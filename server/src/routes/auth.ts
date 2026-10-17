import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ah, badRequest, forbidden, parse, unauthorized } from "../lib/http";
import { hashPassword, randomToken, sha256, verifyPassword } from "../lib/security";
import { createSession, destroySession, me, requireAuth } from "../middleware/auth";
import { publicUser } from "../lib/access";
import { audit } from "../lib/notify";
import { env } from "../lib/env";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 30 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a few minutes and try again." },
});

const AVATAR_COLORS = ["#7058F5", "#4285FF", "#FF7890", "#FFC857", "#3DCFAE"];
const password = z.string().min(8, "Use at least 8 characters.").max(128);

async function contextFor(userId: string) {
  const [judgeRoles, ledTeams, organizerRoles, pendingInvites] = await Promise.all([
    prisma.eventRole.count({ where: { userId, role: "JUDGE" } }),
    prisma.team.count({ where: { leaderId: userId } }),
    prisma.event.count({ where: { OR: [{ organizerId: userId }, { roles: { some: { userId, role: "ORGANIZER" } } }] } }),
    prisma.invitation.count({ where: { recipientId: userId, status: "PENDING" } }),
  ]);
  return { isJudge: judgeRoles > 0, isTeamLeader: ledTeams > 0, organizesEvents: organizerRoles > 0, pendingInvites };
}

router.post(
  "/register",
  authLimiter,
  ah(async (req, res) => {
    const body = parse(
      z.object({
        name: z.string().trim().min(2, "Enter your full name.").max(80),
        email: z.string().trim().toLowerCase().email("Enter a valid email address."),
        password,
        college: z.string().trim().max(120).optional(),
        wantsToOrganize: z.boolean().optional(),
      }),
      req.body,
    );
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw badRequest("An account with this email already exists.", { email: "Already registered — sign in instead." });
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        college: body.college || null,
        passwordHash: await hashPassword(body.password),
        role: body.wantsToOrganize ? "ORGANIZER" : "PARTICIPANT",
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      },
    });
    await createSession(res, user.id);
    await audit(user.id, "user.register", "User", user.id, { role: user.role });
    res.status(201).json({ user: publicUser(user), context: await contextFor(user.id) });
  }),
);

router.post(
  "/login",
  authLimiter,
  ah(async (req, res) => {
    const body = parse(z.object({ email: z.string().trim().toLowerCase(), password: z.string() }), req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      throw unauthorized("That email and password don't match an account.");
    }
    if (user.status === "SUSPENDED") throw forbidden("This account is suspended. Contact a platform administrator.");
    await createSession(res, user.id);
    res.json({ user: publicUser(user), context: await contextFor(user.id) });
  }),
);

router.post(
  "/logout",
  ah(async (req, res) => {
    await destroySession(req, res);
    res.json({ ok: true });
  }),
);

router.get(
  "/me",
  ah(async (req, res) => {
    if (!req.user) return res.json({ user: null, context: null });
    res.json({ user: publicUser(req.user), context: await contextFor(req.user.id) });
  }),
);

router.post(
  "/forgot",
  authLimiter,
  ah(async (req, res) => {
    const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    let devResetLink: string | undefined;
    if (user) {
      const token = randomToken();
      await prisma.passwordResetToken.create({
        data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      });
      const link = `${env.clientOrigin}/reset-password?token=${token}`;
      // No mail server in the prototype: the link is logged (and returned in development).
      console.log(`[password reset] ${email}: ${link}`);
      if (!env.isProd) devResetLink = link;
    }
    res.json({ ok: true, message: "If that email has an account, a reset link is on its way.", devResetLink });
  }),
);

router.post(
  "/reset",
  authLimiter,
  ah(async (req, res) => {
    const body = parse(z.object({ token: z.string().min(10), password }), req.body);
    const record = await prisma.passwordResetToken.findUnique({ where: { id: sha256(body.token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw badRequest("This reset link has expired. Request a new one.");
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(body.password) } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    await audit(record.userId, "user.password_reset", "User", record.userId);
    res.json({ ok: true });
  }),
);

router.post(
  "/change-password",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const body = parse(z.object({ current: z.string(), next: password }), req.body);
    if (!(await verifyPassword(user.passwordHash, body.current))) {
      throw badRequest("Current password is incorrect.", { current: "Doesn't match your current password." });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.next) } });
    res.json({ ok: true });
  }),
);

router.patch(
  "/profile",
  requireAuth,
  ah(async (req, res) => {
    const user = me(req);
    const body = parse(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        college: z.string().trim().max(120).nullable().optional(),
        bio: z.string().trim().max(400).nullable().optional(),
        skills: z.string().trim().max(200).nullable().optional(),
        avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }),
      req.body,
    );
    const updated = await prisma.user.update({ where: { id: user.id }, data: body });
    res.json({ user: publicUser(updated) });
  }),
);

export default router;
