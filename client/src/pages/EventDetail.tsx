import { useCallback, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, CalendarDays, Megaphone, MapPin, Pin, Trophy, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtRange, MODE_LABEL, readableOn, relative } from "@/lib/format";
import type { EventDetail as EventDetailT, Person, Viewer } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";
import { useEventChannel } from "@/lib/useRealtime";
import { Avatar, AvatarStack, Badge, Button, ButtonLink, EmptyState, ErrorState, Field, FormError, Input, RegistrationBadge, Spinner, StageBadge, Textarea } from "@/components/ui";
import { Dialog } from "@/components/Dialog";
import { useToast } from "@/components/Toast";

const DIFF = { EASY: "bg-mint-tint text-mint-ink", MEDIUM: "bg-sun-tint text-sun-ink", HARD: "bg-coral-tint text-coral-ink" } as const;

export default function EventDetail() {
  const { slug = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["event", slug], queryFn: () => api<{ event: EventDetailT; viewer: Viewer | null }>(`/events/${slug}`) });
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["event", slug] }), [qc, slug]);
  useEventChannel(q.data?.event.id, refresh);

  if (q.isLoading) return <Spinner />;
  if (q.isError)
    return (
      <div className="px-5 pt-16">
        <ErrorState error={q.error} />
      </div>
    );
  const { event, viewer } = q.data!;

  const timeline = [
    { label: "Registration closes", at: event.registrationClosesAt },
    { label: "Hackathon starts", at: event.startsAt },
    { label: "Submission deadline", at: event.submissionDeadline },
    { label: "Hackathon ends", at: event.endsAt },
  ];
  const totalWeight = event.criteria.reduce((a, c) => a + c.weight, 0) || 1;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-6">
      {/* Header */}
      <header className="clay relative overflow-hidden rounded-[2rem] p-7 sm:p-10" style={{ ["--clay" as string]: event.accentColor, color: readableOn(event.accentColor) }}>
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <StageBadge stage={event.stage} className="bg-white/90 dark:bg-surface" />
            <Badge className="bg-white/70 text-navy dark:bg-surface dark:text-ink">{event.category}</Badge>
            <Badge className="bg-white/70 text-navy dark:bg-surface dark:text-ink">{MODE_LABEL[event.mode]}</Badge>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-6xl">{event.title}</h1>
          <p className="mt-3 text-lg font-medium">{event.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden /> {fmtRange(event.startsAt, event.endsAt)}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden /> {event.location}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Users className="size-4" aria-hidden /> Teams of {event.minTeamSize}–{event.maxTeamSize}
            </span>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 size-56 rounded-full bg-white/20" aria-hidden />
        <div className="absolute -bottom-16 right-24 size-40 rounded-full bg-white/15" aria-hidden />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="about">
            <h2 id="about" className="text-2xl font-bold">
              About
            </h2>
            <p className="mt-3 max-w-[70ch] whitespace-pre-line text-ink-soft">{event.description}</p>
          </section>

          <section id="challenges" aria-labelledby="challenges-h" className="scroll-mt-24">
            <h2 id="challenges-h" className="text-2xl font-bold">
              Problem statements
            </h2>
            <div className="mt-4 grid gap-4">
              {event.problems.map((p) => (
                <article key={p.id} className="tile p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-navy text-white dark:bg-white dark:text-navy">{p.code}</Badge>
                    <Badge className={DIFF[p.difficulty]}>{p.difficulty.charAt(0) + p.difficulty.slice(1).toLowerCase()}</Badge>
                    <Badge className="bg-surface-2 text-ink-soft">{p.category}</Badge>
                    <span className="ml-auto text-sm text-ink-soft">
                      {p.selectedCount} selected, {p.submittedCount} submitted
                      {p.selectionLimit ? ` (limit ${p.selectionLimit})` : ""}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 max-w-[70ch] text-ink-soft">{p.description}</p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-surface-2 p-3">
                      <dt className="font-semibold">Expected output</dt>
                      <dd className="mt-0.5 text-ink-soft">{p.expectedOutput}</dd>
                    </div>
                    {p.resources && (
                      <div className="rounded-xl bg-surface-2 p-3">
                        <dt className="font-semibold">Resources</dt>
                        <dd className="mt-0.5 text-ink-soft">{p.resources}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="criteria">
            <h2 id="criteria" className="text-2xl font-bold">
              How projects are judged
            </h2>
            <p className="mt-2 text-ink-soft">Each judge rates every criterion from 0 to 10. The final score is the weighted average across all judges.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {event.criteria.map((c) => (
                <li key={c.id} className="tile p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-sm font-semibold text-violet-ink">{Math.round((c.weight / totalWeight) * 100)}%</span>
                  </div>
                  {c.description && <p className="mt-1 text-sm text-ink-soft">{c.description}</p>}
                </li>
              ))}
            </ul>
          </section>

          {(event.rules || event.eligibility || event.prizes) && (
            <section className="grid gap-4 md:grid-cols-3" aria-label="Rules, eligibility and prizes">
              {[
                ["Rules", event.rules],
                ["Eligibility", event.eligibility],
                ["Prizes", event.prizes],
              ]
                .filter(([, v]) => v)
                .map(([title, body]) => (
                  <div key={title} className="tile p-5">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{body}</p>
                  </div>
                ))}
            </section>
          )}

          <section id="announcements" aria-labelledby="ann" className="scroll-mt-24">
            <h2 id="ann" className="text-2xl font-bold">
              Announcements
            </h2>
            {event.announcements.length === 0 ? (
              <EmptyState className="mt-4" icon={<Megaphone className="size-6" />} title="No announcements yet" body="Organizer updates appear here and in your notifications." />
            ) : (
              <ul className="mt-4 space-y-3">
                {event.announcements.map((a) => (
                  <li key={a.id} className={cn("tile p-5", a.pinned && "border-sun bg-sun-tint/60 dark:bg-sun/10")}>
                    <div className="flex items-center gap-2 text-sm text-ink-soft">
                      {a.pinned && <Pin className="size-4 text-sun-ink" aria-label="Pinned" />}
                      <span>{a.author?.name}</span>
                      <span aria-hidden>,</span>
                      <time dateTime={a.createdAt}>{relative(a.createdAt)}</time>
                    </div>
                    <h3 className="mt-1 text-lg font-bold">{a.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-ink-soft">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Action rail */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ActionPanel event={event} viewer={viewer} />
          <div className="tile p-5">
            <h2 className="mb-4 text-lg font-bold">Timeline</h2>
            <ol className="relative space-y-4 border-l-2 border-line pl-5">
              {timeline.map((t) => {
                const past = new Date(t.at) < new Date();
                return (
                  <li key={t.label} className="relative">
                    <span className={cn("absolute -left-[1.72rem] top-1 size-3.5 rounded-full border-2 border-surface", past ? "bg-mint" : "bg-line")} aria-hidden />
                    <p className={cn("font-semibold", past && "text-ink-soft")}>{t.label}</p>
                    <p className="text-sm text-ink-soft">
                      <time dateTime={t.at}>{fmtDateTime(t.at)}</time>
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActionPanel({ event, viewer }: { event: EventDetailT; viewer: Viewer | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const bookmark = useMutation({
    mutationFn: () => api<{ bookmarked: boolean }>(`/events/${event.id}/bookmark`, { method: "POST" }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["event", event.slug] });
      toast({ title: d.bookmarked ? "Saved" : "Removed from saved", tone: "success" });
    },
  });
  const canFormTeams = ["PUBLISHED", "REGISTRATION_OPEN"].includes(event.stage);

  return (
    <div className="glass rounded-[var(--radius-tile)] p-5 shadow-[var(--shadow-soft)]">
      {!user ? (
        <>
          <p className="font-display text-lg font-bold">Want to take part?</p>
          <p className="mt-1 text-sm text-ink-soft">Sign in to create a team, join one, or save this hackathon.</p>
          <ButtonLink to={`/login?next=/hackathons/${event.slug}`} className="mt-4 w-full">
            Sign in to join
          </ButtonLink>
        </>
      ) : viewer?.isManager ? (
        <>
          <p className="font-display text-lg font-bold">You organize this hackathon</p>
          <ButtonLink to={`/app/organize/${event.id}`} className="mt-4 w-full">
            Open command center
          </ButtonLink>
        </>
      ) : viewer?.isJudge ? (
        <>
          <p className="font-display text-lg font-bold">You're judging this hackathon</p>
          <ButtonLink to="/app/judging" className="mt-4 w-full">
            Open judging workspace
          </ButtonLink>
        </>
      ) : viewer?.team ? (
        <>
          <p className="text-sm text-ink-soft">Your team</p>
          <p className="font-display text-xl font-bold">{viewer.team.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <RegistrationBadge status={viewer.team.registration} />
            {viewer.team.isLeader && <Badge className="bg-sun-tint text-sun-ink">You lead this team</Badge>}
          </div>
          <ButtonLink to={`/app/teams/${viewer.team.id}`} className="mt-4 w-full">
            Open team workspace
          </ButtonLink>
        </>
      ) : canFormTeams ? (
        <>
          <p className="font-display text-lg font-bold">Join this hackathon</p>
          <p className="mt-1 text-sm text-ink-soft">Start a team and invite people, or ask to join a team that's recruiting.</p>
          <div className="mt-4 grid gap-2">
            <Button onClick={() => setCreateOpen(true)}>Create a team</Button>
            <Button variant="secondary" onClick={() => setFindOpen(true)}>
              Find a team
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-soft">Team formation is closed for this hackathon.</p>
      )}

      {event.resultsPublished && (
        <ButtonLink to={`/hackathons/${event.slug}/results`} variant="sun" className="mt-3 w-full">
          <Trophy className="size-4" aria-hidden /> View results
        </ButtonLink>
      )}
      {user && !viewer?.isManager && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => bookmark.mutate()} aria-pressed={viewer?.bookmarked}>
          <Bookmark className={cn("size-4", viewer?.bookmarked && "fill-current text-sun-ink")} aria-hidden />
          {viewer?.bookmarked ? "Saved" : "Save for later"}
        </Button>
      )}

      <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} eventId={event.id} />
      {findOpen && <FindTeamDialog open={findOpen} onOpenChange={setFindOpen} eventId={event.id} maxTeamSize={event.maxTeamSize} />}
    </div>
  );
}

function CreateTeamDialog({ open, onOpenChange, eventId }: { open: boolean; onOpenChange: (o: boolean) => void; eventId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const m = useMutation({
    mutationFn: () => api<{ team: { id: string } }>("/teams", { body: { eventId, name, pitch } }),
    onSuccess: ({ team }) => {
      qc.invalidateQueries();
      toast({ title: `${name} created`, body: "Invite teammates from your workspace.", tone: "success" });
      navigate(`/app/teams/${team.id}`);
    },
  });
  const err = m.error instanceof ApiError ? m.error : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Create a team" description="You'll be the team leader. You can invite members right after.">
      <form onSubmit={submit} className="space-y-4">
        <FormError message={err && !err.fields ? err.message : null} />
        <Field label="Team name" error={err?.fields?.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} autoFocus />
        </Field>
        <Field label="What are you looking for?" optional hint="Shown to people browsing teams, e.g. the skills you need." error={err?.fields?.pitch}>
          <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)} maxLength={280} className="min-h-20" />
        </Field>
        <Button type="submit" loading={m.isPending} className="w-full">
          Create team
        </Button>
      </form>
    </Dialog>
  );
}

interface OpenTeam {
  id: string;
  name: string;
  pitch: string | null;
  members: { user: Person }[];
  problem: { code: string; title: string } | null;
}

function FindTeamDialog({ open, onOpenChange, eventId, maxTeamSize }: { open: boolean; onOpenChange: (o: boolean) => void; eventId: string; maxTeamSize: number }) {
  const toast = useToast();
  const teams = useQuery({ queryKey: ["open-teams", eventId], queryFn: () => api<{ teams: OpenTeam[] }>(`/events/${eventId}/teams/open`) });
  const [sent, setSent] = useState<string[]>([]);
  const request = useMutation({
    mutationFn: (teamId: string) => api(`/teams/${teamId}/request`, { body: {} }),
    onSuccess: (_d, teamId) => {
      setSent((s) => [...s, teamId]);
      toast({ title: "Request sent", body: "The team leader will see it in their invitations.", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Teams looking for members" className="sm:max-w-xl">
      {teams.isLoading ? (
        <Spinner />
      ) : !teams.data?.teams.length ? (
        <EmptyState title="No teams are recruiting yet" body="Create your own team and others can ask to join you." />
      ) : (
        <ul className="space-y-3">
          {teams.data.teams.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{t.name}</p>
                  <p className="text-sm text-ink-soft">
                    {t.members.length} of {maxTeamSize} members{t.problem ? `, working on ${t.problem.code}` : ""}
                  </p>
                </div>
                <AvatarStack people={t.members.map((m) => m.user)} size={30} />
              </div>
              {t.pitch && <p className="mt-2 text-sm">{t.pitch}</p>}
              <div className="mt-3 flex items-center gap-2">
                {t.members.slice(0, 1).map((m) => (
                  <span key={m.user.id} className="flex items-center gap-2 text-xs text-ink-soft">
                    <Avatar name={m.user.name} color={m.user.avatarColor} size={20} /> Led by {m.user.name}
                  </span>
                ))}
                <Button size="sm" variant={sent.includes(t.id) ? "ghost" : "soft"} className="ml-auto" disabled={sent.includes(t.id)} loading={request.isPending && request.variables === t.id} onClick={() => request.mutate(t.id)}>
                  {sent.includes(t.id) ? "Request sent" : "Ask to join"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
