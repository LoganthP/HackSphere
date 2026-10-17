import type { NextFunction, Request, Response } from "express";
import { prisma, type User, type PlatformRole } from "../lib/prisma";
import { env } from "../lib/env";
import { forbidden, unauthorized } from "../lib/http";
import { randomToken, sha256 } from "../lib/security";

export const SESSION_COOKIE = "hs_session";
const SESSION_DAYS = 7;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function createSession(res: Response, userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { id: sha256(token), userId, expiresAt } });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function userFromToken(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = (await userFromToken(req.cookies?.[SESSION_COOKIE])) ?? undefined;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export const requireRole =
  (...roles: PlatformRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

/** Narrowing helper for handlers behind requireAuth. */
export const me = (req: Request) => {
  if (!req.user) throw unauthorized();
  return req.user;
};
