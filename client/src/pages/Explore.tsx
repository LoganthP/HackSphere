import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { STAGE_LABEL } from "@/lib/format";
import type { EventStage, EventSummary } from "@/lib/types";
import { EmptyState, ErrorState, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/auth/AuthContext";

const STAGE_FILTERS: EventStage[] = ["REGISTRATION_OPEN", "PUBLISHED", "IN_PROGRESS", "JUDGING", "COMPLETED"];

export default function Explore() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const stage = params.get("stage") ?? "";
  const mode = params.get("mode") ?? "";
  const category = params.get("category") ?? "";
  const saved = params.get("saved") === "1";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (stage) p.set("stage", stage);
    if (mode) p.set("mode", mode);
    if (category) p.set("category", category);
    if (saved) p.set("bookmarked", "true");
    return p.toString();
  }, [q, stage, mode, category, saved]);

  const events = useQuery({
    queryKey: ["events", query],
    queryFn: () => api<{ events: EventSummary[]; categories: string[] }>(`/events?${query}`),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-6">
      <PageHeader title="Explore hackathons" description="Search by theme, format or stage. Save the ones you like and we'll tell you when registration opens." />

      <div className="glass sticky top-[5.25rem] z-30 mb-6 flex flex-col gap-3 rounded-[var(--radius-panel)] p-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search hackathons</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <Input value={q} onChange={(e) => set("q", e.target.value)} placeholder="Search by name, theme or category" className="pl-10" />
        </label>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <label>
            <span className="sr-only">Format</span>
            <Select value={mode} onChange={(e) => set("mode", e.target.value)} className="md:w-36">
              <option value="">Any format</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">In person</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Category</span>
            <Select value={category} onChange={(e) => set("category", e.target.value)} className="md:w-44">
              <option value="">All categories</option>
              {events.data?.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div className="scrollbar-none -mx-1 mb-6 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filter by stage">
        {[["", "All stages"] as const, ...STAGE_FILTERS.map((s) => [s, STAGE_LABEL[s]] as const)].map(([value, label]) => (
          <button
            key={value}
            onClick={() => set("stage", value)}
            aria-pressed={stage === value}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", stage === value ? "bg-navy text-white dark:bg-white dark:text-navy" : "neu text-ink-soft hover:text-ink")}
          >
            {label}
          </button>
        ))}
        {user && (
          <button
            onClick={() => set("saved", saved ? "" : "1")}
            aria-pressed={saved}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors", saved ? "bg-sun text-navy" : "neu text-ink-soft hover:text-ink")}
          >
            Saved
          </button>
        )}
      </div>

      {events.isLoading ? (
        <Spinner />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : events.data!.events.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="No hackathons match these filters"
          body="Try a broader search or clear a filter."
          action={
            <button className="font-semibold text-violet-ink underline-offset-4 hover:underline" onClick={() => setParams({})}>
              Clear all filters
            </button>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-soft" aria-live="polite">
            {events.data!.events.length} hackathon{events.data!.events.length === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.data!.events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
