import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import type { Notification } from "@/lib/types";
import { Button, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";

export default function Notifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ notifications: Notification[]; unread: number }>("/notifications") });
  const readAll = useMutation({ mutationFn: () => api("/notifications/read-all", { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const readOne = useMutation({ mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState error={q.error} />;
  const { notifications, unread } = q.data!;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={unread > 0 && <Button variant="secondary" size="sm" onClick={() => readAll.mutate()} loading={readAll.isPending}>Mark all as read</Button>}
      />
      {notifications.length === 0 ? (
        <EmptyState icon={<BellOff className="size-6" />} title="No notifications yet" body="Invitations, registration decisions, announcements and results will show up here." />
      ) : (
        <ul className="tile divide-y divide-line overflow-hidden p-0">
          {notifications.map((n) => {
            const body = (
              <>
                <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-coral")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block", !n.read && "font-semibold")}>{n.title}</span>
                  <span className="block text-sm text-ink-soft">{n.body}</span>
                </span>
                <time className="shrink-0 text-xs text-ink-soft" dateTime={n.createdAt}>
                  {relative(n.createdAt)}
                </time>
                <span className="sr-only">{n.read ? "Read" : "Unread"}</span>
              </>
            );
            const cls = cn("flex gap-3 px-5 py-4 transition-colors hover:bg-surface-2", !n.read && "bg-violet-tint/40 dark:bg-violet/10");
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link to={n.link} className={cls} onClick={() => !n.read && readOne.mutate(n.id)}>
                    {body}
                  </Link>
                ) : (
                  <button className={cn(cls, "w-full text-left")} onClick={() => !n.read && readOne.mutate(n.id)}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
