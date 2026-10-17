import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./lib/env";
import { setIo } from "./lib/realtime";
import { SESSION_COOKIE, userFromToken } from "./middleware/auth";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin, credentials: true } });
setIo(io);

function readCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
}

io.use(async (socket, next) => {
  try {
    const user = await userFromToken(readCookie(socket.handshake.headers.cookie, SESSION_COOKIE));
    socket.data.userId = user?.id ?? null;
    next();
  } catch (e) {
    next(e as Error);
  }
});

io.on("connection", (socket) => {
  if (socket.data.userId) socket.join(`user:${socket.data.userId}`);
  socket.on("event:join", (eventId: unknown) => {
    if (typeof eventId === "string" && eventId.length < 64) socket.join(`event:${eventId}`);
  });
  socket.on("event:leave", (eventId: unknown) => {
    if (typeof eventId === "string") socket.leave(`event:${eventId}`);
  });
});

server.listen(env.port, () => {
  console.log(`HackSphere API listening on http://localhost:${env.port}`);
});
