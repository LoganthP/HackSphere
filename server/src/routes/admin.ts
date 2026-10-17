import { Router } from "express";
import { z } from "zod";
import { prisma, type Prisma } from "../lib/prisma";
import { ah, badRequest, notFound, param, parse } from "../lib/http";
import { me, requireRole } from "../middleware/auth";
import { publicUser } from "../lib/access";
import { audit, notify } from "../lib/notify";

const router = Router();
router.use(requireRole("ADMIN"));

router.get(
  "/overview",
  ah(async (_req, res) => {
    const [users, byRole, events, byStage, pendingOrganizers, suspended, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.event.count(),
      prisma.event.groupBy({ by: ["stage"], _count: true }),
      prisma.user.count({ where: { role: "ORGANIZER", organizerVerified: false } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.user.findMany({ select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const signups = new Map<string, number>();
    for (const u of recentUsers) {
      const day = u.createdAt.toISOString().slice(0, 10);
      signups.set(day, (signups.get(day) ?? 0) + 1);
    }
    res.json({
      users,
      events,
      pendingOrganizers,
      suspended,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count })),
      byStage: byStage.map((s) => ({ stage: s.stage, count: s._count })),
      signups: [...signups.entries()].map(([day, count]) => ({ day, count })),
    });
  }),
);

router.get(
  "/users",
  ah(async (req, res) => {
    const q = parse(z.object({ q: z.string().optional(), role: z.enum(["PARTICIPANT", "ORGANIZER", "ADMIN"]).optional(), pending: z.enum(["true"]).optional() }), req.query);
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.pending && { role: "ORGANIZER", organizerVerified: false }),
      ...(q.q && { OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }] }),
    };
    const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ users: users.map(publicUser) });
  }),
);

router.patch(
  "/users/:id",
  ah(async (req, res) => {
    const admin = me(req);
    const id = param(req, "id");
    const body = parse(
      z.object({
        role: z.enum(["PARTICIPANT", "ORGANIZER", "ADMIN"]).optional(),
        status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
        organizerVerified: z.boolean().optional(),
      }),
      req.body,
    );
    if (id === admin.id && (body.role && body.role !== "ADMIN" || body.status === "SUSPENDED")) {
      throw badRequest("You can't demote or suspend your own account.");
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFound("User not found.");
    const user = await prisma.user.update({ where: { id }, data: body });
    if (body.status === "SUSPENDED") await prisma.session.deleteMany({ where: { userId: id } });
    await audit(admin.id, "admin.user.update", "User", id, body);
    if (body.organizerVerified && !target.organizerVerified) {
      await notify(id, { type: "organizer.verified", title: "You're verified to host hackathons", body: "You can now create and publish events.", link: "/app/organize/new" });
    }
    res.json({ user: publicUser(user) });
  }),
);

router.get(
  "/events",
  ah(async (_req, res) => {
    const events = await prisma.event.findMany({
      include: { organizer: { select: { name: true, email: true } }, _count: { select: { teams: true, problems: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ events });
  }),
);

router.get(
  "/audit",
  ah(async (req, res) => {
    const q = parse(z.object({ action: z.string().optional(), take: z.coerce.number().int().min(1).max(500).default(100) }), req.query);
    const logs = await prisma.auditLog.findMany({
      where: q.action ? { action: { contains: q.action } } : {},
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: q.take,
    });
    res.json({ logs });
  }),
);

export default router;
