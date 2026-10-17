/**
 * Weighted rubric score: S = Σ(w_i · r_i) / Σ(w_i), ratings on a 0–10 scale.
 */
export interface CriterionLike {
  id: string;
  weight: number;
}

export function weightedScore(criteria: CriterionLike[], ratings: Record<string, number>): number {
  let num = 0;
  let den = 0;
  for (const c of criteria) {
    const r = ratings[c.id];
    if (typeof r !== "number" || Number.isNaN(r)) continue;
    num += c.weight * r;
    den += c.weight;
  }
  return den === 0 ? 0 : round2(num / den);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function isComplete(criteria: CriterionLike[], ratings: Record<string, number>) {
  return criteria.every((c) => typeof ratings[c.id] === "number" && ratings[c.id] >= 0 && ratings[c.id] <= 10);
}

export interface RankInput {
  teamId: string;
  teamName: string;
  scores: number[]; // one per SUBMITTED evaluation
  assigned: number; // judges assigned (excluding conflicts)
  submittedAt: Date | null; // final submission time — earlier wins ties
}

export interface RankRow extends RankInput {
  average: number | null;
  rank: number | null;
}

/**
 * Average the submitted judge scores per team and rank them.
 * Teams with no submitted evaluations are listed but unranked.
 * Ties: equal averages share a rank only if final submissions also tie; otherwise the earlier
 * final submission ranks higher.
 */
export function rankTeams(rows: RankInput[]): RankRow[] {
  const withAvg = rows.map((r) => ({
    ...r,
    average: r.scores.length ? round2(r.scores.reduce((a, b) => a + b, 0) / r.scores.length) : null,
    rank: null as number | null,
  }));
  const scored = withAvg
    .filter((r) => r.average !== null)
    .sort((a, b) => {
      if (b.average! !== a.average!) return b.average! - a.average!;
      const ta = a.submittedAt?.getTime() ?? Infinity;
      const tb = b.submittedAt?.getTime() ?? Infinity;
      return ta - tb;
    });
  scored.forEach((r, i) => {
    const prev = scored[i - 1];
    const tie =
      prev &&
      prev.average === r.average &&
      (prev.submittedAt?.getTime() ?? 0) === (r.submittedAt?.getTime() ?? 0);
    r.rank = tie ? prev.rank : i + 1;
  });
  const unscored = withAvg.filter((r) => r.average === null).sort((a, b) => a.teamName.localeCompare(b.teamName));
  return [...scored, ...unscored];
}
