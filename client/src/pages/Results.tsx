import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Award, Medal } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import type { Results as ResultsT } from "@/lib/types";
import { AvatarStack, Badge, EmptyState, ErrorState, Spinner } from "@/components/ui";

const PODIUM = [
  { clay: "#FFC857", label: "Winner", h: "sm:h-64" },
  { clay: "#9C8CFF", label: "Runner-up", h: "sm:h-52" },
  { clay: "#3DCFAE", label: "Third place", h: "sm:h-44" },
];
const BAR_COLORS = ["var(--chart-violet)", "var(--chart-coral)", "var(--chart-mint)"];

export default function Results() {
  const { slug = "" } = useParams();
  const q = useQuery({ queryKey: ["results", slug], queryFn: () => api<ResultsT>(`/events/${slug}/results`) });

  if (q.isLoading) return <Spinner />;
  if (q.isError)
    return (
      <div className="px-5 pt-16">
        <ErrorState error={q.error} />
      </div>
    );
  const r = q.data!;
  const ranked = r.rows.filter((x) => x.rank !== null);
  const top3 = ranked.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top3[i]); // podium order: 2nd, 1st, 3rd
  const chartData = r.criteria.map((c) => {
    const row: Record<string, string | number> = { criterion: c.name };
    for (const t of top3) row[t.team.name] = t.perCriterion.find((p) => p.criterionId === c.id)?.average ?? 0;
    return row;
  });

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-6">
      {r.preview && (
        <p className="mb-6 rounded-2xl bg-sun-tint px-4 py-3 font-semibold text-sun-ink" role="status">
          Organizer preview. Participants can't see these results until you publish them.
        </p>
      )}
      <Link to={`/hackathons/${r.event.slug}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
        {r.event.title}
      </Link>
      <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">Results</h1>
      <p className="mt-2 text-ink-soft">
        {ranked.length} ranked project{ranked.length === 1 ? "" : "s"}, scored by {r.progress.completed} completed evaluation{r.progress.completed === 1 ? "" : "s"}.
      </p>

      {top3.length === 0 ? (
        <EmptyState className="mt-10" title="No scored projects yet" body="Rankings appear once judges submit their evaluations." />
      ) : (
        <>
          {/* Podium */}
          <div className="mt-10 grid items-end gap-4 sm:grid-cols-3">
            {order.map((i, k) => {
              const row = top3[i];
              const p = PODIUM[i];
              return (
                <motion.div
                  key={row.team.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 * k, type: "spring", stiffness: 140, damping: 18 }}
                  className={`clay flex flex-col justify-end rounded-[var(--radius-tile)] p-6 text-navy ${p.h} ${i === 0 ? "order-first sm:order-none" : ""}`}
                  style={{ ["--clay" as string]: p.clay }}
                >
                  <Medal className="size-7" aria-hidden />
                  <p className="mt-2 text-sm font-bold">{p.label}</p>
                  <p className="font-display text-2xl font-extrabold leading-tight">{row.team.name}</p>
                  <p className="text-sm font-medium text-navy">{row.project.title}</p>
                  <p className="mt-3 font-display text-4xl font-extrabold tabular-nums">{row.average?.toFixed(2)}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Leaderboard */}
          <section className="mt-12" aria-labelledby="board">
            <h2 id="board" className="text-2xl font-bold">
              Leaderboard
            </h2>
            <div className="tile mt-4 overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-b border-line text-sm text-ink-soft">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Rank</th>
                    <th className="px-5 py-3 font-semibold">Team and project</th>
                    <th className="px-5 py-3 font-semibold">Challenge</th>
                    <th className="px-5 py-3 font-semibold">Judges</th>
                    <th className="px-5 py-3 text-right font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row, i) => (
                    <motion.tr
                      key={row.team.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i }}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-5 py-4 font-display text-xl font-bold tabular-nums">{row.rank ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarStack people={row.team.members} size={28} max={3} />
                          <div>
                            <p className="font-semibold">{row.team.name}</p>
                            <p className="text-sm text-ink-soft">{row.project.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">{row.problem ? <Badge className="bg-surface-2 text-ink-soft">{row.problem.code}</Badge> : "—"}</td>
                      <td className="px-5 py-4 text-sm text-ink-soft">
                        {row.evaluations}/{row.assignedJudges || row.evaluations}
                        {row.missingEvaluations > 0 && <span className="ml-1 text-coral-ink">({row.missingEvaluations} pending)</span>}
                      </td>
                      <td className="px-5 py-4 text-right font-display text-xl font-bold tabular-nums">{row.average?.toFixed(2) ?? "Not scored"}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-ink-soft">Scores are weighted averages on a 0–10 scale. Ties go to the earlier final submission.</p>
          </section>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section className="tile p-5 sm:p-6" aria-labelledby="breakdown">
              <h2 id="breakdown" className="mb-4 text-xl font-bold">
                How the top teams scored
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="criterion" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} interval={0} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: "var(--ink)" }}>{v}</span>} />
                    {top3.map((t, i) => (
                      <Bar key={t.team.id} dataKey={t.team.name} fill={BAR_COLORS[i]} radius={[8, 8, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="tile p-5 sm:p-6" aria-labelledby="awards">
              <h2 id="awards" className="mb-4 text-xl font-bold">
                Awards
              </h2>
              <ul className="space-y-3">
                {r.awards.map((a) => (
                  <li key={a.award + a.teamId} className="flex gap-3">
                    <span className="clay grid size-10 shrink-0 place-items-center rounded-xl text-navy" style={{ ["--clay" as string]: "#FFC857" }}>
                      <Award className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm text-ink-soft">{a.award}</p>
                      <p className="font-semibold">{a.teamName}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
