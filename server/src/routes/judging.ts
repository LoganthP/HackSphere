import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, badRequest, forbidden, notFound, param, parse } from "../lib/http";
import { me, requireAuth } from "../middleware/auth";
import { isComplete, weightedScore } from "../lib/scoring";
import { audit, notify } from "../lib/notify";

const router = Router();
router.use(requireAuth);

router.get(
  "/assignments",
  ah(async (req, res) => {
    const user = me(req);
    const assignments = await prisma.judgeAssignment.findMany({
      where: { judgeId: user.id },
      include: {
        event: { select: { id: true, title: true, slug: true, stage: true, accentColor: true, resultsPublished: true } },
        team: {
          include: {
            problem: { select: { code: true, title: true } },
            project: { include: { submissions: { where: { isFinal: true }, orderBy: { version: "desc" }, take: 1, select: { id: true, title: true, submittedAt: true, version: true } } } },
            evaluations: { where: { judgeId: user.id }, select: { status: true, score: true, updatedAt: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        conflict: a.conflict,
        conflictNote: a.conflictNote,
        event: a.event,
        team: { id: a.team.id, name: a.team.name, problem: a.team.problem },
        submission: a.team.project?.submissions[0] ?? null,
        evaluation: a.team.evaluations[0] ?? null,
      })),
    });
  }),
);

async function loadAssignment(judgeId: string, teamId: string) {
  const assignment = await prisma.judgeAssignment.findUnique({
    where: { judgeId_teamId: { judgeId, teamId } },
    include: { event: true },
  });
  if (!assignment) throw notFound("This project isn't assigned to you.");
  return assignment;
}

router.get(
  "/assignments/:teamId",
  ah(async (req, res) => {
    const user = me(req);
    const assignment = await loadAssignment(user.id, param(req, "teamId"));
    const [team, criteria, evaluation] = await Promise.all([
      prisma.team.findUnique({
        where: { id: assignment.teamId },
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarColor: true, college: true } } } },
          problem: true,
          project: { include: { submissions: { where: { isFinal: true }, orderBy: { version: "desc" }, take: 1 } } },
        },
      }),
      prisma.criterion.findMany({ where: { eventId: assignment.eventId }, orderBy: { position: "asc" } }),
      prisma.evaluation.findUnique({ where: { judgeId_teamId: { judgeId: user.id, teamId: assignment.teamId } } }),
    ]);
    res.json({
      assignment: { id: assignment.id, conflict: assignment.conflict, conflictNote: assignment.conflictNote },
      event: { id: assignment.event.id, title: assignment.event.title, stage: assignment.event.stage, resultsPublished: assignment.event.resultsPublished },
      team: team && { id: team.id, name: team.name, pitch: team.pitch, members: team.members.map((m) => m.user), problem: team.problem },
      submission: team?.project?.submissions[0] ?? null,
      criteria,
      evaluation: evaluation && { ...evaluation, scores: JSON.parse(evaluation.scores) },
      canScore: assignment.event.stage === "JUDGING" && !assignment.event.resultsPublished && !assignment.conflict,
    });
  }),
);

router.put(
  "/evaluations/:teamId",
  ah(async (req, res) => {
    const user = me(req);
    const assignment = await loadAssignment(user.id, param(req, "teamId"));
    if (assignment.conflict) throw forbidden("You declared a conflict of interest for this team.");
    if (assignment.event.stage !== "JUDGING") throw badRequest("Scoring opens when the organizers start judging.");
    if (assignment.event.resultsPublished) throw badRequest("Results are published, so scores are final.");
    const body = parse(
      z.object({
        scores: z.record(z.string(), z.number().min(0, "Scores range from 0 to 10.").max(10, "Scores range from 0 to 10.")),
        feedback: z.string().trim().max(3000).default(""),
        submit: z.boolean().default(false),
      }),
      req.body,
    );
    const [criteria, submission] = await Promise.all([
      prisma.criterion.findMany({ where: { eventId: assignment.eventId } }),
      prisma.submission.findFirst({ where: { project: { teamId: assignment.teamId }, isFinal: true }, orderBy: { version: "desc" } }),
    ]);
    if (!submission) throw badRequest("This team hasn't made a final submission.");
    const ids = new Set(criteria.map((c) => c.id));
    const scores = Object.fromEntries(Object.entries(body.scores).filter(([k]) => ids.has(k)));
    if (body.submit) {
      const fields: Record<string, string> = {};
      if (!isComplete(criteria, scores)) fields.scores = "Score every criterion before submitting.";
      if (body.feedback.length < 20) fields.feedback = "Write at least 20 characters of feedback for the team.";
      if (Object.keys(fields).length) throw badRequest("Your evaluation isn't complete yet.", fields);
    }
    const data = {
      scores: JSON.stringify(scores),
      feedback: body.feedback,
      score: weightedScore(criteria, scores),
      submissionId: submission.id,
      status: body.submit ? ("SUBMITTED" as const) : ("DRAFT" as const),
      submittedAt: body.submit ? new Date() : null,
    };
    const evaluation = await prisma.evaluation.upsert({
      where: { judgeId_teamId: { judgeId: user.id, teamId: assignment.teamId } },
      create: { ...data, judgeId: user.id, teamId: assignment.teamId, eventId: assignment.eventId },
      update: data,
    });
    if (body.submit) await audit(user.id, "evaluation.submit", "Team", assignment.teamId, { score: evaluation.score });
    res.json({ evaluation: { ...evaluation, scores } });
  }),
);

router.post(
  "/assignments/:teamId/conflict",
  ah(async (req, res) => {
    const user = me(req);
    const assignment = await loadAssignment(user.id, param(req, "teamId"));
    const { note } = parse(z.object({ note: z.string().trim().min(5, "Briefly explain the conflict.").max(300) }), req.body);
    await prisma.$transaction([
      prisma.judgeAssignment.update({ where: { id: assignment.id }, data: { conflict: true, conflictNote: note } }),
      prisma.evaluation.deleteMany({ where: { judgeId: user.id, teamId: assignment.teamId } }),
    ]);
    const organizers = await prisma.eventRole.findMany({ where: { eventId: assignment.eventId, role: "ORGANIZER" } });
    await notify(organizers.map((o) => o.userId), {
      type: "judge.conflict",
      title: `${user.name} declared a conflict of interest`,
      body: note,
      link: `/app/organize/${assignment.eventId}?tab=judging`,
    });
    await audit(user.id, "judge.conflict", "JudgeAssignment", assignment.id, { note });
    res.json({ ok: true });
  }),
);

export default router;
