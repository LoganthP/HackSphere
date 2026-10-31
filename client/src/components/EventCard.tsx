import { Link } from "react-router";
import { Bookmark, CalendarDays, MapPin, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtRange, MODE_LABEL, pluralize } from "@/lib/format";
import type { EventSummary } from "@/lib/types";
import { Badge, StageBadge } from "./ui";
import { Countdown } from "./Countdown";
import { useAuth } from "@/auth/AuthContext";

export function EventCard({ event, className }: { event: EventSummary; className?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => api<{ bookmarked: boolean }>(`/events/${event.id}/bookmark`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const countdownTarget =
    event.stage === "REGISTRATION_OPEN" ? { label: "Registration closes in", at: event.registrationClosesAt } : event.stage === "IN_PROGRESS" ? { label: "Submissions close in", at: event.submissionDeadline } : null;

  return (
    <article className={cn("tile hover-lift group relative flex flex-col overflow-hidden", className)}>
      <div className="clay relative h-24 rounded-b-none rounded-t-[var(--radius-tile)]" style={{ ["--clay" as string]: event.accentColor }}>
        <div className="absolute inset-x-5 top-4 flex items-start justify-between">
          <StageBadge stage={event.stage} className="bg-white/85 dark:bg-surface" />
          {user && (
            <button
              onClick={() => toggle.mutate()}
              className="relative z-10 grid size-9 place-items-center rounded-xl bg-white/80 text-navy transition hover:bg-white dark:bg-surface dark:text-ink dark:hover:bg-surface-2"
              aria-pressed={event.bookmarked}
              aria-label={event.bookmarked ? `Remove ${event.title} from saved` : `Save ${event.title}`}
            >
              <Bookmark className={cn("size-4", event.bookmarked && "fill-current")} />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Badge className="bg-surface-2 text-ink-soft">{event.category}</Badge>
          <Badge className="bg-surface-2 text-ink-soft">{MODE_LABEL[event.mode]}</Badge>
        </div>
        <h3 className="text-xl font-bold">
          <Link to={`/hackathons/${event.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{event.tagline}</p>
        <dl className="mt-4 grid gap-1.5 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <dt className="sr-only">Dates</dt>
            <dd>{fmtRange(event.startsAt, event.endsAt)}</dd>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <dt className="sr-only">Location</dt>
              <dd className="truncate">{event.location}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0" aria-hidden />
            <dt className="sr-only">Teams</dt>
            <dd>
              {pluralize(event._count?.teams ?? 0, "team")} of {event.minTeamSize}–{event.maxTeamSize}
            </dd>
          </div>
        </dl>
        {countdownTarget && (
          <p className="mt-auto pt-4 text-sm">
            <span className="text-ink-soft">{countdownTarget.label} </span>
            <Countdown to={countdownTarget.at} compact className="font-semibold" />
          </p>
        )}
      </div>
    </article>
  );
}
