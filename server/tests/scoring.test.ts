import { describe, expect, it } from "vitest";
import { isComplete, rankTeams, weightedScore } from "../src/lib/scoring";

const criteria = [
  { id: "innovation", weight: 2 },
  { id: "tech", weight: 1 },
];

describe("weightedScore", () => {
  it("computes Σ(w·r)/Σw", () => {
    expect(weightedScore(criteria, { innovation: 9, tech: 6 })).toBe(8);
  });
  it("ignores missing ratings instead of treating them as zero", () => {
    expect(weightedScore(criteria, { tech: 6 })).toBe(6);
  });
  it("returns 0 when nothing is rated", () => {
    expect(weightedScore(criteria, {})).toBe(0);
  });
});

describe("isComplete", () => {
  it("requires every criterion in range", () => {
    expect(isComplete(criteria, { innovation: 5, tech: 10 })).toBe(true);
    expect(isComplete(criteria, { innovation: 5 })).toBe(false);
    expect(isComplete(criteria, { innovation: 5, tech: 11 })).toBe(false);
  });
});

describe("rankTeams", () => {
  const t = (id: string, scores: number[], minutes: number | null) => ({
    teamId: id,
    teamName: id,
    scores,
    assigned: 2,
    submittedAt: minutes === null ? null : new Date(2026, 0, 1, 10, minutes),
  });

  it("ranks by average score", () => {
    const rows = rankTeams([t("A", [7, 7], 0), t("B", [9, 8], 0), t("C", [8, 8], 0)]);
    expect(rows.map((r) => [r.teamId, r.rank])).toEqual([["B", 1], ["C", 2], ["A", 3]]);
  });

  it("breaks ties by earlier final submission", () => {
    const rows = rankTeams([t("Late", [8], 30), t("Early", [8], 5)]);
    expect(rows.map((r) => [r.teamId, r.rank])).toEqual([["Early", 1], ["Late", 2]]);
  });

  it("shares a rank on a complete tie", () => {
    const rows = rankTeams([t("A", [8], 5), t("B", [8], 5)]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1]);
  });

  it("leaves teams without evaluations unranked at the bottom", () => {
    const rows = rankTeams([t("None", [], 0), t("Some", [5], 0)]);
    expect(rows.map((r) => [r.teamId, r.rank, r.average])).toEqual([["Some", 1, 5], ["None", null, null]]);
  });
});
