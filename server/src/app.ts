import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";
import { env } from "./lib/env";
import { errorHandler } from "./lib/http";
import { attachUser } from "./middleware/auth";
import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import manageRoutes from "./routes/manage";
import teamRoutes, { invitationsRouter } from "./routes/teams";
import judgingRoutes from "./routes/judging";
import notificationRoutes from "./routes/notifications";
import dashboardRoutes from "./routes/dashboard";
import adminRoutes from "./routes/admin";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" }, contentSecurityPolicy: false }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(attachUser);

  app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/manage", manageRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/invitations", invitationsRouter);
  app.use("/api/judging", judgingRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", (_req, res) => res.status(404).json({ error: "Unknown API route." }));

  // Optional single-host deployment: serve the built React app if it exists.
  const clientDist = path.resolve(process.cwd(), "../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
