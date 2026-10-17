import { Router } from "express";
import { z } from "zod";
import { prisma, type Prisma } from "../lib/prisma";
import { ah, badRequest, forbidden, notFound, param, parse } from "../lib/http";
import { me, requireAuth } from "../middleware/auth";
import { assertManage, canManageEvent, PUBLIC_STAGES, userCard } from "../lib/access";
import { audit, notify } from "../lib/notify";
import { emitToEvent } from "../lib/realtime";
import { computeResults } from "../lib/results";

const router = Router();

const STAGES = ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS", "JUDGING", "COMPLETED"] as const;
const date = z.coerce.date({ message: "Pick a valid date and time." });

const eventFields = z.object({
  title: z.string().trim().min(4, "Use at least 4 characters.").max(100),
  tagline: z.string().trim().min(4).max(160),
  description: z.string().trim().min(20, "Describe the hackathon in at least 20 characters.").max(5000),
  category: z.string().trim().min(2).max(40),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
  location: z.string().trim().max(160).nullable().optional(),
  registrationClosesAt: date,
  startsAt: date,
  submissionDeadline: date,
  endsAt: date,
  minTeamSize: z.coerce.number().int().min(1).max(10),
  maxTeamSize: z.coerce.number().int().min(1).max(10),
  maxTeams: z.coerce.number().int().min(1).max(5000).nullable().optional(),
  eligibility: z.string().trim().max(1000).nullable().optional(),
  rules: z.string().trim().max(5000).nullable().optional(),
  prizes: z.string().trim().max(2000).nullable().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

function checkDates(d: { registrationClosesAt: Date; startsAt: Date; submissionDeadline: Date; endsAt: Date; minTeamSize: number; maxTeamSize: number; mode: string; location?: string | null }) {
  const fields: Record<string, string> = {};
  if (d.submissionDeadline <= d.startsAt) fields.submissionDeadline = "Deadline must be after the start time.";
  if (d.endsAt < d.submissionDeadline) fields.endsAt = "The event must end on or after the submission deadline.";
  if (d.registrationClosesAt > d.submissionDeadline) fields.registrationClosesAt = "Registration must close before the submission deadline.";
  if (d.minTeamSize > d.maxTeamSize) fields.minTeamSize = "Minimum team size can't exceed the maximum.";
  if (d.mode !== "ONLINE" && !d.location) fields.location = "Add a venue for offline or hybrid events.";
  if (Object.keys(fields).length) throw badRequest("Some fields need attention.", fields);
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) + "-" + Math.random().toString(36).slice(2, 6);

const listInclude = {
  organizer: { select: { id: true, name: true } },
  _count: { select: { teams: true, problems: true, registrations: { where: { status: "APPROVED" } } } },
} satisfies Prisma.EventInclude;

/* ---------- Public discovery ---------- */

router.get(
  "/",
  ah(async (req, res) => {
    const q = parse(
      z.object({
        q: z.string().optional(),
        mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
        stage: z.enum(STAGES).optional(),
        category: z.string().optional(),
        bookmarked: z.enum(["true", "false"]).optional(),
      }),
      req.query,
    );
    const where: Prisma.EventWhereInput = {
      stage: q.stage && q.stage !== "DRAFT" ? q.stage : { in: [...PUBLIC_STAGES] },
      ...(q.mode && { mode: q.mode }),
      ...(q.category && { category: q.category }),
      ...(q.q && { OR: [{ title: { contains: q.q } }, { tagline: { contains: q.q } }, { category: { contains: q.q } }] }),
      ...(q.bookmarked === "true" && req.user && { bookmarks: { some: { userId: req.user.id } } }),
    };
    const events = await prisma.event.findMany({ where, include: listInclude, orderBy: { startsAt: "asc" } });
    const bookmarks = req.user
      ? new Set((await prisma.bookmark.findMany({ where: { userId: req.user.id } })).map((b) => b.eventId))
      : new Set<string>();
    const categories = await prisma.event.findMany({ where: { stage: { in: [...PUBLIC_STAGES] } }, select: { category: true }, distinct: ["category"] });
    res.json({
      events: events.map((e) => ({ ...e, bookmarked: bookmarks.has(e.id) })),
      categories: categories.map((c) => c.category).sort(),
    });
  }),
);

router.get(
  "/mine",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const where: Prisma.EventWhereInput =
      user.role === "ADMIN" ? {} : { OR: [{ organizerId: user.id }, { roles: { some: { userId: user.id, role: "ORGANIZER" } } }] };
    const events = await prisma.event.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" } });
    res.json({ events });
  }),
);

router.get(
  "/:ref",
  ah(async (req, res) => {
    const ref = param(req, "ref");
    const event = await prisma.event.findFirst({
      where: { OR: [{ id: ref }, { slug: ref }] },
      include: {
        ...listInclude,
        problems: { orderBy: { code: "asc" } },
        criteria: { orderBy: { position: "asc" } },
        announcements: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], include: { author: { select: { name: true } } } },
      },
    });
    if (!event) throw notFound("Hackathon not found.");
    const isManager = await canManageEvent(req.user, event);
    if (event.stage === "DRAFT" && !isManager) throw notFound("Hackathon not found.");

    const teams = await prisma.team.findMany({
      where: { eventId: event.id },
      select: { problemId: true, project: { select: { submissions: { where: { isFinal: true }, select: { id: true }, take: 1 } } } },
    });
    const problems = event.problems.map((p) => ({
      ...p,
      selectedCount: teams.filter((t) => t.problemId === p.id).length,
      submittedCount: teams.filter((t) => t.problemId === p.id && t.project?.submissions.length).length,
    }));

    let viewer = null;
    if (req.user) {
      const [membership, judgeRole, bookmark] = await Promise.all([
        prisma.teamMember.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: req.user.id } },
          include: { team: { select: { id: true, name: true, leaderId: true, registration: { select: { status: true } } } } },
        }),
        prisma.eventRole.findFirst({ where: { eventId: event.id, userId: req.user.id, role: "JUDGE" } }),
        prisma.bookmark.findUnique({ where: { userId_eventId: { userId: req.user.id, eventId: event.id } } }),
      ]);
      viewer = {
        isManager,
        isJudge: Boolean(judgeRole),
        bookmarked: Boolean(bookmark),
        team: membership
          ? { id: membership.team.id, name: membership.team.name, isLeader: membership.team.leaderId === req.user.id, registration: membership.team.registration?.status ?? null }
          : null,
      };
    }
    res.json({ event: { ...event, problems }, viewer });
  }),
);

router.get(
  "/:id/teams/open",
  requireAuth,
  ah(async (req, res) => {
    const ref = param(req, "id");
    const event = await prisma.event.findFirst({ where: { OR: [{ id: ref }, { slug: ref }] } });
    if (!event) throw notFound();
    const teams = await prisma.team.findMany({
      where: { eventId: event.id, lookingForMembers: true },
      include: { members: { include: { user: userCard }, orderBy: { isLeader: "desc" } }, problem: { select: { code: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ teams: teams.filter((t) => t.members.length < event.maxTeamSize) });
  }),
);

/* ---------- Bookmarks ---------- */

router.post(
  "/:id/bookmark",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const eventId = param(req, "id");
    const key = { userId_eventId: { userId: user.id, eventId } };
    const existing = await prisma.bookmark.findUnique({ where: key });
    if (existing) await prisma.bookmark.delete({ where: key });
    else await prisma.bookmark.create({ data: { userId: user.id, eventId } });
    res.json({ bookmarked: !existing });
  }),
);

/* ---------- Create / edit / stage ---------- */

const DEFAULT_CRITERIA = [
  { name: "Innovation", description: "Originality of the idea and approach.", weight: 1.25 },
  { name: "Technical implementation", description: "Quality, completeness and complexity of the build.", weight: 1.5 },
  { name: "User experience", description: "How usable, clear and accessible the product is.", weight: 1 },
  { name: "Feasibility", description: "Could this be deployed and sustained in the real world?", weight: 1 },
  { name: "Presentation", description: "Clarity of the demo, pitch and documentation.", weight: 0.75 },
];

router.post(
  "/",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    if (user.role === "PARTICIPANT") throw forbidden("Only organizer accounts can host hackathons.");
    if (user.role === "ORGANIZER" && !user.organizerVerified) {
      throw forbidden("Your organizer account is awaiting verification by a platform administrator.");
    }
    const body = parse(eventFields, req.body);
    checkDates(body);
    const event = await prisma.event.create({
      data: {
        ...body,
        slug: slugify(body.title),
        organizerId: user.id,
        roles: { create: { userId: user.id, role: "ORGANIZER" } },
        criteria: { create: DEFAULT_CRITERIA.map((c, i) => ({ ...c, position: i })) },
      },
    });
    await audit(user.id, "event.create", "Event", event.id, { title: event.title });
    res.status(201).json({ event });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const body = parse(eventFields.partial(), req.body);
    checkDates({ ...event, ...body });
    const updated = await prisma.event.update({ where: { id: event.id }, data: body });
    await audit(user.id, "event.update", "Event", event.id);
    res.json({ event: updated });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    if (event.stage !== "DRAFT" && user.role !== "ADMIN") throw badRequest("Only draft hackathons can be deleted.");
    await prisma.event.delete({ where: { id: event.id } });
    await audit(user.id, "event.delete", "Event", event.id, { title: event.title });
    res.json({ ok: true });
  }),
);

const STAGE_MESSAGES: Partial<Record<(typeof STAGES)[number], string>> = {
  REGISTRATION_OPEN: "Registration is open. Form your team and register.",
  IN_PROGRESS: "The hackathon is live. Start building and submit before the deadline.",
  JUDGING: "Submissions are closed and judging has started.",
  COMPLETED: "The hackathon has wrapped up.",
};

router.post(
  "/:id/stage",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const { stage } = parse(z.object({ stage: z.enum(STAGES) }), req.body);
    if (stage !== "DRAFT") {
      const [problems, criteria] = await Promise.all([
        prisma.problemStatement.count({ where: { eventId: event.id } }),
        prisma.criterion.count({ where: { eventId: event.id } }),
      ]);
      if (!problems) throw badRequest("Add at least one problem statement before publishing.");
      if (!criteria) throw badRequest("Add at least one judging criterion before publishing.");
    }
    const updated = await prisma.event.update({ where: { id: event.id }, data: { stage } });
    await audit(user.id, "event.stage", "Event", event.id, { from: event.stage, to: stage });

    const msg = STAGE_MESSAGES[stage];
    if (msg && stage !== event.stage) {
      const members = await prisma.teamMember.findMany({ where: { eventId: event.id }, select: { userId: true } });
      const bookmarkers = stage === "REGISTRATION_OPEN" ? await prisma.bookmark.findMany({ where: { eventId: event.id } }) : [];
      await notify([...members.map((m) => m.userId), ...bookmarkers.map((b) => b.userId)], {
        type: "event.stage",
        title: event.title,
        body: msg,
        link: `/hackathons/${event.slug}`,
      });
      if (stage === "JUDGING") {
        const judges = await prisma.eventRole.findMany({ where: { eventId: event.id, role: "JUDGE" } });
        await notify(judges.map((j) => j.userId), { type: "judging.open", title: event.title, body: "Judging is open. Your assigned projects are ready.", link: "/app/judging" });
      }
    }
    emitToEvent(event.id, "event:updated", { id: event.id, stage });
    res.json({ event: updated });
  }),
);

/* ---------- Announcements ---------- */

router.get(
  "/:id/announcements",
  ah(async (req, res) => {
    const ref = param(req, "id");
    const event = await prisma.event.findFirst({ where: { OR: [{ id: ref }, { slug: ref }] } });
    if (!event) throw notFound();
    const announcements = await prisma.announcement.findMany({
      where: { eventId: event.id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } } },
    });
    res.json({ announcements });
  }),
);

router.post(
  "/:id/announcements",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const body = parse(
      z.object({ title: z.string().trim().min(3).max(120), body: z.string().trim().min(3).max(2000), pinned: z.boolean().optional() }),
      req.body,
    );
    const a = await prisma.announcement.create({ data: { ...body, eventId: event.id, authorId: user.id } });
    const [members, judges] = await Promise.all([
      prisma.teamMember.findMany({ where: { eventId: event.id }, select: { userId: true } }),
      prisma.eventRole.findMany({ where: { eventId: event.id, role: "JUDGE" }, select: { userId: true } }),
    ]);
    await notify([...members, ...judges].map((m) => m.userId), {
      type: "announcement",
      title: `${event.title}: ${a.title}`,
      body: a.body.slice(0, 180),
      link: `/hackathons/${event.slug}#announcements`,
    });
    emitToEvent(event.id, "announcement", a);
    res.status(201).json({ announcement: a });
  }),
);

router.delete(
  "/:id/announcements/:announcementId",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    await prisma.announcement.deleteMany({ where: { id: param(req, "announcementId"), eventId: event.id } });
    res.json({ ok: true });
  }),
);

/* ---------- Results ---------- */

router.get(
  "/:id/results",
  ah(async (req, res) => {
    const ref = param(req, "id");
    const event = await prisma.event.findFirst({ where: { OR: [{ id: ref }, { slug: ref }] } });
    if (!event) throw notFound();
    const isManager = await canManageEvent(req.user, event);
    if (!event.resultsPublished && !isManager) throw forbidden("Results haven't been published yet.");
    const results = await computeResults(event.id);
    res.json({
      event: { id: event.id, slug: event.slug, title: event.title, stage: event.stage, resultsPublished: event.resultsPublished, accentColor: event.accentColor },
      ...results,
      preview: !event.resultsPublished,
    });
  }),
);

router.post(
  "/:id/results/publish",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const event = await assertManage(user, param(req, "id"));
    const { publish } = parse(z.object({ publish: z.boolean() }), req.body);
    if (publish && !["JUDGING", "COMPLETED"].includes(event.stage)) {
      throw badRequest("Move the hackathon to judging before publishing results.");
    }
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { resultsPublished: publish, ...(publish && { stage: "COMPLETED" }) },
    });
    await audit(user.id, publish ? "results.publish" : "results.unpublish", "Event", event.id);
    if (publish) {
      const members = await prisma.teamMember.findMany({ where: { eventId: event.id }, select: { userId: true } });
      await notify(members.map((m) => m.userId), {
        type: "results",
        title: `${event.title} results are out`,
        body: "See the leaderboard and winners.",
        link: `/hackathons/${event.slug}/results`,
      });
    }
    emitToEvent(event.id, "event:updated", { id: event.id, resultsPublished: publish });
    res.json({ event: updated });
  }),
);

export default router;
