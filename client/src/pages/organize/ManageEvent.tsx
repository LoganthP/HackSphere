import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Check, ExternalLink, Pencil, Pin, Plus, Shuffle, Trash2, Trophy, X } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtShort, relative, STAGE_LABEL, STAGES, toLocalInput } from "@/lib/format";
import type { Announcement, Criterion, EventSummary, Person, Problem, Registration, Submission } from "@/lib/types";
import { Avatar, AvatarStack, Badge, Button, ButtonLink, EmptyState, ErrorState, Field, FormError, Input, Progress, RegistrationBadge, Select, Spinner, StageBadge, Textarea, Tile, TileHeader, Toggle } from "@/components/ui";
import { Tabs, TabPanel } from "@/components/Tabs";
import { Dialog } from "@/components/Dialog";
import { useToast } from "@/components/Toast";

interface TeamRow {
  id: string;
  name: string;
  leaderId: string;
  members: (Person & { isLeader: boolean })[];
  registration: Registration | null;
  problem: { id: string; code: string; title: string } | null;
  latestSubmission: Submission | null;
  deadlineExtension: string | null;
  judges: { assignmentId: string; id: string; name: string; conflict: boolean; conflictNote: string | null }[];
}

interface Manage {
  event: EventSummary;
  problems: Problem[];
  criteria: Criterion[];
  criteriaLocked: boolean;
  teams: TeamRow[];
  judges: (Person & { assigned: number; completed: number })[];
  organizers: Person[];
  announcements: Announcement[];
  stats: {
    teams: number;
    participants: number;
    registrations: { pending: number; approved: number; rejected: number };
    finalSubmissions: number;
    judging: { assigned: number; completed: number };
    registrationTimeline: { day: string; count: number }[];
  };
}

const tooltipStyle = { borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" };

export default function ManageEvent() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const q = useQuery({ queryKey: ["manage", id], queryFn: () => api<Manage>(`/manage/events/${id}`) });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const m = q.data!;
  const e = m.event;

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/app/organize" className="text-sm font-semibold text-ink-soft hover:text-ink">
            Organize
          </Link>
          <h1 className="mt-1 text-4xl font-extrabold">{e.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StageBadge stage={e.stage} />
            {e.resultsPublished && <Badge className="bg-sun-soft text-sun-deep">Results published</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={`/hackathons/${e.slug}`} variant="secondary" size="sm">
            <ExternalLink className="size-4" aria-hidden /> Public page
          </ButtonLink>
          <ButtonLink to={`/app/organize/${e.id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit details
          </ButtonLink>
        </div>
      </header>

      <StageControl m={m} />

      <Tabs
        id="manage"
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "registrations", label: "Registrations", count: m.stats.registrations.pending },
          { value: "challenges", label: "Challenges" },
          { value: "judging", label: "Judging", count: m.teams.flatMap((t) => t.judges).filter((j) => j.conflict).length },
          { value: "announcements", label: "Announcements" },
          { value: "results", label: "Results" },
        ]}
      >
        <TabPanel value="overview">
          <Overview m={m} />
        </TabPanel>
        <TabPanel value="registrations">
          <Registrations m={m} />
        </TabPanel>
        <TabPanel value="challenges">
          <Challenges m={m} />
        </TabPanel>
        <TabPanel value="judging">
          <Judging m={m} />
        </TabPanel>
        <TabPanel value="announcements">
          <Announcements m={m} />
        </TabPanel>
        <TabPanel value="results">
          <ResultsTab m={m} />
        </TabPanel>
      </Tabs>
    </>
  );
}

function useRefresh(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["manage", id] });
    qc.invalidateQueries({ queryKey: ["events"] });
  };
}

/* ---------------- Stage stepper ---------------- */

function StageControl({ m }: { m: Manage }) {
  const toast = useToast();
  const refresh = useRefresh(m.event.id);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<string | null>(null);
  const current = STAGES.indexOf(m.event.stage);
  const move = useMutation({
    mutationFn: (stage: string) => api(`/events/${m.event.id}/stage`, { body: { stage } }),
    onSuccess: (_d, stage) => {
      refresh();
      setConfirm(null);
      toast({ title: `Moved to ${STAGE_LABEL[stage as keyof typeof STAGE_LABEL]}`, body: "Participants were notified.", tone: "success" });
    },
    onError: (e) => {
      setConfirm(null);
      toast({ title: e.message, tone: "error" });
    },
  });
  const del = useMutation({
    mutationFn: () => api(`/events/${m.event.id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      navigate("/app/organize");
    },
  });
  const next = STAGES[current + 1];

  return (
    <section className="tile mb-6 p-4 sm:p-5" aria-label="Hackathon stage">
      <ol className="scrollbar-none flex gap-1 overflow-x-auto">
        {STAGES.map((s, i) => (
          <li key={s} className="flex min-w-28 flex-1 flex-col gap-2">
            <span className={cn("h-2 rounded-full", i <= current ? "bg-violet" : "bg-surface-2")} aria-hidden />
            <span className={cn("text-xs font-semibold", i === current ? "text-ink" : "text-ink-soft")}>
              {STAGE_LABEL[s]}
              {i === current && <span className="sr-only"> (current)</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next && (
          <Button size="sm" onClick={() => setConfirm(next)}>
            Move to {STAGE_LABEL[next].toLowerCase()}
          </Button>
        )}
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <span>or set stage</span>
          <Select className="h-9 w-auto text-sm" value={m.event.stage} onChange={(e) => setConfirm(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        {m.event.stage === "DRAFT" && (
          <Button size="sm" variant="ghost" className="ml-auto text-coral-deep" onClick={() => del.mutate()} loading={del.isPending}>
            <Trash2 className="size-4" aria-hidden /> Delete draft
          </Button>
        )}
      </div>
      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={`Move to ${confirm ? STAGE_LABEL[confirm as keyof typeof STAGE_LABEL].toLowerCase() : ""}?`} description="Team members, and anyone who saved this hackathon, get a notification.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button loading={move.isPending} onClick={() => confirm && move.mutate(confirm)}>
            Confirm
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ m }: { m: Manage }) {
  const s = m.stats;
  const distribution = m.problems.map((p) => ({ name: p.code, selected: p.selectedCount ?? 0, submitted: p.submittedCount ?? 0 }));
  const timeline = s.registrationTimeline.map((t) => ({ day: fmtShort(t.day), count: t.count }));
  const tiles = [
    { n: s.teams, label: "Teams", clay: "#FFC857" },
    { n: s.participants, label: "Participants", clay: "#3DCFAE" },
    { n: s.registrations.approved, label: "Approved teams", clay: "#9C8CFF" },
    { n: s.finalSubmissions, label: "Final submissions", clay: "#FF9AAC" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="clay rounded-[1.5rem] p-5 text-navy" style={{ ["--clay" as string]: t.clay }}>
            <p className="font-display text-4xl font-extrabold tabular-nums">{t.n}</p>
            <p className="text-sm font-semibold">{t.label}</p>
          </div>
        ))}
      </div>
      <Tile className="lg:col-span-2">
        <TileHeader title="Registrations over time" />
        {timeline.length === 0 ? (
          <p className="text-sm text-ink-soft">No registrations yet.</p>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ left: -24, right: 8 }}>
                <defs>
                  <linearGradient id="reg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7058F5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7058F5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" name="Registrations" stroke="#5A41E6" strokeWidth={2.5} fill="url(#reg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Tile>
      <Tile>
        <TileHeader title="Review queue" />
        <dl className="space-y-3">
          {[
            ["Pending", s.registrations.pending, "bg-sun"],
            ["Approved", s.registrations.approved, "bg-mint"],
            ["Declined", s.registrations.rejected, "bg-coral"],
          ].map(([l, n, c]) => (
            <div key={l as string} className="flex items-center gap-3">
              <span className={cn("size-3 rounded-full", c as string)} aria-hidden />
              <dt className="flex-1">{l}</dt>
              <dd className="font-display text-xl font-bold">{n}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">Judging progress</p>
          <Progress value={s.judging.completed} max={s.judging.assigned || 1} tone="coral" label="Judging progress" />
          <p className="mt-1.5 text-sm text-ink-soft">
            {s.judging.completed} of {s.judging.assigned} evaluations submitted
          </p>
        </div>
      </Tile>
      <Tile className="lg:col-span-3">
        <TileHeader title="Teams per challenge" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ left: -24, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: "var(--ink)" }}>{v}</span>} />
              <Bar dataKey="selected" name="Teams that chose it" fill="#7058F5" radius={[8, 8, 0, 0]} maxBarSize={56} />
              <Bar dataKey="submitted" name="Final submissions" fill="#3DCFAE" radius={[8, 8, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Tile>
      <Tile className="lg:col-span-3">
        <TileHeader title="Organizers" />
        <OrganizersEditor m={m} />
      </Tile>
    </div>
  );
}

function OrganizersEditor({ m }: { m: Manage }) {
  const refresh = useRefresh(m.event.id);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const add = useMutation({
    mutationFn: () => api(`/manage/events/${m.event.id}/organizers`, { body: { email } }),
    onSuccess: () => {
      setEmail("");
      refresh();
      toast({ title: "Co-organizer added", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <ul className="flex flex-1 flex-wrap gap-3">
        {m.organizers.map((o) => (
          <li key={o.id} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm font-semibold">
            <Avatar name={o.name} color={o.avatarColor} size={28} /> {o.name}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <label>
          <span className="sr-only">Co-organizer email</span>
          <Input type="email" placeholder="Add co-organizer by email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-64" />
        </label>
        <Button type="submit" variant="soft" size="icon" loading={add.isPending} aria-label="Add co-organizer">
          {!add.isPending && <Plus className="size-5" />}
        </Button>
      </form>
    </div>
  );
}

/* ---------------- Registrations ---------------- */

function Registrations({ m }: { m: Manage }) {
  const refresh = useRefresh(m.event.id);
  const toast = useToast();
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED" | "NONE">("PENDING");
  const [declining, setDeclining] = useState<TeamRow | null>(null);
  const [note, setNote] = useState("");
  const [extending, setExtending] = useState<TeamRow | null>(null);
  const [until, setUntil] = useState("");

  const review = useMutation({
    mutationFn: ({ rid, status, note }: { rid: string; status: string; note?: string }) => api(`/manage/registrations/${rid}/review`, { body: { status, note } }),
    onSuccess: (_d, v) => {
      refresh();
      setDeclining(null);
      setNote("");
      toast({ title: v.status === "APPROVED" ? "Team approved" : v.status === "REJECTED" ? "Registration declined" : "Moved back to pending", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const extend = useMutation({
    mutationFn: ({ teamId, until }: { teamId: string; until: string | null }) => api(`/manage/teams/${teamId}/extension`, { body: { until } }),
    onSuccess: () => {
      refresh();
      setExtending(null);
      toast({ title: "Deadline updated", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });

  const rows = m.teams.filter((t) => (filter === "ALL" ? true : filter === "NONE" ? !t.registration : t.registration?.status === filter));
  const counts = {
    ALL: m.teams.length,
    PENDING: m.stats.registrations.pending,
    APPROVED: m.stats.registrations.approved,
    REJECTED: m.stats.registrations.rejected,
    NONE: m.teams.filter((t) => !t.registration).length,
  };
  const labels = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Declined", NONE: "Not applied", ALL: "All teams" } as const;

  return (
    <>
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto" role="group" aria-label="Filter teams">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", filter === k ? "bg-navy text-white dark:bg-white dark:text-navy" : "neu text-ink-soft")}>
            {labels[k]} ({counts[k]})
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No teams here" body={filter === "PENDING" ? "You're all caught up on reviews." : "Try another filter."} />
      ) : (
        <ul className="space-y-3">
          {rows.map((t) => {
            const size = t.members.length;
            const sizeOk = size >= m.event.minTeamSize && size <= m.event.maxTeamSize;
            return (
              <li key={t.id} className="tile p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold">{t.name}</p>
                      <RegistrationBadge status={t.registration?.status} />
                      {t.problem && <Badge className="bg-surface-2 text-ink-soft">{t.problem.code}</Badge>}
                      {t.latestSubmission?.isFinal && <Badge className="bg-mint-soft text-mint-deep">Submitted v{t.latestSubmission.version}</Badge>}
                      {t.deadlineExtension && <Badge className="bg-blue-soft text-blue-deep">Extended to {fmtDateTime(t.deadlineExtension)}</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                      <AvatarStack people={t.members} size={26} />
                      <span>{t.members.map((x) => x.name).join(", ")}</span>
                    </div>
                    {!sizeOk && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-coral-deep">
                        <AlertTriangle className="size-4" aria-hidden /> {size} members, outside the {m.event.minTeamSize}–{m.event.maxTeamSize} limit
                      </p>
                    )}
                    {t.registration?.note && <p className="mt-1 text-sm text-ink-soft">Note: {t.registration.note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.registration && t.registration.status !== "APPROVED" && (
                      <Button size="sm" onClick={() => review.mutate({ rid: t.registration!.id, status: "APPROVED" })}>
                        <Check className="size-4" aria-hidden /> Approve
                      </Button>
                    )}
                    {t.registration && t.registration.status !== "REJECTED" && (
                      <Button size="sm" variant="danger" onClick={() => setDeclining(t)}>
                        <X className="size-4" aria-hidden /> Decline
                      </Button>
                    )}
                    {t.registration?.status === "APPROVED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setExtending(t);
                          setUntil(toLocalInput(t.deadlineExtension ?? new Date(new Date(m.event.submissionDeadline).getTime() + 2 * 36e5)));
                        }}
                      >
                        <CalendarClock className="size-4" aria-hidden /> Extension
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!declining} onOpenChange={() => setDeclining(null)} title={`Decline ${declining?.name}?`} description="The team sees your note and can apply again while registration is open.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            declining?.registration && review.mutate({ rid: declining.registration.id, status: "REJECTED", note });
          }}
          className="space-y-4"
        >
          <Field label="Reason for the team" optional>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-20" placeholder="For example: one member isn't an enrolled student." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeclining(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={review.isPending}>
              Decline registration
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!extending} onOpenChange={() => setExtending(null)} title={`Deadline extension for ${extending?.name}`} description={`The regular deadline is ${fmtDateTime(m.event.submissionDeadline)}.`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            extending && extend.mutate({ teamId: extending.id, until: new Date(until).toISOString() });
          }}
          className="space-y-4"
        >
          <Field label="New deadline for this team">
            <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} required />
          </Field>
          <div className="flex justify-between gap-2">
            {extending?.deadlineExtension ? (
              <Button type="button" variant="ghost" onClick={() => extend.mutate({ teamId: extending.id, until: null })}>
                Remove extension
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={extend.isPending}>
              Grant extension
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/* ---------------- Challenges ---------------- */

const EMPTY_P = { code: "", title: "", category: "", difficulty: "MEDIUM", description: "", expectedOutput: "", resources: "", selectionLimit: "" };

function Challenges({ m }: { m: Manage }) {
  const refresh = useRefresh(m.event.id);
  const toast = useToast();
  const [editing, setEditing] = useState<Problem | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_P);
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, resources: form.resources || null, selectionLimit: form.selectionLimit ? Number(form.selectionLimit) : null };
      return editing === "new" ? api(`/manage/events/${m.event.id}/problems`, { body }) : api(`/manage/problems/${(editing as Problem).id}`, { method: "PATCH", body });
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast({ title: "Problem statement saved", tone: "success" });
    },
  });
  const del = useMutation({
    mutationFn: (pid: string) => api(`/manage/problems/${pid}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const open = (p: Problem | "new") => {
    save.reset();
    setEditing(p);
    setForm(
      p === "new"
        ? { ...EMPTY_P, code: `${m.event.title.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}-${String(m.problems.length + 1).padStart(2, "0")}` }
        : { code: p.code, title: p.title, category: p.category, difficulty: p.difficulty, description: p.description, expectedOutput: p.expectedOutput, resources: p.resources ?? "", selectionLimit: p.selectionLimit ? String(p.selectionLimit) : "" },
    );
  };
  const err = save.error instanceof ApiError ? save.error : null;
  const fe = err?.fields ?? {};
  const set = (k: keyof typeof EMPTY_P) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open("new")}>
          <Plus className="size-4" aria-hidden /> Add problem statement
        </Button>
      </div>
      {m.problems.length === 0 ? (
        <EmptyState title="No problem statements yet" body="Add at least one before you publish the hackathon." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {m.problems.map((p) => (
            <li key={p.id} className="tile p-5">
              <div className="flex items-center gap-2">
                <Badge className="bg-navy text-white dark:bg-white dark:text-navy">{p.code}</Badge>
                <Badge className="bg-surface-2 text-ink-soft">{p.difficulty.toLowerCase()}</Badge>
                <div className="ml-auto flex gap-1">
                  <button className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-2" onClick={() => open(p)} aria-label={`Edit ${p.code}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button className="rounded-lg p-1.5 text-ink-soft hover:bg-coral-soft hover:text-coral-deep" onClick={() => del.mutate(p.id)} aria-label={`Delete ${p.code}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 font-bold">{p.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.description}</p>
              <p className="mt-3 text-sm">
                <span className="font-semibold">{p.selectedCount}</span> selected, <span className="font-semibold">{p.submittedCount}</span> submitted
                {p.selectionLimit ? `, limit ${p.selectionLimit}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)} title={editing === "new" ? "New problem statement" : "Edit problem statement"} className="sm:max-w-2xl">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {err && !err.fields && <FormError message={err.message} />}
          <Field label="ID" error={fe.code}>
            <Input value={form.code} onChange={set("code")} required maxLength={16} />
          </Field>
          <Field label="Difficulty">
            <Select value={form.difficulty} onChange={set("difficulty")}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </Select>
          </Field>
          <Field label="Title" error={fe.title} className="sm:col-span-2">
            <Input value={form.title} onChange={set("title")} required />
          </Field>
          <Field label="Category" error={fe.category}>
            <Input value={form.category} onChange={set("category")} required />
          </Field>
          <Field label="Team limit" optional hint="Max teams that can pick it." error={fe.selectionLimit}>
            <Input type="number" min={1} value={form.selectionLimit} onChange={set("selectionLimit")} />
          </Field>
          <Field label="Challenge description" error={fe.description} className="sm:col-span-2">
            <Textarea value={form.description} onChange={set("description")} required />
          </Field>
          <Field label="Expected output" error={fe.expectedOutput} className="sm:col-span-2">
            <Textarea value={form.expectedOutput} onChange={set("expectedOutput")} required className="min-h-20" />
          </Field>
          <Field label="Resources" optional className="sm:col-span-2">
            <Textarea value={form.resources} onChange={set("resources")} className="min-h-20" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={save.isPending} className="w-full">
              Save problem statement
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/* ---------------- Judging ---------------- */

function Judging({ m }: { m: Manage }) {
  const refresh = useRefresh(m.event.id);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [crit, setCrit] = useState({ name: "", weight: "1", description: "" });
  const [perTeam, setPerTeam] = useState("2");
  const onErr = (e: Error) => toast({ title: e.message, tone: "error" });

  const addJudge = useMutation({
    mutationFn: () => api(`/manage/events/${m.event.id}/judges`, { body: { email } }),
    onSuccess: () => {
      setEmail("");
      refresh();
      toast({ title: "Judge added", tone: "success" });
    },
    onError: onErr,
  });
  const removeJudge = useMutation({ mutationFn: (uid: string) => api(`/manage/events/${m.event.id}/judges/${uid}`, { method: "DELETE" }), onSuccess: refresh });
  const auto = useMutation({
    mutationFn: () => api<{ created: number }>(`/manage/events/${m.event.id}/assignments/auto`, { body: { perTeam: Number(perTeam) } }),
    onSuccess: (d) => {
      refresh();
      toast({ title: d.created ? `${d.created} assignments created` : "Every approved team already has enough judges", tone: "success" });
    },
    onError: onErr,
  });
  const assign = useMutation({ mutationFn: (b: { judgeId: string; teamId: string }) => api(`/manage/events/${m.event.id}/assignments`, { body: b }), onSuccess: refresh, onError: onErr });
  const unassign = useMutation({ mutationFn: (aid: string) => api(`/manage/assignments/${aid}`, { method: "DELETE" }), onSuccess: refresh });
  const addCrit = useMutation({
    mutationFn: () => api(`/manage/events/${m.event.id}/criteria`, { body: { name: crit.name, weight: Number(crit.weight), description: crit.description || null } }),
    onSuccess: () => {
      setCrit({ name: "", weight: "1", description: "" });
      refresh();
    },
    onError: onErr,
  });
  const updCrit = useMutation({ mutationFn: ({ cid, weight }: { cid: string; weight: number }) => api(`/manage/criteria/${cid}`, { method: "PATCH", body: { weight } }), onSuccess: refresh, onError: onErr });
  const delCrit = useMutation({ mutationFn: (cid: string) => api(`/manage/criteria/${cid}`, { method: "DELETE" }), onSuccess: refresh, onError: onErr });

  const total = m.criteria.reduce((a, c) => a + c.weight, 0) || 1;
  const approved = m.teams.filter((t) => t.registration?.status === "APPROVED");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Tile>
        <TileHeader title="Rubric" action={m.criteriaLocked && <Badge className="bg-surface-2 text-ink-soft">Locked, scoring started</Badge>} />
        <ul className="space-y-3">
          {m.criteria.map((c) => (
            <li key={c.id} className="rounded-2xl bg-surface-2 p-3">
              <div className="flex items-center gap-3">
                <p className="flex-1 font-semibold">{c.name}</p>
                <label className="flex items-center gap-1.5 text-sm text-ink-soft">
                  Weight
                  <Input
                    type="number"
                    step="0.25"
                    min="0.1"
                    max="10"
                    defaultValue={c.weight}
                    disabled={m.criteriaLocked}
                    className="h-9 w-20"
                    onBlur={(e) => Number(e.target.value) !== c.weight && updCrit.mutate({ cid: c.id, weight: Number(e.target.value) })}
                  />
                </label>
                {!m.criteriaLocked && (
                  <button className="rounded-lg p-1.5 text-ink-soft hover:text-coral-deep" onClick={() => delCrit.mutate(c.id)} aria-label={`Remove ${c.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <Progress className="mt-2" value={c.weight} max={total} label={`${c.name} share`} />
              <p className="mt-1 text-xs text-ink-soft">{Math.round((c.weight / total) * 100)}% of the final score</p>
            </li>
          ))}
        </ul>
        {!m.criteriaLocked && (
          <form
            className="mt-4 grid grid-cols-[1fr_5rem_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addCrit.mutate();
            }}
          >
            <label>
              <span className="sr-only">Criterion name</span>
              <Input placeholder="New criterion" value={crit.name} onChange={(e) => setCrit((c) => ({ ...c, name: e.target.value }))} required />
            </label>
            <label>
              <span className="sr-only">Weight</span>
              <Input type="number" step="0.25" min="0.1" value={crit.weight} onChange={(e) => setCrit((c) => ({ ...c, weight: e.target.value }))} required />
            </label>
            <Button type="submit" variant="soft" size="icon" aria-label="Add criterion">
              <Plus className="size-5" />
            </Button>
          </form>
        )}
      </Tile>

      <Tile>
        <TileHeader title="Judges" />
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addJudge.mutate();
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Judge email</span>
            <Input type="email" placeholder="judge@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <Button type="submit" loading={addJudge.isPending}>
            Add judge
          </Button>
        </form>
        {m.judges.length === 0 ? (
          <p className="text-sm text-ink-soft">Judges need a HackSphere account. Add them by email.</p>
        ) : (
          <ul className="space-y-3">
            {m.judges.map((j) => (
              <li key={j.id} className="flex items-center gap-3">
                <Avatar name={j.name} color={j.avatarColor} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{j.name}</p>
                  <p className="text-xs text-ink-soft">
                    {j.completed} of {j.assigned} evaluated
                  </p>
                </div>
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-coral-soft hover:text-coral-deep" onClick={() => removeJudge.mutate(j.id)} aria-label={`Remove ${j.name}`}>
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile className="lg:col-span-2">
        <TileHeader
          title="Assignments"
          action={
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                Judges per team
                <Select className="h-9 w-20" value={perTeam} onChange={(e) => setPerTeam(e.target.value)}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </Select>
              </label>
              <Button size="sm" variant="soft" onClick={() => auto.mutate()} loading={auto.isPending}>
                <Shuffle className="size-4" aria-hidden /> Auto-assign
              </Button>
            </div>
          }
        />
        <p className="mb-4 text-sm text-ink-soft">Auto-assign balances the load across judges and never assigns a judge to a team they belong to.</p>
        {approved.length === 0 ? (
          <p className="text-sm text-ink-soft">Approve teams first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-semibold">Team</th>
                  <th className="py-2 pr-4 font-semibold">Assigned judges</th>
                  <th className="py-2 font-semibold">Add</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((t) => {
                  const available = m.judges.filter((j) => !t.judges.some((x) => x.id === j.id) && !t.members.some((x) => x.id === j.id));
                  return (
                    <tr key={t.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-4 font-semibold">{t.name}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          {t.judges.length === 0 && <span className="text-ink-soft">None</span>}
                          {t.judges.map((j) => (
                            <span key={j.assignmentId} className={cn("inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-semibold", j.conflict ? "bg-coral-soft text-coral-deep" : "bg-surface-2")} title={j.conflictNote ?? undefined}>
                              {j.name}
                              {j.conflict && " (conflict)"}
                              <button className="rounded-full p-0.5 hover:bg-white/60" onClick={() => unassign.mutate(j.assignmentId)} aria-label={`Unassign ${j.name}`}>
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <label>
                          <span className="sr-only">Assign a judge to {t.name}</span>
                          <Select className="h-9 w-44 text-sm" value="" disabled={!available.length} onChange={(e) => e.target.value && assign.mutate({ judgeId: e.target.value, teamId: t.id })}>
                            <option value="">{available.length ? "Choose judge" : "No judges left"}</option>
                            {available.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.name}
                              </option>
                            ))}
                          </Select>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </div>
  );
}

/* ---------------- Announcements ---------------- */

function Announcements({ m }: { m: Manage }) {
  const refresh = useRefresh(m.event.id);
  const toast = useToast();
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const post = useMutation({
    mutationFn: () => api(`/events/${m.event.id}/announcements`, { body: form }),
    onSuccess: () => {
      setForm({ title: "", body: "", pinned: false });
      refresh();
      toast({ title: "Announcement posted", body: "Every participant and judge was notified.", tone: "success" });
    },
  });
  const del = useMutation({ mutationFn: (aid: string) => api(`/events/${m.event.id}/announcements/${aid}`, { method: "DELETE" }), onSuccess: refresh });
  const err = post.error instanceof ApiError ? post.error : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Tile className="self-start">
        <TileHeader title="Post an update" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            post.mutate();
          }}
          className="space-y-4"
        >
          {err && !err.fields && <FormError message={err.message} />}
          <Field label="Title" error={err?.fields?.title}>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required maxLength={120} />
          </Field>
          <Field label="Message" error={err?.fields?.body}>
            <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required maxLength={2000} />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Pin to the top</span>
            <Toggle checked={form.pinned} onChange={(v) => setForm((f) => ({ ...f, pinned: v }))} label="Pin to the top" />
          </div>
          <Button type="submit" loading={post.isPending} className="w-full">
            Post and notify everyone
          </Button>
        </form>
      </Tile>
      <div>
        {m.announcements.length === 0 ? (
          <EmptyState title="No announcements yet" body="Updates you post show on the public page and as live notifications." />
        ) : (
          <ul className="space-y-3">
            {m.announcements.map((a) => (
              <li key={a.id} className={cn("tile p-5", a.pinned && "border-sun")}>
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  {a.pinned && <Pin className="size-4 text-sun-deep" aria-label="Pinned" />}
                  {relative(a.createdAt)}
                  <button className="ml-auto rounded-lg p-1.5 hover:bg-coral-soft hover:text-coral-deep" onClick={() => del.mutate(a.id)} aria-label={`Delete ${a.title}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-1 font-bold">{a.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Results ---------------- */

function ResultsTab({ m }: { m: Manage }) {
  const refresh = useRefresh(m.event.id);
  const qc = useQueryClient();
  const toast = useToast();
  const publish = useMutation({
    mutationFn: (p: boolean) => api(`/events/${m.event.id}/results/publish`, { body: { publish: p } }),
    onSuccess: (_d, p) => {
      refresh();
      qc.invalidateQueries({ queryKey: ["results"] });
      toast({ title: p ? "Results published" : "Results hidden", body: p ? "Participants were notified." : undefined, tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const j = m.stats.judging;
  const missing = j.assigned - j.completed;
  const canPublish = ["JUDGING", "COMPLETED"].includes(m.event.stage);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="clay rounded-[var(--radius-tile)] p-6 text-navy" style={{ ["--clay" as string]: m.event.resultsPublished ? "#3DCFAE" : "#FFC857" }}>
        <Trophy className="size-8" aria-hidden />
        <h2 className="mt-3 text-2xl font-bold">{m.event.resultsPublished ? "Results are public" : "Results are private"}</h2>
        <p className="mt-1 text-sm font-medium text-navy/80">
          {m.event.resultsPublished ? "Anyone can see the leaderboard. Teams can read judge feedback in their workspace." : "Only organizers can preview rankings until you publish them."}
        </p>
        {missing > 0 && !m.event.resultsPublished && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="size-4" aria-hidden /> {missing} evaluation{missing === 1 ? " is" : "s are"} still missing.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {m.event.resultsPublished ? (
            <Button variant="secondary" className="border-0 bg-white/85 text-navy shadow-none" onClick={() => publish.mutate(false)} loading={publish.isPending}>
              Hide results
            </Button>
          ) : (
            <Button onClick={() => publish.mutate(true)} loading={publish.isPending} disabled={!canPublish}>
              Publish results
            </Button>
          )}
          <ButtonLink to={`/hackathons/${m.event.slug}/results`} variant="secondary" className="border-0 bg-white/85 text-navy shadow-none">
            {m.event.resultsPublished ? "View leaderboard" : "Preview leaderboard"}
          </ButtonLink>
        </div>
        {!canPublish && <p className="mt-3 text-sm font-semibold">Move the hackathon to judging before publishing.</p>}
      </div>
      <Tile>
        <TileHeader title="Evaluation progress" />
        <Progress value={j.completed} max={j.assigned || 1} tone="mint" label="Evaluations completed" />
        <p className="mt-2 text-sm text-ink-soft">
          {j.completed} of {j.assigned} assigned evaluations submitted.
        </p>
        <ul className="mt-5 space-y-2">
          {m.judges.map((jd) => (
            <li key={jd.id} className="flex items-center gap-3 text-sm">
              <Avatar name={jd.name} color={jd.avatarColor} size={28} />
              <span className="flex-1 font-semibold">{jd.name}</span>
              <span className={cn("font-semibold", jd.completed >= jd.assigned ? "text-mint-deep" : "text-ink-soft")}>
                {jd.completed}/{jd.assigned}
              </span>
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  );
}
