import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateTime, fmtShort, STAGE_LABEL } from "@/lib/format";
import type { EventStage, PlatformRole, User } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";
import { Avatar, Badge, Button, EmptyState, ErrorState, Input, PageHeader, Select, Spinner, StageBadge, Tile, TileHeader } from "@/components/ui";
import { Tabs, TabPanel } from "@/components/Tabs";
import { useToast } from "@/components/Toast";

interface Overview {
  users: number;
  events: number;
  pendingOrganizers: number;
  suspended: number;
  byRole: { role: PlatformRole; count: number }[];
  byStage: { stage: EventStage; count: number }[];
  signups: { day: string; count: number }[];
}

const tooltipStyle = { borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)" };

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => api<Overview>("/admin/overview") });

  return (
    <>
      <PageHeader title="Administration" description="Accounts, organizer verification, event moderation and the audit trail." />
      <Tabs
        id="admin"
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "users", label: "Users", count: overview.data?.pendingOrganizers },
          { value: "events", label: "Hackathons" },
          { value: "audit", label: "Audit log" },
        ]}
      >
        <TabPanel value="overview">{overview.isLoading ? <Spinner /> : overview.isError ? <ErrorState error={overview.error} /> : <OverviewPanel o={overview.data!} />}</TabPanel>
        <TabPanel value="users">
          <Users />
        </TabPanel>
        <TabPanel value="events">
          <Events />
        </TabPanel>
        <TabPanel value="audit">
          <Audit />
        </TabPanel>
      </Tabs>
    </>
  );
}

function OverviewPanel({ o }: { o: Overview }) {
  const tiles = [
    { n: o.users, label: "Accounts", clay: "#FFC857" },
    { n: o.events, label: "Hackathons", clay: "#3DCFAE" },
    { n: o.pendingOrganizers, label: "Organizers to verify", clay: "#9C8CFF" },
    { n: o.suspended, label: "Suspended", clay: "#FF9AAC" },
  ];
  const stages = (Object.keys(STAGE_LABEL) as EventStage[]).map((s) => ({ name: STAGE_LABEL[s], count: o.byStage.find((b) => b.stage === s)?.count ?? 0 }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="clay rounded-[1.5rem] p-5 text-navy" style={{ ["--clay" as string]: t.clay }}>
            <p className="font-display text-4xl font-extrabold tabular-nums">{t.n}</p>
            <p className="text-sm font-semibold">{t.label}</p>
          </div>
        ))}
      </div>
      <Tile>
        <TileHeader title="Sign-ups" />
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={o.signups.map((s) => ({ day: fmtShort(s.day), count: s.count }))} margin={{ left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--ink-soft)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="count" name="New accounts" fill="var(--chart-blue)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Tile>
      <Tile>
        <TileHeader title="Hackathons by stage" />
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} width={110} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="count" name="Hackathons" fill="var(--chart-violet)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Tile>
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [pending, setPending] = useState(false);
  const qs = new URLSearchParams({ ...(q && { q }), ...(role && { role }), ...(pending && { pending: "true" }) }).toString();
  const users = useQuery({ queryKey: ["admin", "users", qs], queryFn: () => api<{ users: User[] }>(`/admin/users?${qs}`), placeholderData: (p) => p });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<User, "role" | "status" | "organizerVerified">> }) => api(`/admin/users/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Account updated", tone: "success" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-10" />
        </label>
        <label>
          <span className="sr-only">Role</span>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="md:w-44">
            <option value="">All roles</option>
            <option value="PARTICIPANT">Participants</option>
            <option value="ORGANIZER">Organizers</option>
            <option value="ADMIN">Admins</option>
          </Select>
        </label>
        <Button variant={pending ? "sun" : "secondary"} onClick={() => setPending((p) => !p)} aria-pressed={pending}>
          Awaiting verification
        </Button>
      </div>
      {users.isLoading ? (
        <Spinner />
      ) : !users.data?.users.length ? (
        <EmptyState title="No accounts match" />
      ) : (
        <div className="tile overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">Person</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data.users.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} color={u.avatarColor} size={34} />
                        <div>
                          <p className="font-semibold">
                            {u.name}
                            {self && <span className="ml-1 text-ink-soft">(you)</span>}
                          </p>
                          <p className="text-xs text-ink-soft">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <label>
                        <span className="sr-only">Role for {u.name}</span>
                        <Select className="h-9 w-36 text-sm" value={u.role} disabled={self} onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value as PlatformRole } })}>
                          <option value="PARTICIPANT">Participant</option>
                          <option value="ORGANIZER">Organizer</option>
                          <option value="ADMIN">Admin</option>
                        </Select>
                      </label>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={u.status === "ACTIVE" ? "bg-mint-tint text-mint-ink" : "bg-coral-tint text-coral-ink"}>{u.status === "ACTIVE" ? "Active" : "Suspended"}</Badge>
                        {u.role === "ORGANIZER" && <Badge className={u.organizerVerified ? "bg-violet-tint text-violet-ink" : "bg-sun-tint text-sun-ink"}>{u.organizerVerified ? "Verified" : "Unverified"}</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {u.role === "ORGANIZER" && !u.organizerVerified && (
                          <Button size="sm" onClick={() => update.mutate({ id: u.id, body: { organizerVerified: true } })}>
                            Verify
                          </Button>
                        )}
                        {!self && (
                          <Button size="sm" variant={u.status === "ACTIVE" ? "danger" : "secondary"} onClick={() => update.mutate({ id: u.id, body: { status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } })}>
                            {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Events() {
  const q = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => api<{ events: { id: string; slug: string; title: string; stage: EventStage; createdAt: string; organizer: { name: string; email: string }; _count: { teams: number; problems: number } }[] }>("/admin/events"),
  });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} />;
  return (
    <ul className="space-y-3">
      {q.data!.events.map((e) => (
        <li key={e.id} className="tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{e.title}</p>
            <p className="text-sm text-ink-soft">
              {e.organizer.name}, {e._count.teams} teams, {e._count.problems} challenges, created {fmtDate(e.createdAt)}
            </p>
          </div>
          <StageBadge stage={e.stage} />
          <Link to={`/app/organize/${e.id}`} className="text-sm font-semibold text-violet-ink hover:underline">
            Moderate
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Audit() {
  const [action, setAction] = useState("");
  const q = useQuery({
    queryKey: ["admin", "audit", action],
    queryFn: () => api<{ logs: { id: string; action: string; targetType: string; targetId: string | null; meta: string | null; createdAt: string; actor: { name: string; email: string } | null }[] }>(`/admin/audit${action ? `?action=${encodeURIComponent(action)}` : ""}`),
    placeholderData: (p) => p,
  });
  return (
    <>
      <label className="mb-4 block max-w-sm">
        <span className="sr-only">Filter by action</span>
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action, e.g. results or judge" />
      </label>
      {q.isLoading ? (
        <Spinner />
      ) : (
        <div className="tile overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Who</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.logs.map((l) => (
                <tr key={l.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-5 py-3">{l.actor?.name ?? "System"}</td>
                  <td className="px-5 py-3">
                    <code className={cn("rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-semibold")}>{l.action}</code>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3 text-ink-soft" title={l.meta ?? undefined}>
                    {l.targetType}
                    {l.meta ? ` ${l.meta}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
