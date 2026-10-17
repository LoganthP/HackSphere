import { prisma } from "./prisma";
import { rankTeams, round2 } from "./scoring";

export async function computeResults(eventId: string) {
  const [teams, criteria] = await Promise.all([
    prisma.team.findMany({
      where: { eventId, registration: { status: "APPROVED" } },
      include: {
        problem: { select: { id: true, code: true, title: true, category: true } },
        members: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
        project: { include: { submissions: { where: { isFinal: true }, orderBy: { version: "desc" }, take: 1 } } },
        evaluations: { where: { status: "SUBMITTED" } },
        assignments: { where: { conflict: false } },
      },
    }),
    prisma.criterion.findMany({ where: { eventId }, orderBy: { position: "asc" } }),
  ]);

  const finalists = teams.filter((t) => t.project?.submissions.length);
  const ranked = rankTeams(
    finalists.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      scores: t.evaluations.map((e) => e.score),
      assigned: t.assignments.length,
      submittedAt: t.project!.submissions[0].submittedAt,
    })),
  );

  const rows = ranked.map((r) => {
    const t = finalists.find((x) => x.id === r.teamId)!;
    const perCriterion = criteria.map((c) => {
      const vals = t.evaluations
        .map((e) => (JSON.parse(e.scores) as Record<string, number>)[c.id])
        .filter((v): v is number => typeof v === "number");
      return { criterionId: c.id, name: c.name, average: vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
    });
    return {
      rank: r.rank,
      average: r.average,
      evaluations: r.scores.length,
      assignedJudges: r.assigned,
      missingEvaluations: Math.max(0, r.assigned - r.scores.length),
      team: { id: t.id, name: t.name, members: t.members.map((m) => m.user) },
      problem: t.problem,
      project: { title: t.project!.submissions[0].title, summary: t.project!.submissions[0].summary, repoUrl: t.project!.submissions[0].repoUrl, demoUrl: t.project!.submissions[0].demoUrl },
      submittedAt: t.project!.submissions[0].submittedAt,
      perCriterion,
    };
  });

  // Awards: podium + best project per problem statement.
  const podium = rows.filter((r) => r.rank !== null && r.rank <= 3);
  const byProblem = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.rank === null || !r.problem) continue;
    const cur = byProblem.get(r.problem.id);
    if (!cur || (r.rank ?? 99) < (cur.rank ?? 99)) byProblem.set(r.problem.id, r);
  }
  const awards = [
    ...podium.map((r) => ({ award: r.rank === 1 ? "Winner" : r.rank === 2 ? "Runner-up" : "Third place", teamId: r.team.id, teamName: r.team.name })),
    ...[...byProblem.values()].map((r) => ({ award: `Best in ${r.problem!.code}: ${r.problem!.title}`, teamId: r.team.id, teamName: r.team.name })),
  ];

  const totalAssigned = rows.reduce((a, r) => a + r.assignedJudges, 0);
  const totalDone = rows.reduce((a, r) => a + Math.min(r.evaluations, r.assignedJudges || r.evaluations), 0);
  return {
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, weight: c.weight })),
    rows,
    awards,
    progress: { assigned: totalAssigned, completed: totalDone },
  };
}
