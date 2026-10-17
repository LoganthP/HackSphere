import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { api } from "@/lib/api";
import { fmtRange } from "@/lib/format";
import type { EventSummary } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";
import { ButtonLink, EmptyState, ErrorState, PageHeader, Spinner, StageBadge } from "@/components/ui";

export default function OrganizerHome() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["events", "mine"], queryFn: () => api<{ events: EventSummary[] }>("/events/mine") });
  const canCreate = user?.role === "ADMIN" || (user?.role === "ORGANIZER" && user.organizerVerified);

  return (
    <>
      <PageHeader
        title="Organize"
        description="Your hackathons, from first draft to published results."
        actions={
          canCreate && (
            <ButtonLink to="/app/organize/new">
              <CalendarPlus className="size-4" aria-hidden /> Host a hackathon
            </ButtonLink>
          )
        }
      />
      {user?.role === "ORGANIZER" && !user.organizerVerified && (
        <p className="mb-6 rounded-2xl bg-sun-soft p-4 font-medium text-sun-deep">An administrator is reviewing your organizer account. You can create hackathons once it's verified.</p>
      )}
      {q.isLoading ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState error={q.error} />
      ) : q.data!.events.length === 0 ? (
        <EmptyState icon={<CalendarPlus className="size-6" />} title="No hackathons yet" body="Create a draft, add problem statements, then open registration when you're ready." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data!.events.map((e) => (
            <Link key={e.id} to={`/app/organize/${e.id}`} className="tile hover-lift flex gap-4 p-5">
              <span className="clay w-3 shrink-0 rounded-full" style={{ ["--clay" as string]: e.accentColor }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-xl font-bold">{e.title}</p>
                  <StageBadge stage={e.stage} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">{fmtRange(e.startsAt, e.endsAt)}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    [e._count?.teams ?? 0, "teams"],
                    [e._count?.registrations ?? 0, "approved"],
                    [e._count?.problems ?? 0, "challenges"],
                  ].map(([n, l]) => (
                    <div key={l} className="rounded-xl bg-surface-2 py-2">
                      <p className="font-display text-xl font-bold">{n}</p>
                      <p className="text-xs text-ink-soft">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
