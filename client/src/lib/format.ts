import type { EventMode, EventStage } from "./types";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export const fmtDate = (d: string | Date) => dateFmt.format(new Date(d));
export const fmtDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));
export const fmtShort = (d: string | Date) => shortFmt.format(new Date(d));

export function fmtRange(a: string | Date, b: string | Date) {
  const s = new Date(a);
  const e = new Date(b);
  if (s.toDateString() === e.toDateString()) return fmtDate(s);
  return `${fmtShort(s)} – ${fmtDate(e)}`;
}

export function relative(d: string | Date) {
  const diff = new Date(d).getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  return fmtDate(d);
}

/** For <input type="datetime-local"> */
export function toLocalInput(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export const STAGE_LABEL: Record<EventStage, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Announced",
  REGISTRATION_OPEN: "Registration open",
  IN_PROGRESS: "Live now",
  JUDGING: "Judging",
  COMPLETED: "Completed",
};

/** One stage → one colour, used consistently across the whole app. */
export const STAGE_STYLE: Record<EventStage, string> = {
  DRAFT: "bg-surface-2 text-ink-soft",
  PUBLISHED: "bg-sun-tint text-sun-ink",
  REGISTRATION_OPEN: "bg-mint-tint text-mint-ink",
  IN_PROGRESS: "bg-blue-tint text-blue-ink",
  JUDGING: "bg-coral-tint text-coral-ink",
  COMPLETED: "bg-violet-tint text-violet-ink",
};

export const STAGES: EventStage[] = ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS", "JUDGING", "COMPLETED"];

export const MODE_LABEL: Record<EventMode, string> = { ONLINE: "Online", OFFLINE: "In person", HYBRID: "Hybrid" };

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const pluralize = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Pick navy or white for a coloured surface, deepening navy when neither reaches AA. */
export function readableOn(hex: string) {
  const c = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  const navyL = 0.0204;
  const vsWhite = 1.05 / (L + 0.05);
  const vsNavy = (L + 0.05) / (navyL + 0.05);
  if (vsWhite < 4.5 && vsNavy < 4.5) return "#161a33";
  return vsWhite > vsNavy ? "#FFFFFF" : "#202747";
}
