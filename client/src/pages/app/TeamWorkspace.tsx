import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Circle, Crown, Download, FileUp, Lock, Plus, Trash2, UserPlus, X } from "lucide-react";
import { api, apiUrl, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime, relative } from "@/lib/format";
import type { Criterion, EventSummary, Invitation, Milestone, Person, Problem, Project, Registration } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";
import { Avatar, Badge, Button, EmptyState, ErrorState, Field, FormError, Input, Progress, RegistrationBadge, Spinner, StageBadge, Textarea, Tile, TileHeader, Toggle } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { Dialog } from "@/components/Dialog";
import { Tabs, TabPanel } from "@/components/Tabs";
import { Confetti } from "@/components/Confetti";
import { useToast } from "@/components/Toast";

interface Workspace {
  team: {
    id: string;
    name: string;
    pitch: string | null;
    lookingForMembers: boolean;
    leaderId: string;
    problemId: string | null;
    deadlineExtension: string | null;
    event: EventSummary & { problems: Problem[]; criteria: Criterion[] };
    members: { id: string; userId: string; isLeader: boolean; user: Person }[];
    registration: Registration | null;
    problem: Problem | null;
    project: Project | null;
    invitations: Invitation[];
  };
  feedback: string[];
  permissions: { isLeader: boolean; isMember: boolean; isManager: boolean };
  deadline: string;
  submissionOpen: boolean;
}

export default function TeamWorkspace() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState("overview");
  const [celebrate, setCelebrate] = useState(false);
  const q = useQuery({ queryKey: ["team", id], queryFn: () => api<Workspace>(`/teams/${id}`) });

  const party = () => {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 2000);
  };

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const w = q.data!;
  const { team } = w;
  const ev = team.event;
  const pendingRequests = team.invitations.filter((i) => i.kind === "REQUEST").length;

  return (
    <>
      <Confetti show={celebrate} />
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={`/hackathons/${ev.slug}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
            {ev.title}
          </Link>
          <h1 className="mt-1 text-4xl font-extrabold">{team.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StageBadge stage={ev.stage} />
            <RegistrationBadge status={team.registration?.status} />
            {w.permissions.isLeader && <Badge className="bg-sun-tint text-sun-ink">You lead this team</Badge>}
            {w.permissions.isManager && !w.permissions.isMember && <Badge className="bg-blue-tint text-blue-ink">Organizer view</Badge>}
          </div>
        </div>
        {ev.stage !== "COMPLETED" && (
          <div className="glass rounded-[var(--radius-panel)] px-5 py-3">
            <p className="text-sm font-semibold text-ink-soft">{w.submissionOpen ? "Submissions close in" : new Date(w.deadline) < new Date() ? "Submissions closed" : "Submission deadline"}</p>
            {new Date(w.deadline) > new Date() ? <Countdown to={w.deadline} compact className="font-display text-2xl font-bold" /> : <p className="font-display text-xl font-bold">{fmtDateTime(w.deadline)}</p>}
            {team.deadlineExtension && <p className="text-xs font-semibold text-mint-ink">Extension granted</p>}
          </div>
        )}
      </header>

      <Tabs
        id="team"
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "overview", label: "Overview", count: w.permissions.isLeader ? pendingRequests : 0 },
          { value: "project", label: "Project and submission" },
        ]}
      >
        <TabPanel value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <RegistrationTile w={w} onRegistered={party} />
              <ChallengeTile w={w} />
              <MilestonesTile w={w} />
              {w.feedback.length > 0 && (
                <Tile>
                  <TileHeader title="Judge feedback" />
                  <ul className="space-y-3">
                    {w.feedback.map((f, i) => (
                      <li key={i} className="rounded-2xl bg-surface-2 p-4 text-sm">
                        {f}
                      </li>
                    ))}
                  </ul>
                </Tile>
              )}
            </div>
            <MembersTile w={w} />
          </div>
        </TabPanel>
        <TabPanel value="project">
          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <ProjectForm w={w} />
            <SubmissionTile w={w} onFinal={party} />
          </div>
        </TabPanel>
      </Tabs>
    </>
  );
}

/* ---------------- Registration ---------------- */

function RegistrationTile({ w, onRegistered }: { w: Workspace; onRegistered: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { team, permissions } = w;
  const ev = team.event;
  const n = team.members.length;
  const sizeOk = n >= ev.minTeamSize && n <= ev.maxTeamSize;
  const register = useMutation({
    mutationFn: () => api(`/teams/${team.id}/register`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries();
      onRegistered();
      toast({ title: "Registration sent", body: "Organizers will review it shortly.", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const withdraw = useMutation({
    mutationFn: () => api(`/teams/${team.id}/register`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const status = team.registration?.status;
  const tone = status === "APPROVED" ? "#3DCFAE" : status === "PENDING" ? "#FFC857" : status === "REJECTED" ? "#FF9AAC" : "#ECE8FF";

  return (
    <section className="clay rounded-[var(--radius-tile)] p-6 text-navy" style={{ ["--clay" as string]: tone }} aria-labelledby="reg-h">
      <h2 id="reg-h" className="text-xl font-bold">
        {status === "APPROVED" ? "You're registered" : status === "PENDING" ? "Registration under review" : status === "REJECTED" ? "Registration declined" : "Register your team"}
      </h2>
      <p className="mt-1 max-w-xl text-sm font-medium text-navy/80">
        {status === "APPROVED"
          ? ev.stage === "IN_PROGRESS"
            ? "The hackathon is live. Build, then submit from the Project tab."
            : "You'll be able to submit once the hackathon goes live."
          : status === "PENDING"
            ? "Organizers check eligibility and team size. You'll get a notification when they decide."
            : status === "REJECTED"
              ? team.registration?.note || "Fix the issue and apply again while registration is open."
              : `Teams need ${ev.minTeamSize}–${ev.maxTeamSize} members. You have ${n}.`}
      </p>
      {permissions.isLeader && (!status || status === "REJECTED") && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => register.mutate()} loading={register.isPending} disabled={!sizeOk || ev.stage !== "REGISTRATION_OPEN"}>
            {status === "REJECTED" ? "Apply again" : "Register team"}
          </Button>
          {ev.stage !== "REGISTRATION_OPEN" && <span className="text-sm font-semibold">Registration isn't open yet.</span>}
          {ev.stage === "REGISTRATION_OPEN" && !sizeOk && <span className="text-sm font-semibold">Invite {ev.minTeamSize - n} more member(s) first.</span>}
        </div>
      )}
      {permissions.isLeader && status === "PENDING" && ["PUBLISHED", "REGISTRATION_OPEN"].includes(ev.stage) && (
        <Button variant="secondary" size="sm" className="mt-4 border-0 bg-white/80 text-navy shadow-none dark:bg-surface dark:text-ink" onClick={() => withdraw.mutate()} loading={withdraw.isPending}>
          Withdraw application
        </Button>
      )}
    </section>
  );
}

/* ---------------- Challenge ---------------- */

const DIFF = { EASY: "bg-mint-tint text-mint-ink", MEDIUM: "bg-sun-tint text-sun-ink", HARD: "bg-coral-tint text-coral-ink" } as const;

function ChallengeTile({ w }: { w: Workspace }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { team, permissions } = w;
  const locked = ["JUDGING", "COMPLETED"].includes(team.event.stage) || team.project?.submissions.some((s) => s.isFinal);
  const choose = useMutation({
    mutationFn: (problemId: string) => api(`/teams/${team.id}/problem`, { body: { problemId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", team.id] });
      setOpen(false);
      toast({ title: "Challenge selected", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const p = team.problem;
  return (
    <Tile>
      <TileHeader
        title="Your challenge"
        action={
          permissions.isLeader && !locked ? (
            <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
              {p ? "Change" : "Choose a challenge"}
            </Button>
          ) : locked ? (
            <span className="flex items-center gap-1 text-sm text-ink-soft">
              <Lock className="size-4" aria-hidden /> Locked
            </span>
          ) : null
        }
      />
      {p ? (
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-navy text-white dark:bg-white dark:text-navy">{p.code}</Badge>
            <Badge className={DIFF[p.difficulty]}>{p.difficulty.toLowerCase()}</Badge>
            <Badge className="bg-surface-2 text-ink-soft">{p.category}</Badge>
          </div>
          <h3 className="mt-3 text-xl font-bold">{p.title}</h3>
          <p className="mt-1 text-ink-soft">{p.description}</p>
          <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
            <span className="font-semibold">Expected output: </span>
            {p.expectedOutput}
          </p>
        </div>
      ) : (
        <p className="text-ink-soft">{permissions.isLeader ? "Pick the problem statement your team will solve. You can change it until you make a final submission." : "Your team leader hasn't chosen a challenge yet."}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Choose a challenge" description="Counts show how many teams have already picked each one." className="sm:max-w-2xl">
        <ul className="space-y-3">
          {team.event.problems.map((pr) => {
            const full = !!pr.selectionLimit && (pr.selectedCount ?? 0) >= pr.selectionLimit && pr.id !== team.problemId;
            return (
              <li key={pr.id}>
                <button
                  disabled={full || choose.isPending}
                  onClick={() => choose.mutate(pr.id)}
                  className={cn("w-full rounded-2xl border-2 p-4 text-left transition-colors disabled:opacity-50", pr.id === team.problemId ? "border-violet bg-violet-tint/50" : "border-line hover:border-violet/50")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-navy text-white dark:bg-white dark:text-navy">{pr.code}</Badge>
                    <Badge className={DIFF[pr.difficulty]}>{pr.difficulty.toLowerCase()}</Badge>
                    <span className="ml-auto text-sm text-ink-soft">
                      {pr.selectedCount ?? 0} team(s){pr.selectionLimit ? ` of ${pr.selectionLimit}` : ""}
                      {full && ", full"}
                    </span>
                  </div>
                  <p className="mt-2 font-bold">{pr.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{pr.description}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </Tile>
  );
}

/* ---------------- Members ---------------- */

function MembersTile({ w }: { w: Workspace }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { team, permissions } = w;
  const [email, setEmail] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const full = team.members.length >= team.event.maxTeamSize;
  const rosterOpen = ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS"].includes(team.event.stage);
  const refresh = () => qc.invalidateQueries();

  const invite = useMutation({
    mutationFn: () => api(`/teams/${team.id}/invite`, { body: { email } }),
    onSuccess: () => {
      toast({ title: "Invitation sent", body: email, tone: "success" });
      setEmail("");
      setInviteErr(null);
      refresh();
    },
    onError: (e) => setInviteErr(e instanceof ApiError ? (e.fields?.email ? `${e.message} ${e.fields.email}` : e.message) : "Couldn't send the invitation."),
  });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => api(`/invitations/${id}/respond`, { body: { accept } }),
    onSuccess: (_d, v) => {
      toast({ title: v.accept ? "Member added" : "Request declined", tone: v.accept ? "success" : "info" });
      refresh();
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const cancel = useMutation({ mutationFn: (id: string) => api(`/invitations/${id}`, { method: "DELETE" }), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: (userId: string) => api(`/teams/${team.id}/members/${userId}`, { method: "DELETE" }),
    onSuccess: (_d, userId) => {
      if (userId === user?.id) navigate("/app/teams");
      refresh();
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const transfer = useMutation({
    mutationFn: (userId: string) => api(`/teams/${team.id}/transfer`, { body: { userId } }),
    onSuccess: () => {
      toast({ title: "Leadership handed over", tone: "success" });
      refresh();
    },
  });
  const settings = useMutation({ mutationFn: (body: object) => api(`/teams/${team.id}`, { method: "PATCH", body }), onSuccess: refresh });
  const del = useMutation({
    mutationFn: () => api(`/teams/${team.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: `${team.name} deleted`, tone: "info" });
      qc.invalidateQueries();
      navigate("/app/teams");
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate();
  };
  const requests = team.invitations.filter((i) => i.kind === "REQUEST");
  const invites = team.invitations.filter((i) => i.kind === "INVITE");

  return (
    <Tile className="self-start">
      <TileHeader title={`Members (${team.members.length}/${team.event.maxTeamSize})`} />
      <ul className="space-y-3">
        {team.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar name={m.user.name} color={m.user.avatarColor} size={42} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold">
                {m.user.name}
                {m.isLeader && <Crown className="size-4 text-sun-ink" aria-label="Team leader" />}
              </p>
              <p className="truncate text-xs text-ink-soft">{m.user.skills || m.user.college || m.user.email}</p>
            </div>
            {permissions.isLeader && !m.isLeader && rosterOpen && (
              <div className="flex gap-1">
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink" onClick={() => transfer.mutate(m.userId)} aria-label={`Make ${m.user.name} the leader`} title="Make leader">
                  <Crown className="size-4" />
                </button>
                <button className="rounded-lg p-1.5 text-ink-soft hover:bg-coral-tint hover:text-coral-ink" onClick={() => remove.mutate(m.userId)} aria-label={`Remove ${m.user.name}`} title="Remove">
                  <X className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {permissions.isLeader && requests.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold">Join requests</h3>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl bg-sun-tint/70 p-3 dark:bg-sun/10">
                <div className="flex items-center gap-2">
                  <Avatar name={r.sender.name} color={r.sender.avatarColor} size={28} />
                  <p className="text-sm font-semibold">{r.sender.name}</p>
                </div>
                {r.message && <p className="mt-1 text-sm text-ink-soft">{r.message}</p>}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" disabled={full} onClick={() => respond.mutate({ id: r.id, accept: true })}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: r.id, accept: false })}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {permissions.isLeader && rosterOpen && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="mb-2 text-sm font-bold">Invite a teammate</h3>
          {full ? (
            <p className="text-sm text-ink-soft">Your team is full.</p>
          ) : (
            <form onSubmit={submitInvite} className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Teammate's email</span>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@college.edu" required aria-invalid={!!inviteErr} aria-describedby={inviteErr ? "invite-err" : undefined} />
              </label>
              <Button type="submit" size="icon" loading={invite.isPending} aria-label="Send invitation">
                {!invite.isPending && <UserPlus className="size-5" />}
              </Button>
            </form>
          )}
          {inviteErr && (
            <p id="invite-err" className="mt-2 text-sm font-medium text-coral-ink">
              {inviteErr}
            </p>
          )}
          {invites.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink-soft">
                    Invited <span className="font-semibold text-ink">{i.recipient.name}</span> {relative(i.createdAt)}
                  </span>
                  <button className="shrink-0 text-xs font-semibold text-coral-ink hover:underline" onClick={() => cancel.mutate(i.id)}>
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Show team as recruiting</span>
            <Toggle checked={team.lookingForMembers} onChange={(v) => settings.mutate({ lookingForMembers: v })} label="Show team as recruiting" />
          </div>
        </div>
      )}

      {permissions.isMember && (
        <div className="mt-6 border-t border-line pt-4">
          {permissions.isLeader ? (
            <Button variant="ghost" size="sm" className="text-coral-ink" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete team
            </Button>
          ) : (
            rosterOpen && (
              <Button variant="ghost" size="sm" className="text-coral-ink" onClick={() => user && remove.mutate(user.id)}>
                Leave team
              </Button>
            )
          )}
        </div>
      )}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete ${team.name}?`} description="Members, invitations and project drafts are removed. This can't be undone.">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep team
          </Button>
          <Button variant="danger" loading={del.isPending} onClick={() => del.mutate()}>
            Delete team
          </Button>
        </div>
      </Dialog>
    </Tile>
  );
}

/* ---------------- Milestones ---------------- */

function MilestonesTile({ w }: { w: Workspace }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { team, permissions } = w;
  const [items, setItems] = useState<Milestone[]>(team.project?.milestones ?? []);
  const [label, setLabel] = useState("");
  useEffect(() => setItems(team.project?.milestones ?? []), [team.project?.milestones]);
  const editable = permissions.isMember && !!team.project && new Date(w.deadline) > new Date();

  const save = useMutation({
    mutationFn: (milestones: Milestone[]) =>
      api(`/teams/${team.id}/project`, { method: "PUT", body: { ...pick(team.project!), milestones } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team", team.id] }),
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const update = (next: Milestone[]) => {
    setItems(next);
    save.mutate(next);
  };
  const done = items.filter((m) => m.done).length;

  return (
    <Tile>
      <TileHeader title="Milestones" action={items.length > 0 && <span className="text-sm font-semibold text-ink-soft">{done}/{items.length} done</span>} />
      {!team.project ? (
        <p className="text-sm text-ink-soft">Save your project details in the Project tab to start tracking milestones.</p>
      ) : (
        <>
          {items.length > 0 && <Progress value={done} max={items.length} tone="mint" label="Milestones complete" className="mb-4" />}
          <ul className="space-y-1.5">
            {items.map((m) => (
              <li key={m.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                <button
                  disabled={!editable}
                  onClick={() => update(items.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))}
                  aria-pressed={m.done}
                  aria-label={`${m.done ? "Mark not done" : "Mark done"}: ${m.label}`}
                  className="text-mint-ink disabled:opacity-60"
                >
                  {m.done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5 text-ink-soft" />}
                </button>
                <span className={cn("flex-1", m.done && "text-ink-soft line-through")}>{m.label}</span>
                {editable && (
                  <button onClick={() => update(items.filter((x) => x.id !== m.id))} className="rounded-lg p-1 text-ink-soft opacity-0 hover:text-coral-ink focus-visible:opacity-100 group-hover:opacity-100" aria-label={`Remove ${m.label}`}>
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!label.trim()) return;
                update([...items, { id: crypto.randomUUID().slice(0, 8), label: label.trim(), done: false }]);
                setLabel("");
              }}
            >
              <label className="flex-1">
                <span className="sr-only">New milestone</span>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a milestone, e.g. Working demo" maxLength={120} />
              </label>
              <Button type="submit" variant="soft" size="icon" aria-label="Add milestone">
                <Plus className="size-5" />
              </Button>
            </form>
          )}
        </>
      )}
    </Tile>
  );
}

const pick = (p: Project) => ({ title: p.title, summary: p.summary, techStack: p.techStack, repoUrl: p.repoUrl, demoUrl: p.demoUrl, slidesUrl: p.slidesUrl, videoUrl: p.videoUrl });

/* ---------------- Project form ---------------- */

function ProjectForm({ w }: { w: Workspace }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { team, permissions } = w;
  const p = team.project;
  const [form, setForm] = useState({
    title: p?.title ?? "",
    summary: p?.summary ?? "",
    techStack: p?.techStack ?? "",
    repoUrl: p?.repoUrl ?? "",
    demoUrl: p?.demoUrl ?? "",
    slidesUrl: p?.slidesUrl ?? "",
    videoUrl: p?.videoUrl ?? "",
  });
  const locked = new Date(w.deadline) < new Date();
  const editable = permissions.isMember && !locked;
  const save = useMutation({
    mutationFn: () => api(`/teams/${team.id}/project`, { method: "PUT", body: { ...form, milestones: p?.milestones ?? [] } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", team.id] });
      toast({ title: "Draft saved", tone: "success" });
    },
  });
  const err = save.error instanceof ApiError ? save.error : null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Tile>
      <TileHeader title="Project details" action={p && <span className="text-xs text-ink-soft">Saved {relative(p.updatedAt)}</span>} />
      {locked && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm font-medium">
          <Lock className="size-4" aria-hidden /> The deadline has passed, so your project is locked.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <FormError message={err && !err.fields ? err.message : null} />
        <Field label="Project title" error={err?.fields?.title} className="sm:col-span-2">
          <Input value={form.title} onChange={set("title")} disabled={!editable} required minLength={3} maxLength={100} />
        </Field>
        <Field label="Summary" hint={`What it does, who it's for and how it works. ${form.summary.length}/50 characters minimum for final submission.`} error={err?.fields?.summary} className="sm:col-span-2">
          <Textarea value={form.summary} onChange={set("summary")} disabled={!editable} maxLength={3000} className="min-h-36" />
        </Field>
        <Field label="Tech stack" optional error={err?.fields?.techStack} className="sm:col-span-2">
          <Input value={form.techStack} onChange={set("techStack")} disabled={!editable} placeholder="React, Express, SQLite" />
        </Field>
        <Field label="Repository link" error={err?.fields?.repoUrl}>
          <Input type="url" value={form.repoUrl} onChange={set("repoUrl")} disabled={!editable} placeholder="https://github.com/…" />
        </Field>
        <Field label="Live demo link" error={err?.fields?.demoUrl}>
          <Input type="url" value={form.demoUrl} onChange={set("demoUrl")} disabled={!editable} placeholder="https://…" />
        </Field>
        <Field label="Slides link" optional error={err?.fields?.slidesUrl}>
          <Input type="url" value={form.slidesUrl} onChange={set("slidesUrl")} disabled={!editable} />
        </Field>
        <Field label="Demo video link" error={err?.fields?.videoUrl}>
          <Input type="url" value={form.videoUrl} onChange={set("videoUrl")} disabled={!editable} />
        </Field>
        {editable && (
          <div className="sm:col-span-2">
            <Button type="submit" loading={save.isPending} variant="secondary">
              Save draft
            </Button>
          </div>
        )}
      </form>
    </Tile>
  );
}

/* ---------------- Submission ---------------- */

function SubmissionTile({ w, onFinal }: { w: Workspace; onFinal: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const { team, permissions } = w;
  const p = team.project;
  const subs = p?.submissions ?? [];

  const checks = [
    { ok: team.registration?.status === "APPROVED", label: "Registration approved" },
    { ok: !!team.problemId, label: "Challenge selected" },
    { ok: (p?.summary.trim().length ?? 0) >= 50, label: "Summary of 50+ characters" },
    { ok: !!p?.repoUrl, label: "Repository link" },
    { ok: !!(p?.demoUrl || p?.videoUrl), label: "Demo or video link" },
  ];
  const ready = checks.every((c) => c.ok) && w.submissionOpen;

  const submit = useMutation({
    mutationFn: (final: boolean) => {
      const form = new FormData();
      form.set("final", String(final));
      if (file) form.set("attachment", file);
      return api<{ submission: { version: number } }>(`/teams/${team.id}/submissions`, { form });
    },
    onSuccess: ({ submission }, final) => {
      setFile(null);
      setFieldErrors(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries();
      if (final) onFinal();
      toast({ title: final ? `Version ${submission.version} submitted` : `Snapshot v${submission.version} saved`, body: final ? "Judges will see this version." : undefined, tone: "success" });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fields) setFieldErrors(e.fields);
      toast({ title: e.message, tone: "error" });
    },
  });

  return (
    <div className="space-y-4">
      <Tile>
        <TileHeader title="Final submission" />
        <ul className="space-y-2" aria-label="Submission checklist">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2.5 text-sm">
              <span className={cn("grid size-5 place-items-center rounded-full", c.ok ? "bg-mint text-navy" : "bg-surface-2 text-ink-soft")}>{c.ok ? <Check className="size-3.5" aria-hidden /> : null}</span>
              <span className={cn(!c.ok && "text-ink-soft")}>
                {c.label}
                <span className="sr-only">{c.ok ? " (done)" : " (missing)"}</span>
              </span>
            </li>
          ))}
        </ul>
        {fieldErrors && (
          <ul className="mt-3 space-y-1 rounded-xl bg-coral-tint p-3 text-sm text-coral-ink">
            {Object.values(fieldErrors).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        {permissions.isLeader ? (
          <div className="mt-5 space-y-3">
            <label className="neu flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line p-3 text-sm hover:bg-surface-2">
              <FileUp className="size-5 text-violet" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file ? file.name : "Attach slides or a report (PDF, PPTX, ZIP; 15 MB max)"}</span>
              <input ref={fileRef} type="file" className="sr-only" accept=".pdf,.zip,.ppt,.pptx,.docx,.md,.txt,.png,.jpg,.jpeg,.mp4" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={!w.submissionOpen} />
            </label>
            <Button className="w-full" size="lg" disabled={!ready} loading={submit.isPending && submit.variables === true} onClick={() => submit.mutate(true)}>
              {subs.some((s) => s.isFinal) ? "Submit updated final version" : "Submit final version"}
            </Button>
            <Button className="w-full" variant="ghost" size="sm" disabled={!w.submissionOpen || team.registration?.status !== "APPROVED" || !p} loading={submit.isPending && submit.variables === false} onClick={() => submit.mutate(false)}>
              Save a snapshot without submitting
            </Button>
            {!w.submissionOpen && <p className="text-center text-sm text-ink-soft">Submissions open while the hackathon is live and before the deadline.</p>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">Your team leader makes the final submission. Everyone can edit the project details.</p>
        )}
      </Tile>

      <Tile>
        <TileHeader title="Submission history" />
        {subs.length === 0 ? (
          <EmptyState title="Nothing submitted yet" body="Every snapshot and final submission is kept with its timestamp." />
        ) : (
          <ol className="space-y-3">
            {subs.map((s) => (
              <li key={s.id} className="rounded-2xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">v{s.version}</span>
                  {s.isFinal ? <Badge className="bg-mint-tint text-mint-ink">Final</Badge> : <Badge className="bg-surface-2 text-ink-soft">Snapshot</Badge>}
                  <time className="ml-auto text-xs text-ink-soft" dateTime={s.submittedAt}>
                    {fmtDateTime(s.submittedAt)}
                  </time>
                </div>
                {s.attachmentName && (
                  <a href={apiUrl(`/teams/${team.id}/submissions/${s.id}/attachment`)} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-violet-ink hover:underline">
                    <Download className="size-4" aria-hidden /> {s.attachmentName}
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </Tile>
    </div>
  );
}
