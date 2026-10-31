import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CalendarCog, Compass, Gavel, MapPin, Trophy, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, MODE_LABEL, STAGE_LABEL } from "@/lib/format";
import type { EventStage, EventSummary, Problem } from "@/lib/types";
import { Badge, ButtonLink } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { EventCard } from "@/components/EventCard";

const Hero3D = lazy(() => import("@/components/Hero3D"));

interface Stats {
  events: number;
  participants: number;
  teams: number;
  submissions: number;
  nextEvent: (Pick<EventSummary, "id" | "slug" | "title" | "tagline" | "startsAt" | "registrationClosesAt" | "mode" | "location" | "accentColor"> & { stage: EventStage }) | null;
  featuredProblems: (Problem & { event: { slug: string; title: string }; _count: { teams: number } })[];
}

const JOURNEY = [
  { title: "Discover a hackathon", body: "Filter by theme, format and dates. Check eligibility before you commit.", color: "#ECE8FF" },
  { title: "Form a team and register", body: "Invite friends by email or ask to join a team that's looking for your skills.", color: "#E3EDFF" },
  { title: "Choose a challenge", body: "Read each problem statement and see how many teams already picked it.", color: "#DDF8F1" },
  { title: "Build and submit", body: "Track milestones, save drafts and lock in a final version before the deadline.", color: "#FFF4D9" },
  { title: "Get judged fairly", body: "Judges score every project against the same weighted rubric.", color: "#FFE6EB" },
  { title: "See the results", body: "Rankings and awards appear the moment organizers publish them.", color: "#ECE8FF" },
];

const ROLES = [
  { icon: Compass, title: "Participants", body: "Find events, join teams, keep every deadline in one place.", clay: "#3DCFAE" },
  { icon: Users, title: "Team leaders", body: "Invite members, approve requests, register and submit.", clay: "#FFC857" },
  { icon: CalendarCog, title: "Organizers", body: "Configure stages, challenges, rubrics and publish results.", clay: "#4285FF" },
  { icon: Gavel, title: "Judges", body: "Score assigned projects with a clear rubric and leave feedback.", clay: "#FF7890" },
];

export default function Landing() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
  const events = useQuery({ queryKey: ["events", "landing"], queryFn: () => api<{ events: EventSummary[] }>("/events") });
  const upcoming = (events.data?.events ?? []).filter((e) => ["REGISTRATION_OPEN", "PUBLISHED", "IN_PROGRESS"].includes(e.stage)).slice(0, 3);
  const next = stats.data?.nextEvent;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-display text-[clamp(3rem,8vw,6.2rem)] font-extrabold leading-[0.92] tracking-[-0.04em]"
            style={{ fontVariationSettings: "'wdth' 85" }}
          >
            Where ideas become innovation.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }} className="mt-6 max-w-lg text-lg text-ink-soft">
            HackSphere runs the whole hackathon in one place: discover events, form a team, pick a challenge, submit your build and see how the judges scored it.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/hackathons" size="lg">
              Explore hackathons
            </ButtonLink>
            <ButtonLink to="/register?host=1" size="lg" variant="secondary">
              Host a hackathon
            </ButtonLink>
          </motion.div>
        </div>

        <div className="relative h-[380px] sm:h-[460px]">
          <div className="absolute inset-0">
            <Suspense fallback={null}>
              <Hero3D />
            </Suspense>
          </div>
          {next && (
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 160, damping: 18 }}
              className="glass absolute bottom-2 left-1/2 w-[min(100%,22rem)] -translate-x-1/2 rounded-[var(--radius-tile)] p-5 shadow-[var(--shadow-lift)] sm:bottom-6"
            >
              <p className="text-sm font-semibold text-ink-soft">Next up</p>
              <Link to={`/hackathons/${next.slug}`} className="mt-0.5 block font-display text-2xl font-bold hover:underline">
                {next.title}
              </Link>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <MapPin className="size-3.5" aria-hidden />
                {next.location ?? MODE_LABEL[next.mode]}
              </p>
              <p className="mb-2 mt-4 text-sm font-medium">Starts in</p>
              <Countdown to={next.startsAt} />
              <p className="mt-3 text-xs text-ink-soft">
                {STAGE_LABEL[next.stage]}
                {next.stage === "REGISTRATION_OPEN" && `, closes ${fmtDate(next.registrationClosesAt)}`}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ---------- Live numbers (bento) ---------- */}
      {stats.data && (
        <section aria-label="Platform activity" className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="clay col-span-2 flex min-h-36 flex-col justify-between rounded-[var(--radius-tile)] p-6 text-navy lg:col-span-1" style={{ ["--clay" as string]: "#FFC857" }}>
              <Trophy className="size-7" aria-hidden />
              <p className="font-display text-2xl font-bold leading-tight">
                {stats.data.events} hackathons hosted so far, from campus build nights to national finals.
              </p>
            </div>
            {[
              { n: stats.data.participants, label: "Student builders", clay: "#3DCFAE" },
              { n: stats.data.teams, label: "Teams formed", clay: "#9C8CFF" },
              { n: stats.data.submissions, label: "Projects submitted", clay: "#FF9AAC" },
            ].map((s) => (
              <div key={s.label} className="clay flex min-h-36 flex-col justify-end rounded-[var(--radius-tile)] p-5 text-navy" style={{ ["--clay" as string]: s.clay }}>
                <p className="font-display text-5xl font-extrabold tabular-nums">{s.n}</p>
                <p className="mt-1 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Upcoming events ---------- */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-6" aria-labelledby="upcoming">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="upcoming" className="text-3xl font-bold sm:text-4xl">
            Open for builders
          </h2>
          <Link to="/hackathons" className="shrink-0 font-semibold text-violet-ink underline-offset-4 hover:underline">
            See all hackathons
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-5 sm:px-6" aria-labelledby="journey">
        <h2 id="journey" className="max-w-xl text-3xl font-bold sm:text-4xl">
          From first idea to the leaderboard, in six steps
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((step, i) => (
            <li key={step.title} className="tile relative overflow-hidden p-6">
              <span className="font-display text-6xl font-extrabold leading-none" style={{ color: step.color, WebkitTextStroke: "1.5px var(--focus)" }} aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
              <p className="mt-1.5 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Featured problem statements ---------- */}
      {!!stats.data?.featuredProblems.length && (
        <section className="mx-auto mt-24 max-w-6xl px-5 sm:px-6" aria-labelledby="challenges">
          <h2 id="challenges" className="text-3xl font-bold sm:text-4xl">
            Challenges teams are taking on
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {stats.data.featuredProblems.map((p) => (
              <Link key={p.id} to={`/hackathons/${p.event.slug}#challenges`} className="glass hover-lift block rounded-[var(--radius-tile)] p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-navy text-white dark:bg-white dark:text-navy">{p.code}</Badge>
                  <Badge className="bg-surface-2 text-ink-soft">{p.category}</Badge>
                  <span className="ml-auto text-sm text-ink-soft">{p._count.teams} teams</span>
                </div>
                <h3 className="mt-3 text-xl font-bold">{p.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-ink-soft">{p.description}</p>
                <p className="mt-3 text-sm font-semibold text-violet-ink">{p.event.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Roles ---------- */}
      <section className="mx-auto mt-24 max-w-6xl px-5 sm:px-6" aria-labelledby="roles">
        <h2 id="roles" className="max-w-xl text-3xl font-bold sm:text-4xl">
          One account, the right tools for each role
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map(({ icon: Icon, title, body, clay }) => (
            <div key={title} className="tile p-6">
              <span className="clay grid size-14 place-items-center rounded-2xl text-navy" style={{ ["--clay" as string]: clay }}>
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto mt-24 max-w-6xl px-5 sm:px-6">
        <div className="clay flex flex-col items-start gap-6 rounded-[2.25rem] p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between" style={{ ["--clay" as string]: "#5A41E6" }}>
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Your next team is already here.</h2>
            <p className="mt-2 max-w-lg text-white/85">Create a free account, add your skills, and teams looking for someone like you can find you.</p>
          </div>
          <ButtonLink to="/register" size="lg" variant="sun">
            <UserPlus className="size-5" aria-hidden /> Create your account
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
