import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, type Variants } from "motion/react";
import { Bell, CalendarClock, CalendarCog, Compass, Gavel, Mail, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtShort, relative } from "@/lib/format";
import type { EventStage, EventSummary, Milestone, Notification, Person, RegistrationStatus } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";
import { AvatarStack, Badge, Button, ButtonLink, EmptyState, ErrorState, Progress, RegistrationBadge, Spinner, StageBadge, Tile, TileHeader } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/components/Toast";

interface Dash {
  teams: {
    id: string;
    name: string;
    isLeader: boolean;
    event: { id: string; slug: string; title: string; stage: EventStage; accentColor: string; maxTeamSize: number };
    registration: RegistrationStatus | null;
    members: Person[];
    problem: { code: string; title: string } | null;
    project: { title: string; milestones: Milestone[]; latest: { isFinal: boolean; version: number } | null } | null;
  }[];
  stats: { registeredEvents: number; teams: number; activeProjects: number; unreadNotifications: number };
  invitations: { id: string; team: { id: string; name: string; event: { title: string } }; sender: { name: string; avatarColor: string } }[];
  notifications: Notification[];
  deadlines: { label: string; at: string; eventTitle: string; link: string }[];
  recommendations: (EventSummary & { _count: { teams: number } })[];
  judging: { assigned: number; completed: number; open: number } | null;
  organizing: { id: string; title: string; stage: EventStage; teams: number; pendingRegistrations: number; startsAt: string; accentColor: string }[] | null;
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item: Variants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } } };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dash>("/dashboard") });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => api(`/invitations/${id}/respond`, { body: { accept } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries();
      toast({ title: v.accept ? "You joined the team" : "Invitation declined", tone: v.accept ? "success" : "info" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const firstName = user?.name.split(" ")[0];
  const hasRole = Boolean(d.judging || d.organizing);

  const statTiles = [
    { n: d.stats.registeredEvents, label: "Registered events", clay: "#FFC857" },
    { n: d.stats.teams, label: d.stats.teams === 1 ? "Team" : "Teams", clay: "#3DCFAE" },
    { n: d.stats.activeProjects, label: "Active projects", clay: "#9C8CFF" },
    { n: d.stats.unreadNotifications, label: "New updates", clay: "#FF9AAC" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 md:grid-cols-6">
      {/* Welcome */}
      <motion.section variants={item} className="glass relative overflow-hidden rounded-[var(--radius-tile)] p-6 sm:p-8 md:col-span-6 lg:col-span-4">
        <p className="text-ink-soft">{greeting()},</p>
        <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">{firstName}</h1>
        <p className="mt-3 max-w-md text-ink-soft">
          {d.deadlines[0] ? (
            <>
              Next up: <span className="font-semibold text-ink">{d.deadlines[0].label.toLowerCase()}</span> for {d.deadlines[0].eventTitle} in{" "}
              <Countdown to={d.deadlines[0].at} compact className="font-semibold text-ink" />.
            </>
          ) : (
            "No deadlines coming up. A good time to find your next hackathon."
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink to="/hackathons" size="sm">
            <Compass className="size-4" aria-hidden /> Explore hackathons
          </ButtonLink>
          <ButtonLink to="/app/teams" size="sm" variant="secondary">
            <Users className="size-4" aria-hidden /> My teams
          </ButtonLink>
        </div>
        <span className="clay absolute -right-8 -top-8 hidden size-40 rounded-full sm:block" style={{ ["--clay" as string]: "#ECE8FF" }} aria-hidden />
      </motion.section>

      {/* Stats (2x2) */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 md:col-span-6 md:grid-cols-4 lg:col-span-2 lg:grid-cols-2">
        {statTiles.map((s) => (
          <div key={s.label} className="clay flex min-h-28 flex-col justify-end rounded-[1.5rem] p-4 text-navy" style={{ ["--clay" as string]: s.clay }}>
            <p className="font-display text-4xl font-extrabold tabular-nums">{s.n}</p>
            <p className="text-sm font-semibold">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Teams */}
      <motion.div variants={item} className="md:col-span-6 lg:col-span-4">
        <Tile className="h-full">
          <TileHeader title="Your teams" action={<Link to="/app/teams" className="text-sm font-semibold text-violet-ink hover:underline">See all</Link>} />
          {d.teams.length === 0 ? (
            <EmptyState icon={<Users className="size-6" />} title="You're not on a team yet" body="Pick a hackathon, then create a team or ask to join one." action={<ButtonLink to="/hackathons" size="sm">Find a hackathon</ButtonLink>} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {d.teams.slice(0, 4).map((t) => {
                const ms = t.project?.milestones ?? [];
                const done = ms.filter((m) => m.done).length;
                return (
                  <li key={t.id}>
                    <Link to={`/app/teams/${t.id}`} className="hover-lift block h-full rounded-[var(--radius-panel)] border border-line p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-lg font-bold">{t.name}</p>
                          <p className="truncate text-sm text-ink-soft">{t.event.title}</p>
                        </div>
                        <AvatarStack people={t.members} size={28} max={3} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <StageBadge stage={t.event.stage} />
                        <RegistrationBadge status={t.registration} />
                        {t.isLeader && <Badge className="bg-sun-tint text-sun-ink">Leader</Badge>}
                      </div>
                      {ms.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-soft">
                            <span>{t.project?.title}</span>
                            <span>
                              {done}/{ms.length} milestones
                            </span>
                          </div>
                          <Progress value={done} max={ms.length} tone="mint" label={`${t.name} milestones`} />
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tile>
      </motion.div>

      {/* Invitations */}
      <motion.div variants={item} className="md:col-span-3 lg:col-span-2">
        <Tile className="h-full">
          <TileHeader title="Invitations" action={<Mail className="size-5 text-ink-soft" aria-hidden />} />
          {d.invitations.length === 0 ? (
            <p className="text-sm text-ink-soft">No pending invitations. Teams can invite you by your email address.</p>
          ) : (
            <ul className="space-y-3">
              {d.invitations.slice(0, 3).map((inv) => (
                <li key={inv.id} className="rounded-2xl bg-surface-2 p-3">
                  <p className="text-sm">
                    <span className="font-semibold">{inv.sender.name}</span> invited you to <span className="font-semibold">{inv.team.name}</span>
                  </p>
                  <p className="text-xs text-ink-soft">{inv.team.event.title}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => respond.mutate({ id: inv.id, accept: true })} loading={respond.isPending && respond.variables?.id === inv.id && respond.variables.accept}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: inv.id, accept: false })}>
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tile>
      </motion.div>

      {/* Deadlines */}
      <motion.div variants={item} className={cn("md:col-span-3", hasRole ? "lg:col-span-2" : "lg:col-span-3")}>
        <Tile className="h-full">
          <TileHeader title="Deadlines" action={<CalendarClock className="size-5 text-ink-soft" aria-hidden />} />
          {d.deadlines.length === 0 ? (
            <p className="text-sm text-ink-soft">Deadlines for your teams will show up here.</p>
          ) : (
            <ul className="space-y-3">
              {d.deadlines.map((dl) => (
                <li key={dl.label + dl.eventTitle}>
                  <Link to={dl.link} className="flex items-center gap-3 rounded-xl p-1 hover:bg-surface-2">
                    <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-violet-tint py-1.5 text-center font-display text-sm font-bold leading-tight text-violet-ink">
                      {fmtShort(dl.at)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{dl.label}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {dl.eventTitle}, in <Countdown to={dl.at} compact />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={item} className={cn("md:col-span-3", hasRole ? "lg:col-span-2" : "lg:col-span-3")}>
        <Tile className="h-full">
          <TileHeader title="Recent updates" action={<Link to="/app/notifications" className="text-sm font-semibold text-violet-ink hover:underline">All</Link>} />
          {d.notifications.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing new.</p>
          ) : (
            <ul className="space-y-3">
              {d.notifications.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : "bg-coral")} aria-label={n.read ? "Read" : "Unread"} />
                  <div className="min-w-0">
                    {n.link ? (
                      <Link to={n.link} className="line-clamp-2 text-sm font-semibold hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm font-semibold">{n.title}</p>
                    )}
                    <p className="text-xs text-ink-soft">{relative(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {d.stats.unreadNotifications > 0 && (
            <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
              <Bell className="size-3.5" aria-hidden /> Updates arrive live while you're signed in.
            </p>
          )}
        </Tile>
      </motion.div>
      {/* Role tiles */}
      {d.judging && (
        <motion.div variants={item} className="md:col-span-6 lg:col-span-2">
          <div className="clay flex h-full flex-col rounded-[var(--radius-tile)] p-6 text-navy" style={{ ["--clay" as string]: "#FF9AAC" }}>
            <Gavel className="size-7" aria-hidden />
            <p className="mt-3 font-display text-2xl font-bold">
              {d.judging.completed} of {d.judging.assigned} evaluated
            </p>
            <p className="text-sm font-medium text-navy/85">{d.judging.open ? `${d.judging.open} projects are open for scoring.` : "Scoring opens when organizers start judging."}</p>
            <ButtonLink to="/app/judging" variant="secondary" size="sm" className="mt-auto self-start border-0 bg-white/85 text-navy shadow-none dark:bg-surface dark:text-ink">
              Open judging workspace
            </ButtonLink>
          </div>
        </motion.div>
      )}

      {d.organizing && (
        <motion.div variants={item} className={cn("md:col-span-6", d.judging ? "lg:col-span-6" : "lg:col-span-2")}>
          <Tile className="h-full">
            <TileHeader title="Hackathons you organize" action={<CalendarCog className="size-5 text-ink-soft" aria-hidden />} />
            <ul className="space-y-2">
              {d.organizing.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <Link to={`/app/organize/${e.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                    <span className="clay size-9 shrink-0 rounded-xl" style={{ ["--clay" as string]: e.accentColor }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block text-xs text-ink-soft">{e.teams} teams</span>
                    </span>
                    {e.pendingRegistrations > 0 && <Badge className="bg-sun-tint text-sun-ink">{e.pendingRegistrations} to review</Badge>}
                    <StageBadge stage={e.stage} className="hidden sm:inline-flex" />
                  </Link>
                </li>
              ))}
            </ul>
          </Tile>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div variants={item} className="md:col-span-6">
        <Tile className="h-full">
          <TileHeader title="Recommended for you" action={<Sparkles className="size-5 text-sun-ink" aria-hidden />} />
          {d.recommendations.length === 0 ? (
            <p className="text-sm text-ink-soft">You've joined every open hackathon. Impressive.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {d.recommendations.map((e) => (
                <li key={e.id}>
                  <Link to={`/hackathons/${e.slug}`} className="hover-lift block h-full rounded-[var(--radius-panel)] border border-line p-4">
                    <span className="clay mb-3 block h-2 w-12 rounded-full" style={{ ["--clay" as string]: e.accentColor }} aria-hidden />
                    <p className="font-semibold">{e.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{e.tagline}</p>
                    <p className="mt-2 text-xs font-semibold text-ink-soft">Starts {fmtDateTime(e.startsAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tile>
      </motion.div>

    </motion.div>
  );
}
