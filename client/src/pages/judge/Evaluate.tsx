import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileDown, GitBranch, PlayCircle, Presentation, ShieldAlert } from "lucide-react";
import { api, apiUrl, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import type { Criterion, EventStage, Person, Problem, Submission } from "@/lib/types";
import { Avatar, Badge, Button, ErrorState, Field, FormError, Spinner, Textarea, Tile, TileHeader } from "@/components/ui";
import { Dialog } from "@/components/Dialog";
import { useToast } from "@/components/Toast";

interface Detail {
  assignment: { id: string; conflict: boolean; conflictNote: string | null };
  event: { id: string; title: string; stage: EventStage; resultsPublished: boolean };
  team: { id: string; name: string; pitch: string | null; members: Person[]; problem: Problem | null } | null;
  submission: (Submission & { attachmentPath?: string | null }) | null;
  criteria: Criterion[];
  evaluation: { scores: Record<string, number>; feedback: string; score: number; status: "DRAFT" | "SUBMITTED" } | null;
  canScore: boolean;
}

export default function Evaluate() {
  const { teamId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["evaluate", teamId], queryFn: () => api<Detail>(`/judging/assignments/${teamId}`) });
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (q.data?.evaluation) {
      setScores(q.data.evaluation.scores);
      setFeedback(q.data.evaluation.feedback);
    }
  }, [q.data?.evaluation]);

  const criteria = q.data?.criteria ?? [];
  const live = useMemo(() => {
    let num = 0;
    let den = 0;
    for (const c of criteria) if (typeof scores[c.id] === "number") {
      num += c.weight * scores[c.id];
      den += c.weight;
    }
    return den ? num / den : null;
  }, [scores, criteria]);
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0) || 1;

  const save = useMutation({
    mutationFn: (submit: boolean) => api(`/judging/evaluations/${teamId}`, { method: "PUT", body: { scores, feedback, submit } }),
    onSuccess: (_d, submit) => {
      qc.invalidateQueries({ queryKey: ["judging"] });
      qc.invalidateQueries({ queryKey: ["evaluate", teamId] });
      toast({ title: submit ? "Evaluation submitted" : "Draft saved", tone: "success" });
      if (submit) navigate("/app/judging");
    },
  });
  const conflict = useMutation({
    mutationFn: () => api(`/judging/assignments/${teamId}/conflict`, { body: { note } }),
    onSuccess: () => {
      qc.invalidateQueries();
      setConflictOpen(false);
      toast({ title: "Conflict declared", body: "Organizers were notified and can reassign the project.", tone: "info" });
    },
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} />;
  const d = q.data!;
  const s = d.submission;
  const err = save.error instanceof ApiError ? save.error : null;
  const conflictErr = conflict.error instanceof ApiError ? conflict.error : null;
  const links = s
    ? [
        { href: s.repoUrl, label: "Repository", icon: GitBranch },
        { href: s.demoUrl, label: "Live demo", icon: ExternalLink },
        { href: s.videoUrl, label: "Demo video", icon: PlayCircle },
        { href: s.slidesUrl, label: "Slides", icon: Presentation },
      ].filter((l) => l.href)
    : [];

  return (
    <>
      <Link to="/app/judging" className="text-sm font-semibold text-ink-soft hover:text-ink">
        Judging, {d.event.title}
      </Link>
      <h1 className="mt-1 text-4xl font-extrabold">{s?.title ?? d.team?.name}</h1>
      <p className="mt-1 text-ink-soft">by {d.team?.name}</p>

      {d.assignment.conflict && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-coral-tint p-4 font-medium text-coral-ink" role="status">
          <ShieldAlert className="size-5" aria-hidden /> You declared a conflict of interest: {d.assignment.conflictNote}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_24rem]">
        {/* Submission preview */}
        <div className="space-y-4">
          {!s ? (
            <Tile>
              <p className="text-ink-soft">This team hasn't made a final submission, so there's nothing to score.</p>
            </Tile>
          ) : (
            <>
              <Tile>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-mint-tint text-mint-ink">Final v{s.version}</Badge>
                  <span className="text-sm text-ink-soft">Submitted {fmtDateTime(s.submittedAt)}</span>
                </div>
                <h2 className="mt-4 text-lg font-bold">Summary</h2>
                <p className="mt-1 max-w-[70ch] whitespace-pre-line text-ink-soft">{s.summary}</p>
                {s.techStack && (
                  <p className="mt-4 text-sm">
                    <span className="font-semibold">Built with: </span>
                    {s.techStack}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {links.map(({ href, label, icon: Icon }) => (
                    <a key={label} href={href!} target="_blank" rel="noreferrer" className="neu inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-surface-2">
                      <Icon className="size-4" aria-hidden /> {label}
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ))}
                  {s.attachmentName && (
                    <a href={apiUrl(`/teams/${d.team!.id}/submissions/${s.id}/attachment`)} className="neu inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-surface-2">
                      <FileDown className="size-4" aria-hidden /> {s.attachmentName}
                    </a>
                  )}
                </div>
              </Tile>
              {d.team?.problem && (
                <Tile>
                  <TileHeader title={`Challenge ${d.team.problem.code}: ${d.team.problem.title}`} />
                  <p className="text-sm text-ink-soft">{d.team.problem.description}</p>
                  <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                    <span className="font-semibold">Expected output: </span>
                    {d.team.problem.expectedOutput}
                  </p>
                </Tile>
              )}
              <Tile>
                <TileHeader title="Team" />
                <ul className="flex flex-wrap gap-3">
                  {d.team?.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm">
                      <Avatar name={m.name} color={m.avatarColor} size={28} />
                      <span className="font-semibold">{m.name}</span>
                      {m.college && <span className="text-ink-soft">{m.college}</span>}
                    </li>
                  ))}
                </ul>
                {!d.assignment.conflict && (
                  <button className="mt-4 text-sm font-semibold text-coral-ink hover:underline" onClick={() => setConflictOpen(true)}>
                    I know this team personally (declare a conflict)
                  </button>
                )}
              </Tile>
            </>
          )}
        </div>

        {/* Scoring panel */}
        <aside className="glass self-start rounded-[var(--radius-tile)] p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-8">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold">Your scores</h2>
            <div className="text-right">
              <p className="text-xs font-semibold text-ink-soft">Weighted score</p>
              <p className="font-display text-3xl font-extrabold tabular-nums" aria-live="polite">
                {live === null ? "–" : live.toFixed(2)}
              </p>
            </div>
          </div>
          {!d.canScore && !d.assignment.conflict && (
            <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">{d.event.resultsPublished ? "Results are published, so scores are final." : "Scoring opens when organizers start judging."}</p>
          )}
          <FormError message={err && !err.fields ? err.message : null} />
          {err?.fields?.scores && <p className="mt-3 text-sm font-medium text-coral-ink">{err.fields.scores}</p>}
          <ul className="mt-4 space-y-5">
            {criteria.map((c) => {
              const v = scores[c.id];
              return (
                <li key={c.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor={`c-${c.id}`} className="font-semibold">
                      {c.name}
                    </label>
                    <span className="text-xs font-semibold text-ink-soft">{Math.round((c.weight / totalWeight) * 100)}% weight</span>
                  </div>
                  {c.description && <p className="text-xs text-ink-soft">{c.description}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id={`c-${c.id}`}
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={v ?? 5}
                      disabled={!d.canScore || !s}
                      onChange={(e) => setScores((sc) => ({ ...sc, [c.id]: Number(e.target.value) }))}
                      onPointerUp={(e) => v === undefined && setScores((sc) => ({ ...sc, [c.id]: Number(e.currentTarget.value) }))}
                      onClick={(e) => v === undefined && setScores((sc) => ({ ...sc, [c.id]: Number(e.currentTarget.value) }))}
                      onKeyUp={(e) => v === undefined && setScores((sc) => ({ ...sc, [c.id]: Number(e.currentTarget.value) }))}
                      className={cn("h-2 flex-1 cursor-pointer accent-violet-ink disabled:cursor-not-allowed", v === undefined && "opacity-40")}
                      aria-valuetext={v === undefined ? "Not scored" : `${v} out of 10`}
                    />
                    <span className={cn("w-10 text-right font-display text-lg font-bold tabular-nums", v === undefined && "text-ink-soft")}>{v ?? "–"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Field label="Feedback for the team" hint="At least 20 characters. Teams read this after results are published." error={err?.fields?.feedback} className="mt-5">
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} disabled={!d.canScore || !s} className="min-h-28" />
          </Field>
          <div className="mt-5 grid gap-2">
            <Button size="lg" disabled={!d.canScore || !s} loading={save.isPending && save.variables === true} onClick={() => save.mutate(true)}>
              {d.evaluation?.status === "SUBMITTED" ? "Update evaluation" : "Submit evaluation"}
            </Button>
            <Button variant="ghost" disabled={!d.canScore || !s} loading={save.isPending && save.variables === false} onClick={() => save.mutate(false)}>
              Save draft
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen} title="Declare a conflict of interest" description="You won't be able to score this team. Any draft scores are deleted and organizers are notified.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            conflict.mutate();
          }}
          className="space-y-4"
        >
          <Field label="What's the conflict?" error={conflictErr?.fields?.note}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} required className="min-h-20" placeholder="For example: I mentored this team before the event." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConflictOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={conflict.isPending}>
              Declare conflict
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
