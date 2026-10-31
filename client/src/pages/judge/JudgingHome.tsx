import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, Gavel, PenLine, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { EventStage } from "@/lib/types";
import { Badge, EmptyState, ErrorState, PageHeader, Progress, Spinner, StageBadge } from "@/components/ui";

interface Assignment {
  id: string;
  conflict: boolean;
  event: { id: string; title: string; slug: string; stage: EventStage; accentColor: string; resultsPublished: boolean };
  team: { id: string; name: string; problem: { code: string; title: string } | null };
  submission: { id: string; title: string; submittedAt: string; version: number } | null;
  evaluation: { status: "DRAFT" | "SUBMITTED"; score: number } | null;
}

export default function JudgingHome() {
  const q = useQuery({ queryKey: ["judging"], queryFn: () => api<{ assignments: Assignment[] }>("/judging/assignments") });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} />;
  const all = q.data!.assignments;
  const groups = new Map<string, Assignment[]>();
  for (const a of all) groups.set(a.event.id, [...(groups.get(a.event.id) ?? []), a]);

  return (
    <>
      <PageHeader title="Judging" description="Projects assigned to you. Score each criterion from 0 to 10 and leave feedback the team will read after results are published." />
      {all.length === 0 ? (
        <EmptyState icon={<Gavel className="size-6" />} title="No projects assigned yet" body="Organizers assign projects once teams are approved." />
      ) : (
        <div className="space-y-8">
          {[...groups.values()].map((list) => {
            const ev = list[0].event;
            const active = list.filter((a) => !a.conflict);
            const done = active.filter((a) => a.evaluation?.status === "SUBMITTED").length;
            return (
              <section key={ev.id} aria-labelledby={`ev-${ev.id}`}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="clay size-4 rounded-full" style={{ ["--clay" as string]: ev.accentColor }} aria-hidden />
                  <h2 id={`ev-${ev.id}`} className="text-xl font-bold">
                    {ev.title}
                  </h2>
                  <StageBadge stage={ev.stage} />
                  <span className="ml-auto text-sm font-semibold text-ink-soft">
                    {done}/{active.length} evaluated
                  </span>
                </div>
                <Progress value={done} max={active.length || 1} tone="coral" label={`${ev.title} progress`} className="mb-4" />
                {ev.stage !== "JUDGING" && !ev.resultsPublished && <p className="mb-3 rounded-xl bg-surface-2 p-3 text-sm">Scoring opens when the organizers move this hackathon to judging. You can already review submissions.</p>}
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((a) => {
                    const status = a.conflict ? "conflict" : a.evaluation?.status === "SUBMITTED" ? "done" : a.evaluation ? "draft" : "todo";
                    const meta = {
                      conflict: { icon: ShieldAlert, label: "Conflict declared", cls: "bg-coral-tint text-coral-ink" },
                      done: { icon: CheckCircle2, label: `Submitted, ${a.evaluation?.score.toFixed(2)}`, cls: "bg-mint-tint text-mint-ink" },
                      draft: { icon: PenLine, label: "Draft saved", cls: "bg-sun-tint text-sun-ink" },
                      todo: { icon: CircleDashed, label: "Not started", cls: "bg-surface-2 text-ink-soft" },
                    }[status];
                    const Icon = meta.icon;
                    return (
                      <li key={a.id}>
                        <Link to={`/app/judging/${a.team.id}`} className={cn("tile hover-lift block p-5", a.conflict && "opacity-70")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-display text-lg font-bold">{a.submission?.title ?? a.team.name}</p>
                              <p className="text-sm text-ink-soft">{a.team.name}</p>
                            </div>
                            {a.team.problem && <Badge className="bg-surface-2 text-ink-soft">{a.team.problem.code}</Badge>}
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <Badge className={meta.cls}>
                              <Icon className="size-3.5" aria-hidden /> {meta.label}
                            </Badge>
                            {!a.submission && <span className="text-xs text-ink-soft">No final submission</span>}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
