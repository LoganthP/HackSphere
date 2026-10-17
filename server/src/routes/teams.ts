import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { prisma, type Event } from "../lib/prisma";
import { ah, badRequest, conflict, forbidden, notFound, param, parse } from "../lib/http";
import { me, requireAuth } from "../middleware/auth";
import { assertTeamLeader, assertTeamMember, canManageEvent, effectiveDeadline, getTeamForUser, userCard } from "../lib/access";
import { audit, notify, teamMemberIds } from "../lib/notify";
import { upload, UPLOAD_DIR } from "../lib/upload";

const router = Router();
router.use(requireAuth);

const ROSTER_STAGES = ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS"];
const assertRosterOpen = (event: Event) => {
  if (!ROSTER_STAGES.includes(event.stage)) throw badRequest("Teams can't be changed at this stage of the hackathon.");
};

async function assertFreeForEvent(userId: string, eventId: string, who = "You're") {
  const existing = await prisma.teamMember.findUnique({ where: { eventId_userId: { eventId, userId } } });
  if (existing) throw conflict(`${who} already on a team for this hackathon.`);
  const judge = await prisma.eventRole.findFirst({ where: { eventId, userId, role: "JUDGE" } });
  if (judge) throw badRequest("Judges of a hackathon can't join a team in it.");
}

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Use a full link starting with http:// or https://")
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

/* ---------- My teams ---------- */

router.get(
  "/mine",
  ah(async (req, res) => {
    const user = me(req);
    const memberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: {
        team: {
          include: {
            event: { select: { id: true, slug: true, title: true, stage: true, submissionDeadline: true, accentColor: true, maxTeamSize: true, minTeamSize: true } },
            members: { include: { user: userCard } },
            registration: { select: { status: true } },
            problem: { select: { code: true, title: true } },
            project: { select: { title: true, milestones: true, submissions: { orderBy: { version: "desc" }, take: 1, select: { isFinal: true, submittedAt: true, version: true } } } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    res.json({
      teams: memberships.map((m) => ({ ...m.team, isLeader: m.team.leaderId === user.id })),
    });
  }),
);

router.post(
  "/",
  ah(async (req, res) => {
    const user = me(req);
    const body = parse(
      z.object({
        eventId: z.string(),
        name: z.string().trim().min(2, "Team names need at least 2 characters.").max(40),
        pitch: z.string().trim().max(280).optional(),
      }),
      req.body,
    );
    const event = await prisma.event.findUnique({ where: { id: body.eventId } });
    if (!event) throw notFound("Hackathon not found.");
    if (!["PUBLISHED", "REGISTRATION_OPEN"].includes(event.stage)) throw badRequest("Team formation is closed for this hackathon.");
    await assertFreeForEvent(user.id, event.id);
    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        name: body.name,
        pitch: body.pitch || null,
        leaderId: user.id,
        members: { create: { userId: user.id, eventId: event.id, isLeader: true } },
      },
    });
    await audit(user.id, "team.create", "Team", team.id, { event: event.title });
    res.status(201).json({ team });
  }),
);

/* ---------- Workspace ---------- */

router.get(
  "/:id",
  ah(async (req, res) => {
    const user = me(req);
    const { membership, isLeader, manager } = await assertTeamMember(param(req, "id"), user);
    const team = await prisma.team.findUnique({
      where: { id: param(req, "id") },
      include: {
        event: { include: { problems: { orderBy: { code: "asc" } }, criteria: { orderBy: { position: "asc" } } } },
        members: { include: { user: userCard }, orderBy: { joinedAt: "asc" } },
        registration: true,
        problem: true,
        project: { include: { submissions: { orderBy: { version: "desc" } } } },
        invitations: {
          where: { status: "PENDING" },
          include: { sender: userCard, recipient: userCard },
          orderBy: { createdAt: "desc" },
        },
        evaluations: { where: { status: "SUBMITTED" }, select: { feedback: true, score: true } },
      },
    });
    if (!team) throw notFound();
    const deadline = effectiveDeadline(team.event, team.deadlineExtension);
    const now = new Date();
    const submissionOpen = ["IN_PROGRESS", "JUDGING"].includes(team.event.stage) && now <= deadline;
    const problemCounts = await prisma.team.groupBy({ by: ["problemId"], where: { eventId: team.eventId, problemId: { not: null } }, _count: true });
    const { evaluations, ...rest } = team;
    res.json({
      team: {
        ...rest,
        project: team.project ? { ...team.project, milestones: JSON.parse(team.project.milestones) } : null,
        event: {
          ...team.event,
          problems: team.event.problems.map((p) => ({ ...p, selectedCount: problemCounts.find((c) => c.problemId === p.id)?._count ?? 0 })),
        },
      },
      // Judge feedback is shared with the team only once results are published.
      feedback: team.event.resultsPublished ? evaluations.map((e) => e.feedback).filter(Boolean) : [],
      permissions: { isLeader, isMember: Boolean(membership), isManager: manager },
      deadline,
      submissionOpen,
    });
  }),
);

router.patch(
  "/:id",
  ah(async (req, res) => {
    const { team } = await assertTeamLeader(param(req, "id"), me(req));
    const body = parse(
      z.object({
        name: z.string().trim().min(2).max(40).optional(),
        pitch: z.string().trim().max(280).nullable().optional(),
        lookingForMembers: z.boolean().optional(),
      }),
      req.body,
    );
    const updated = await prisma.team.update({ where: { id: team.id }, data: body });
    res.json({ team: updated });
  }),
);

router.delete(
  "/:id",
  ah(async (req, res) => {
    const user = me(req);
    const { team } = await assertTeamLeader(param(req, "id"), user);
    const finals = await prisma.submission.count({ where: { project: { teamId: team.id }, isFinal: true } });
    if (finals) throw badRequest("Teams with a final submission can't be deleted.");
    const others = team.members.filter((m) => m.userId !== user.id).map((m) => m.userId);
    await prisma.team.delete({ where: { id: team.id } });
    await audit(user.id, "team.delete", "Team", team.id, { name: team.name });
    await notify(others, { type: "team.deleted", title: `${team.name} was disbanded`, body: "Your team leader deleted the team.", link: "/app/teams" });
    res.json({ ok: true });
  }),
);

/* ---------- Invitations & join requests ---------- */

router.post(
  "/:id/invite",
  ah(async (req, res) => {
    const user = me(req);
    const { team } = await assertTeamLeader(param(req, "id"), user);
    assertRosterOpen(team.event);
    const { email, message } = parse(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email."), message: z.string().trim().max(280).optional() }), req.body);
    if (team.members.length >= team.event.maxTeamSize) throw badRequest(`Teams can have at most ${team.event.maxTeamSize} members.`);
    const recipient = await prisma.user.findUnique({ where: { email } });
    if (!recipient) throw badRequest("No HackSphere account uses that email.", { email: "Ask them to sign up first, then invite them." });
    if (recipient.id === user.id) throw badRequest("You're already on this team.");
    await assertFreeForEvent(recipient.id, team.eventId, `${recipient.name} is`);
    const pending = await prisma.invitation.findFirst({ where: { teamId: team.id, recipientId: recipient.id, status: "PENDING" } });
    if (pending) throw conflict(`${recipient.name} already has a pending invitation.`);
    const invitation = await prisma.invitation.create({
      data: { teamId: team.id, senderId: user.id, recipientId: recipient.id, kind: "INVITE", message: message || null },
    });
    await notify(recipient.id, {
      type: "invitation",
      title: `${user.name} invited you to ${team.name}`,
      body: `Join them for ${team.event.title}.`,
      link: "/app/inbox",
    });
    res.status(201).json({ invitation });
  }),
);

router.post(
  "/:id/request",
  ah(async (req, res) => {
    const user = me(req);
    const team = await prisma.team.findUnique({ where: { id: param(req, "id") }, include: { event: true, members: true } });
    if (!team) throw notFound("Team not found.");
    assertRosterOpen(team.event);
    if (!team.lookingForMembers) throw badRequest("This team isn't accepting requests right now.");
    if (team.members.length >= team.event.maxTeamSize) throw badRequest("This team is full.");
    await assertFreeForEvent(user.id, team.eventId);
    const pending = await prisma.invitation.findFirst({ where: { teamId: team.id, senderId: user.id, status: "PENDING", kind: "REQUEST" } });
    if (pending) throw conflict("You've already asked to join this team.");
    const { message } = parse(z.object({ message: z.string().trim().max(280).optional() }), req.body ?? {});
    const invitation = await prisma.invitation.create({
      data: { teamId: team.id, senderId: user.id, recipientId: team.leaderId, kind: "REQUEST", message: message || null },
    });
    await notify(team.leaderId, { type: "join.request", title: `${user.name} wants to join ${team.name}`, body: message || "Review the request in your inbox.", link: "/app/inbox" });
    res.status(201).json({ invitation });
  }),
);

export const invitationsRouter = Router();
invitationsRouter.use(requireAuth);

const inviteInclude = {
  team: { include: { event: { select: { id: true, slug: true, title: true, maxTeamSize: true, stage: true } }, _count: { select: { members: true } } } },
  sender: userCard,
  recipient: userCard,
} as const;

invitationsRouter.get(
  "/",
  ah(async (req, res) => {
    const user = me(req);
    const [incoming, sent] = await Promise.all([
      prisma.invitation.findMany({ where: { recipientId: user.id, status: "PENDING" }, include: inviteInclude, orderBy: { createdAt: "desc" } }),
      prisma.invitation.findMany({ where: { senderId: user.id, status: "PENDING" }, include: inviteInclude, orderBy: { createdAt: "desc" } }),
    ]);
    res.json({
      invitations: incoming.filter((i) => i.kind === "INVITE"),
      requests: incoming.filter((i) => i.kind === "REQUEST"),
      sent,
    });
  }),
);

invitationsRouter.post(
  "/:id/respond",
  ah(async (req, res) => {
    const user = me(req);
    const { accept } = parse(z.object({ accept: z.boolean() }), req.body);
    const inv = await prisma.invitation.findUnique({ where: { id: param(req, "id") }, include: { team: { include: { event: true, members: true } } } });
    if (!inv || inv.status !== "PENDING") throw notFound("This invitation is no longer open.");
    if (inv.recipientId !== user.id) throw forbidden();
    const joinerId = inv.kind === "INVITE" ? inv.recipientId : inv.senderId;

    if (!accept) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.invitation.findUnique({ where: { id: inv.id } });
        if (!current || current.status !== "PENDING") throw notFound("This invitation is no longer open.");
        await tx.invitation.update({ where: { id: inv.id }, data: { status: "DECLINED", respondedAt: new Date() } });
      });
      await notify(inv.senderId, {
        type: "invitation.declined",
        title: inv.kind === "INVITE" ? `${user.name} declined your invitation` : `Your request to join ${inv.team.name} was declined`,
        body: inv.team.event.title,
        link: inv.kind === "INVITE" ? `/app/teams/${inv.teamId}` : `/hackathons/${inv.team.event.slug}`,
      });
      return res.json({ ok: true });
    }

    assertRosterOpen(inv.team.event);
    if (inv.team.members.length >= inv.team.event.maxTeamSize) throw badRequest("This team is already full.");
    await assertFreeForEvent(joinerId, inv.team.eventId, inv.kind === "INVITE" ? "You're" : "They're");

    await prisma.$transaction(async (tx) => {
      const current = await tx.invitation.findUnique({ where: { id: inv.id } });
      if (!current || current.status !== "PENDING") throw notFound("This invitation is no longer open.");
      const count = await tx.teamMember.count({ where: { teamId: inv.teamId } });
      if (count >= inv.team.event.maxTeamSize) throw badRequest("This team is already full.");
      await tx.teamMember.create({ data: { teamId: inv.teamId, userId: joinerId, eventId: inv.team.eventId } });
      await tx.invitation.update({ where: { id: inv.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
      await tx.invitation.updateMany({
        where: {
          status: "PENDING",
          team: { eventId: inv.team.eventId },
          OR: [{ recipientId: joinerId, kind: "INVITE" }, { senderId: joinerId, kind: "REQUEST" }],
        },
        data: { status: "CANCELLED", respondedAt: new Date() },
      });
    });
    const joiner = joinerId === user.id ? user : await prisma.user.findUnique({ where: { id: joinerId } });
    const others = (await teamMemberIds(inv.teamId)).filter((id) => id !== user.id);
    await notify(others, { type: "team.joined", title: `${joiner?.name} joined ${inv.team.name}`, body: inv.team.event.title, link: `/app/teams/${inv.teamId}` });
    await audit(user.id, "team.join", "Team", inv.teamId, { userId: joinerId });
    res.json({ ok: true, teamId: inv.teamId });
  }),
);

invitationsRouter.delete(
  "/:id",
  ah(async (req, res) => {
    const user = me(req);
    const inv = await prisma.invitation.findUnique({ where: { id: param(req, "id") } });
    if (!inv || inv.status !== "PENDING") throw notFound();
    if (inv.senderId !== user.id) throw forbidden();
    await prisma.invitation.update({ where: { id: inv.id }, data: { status: "CANCELLED", respondedAt: new Date() } });
    res.json({ ok: true });
  }),
);

/* ---------- Roster changes ---------- */

router.delete(
  "/:id/members/:userId",
  ah(async (req, res) => {
    const user = me(req);
    const targetId = param(req, "userId");
    const { team, isLeader } = await getTeamForUser(param(req, "id"), user);
    const self = targetId === user.id;
    if (!self && !isLeader) throw forbidden("Only the team leader can remove members.");
    if (targetId === team.leaderId) throw badRequest("Leaders must hand over leadership (or delete the team) before leaving.");
    if (!team.members.some((m) => m.userId === targetId)) throw notFound("That person isn't on this team.");
    assertRosterOpen(team.event);
    await prisma.teamMember.delete({ where: { eventId_userId: { eventId: team.eventId, userId: targetId } } });
    await notify(self ? team.leaderId : targetId, {
      type: "team.left",
      title: self ? `${user.name} left ${team.name}` : `You were removed from ${team.name}`,
      body: team.event.title,
      link: self ? `/app/teams/${team.id}` : "/app/teams",
    });
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/transfer",
  ah(async (req, res) => {
    const user = me(req);
    const { team } = await assertTeamLeader(param(req, "id"), user);
    const { userId } = parse(z.object({ userId: z.string() }), req.body);
    if (!team.members.some((m) => m.userId === userId)) throw badRequest("Choose someone on the team.");
    await prisma.$transaction([
      prisma.team.update({ where: { id: team.id }, data: { leaderId: userId } }),
      prisma.teamMember.updateMany({ where: { teamId: team.id }, data: { isLeader: false } }),
      prisma.teamMember.updateMany({ where: { teamId: team.id, userId }, data: { isLeader: true } }),
    ]);
    await notify(userId, { type: "team.leader", title: `You now lead ${team.name}`, body: `${user.name} handed over leadership.`, link: `/app/teams/${team.id}` });
    res.json({ ok: true });
  }),
);

/* ---------- Problem selection & registration ---------- */

router.post(
  "/:id/problem",
  ah(async (req, res) => {
    const user = me(req);
    const { team } = await assertTeamLeader(param(req, "id"), user);
    const { problemId } = parse(z.object({ problemId: z.string().nullable() }), req.body);
    if (["JUDGING", "COMPLETED"].includes(team.event.stage)) throw badRequest("Challenges are locked once judging starts.");
    const finals = await prisma.submission.count({ where: { project: { teamId: team.id }, isFinal: true } });
    if (finals) throw badRequest("You've made a final submission, so your challenge is locked.");
    if (problemId) {
      const problem = await prisma.problemStatement.findFirst({ where: { id: problemId, eventId: team.eventId } });
      if (!problem) throw notFound("Problem statement not found.");
      if (problem.selectionLimit) {
        const taken = await prisma.team.count({ where: { problemId, NOT: { id: team.id } } });
        if (taken >= problem.selectionLimit) throw badRequest(`${problem.code} has reached its limit of ${problem.selectionLimit} teams.`);
      }
    }
    const updated = await prisma.team.update({ where: { id: team.id }, data: { problemId } });
    res.json({ team: updated });
  }),
);

router.post(
  "/:id/register",
  ah(async (req, res) => {
    const user = me(req);
    const { team } = await assertTeamLeader(param(req, "id"), user);
    const event = team.event;
    if (event.stage !== "REGISTRATION_OPEN") throw badRequest("Registration isn't open for this hackathon.");
    if (new Date() > event.registrationClosesAt) throw badRequest("The registration deadline has passed.");
    const n = team.members.length;
    if (n < event.minTeamSize || n > event.maxTeamSize) {
      throw badRequest(`Teams need ${event.minTeamSize}–${event.maxTeamSize} members to register. You have ${n}.`);
    }
    const existing = await prisma.registration.findUnique({ where: { teamId: team.id } });
    if (existing && existing.status !== "REJECTED") throw conflict("This team has already applied.");
    const registration = existing
      ? await prisma.registration.update({ where: { id: existing.id }, data: { status: "PENDING", note: null, reviewedAt: null } })
      : await prisma.registration.create({ data: { eventId: event.id, teamId: team.id } });
    const organizers = await prisma.eventRole.findMany({ where: { eventId: event.id, role: "ORGANIZER" } });
    await notify(organizers.map((o) => o.userId), {
      type: "registration.new",
      title: `${team.name} registered for ${event.title}`,
      body: `${n} member(s) awaiting review.`,
      link: `/app/organize/${event.id}?tab=registrations`,
    });
    await audit(user.id, "registration.apply", "Team", team.id);
    res.status(201).json({ registration });
  }),
);

router.delete(
  "/:id/register",
  ah(async (req, res) => {
    const { team } = await assertTeamLeader(param(req, "id"), me(req));
    if (!["PUBLISHED", "REGISTRATION_OPEN"].includes(team.event.stage)) throw badRequest("Registration can't be withdrawn now.");
    await prisma.registration.deleteMany({ where: { teamId: team.id } });
    res.json({ ok: true });
  }),
);

/* ---------- Project workspace & submissions ---------- */

const milestone = z.object({ id: z.string().max(40), label: z.string().trim().min(1).max(120), done: z.boolean() });
const projectFields = z.object({
  title: z.string().trim().min(3, "Give the project a title (3+ characters).").max(100),
  summary: z.string().trim().max(3000).default(""),
  techStack: z.string().trim().max(300).nullable().optional(),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  slidesUrl: optionalUrl,
  videoUrl: optionalUrl,
  milestones: z.array(milestone).max(30).optional(),
});

function assertCanEdit(team: { event: Event; deadlineExtension: Date | null }) {
  const deadline = effectiveDeadline(team.event, team.deadlineExtension);
  if (new Date() > deadline) throw badRequest("The submission deadline has passed. Your project is locked.");
}

router.put(
  "/:id/project",
  ah(async (req, res) => {
    const user = me(req);
    const { team, membership } = await getTeamForUser(param(req, "id"), user);
    if (!membership) throw forbidden("Only team members can edit the project.");
    assertCanEdit(team);
    const body = parse(projectFields, req.body);
    const { milestones, ...fields } = body;
    const data = { ...fields, ...(milestones && { milestones: JSON.stringify(milestones) }) };
    const project = await prisma.project.upsert({ where: { teamId: team.id }, create: { teamId: team.id, ...data }, update: data });
    res.json({ project: { ...project, milestones: JSON.parse(project.milestones) } });
  }),
);

router.post(
  "/:id/submissions",
  upload.single("attachment"),
  ah(async (req, res) => {
    const user = me(req);
    const { team } = await assertTeamLeader(param(req, "id"), user);
    const final = req.body.final === "true" || req.body.final === true;
    const event = team.event;
    if (!["IN_PROGRESS", "JUDGING"].includes(event.stage)) throw badRequest("Submissions open when the hackathon goes live.");
    assertCanEdit(team);
    const registration = await prisma.registration.findUnique({ where: { teamId: team.id } });
    if (registration?.status !== "APPROVED") throw badRequest("Your registration must be approved before you can submit.");
    const project = await prisma.project.findUnique({ where: { teamId: team.id }, include: { submissions: { orderBy: { version: "desc" }, take: 1 } } });
    if (!project) throw badRequest("Save your project details first.");

    if (final) {
      const missing: Record<string, string> = {};
      if (!team.problemId) missing.problem = "Choose a problem statement.";
      if (project.summary.trim().length < 50) missing.summary = "Write a summary of at least 50 characters.";
      if (!project.repoUrl) missing.repoUrl = "Add your repository link.";
      if (!project.demoUrl && !project.videoUrl) missing.demoUrl = "Add a live demo or a demo video link.";
      if (Object.keys(missing).length) throw badRequest("Your submission is missing required items.", missing);
    }

    const prev = project.submissions[0];
    const submission = await prisma.submission.create({
      data: {
        projectId: project.id,
        version: (prev?.version ?? 0) + 1,
        title: project.title,
        summary: project.summary,
        techStack: project.techStack,
        repoUrl: project.repoUrl,
        demoUrl: project.demoUrl,
        slidesUrl: project.slidesUrl,
        videoUrl: project.videoUrl,
        attachmentPath: req.file?.filename ?? prev?.attachmentPath ?? null,
        attachmentName: req.file?.originalname ?? prev?.attachmentName ?? null,
        isFinal: final,
        submittedById: user.id,
      },
    });
    await audit(user.id, final ? "submission.final" : "submission.draft", "Team", team.id, { version: submission.version });
    if (final) {
      const others = (await teamMemberIds(team.id)).filter((id) => id !== user.id);
      await notify(others, { type: "submission", title: `${team.name} submitted v${submission.version}`, body: `Final submission recorded for ${event.title}.`, link: `/app/teams/${team.id}` });
    }
    res.status(201).json({ submission });
  }),
);

router.get(
  "/:id/submissions/:sid/attachment",
  ah(async (req, res) => {
    const user = me(req);
    const sub = await prisma.submission.findUnique({ where: { id: param(req, "sid") }, include: { project: { include: { team: { include: { event: true, members: true } } } } } });
    if (!sub || sub.project.teamId !== param(req, "id") || !sub.attachmentPath) throw notFound("File not found.");
    const team = sub.project.team;
    const allowed =
      team.members.some((m) => m.userId === user.id) ||
      (await canManageEvent(user, team.event)) ||
      Boolean(await prisma.judgeAssignment.findFirst({ where: { teamId: team.id, judgeId: user.id, conflict: false } }));
    if (!allowed) throw forbidden();
    const filePath = path.join(UPLOAD_DIR, path.basename(sub.attachmentPath));
    if (!fs.existsSync(filePath)) throw notFound("File not found on disk.");
    res.download(filePath, sub.attachmentName ?? "attachment");
  }),
);

export default router;
