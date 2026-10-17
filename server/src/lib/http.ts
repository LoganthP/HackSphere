import type { NextFunction, Request, Response, RequestHandler } from "express";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const badRequest = (m: string, d?: unknown) => new HttpError(400, m, d);
export const unauthorized = (m = "Sign in to continue.") => new HttpError(401, m);
export const forbidden = (m = "You don't have permission to do that.") => new HttpError(403, m);
export const notFound = (m = "Not found.") => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);

/** Wraps an async route so thrown errors reach the error middleware. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join(".") || "_"] = issue.message;
    throw badRequest("Some fields need attention.", fields);
  }
  return result.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid input." });
  }
  const code = (err as { code?: string })?.code;
  if (code === "P2002") return res.status(409).json({ error: "That already exists." });
  if (code === "P2025") return res.status(404).json({ error: "Not found." });
  if (code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File is larger than 15 MB." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
}

export const param = (req: Request, key: string) => String(req.params[key]);
