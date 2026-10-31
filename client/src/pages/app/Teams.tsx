import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import type { EventStage, Milestone, Person, RegistrationStatus } from "@/lib/types";
import { AvatarStack, Badge, ButtonLink, EmptyState, ErrorState, PageHeader, Progress, RegistrationBadge, Spinner, StageBadge } from "@/components/ui";

interface MyTeam {
  id: string;
  name: string;
  isLeader: boolean;
  event: { id: string; slug: string; title: string; stage: EventStage; accentColor: string; maxTeamSize: number };
  members: { user: Person }[];
  registration: { status: RegistrationStatus } | null;
  problem: { code: string; title: string } | null;
  project: { title: string; milestones: string; submissions: { isFinal: boolean; version: number }[] } | null;
}

export default function Teams() {
  const q = useQuery({ queryKey: ["teams", "mine"], queryFn: () => api<{ teams: MyTeam[] }>("/teams/mine") });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const teams = q.data!.teams;
  const active = teams.filter((t) => t.event.stage !== "COMPLETED");
  const past = teams.filter((t) => t.event.stage === "COMPLETED");

  return (
    <>
      <PageHeader title="My teams" description="One team per hackathon. Open a team to manage members, your challenge and submissions." actions={<ButtonLink to="/hackathons">Find a hackathon</ButtonLink>} />
      {teams.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title="No teams yet" body="Open a hackathon to create a team or ask to join one." action={<ButtonLink to="/hackathons">Explore hackathons</ButtonLink>} />
      ) : (
        <div className="space-y-10">
          {[
            ["Active", active],
            ["Past hackathons", past],
          ].map(([label, list]) =>
            (list as MyTeam[]).length ? (
              <section key={label as string}>
                <h2 className="mb-4 text-xl font-bold">{label as string}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {(list as MyTeam[]).map((t) => {
                    const ms: Milestone[] = t.project ? JSON.parse(t.project.milestones) : [];
                    const final = t.project?.submissions[0]?.isFinal;
                    return (
                      <Link key={t.id} to={`/app/teams/${t.id}`} className="tile hover-lift block overflow-hidden">
                        <div className="clay h-3 rounded-none" style={{ ["--clay" as string]: t.event.accentColor }} aria-hidden />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-display text-xl font-bold">{t.name}</p>
                              <p className="truncate text-sm text-ink-soft">{t.event.title}</p>
                            </div>
                            <AvatarStack people={t.members.map((m) => m.user)} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <StageBadge stage={t.event.stage} />
                            <RegistrationBadge status={t.registration?.status} />
                            {t.isLeader && <Badge className="bg-sun-tint text-sun-ink">Leader</Badge>}
                            {final && <Badge className="bg-mint-tint text-mint-ink">Submitted v{t.project!.submissions[0].version}</Badge>}
                          </div>
                          <p className="mt-3 text-sm">{t.problem ? <><span className="font-semibold">{t.problem.code}</span> {t.problem.title}</> : <span className="text-ink-soft">No challenge selected</span>}</p>
                          {ms.length > 0 && <Progress className="mt-4" value={ms.filter((m) => m.done).length} max={ms.length} tone="mint" label="Milestones" />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </>
  );
}
