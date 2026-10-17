import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, parse } from "../lib/http";
import { me, requireAuth } from "../middleware/auth";
import { PUBLIC_STAGES, effectiveDeadline } from "../lib/access";

const router = Router();

/** Public landing-page numbers — always real counts from the database. */
router.get(
  "/stats",
  ah(async (_req, res) => {
    const [events, participants, teams, submissions, next, problems] = await Promise.all([
      prisma.event.count({ where: { stage: { in: [...PUBLIC_STAGES] } } }),
      prisma.user.count({ where: { role: "PARTICIPANT" } }),
      prisma.team.count(),
      prisma.submission.count({ where: { isFinal: true } }),
      prisma.event.findFirst({
        where: { stage: { in: ["PUBLISHED", "REGISTRATION_OPEN"] }, startsAt: { gt: new Date() } },
        orderBy: { startsAt: "asc" },
        select: { id: true, slug: true, title: true, tagline: true, startsAt: true, registrationClosesAt: true, mode: true, location: true, accentColor: true, stage: true },
      }),
      prisma.problemStatement.findMany({
        where: { event: { stage: { in: ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS"] } } },
        include: { event: { select: { slug: true, title: true } }, _count: { select: { teams: true } } },
        take: 4,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({ events, participants, teams, submissions, nextEvent: next, featuredProblems: problems });
  }),
);

router.get(
  "/users/search",
  requireAuth,
  ah(async (req, res) => {
    const { q } = parse(z.object({ q: z.string().trim().min(2) }), req.query);
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE", OR: [{ name: { contains: q } }, { email: { contains: q } }] },
      select: { id: true, name: true, email: true, avatarColor: true, college: true, skills: true },
      take: 8,
    });
    res.json({ users });
  }),
);

router.get(
  "/dashboard",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const now = new Date();
    const [memberships, invitations, notifications, openEvents, judgeAssignments, organized] = await Promise.all([
      prisma.teamMember.findMany({
        where: { userId: user.id },
        include: {
          team: {
            include: {
              event: true,
              registration: { select: { status: true } },
              members: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
              problem: { select: { code: true, title: true } },
              project: { select: { title: true, milestones: true, submissions: { orderBy: { version: "desc" }, take: 1, select: { isFinal: true, version: true } } } },
            },
          },
        },
      }),
      prisma.invitation.findMany({
        where: { recipientId: user.id, status: "PENDING" },
        include: { team: { select: { id: true, name: true, event: { select: { title: true } } } }, sender: { select: { name: true, avatarColor: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.event.findMany({
        where: { stage: { in: ["PUBLISHED", "REGISTRATION_OPEN"] } },
        include: { _count: { select: { teams: true } } },
        orderBy: { startsAt: "asc" },
      }),
      prisma.judgeAssignment.findMany({
        where: { judgeId: user.id, conflict: false },
        include: { event: { select: { stage: true } }, team: { select: { evaluations: { where: { judgeId: user.id }, select: { status: true } } } } },
      }),
      user.role === "PARTICIPANT"
        ? Promise.resolve([])
        : prisma.event.findMany({
            where: user.role === "ADMIN" ? {} : { OR: [{ organizerId: user.id }, { roles: { some: { userId: user.id, role: "ORGANIZER" } } }] },
            include: { _count: { select: { teams: true } }, registrations: { where: { status: "PENDING" }, select: { id: true } } },
            orderBy: { startsAt: "asc" },
          }),
    ]);

    const myEventIds = new Set(memberships.map((m) => m.team.eventId));
    const skills = (user.skills ?? "").toLowerCase().split(/[,\s]+/).filter((s) => s.length > 2);
    const recommendations = openEvents
      .filter((e) => !myEventIds.has(e.id))
      .map((e) => {
        const hay = `${e.title} ${e.category} ${e.tagline}`.toLowerCase();
        return { ...e, match: skills.filter((s) => hay.includes(s)).length };
      })
      .sort((a, b) => b.match - a.match || a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 3);

    const deadlines: { label: string; at: Date; eventTitle: string; link: string }[] = [];
    for (const m of memberships) {
      const { team } = m;
      const ev = team.event;
      const link = `/app/teams/${team.id}`;
      if (!team.registration && ev.stage === "REGISTRATION_OPEN" && ev.registrationClosesAt > now)
        deadlines.push({ label: "Registration closes", at: ev.registrationClosesAt, eventTitle: ev.title, link });
      if (ev.startsAt > now) deadlines.push({ label: "Hackathon starts", at: ev.startsAt, eventTitle: ev.title, link });
      const due = effectiveDeadline(ev, team.deadlineExtension);
      if (due > now && ev.stage !== "COMPLETED") deadlines.push({ label: "Submission deadline", at: due, eventTitle: ev.title, link });
    }
    deadlines.sort((a, b) => a.at.getTime() - b.at.getTime());

    res.json({
      teams: memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        isLeader: m.team.leaderId === user.id,
        event: { id: m.team.event.id, slug: m.team.event.slug, title: m.team.event.title, stage: m.team.event.stage, accentColor: m.team.event.accentColor, maxTeamSize: m.team.event.maxTeamSize },
        registration: m.team.registration?.status ?? null,
        members: m.team.members.map((x) => x.user),
        problem: m.team.problem,
        project: m.team.project ? { title: m.team.project.title, milestones: JSON.parse(m.team.project.milestones), latest: m.team.project.submissions[0] ?? null } : null,
      })),
      stats: {
        registeredEvents: memberships.filter((m) => m.team.registration?.status === "APPROVED").length,
        teams: memberships.length,
        activeProjects: memberships.filter((m) => m.team.project && ["IN_PROGRESS", "REGISTRATION_OPEN", "PUBLISHED"].includes(m.team.event.stage)).length,
        unreadNotifications: await prisma.notification.count({ where: { userId: user.id, read: false } }),
      },
      invitations,
      notifications,
      deadlines: deadlines.slice(0, 6),
      recommendations,
      judging: judgeAssignments.length
        ? {
            assigned: judgeAssignments.length,
            completed: judgeAssignments.filter((a) => a.team.evaluations[0]?.status === "SUBMITTED").length,
            open: judgeAssignments.filter((a) => a.event.stage === "JUDGING").length,
          }
        : null,
      organizing: organized.length
        ? organized.map((e) => ({ id: e.id, title: e.title, stage: e.stage, teams: e._count.teams, pendingRegistrations: e.registrations.length, startsAt: e.startsAt, accentColor: e.accentColor }))
        : null,
    });
  }),
);

export default router;
