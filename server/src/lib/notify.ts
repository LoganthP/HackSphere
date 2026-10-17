import { prisma } from "./prisma";
import { emitToUser } from "./realtime";

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string;
}

export async function notify(userIds: string | string[], n: NotifyInput) {
  const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
  for (const userId of ids) {
    const created = await prisma.notification.create({ data: { userId, ...n } });
    emitToUser(userId, "notification", created);
  }
}

export async function audit(actorId: string | null, action: string, targetType: string, targetId?: string, meta?: unknown) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, meta: meta === undefined ? null : JSON.stringify(meta) },
  });
}

/** Everyone on a team in this event. */
export async function teamMemberIds(teamId: string) {
  const members = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
  return members.map((m) => m.userId);
}
