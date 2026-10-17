import type { Server } from "socket.io";

let io: Server | null = null;
export const setIo = (server: Server) => (io = server);
export const emitToUser = (userId: string, event: string, payload: unknown) => io?.to(`user:${userId}`).emit(event, payload);
export const emitToEvent = (eventId: string, event: string, payload: unknown) => io?.to(`event:${eventId}`).emit(event, payload);
