import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, badRequest, notFound, param, parse } from "../lib/http";
import { me, requireAuth } from "../middleware/auth";
import { assertManage, userCard } from "../lib/access";
import { audit, notify, teamMemberIds } from "../lib/notify";

const router = Router();
router.use(requireAuth);

/* ---------- Command center overview ---------- */

router.get(
  "/events/:id",
  ah(async (req, res) => {
    const event = await assertManage(me(req), param(req, "id"));
    const [problems, criteria, teams, judges, organizers, evaluations, announcements] = await Promise.all([
      prisma.problemStatement.findMany({ where: { eventId: event.id }, orderBy: { code: "asc" } }),
      prisma.criterion.findMany({ where: { eventId: event.id }, orderBy: { position: "asc" } }),
      prisma.team.findMany({
        where: { eventId: event.id },
        include: {
          members: { include: { user: userCard } },
          registration: true,
          problem: { select: { id: true, code: true, title: true } },
          project: { include: { submissions: { orderBy: { version: "desc" }, take: 1 } } },
          assignments: { include: { judge: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.eventRole.findMany({ where: { eventId: event.id, role: "JUDGE" }, include: { user: userCard } }),
      prisma.eventRole.findMany({ where: { eventId: event.id, role: "ORGANIZER" }, include: { user: userCard } }),
      prisma.evaluation.findMany({ where: { eventId: event.id }, select: { judgeId: true, teamId: true, status: true } }),
      prisma.announcement.findMany({ where: { eventId: event.id }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] }),
    ]);

    const regs = teams.map((t) => t.registration).filter(Boolean);
    const finalSubmissions = teams.filter((t) => t.project?.submissions[0]?.isFinal).length;
    const timeline = new Map<string, number>();
    for (const r of regs) {
      const day = r!.createdAt.toISOString().slice(0, 10);
      timeline.set(day, (timeline.get(day) ?? 0) + 1);
    }
    const assignments = teams.flatMap((t) => t.assignments.filter((a) => !a.conflict));
    const submittedEvals = evaluations.filter((e) => e.status === "SUBMITTED").length;

    res.json({
      event,
      problems: problems.map((p) => ({
        ...p,
        selectedCount: teams.filter((t) => t.problemId === p.id).length,
        submittedCount: teams.filter((t) => t.problemId === p.id && t.project?.submissions[0]?.isFinal).length,
      })),
      criteria,
      criteriaLocked: evaluations.length > 0,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        leaderId: t.leaderId,
        members: t.members.map((m) => ({ ...m.user, isLeader: m.isLeader })),
        registration: t.registration,
        problem: t.problem,
        latestSubmission: t.project?.submissions[0] ?? null,
        deadlineExtension: t.deadlineExtension,
        judges: t.assignments.map((a) => ({ assignmentId: a.id, ...a.judge, conflict: a.conflict, conflictNote: a.conflictNote })),
      })),
      judges: judges.map((j) => ({
        ...j.user,
        assigned: assignments.filter((a) => a.judgeId === j.userId).length,
        completed: evaluations.filter((e) => e.judgeId === j.userId && e.status === "SUBMITTED").length,
      })),
      organizers: organizers.map((o) => o.user),
      announcements,
      stats: {
        teams: teams.length,
        participants: teams.reduce((a, t) => a + t.members.length, 0),
        registrations: {
          pending: regs.filter((r) => r!.status === "PENDING").length,
          approved: regs.filter((r) => r!.status === "APPROVED").length,
          rejected: regs.filter((r) => r!.status === "REJECTED").length,
        },
        finalSubmissions,
        judging: { assigned: assignments.length, completed: submittedEvals },
        registrationTimeline: [...timeline.entries()].sort().map(([day, count]) => ({ day, count })),
      },
    });
  }),
);

/* ---------- Problem statements ---------- */

const problemFields = z.object({
  code: z.string().trim().min(2).max(16),
  title: z.string().trim().min(4).max(120),
  category: z.string().trim().min(2).max(40),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  description: z.string().trim().min(20, "Describe the challenge in at least 20 characters.").max(4000),
  expectedOutput: z.string().trim().min(5).max(2000),
  resources: z.string().trim().max(2000).nullable().optional(),
  selectionLimit: z.coerce.number().int().min(1).max(1000).nullable().optional(),
});

router.post(
  "/events/:id/problems",
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const body = parse(problemFields, req.body);
    const problem = await prisma.problemStatement.create({ data: { ...body, code: body.code.toUpperCase(), eventId: event.id } });
    await audit(user.id, "problem.create", "ProblemStatement", problem.id);
    res.status(201).json({ problem });
  }),
);

async function problemForManager(req: Parameters<Parameters<typeof router.get>[1]>[0]) {
  const problem = await prisma.problemStatement.findUnique({ where: { id: param(req, "pid") } });
  if (!problem) throw notFound("Problem statement not found.");
  await assertManage(me(req), problem.eventId);
  return problem;
}

router.patch(
  "/problems/:pid",
  ah(async (req, res) => {
    const problem = await problemForManager(req);
    const body = parse(problemFields.partial(), req.body);
    const updated = await prisma.problemStatement.update({
      where: { id: problem.id },
      data: { ...body, ...(body.code && { code: body.code.toUpperCase() }) },
    });
    res.json({ problem: updated });
  }),
);

router.delete(
  "/problems/:pid",
  ah(async (req, res) => {
    const problem = await problemForManager(req);
    const used = await prisma.team.count({ where: { problemId: problem.id } });
    if (used) throw badRequest(`${used} team(s) have chosen this problem. Ask them to switch before deleting it.`);
    await prisma.problemStatement.delete({ where: { id: problem.id } });
    res.json({ ok: true });
  }),
);

/* ---------- Judging criteria ---------- */

const criterionFields = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).nullable().optional(),
  weight: z.coerce.number().min(0.1).max(10),
  position: z.coerce.number().int().min(0).optional(),
});

async function assertCriteriaUnlocked(eventId: string) {
  const count = await prisma.evaluation.count({ where: { eventId } });
  if (count) throw badRequest("Judges have started scoring, so the rubric is locked to keep scores comparable.");
}

router.post(
  "/events/:id/criteria",
  ah(async (req, res) => {
    const event = await assertManage(me(req), param(req, "id"));
    await assertCriteriaUnlocked(event.id);
    const body = parse(criterionFields, req.body);
    const position = body.position ?? (await prisma.criterion.count({ where: { eventId: event.id } }));
    const criterion = await prisma.criterion.create({ data: { ...body, position, eventId: event.id } });
    res.status(201).json({ criterion });
  }),
);

router.patch(
  "/criteria/:cid",
  ah(async (req, res) => {
    const c = await prisma.criterion.findUnique({ where: { id: param(req, "cid") } });
    if (!c) throw notFound();
    await assertManage(me(req), c.eventId);
    await assertCriteriaUnlocked(c.eventId);
    const criterion = await prisma.criterion.update({ where: { id: c.id }, data: parse(criterionFields.partial(), req.body) });
    res.json({ criterion });
  }),
);

router.delete(
  "/criteria/:cid",
  ah(async (req, res) => {
    const c = await prisma.criterion.findUnique({ where: { id: param(req, "cid") } });
    if (!c) throw notFound();
    await assertManage(me(req), c.eventId);
    await assertCriteriaUnlocked(c.eventId);
    await prisma.criterion.delete({ where: { id: c.id } });
    res.json({ ok: true });
  }),
);

/* ---------- Registrations ---------- */

router.post(
  "/registrations/:rid/review",
  ah(async (req, res) => {
    const user = me(req);
    const reg = await prisma.registration.findUnique({ where: { id: param(req, "rid") }, include: { team: true, event: true } });
    if (!reg) throw notFound("Registration not found.");
    await assertManage(user, reg.eventId);
    const body = parse(z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING"]), note: z.string().trim().max(500).optional() }), req.body);
    if (body.status === "APPROVED" && reg.event.maxTeams) {
      const approved = await prisma.registration.count({ where: { eventId: reg.eventId, status: "APPROVED", NOT: { id: reg.id } } });
      if (approved >= reg.event.maxTeams) throw badRequest(`All ${reg.event.maxTeams} team slots are filled.`);
    }
    const updated = await prisma.registration.update({
      where: { id: reg.id },
      data: { status: body.status, note: body.note ?? null, reviewedAt: new Date() },
    });
    await audit(user.id, `registration.${body.status.toLowerCase()}`, "Registration", reg.id, { team: reg.team.name });
    if (body.status !== "PENDING") {
      await notify(await teamMemberIds(reg.teamId), {
        type: "registration",
        title: body.status === "APPROVED" ? `${reg.team.name} is registered` : `${reg.team.name}'s registration was declined`,
        body:
          body.status === "APPROVED"
            ? `You're in for ${reg.event.title}.`
            : body.note || `The organizers of ${reg.event.title} declined this registration.`,
        link: `/app/teams/${reg.teamId}`,
      });
    }
    res.json({ registration: updated });
  }),
);

/* ---------- Judges & co-organizers ---------- */

router.post(
  "/events/:id/judges",
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    const judge = await prisma.user.findUnique({ where: { email } });
    if (!judge) throw badRequest("No HackSphere account uses that email. Ask them to sign up first.", { email: "No account with this email." });
    await prisma.eventRole.upsert({
      where: { eventId_userId_role: { eventId: event.id, userId: judge.id, role: "JUDGE" } },
      create: { eventId: event.id, userId: judge.id, role: "JUDGE" },
      update: {},
    });
    await audit(user.id, "judge.add", "Event", event.id, { judge: judge.email });
    await notify(judge.id, { type: "judge.added", title: `You're judging ${event.title}`, body: "Your assigned projects will appear in your judging workspace.", link: "/app/judging" });
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  "/events/:id/judges/:userId",
  ah(async (req, res) => {
    const event = await assertManage(me(req), param(req, "id"));
    const userId = param(req, "userId");
    await prisma.$transaction([
      prisma.judgeAssignment.deleteMany({ where: { eventId: event.id, judgeId: userId } }),
      prisma.eventRole.deleteMany({ where: { eventId: event.id, userId, role: "JUDGE" } }),
    ]);
    res.json({ ok: true });
  }),
);

router.post(
  "/events/:id/organizers",
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) throw badRequest("No account uses that email.", { email: "No account with this email." });
    await prisma.eventRole.upsert({
      where: { eventId_userId_role: { eventId: event.id, userId: target.id, role: "ORGANIZER" } },
      create: { eventId: event.id, userId: target.id, role: "ORGANIZER" },
      update: {},
    });
    await audit(user.id, "organizer.add", "Event", event.id, { organizer: email });
    res.status(201).json({ ok: true });
  }),
);

/* ---------- Judge assignments ---------- */

router.post(
  "/events/:id/assignments/auto",
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const { perTeam } = parse(z.object({ perTeam: z.coerce.number().int().min(1).max(10).default(2) }), req.body ?? {});
    const [judges, teams, existing] = await Promise.all([
      prisma.eventRole.findMany({ where: { eventId: event.id, role: "JUDGE" } }),
      prisma.team.findMany({ where: { eventId: event.id, registration: { status: "APPROVED" } }, include: { members: true } }),
      prisma.judgeAssignment.findMany({ where: { eventId: event.id } }),
    ]);
    if (!judges.length) throw badRequest("Add at least one judge first.");
    const load = new Map(judges.map((j) => [j.userId, existing.filter((a) => a.judgeId === j.userId).length]));
    let created = 0;
    for (const team of teams) {
      const current = existing.filter((a) => a.teamId === team.id);
      const memberIds = new Set(team.members.map((m) => m.userId));
      const candidates = judges
        .map((j) => j.userId)
        .filter((id) => !memberIds.has(id) && !current.some((a) => a.judgeId === id))
        .sort((a, b) => load.get(a)! - load.get(b)!);
      const needed = Math.max(0, perTeam - current.filter((a) => !a.conflict).length);
      for (const judgeId of candidates.slice(0, needed)) {
        await prisma.judgeAssignment.create({ data: { eventId: event.id, judgeId, teamId: team.id } });
        load.set(judgeId, load.get(judgeId)! + 1);
        created++;
      }
    }
    await audit(user.id, "assignments.auto", "Event", event.id, { created });
    res.json({ created });
  }),
);

router.post(
  "/events/:id/assignments",
  ah(async (req, res) => {
    const event = await assertManage(me(req), param(req, "id"));
    const body = parse(z.object({ judgeId: z.string(), teamId: z.string() }), req.body);
    const [role, team] = await Promise.all([
      prisma.eventRole.findFirst({ where: { eventId: event.id, userId: body.judgeId, role: "JUDGE" } }),
      prisma.team.findFirst({ where: { id: body.teamId, eventId: event.id }, include: { members: true } }),
    ]);
    if (!role) throw badRequest("That person isn't a judge for this hackathon.");
    if (!team) throw notFound("Team not found.");
    if (team.members.some((m) => m.userId === body.judgeId)) throw badRequest("Judges can't evaluate their own team.");
    const assignment = await prisma.judgeAssignment.create({ data: { eventId: event.id, ...body } });
    res.status(201).json({ assignment });
  }),
);

router.delete(
  "/assignments/:aid",
  ah(async (req, res) => {
    const a = await prisma.judgeAssignment.findUnique({ where: { id: param(req, "aid") } });
    if (!a) throw notFound();
    await assertManage(me(req), a.eventId);
    await prisma.judgeAssignment.delete({ where: { id: a.id } });
    res.json({ ok: true });
  }),
);

/* ---------- Deadline extensions ---------- */

router.post(
  "/teams/:teamId/extension",
  ah(async (req, res) => {
    const user = me(req);
    const team = await prisma.team.findUnique({ where: { id: param(req, "teamId") }, include: { event: true } });
    if (!team) throw notFound("Team not found.");
    await assertManage(user, team.eventId);
    const { until } = parse(z.object({ until: z.coerce.date().nullable() }), req.body);
    if (until && until <= team.event.submissionDeadline) throw badRequest("An extension must be later than the regular deadline.");
    const updated = await prisma.team.update({ where: { id: team.id }, data: { deadlineExtension: until } });
    await audit(user.id, "team.extension", "Team", team.id, { until });
    if (until) {
      await notify(await teamMemberIds(team.id), {
        type: "extension",
        title: "Deadline extended",
        body: `${team.name} can submit until ${until.toUTCString()}.`,
        link: `/app/teams/${team.id}`,
      });
    }
    res.json({ team: updated });
  }),
);

export default router;
