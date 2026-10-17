import { prisma, type User, type Event } from "./prisma";
import { forbidden, notFound } from "./http";

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw notFound("Hackathon not found.");
  return event;
}

export async function canManageEvent(user: User | undefined, event: Event) {
  if (!user) return false;
  if (user.role === "ADMIN" || event.organizerId === user.id) return true;
  const role = await prisma.eventRole.findFirst({ where: { eventId: event.id, userId: user.id, role: "ORGANIZER" } });
  return Boolean(role);
}

export async function assertManage(user: User, eventId: string) {
  const event = await getEvent(eventId);
  if (!(await canManageEvent(user, event))) throw forbidden("Only this hackathon's organizers can do that.");
  return event;
}

export async function getTeamForUser(teamId: string, user: User) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: true, members: { include: { user: true } } },
  });
  if (!team) throw notFound("Team not found.");
  const membership = team.members.find((m) => m.userId === user.id) ?? null;
  const isLeader = team.leaderId === user.id;
  const manager = await canManageEvent(user, team.event);
  return { team, membership, isLeader, manager };
}

export async function assertTeamLeader(teamId: string, user: User) {
  const ctx = await getTeamForUser(teamId, user);
  if (!ctx.isLeader) throw forbidden("Only the team leader can do that.");
  return ctx;
}

export async function assertTeamMember(teamId: string, user: User) {
  const ctx = await getTeamForUser(teamId, user);
  if (!ctx.membership && !ctx.manager) throw forbidden("You're not on this team.");
  return ctx;
}

export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  organizerVerified: u.organizerVerified,
  college: u.college,
  bio: u.bio,
  skills: u.skills,
  avatarColor: u.avatarColor,
  createdAt: u.createdAt,
});

export const userCard = { select: { id: true, name: true, email: true, avatarColor: true, college: true, skills: true } } as const;

/** Stages where the event is visible to the public. */
export const PUBLIC_STAGES = ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS", "JUDGING", "COMPLETED"] as const;

export function effectiveDeadline(event: Event, extension: Date | null) {
  return extension && extension > event.submissionDeadline ? extension : event.submissionDeadline;
}
