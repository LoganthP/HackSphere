import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox as InboxIcon } from "lucide-react";
import { api } from "@/lib/api";
import { relative } from "@/lib/format";
import type { Invitation } from "@/lib/types";
import { Avatar, Button, EmptyState, ErrorState, PageHeader, Spinner, Tile, TileHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function Inbox() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["invitations"], queryFn: () => api<{ invitations: Invitation[]; requests: Invitation[]; sent: Invitation[] }>("/invitations") });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => api(`/invitations/${id}/respond`, { body: { accept } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries();
      toast({ title: v.accept ? "Accepted" : "Declined", tone: v.accept ? "success" : "info" });
    },
    onError: (e) => toast({ title: e.message, tone: "error" }),
  });
  const cancel = useMutation({ mutationFn: (id: string) => api(`/invitations/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries() });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} />;
  const { invitations, requests, sent } = q.data!;

  const Row = ({ inv, mode }: { inv: Invitation; mode: "invite" | "request" | "sent" }) => {
    const person = mode === "sent" ? inv.recipient : inv.sender;
    const full = inv.team._count.members >= inv.team.event.maxTeamSize;
    return (
      <li className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
        <Avatar name={person.name} color={person.avatarColor} size={44} />
        <div className="min-w-0 flex-1">
          <p>
            {mode === "invite" && (
              <>
                <span className="font-semibold">{person.name}</span> invited you to join <span className="font-semibold">{inv.team.name}</span>
              </>
            )}
            {mode === "request" && (
              <>
                <span className="font-semibold">{person.name}</span> wants to join <span className="font-semibold">{inv.team.name}</span>
              </>
            )}
            {mode === "sent" &&
              (inv.kind === "INVITE" ? (
                <>
                  You invited <span className="font-semibold">{person.name}</span> to {inv.team.name}
                </>
              ) : (
                <>
                  You asked to join <span className="font-semibold">{inv.team.name}</span>
                </>
              ))}
          </p>
          <p className="text-sm text-ink-soft">
            <Link to={`/hackathons/${inv.team.event.slug}`} className="hover:underline">
              {inv.team.event.title}
            </Link>
            , {inv.team._count.members}/{inv.team.event.maxTeamSize} members, {relative(inv.createdAt)}
          </p>
          {inv.message && <p className="mt-1 text-sm italic">"{inv.message}"</p>}
        </div>
        <div className="flex gap-2">
          {mode === "sent" ? (
            <Button size="sm" variant="ghost" onClick={() => cancel.mutate(inv.id)}>
              Withdraw
            </Button>
          ) : (
            <>
              <Button size="sm" disabled={full} onClick={() => respond.mutate({ id: inv.id, accept: true })} title={full ? "This team is full" : undefined}>
                Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => respond.mutate({ id: inv.id, accept: false })}>
                Decline
              </Button>
            </>
          )}
        </div>
      </li>
    );
  };

  const empty = !invitations.length && !requests.length && !sent.length;
  return (
    <>
      <PageHeader title="Invitations" description="Team invitations you've received, requests to join teams you lead, and requests you've sent." />
      {empty ? (
        <EmptyState icon={<InboxIcon className="size-6" />} title="Nothing waiting on you" body="Invitations and join requests will appear here." />
      ) : (
        <div className="space-y-4">
          {invitations.length > 0 && (
            <Tile>
              <TileHeader title="Invitations for you" />
              <ul className="space-y-3">{invitations.map((i) => <Row key={i.id} inv={i} mode="invite" />)}</ul>
            </Tile>
          )}
          {requests.length > 0 && (
            <Tile>
              <TileHeader title="Requests to join your teams" />
              <ul className="space-y-3">{requests.map((i) => <Row key={i.id} inv={i} mode="request" />)}</ul>
            </Tile>
          )}
          {sent.length > 0 && (
            <Tile>
              <TileHeader title="Sent by you" />
              <ul className="space-y-3">{sent.map((i) => <Row key={i.id} inv={i} mode="sent" />)}</ul>
            </Tile>
          )}
        </div>
      )}
    </>
  );
}
