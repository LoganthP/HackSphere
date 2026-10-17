import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { socketUrl } from "./api";
import { useToast } from "@/components/Toast";
import type { Notification } from "./types";

/** Live notifications over Socket.IO: toast + refresh any on-screen data. */
export function useRealtime(userId: string | undefined) {
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!userId) return;
    const socket = io(socketUrl, { withCredentials: true, transports: ["websocket", "polling"] });
    socket.on("notification", (n: Notification) => {
      toast({ title: n.title, body: n.body, tone: "info" });
      qc.invalidateQueries();
    });
    return () => {
      socket.disconnect();
    };
  }, [userId, qc, toast]);
}

/** Join an event's room to receive announcements and stage changes while viewing it. */
export function useEventChannel(eventId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!eventId) return;
    const socket = io(socketUrl, { withCredentials: true, transports: ["websocket", "polling"] });
    socket.emit("event:join", eventId);
    socket.on("announcement", onUpdate);
    socket.on("event:updated", onUpdate);
    return () => {
      socket.disconnect();
    };
  }, [eventId, onUpdate]);
}
