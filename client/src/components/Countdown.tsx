import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function parts(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    days: Math.floor(ms / 864e5),
    hours: Math.floor((ms / 36e5) % 24),
    minutes: Math.floor((ms / 6e4) % 60),
    seconds: Math.floor((ms / 1e3) % 60),
    done: ms === 0,
  };
}

export function useCountdown(to: string | Date) {
  const target = new Date(to).getTime();
  const [p, setP] = useState(() => parts(target));
  useEffect(() => {
    setP(parts(target));
    const t = setInterval(() => setP(parts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  return p;
}

export function Countdown({ to, className, compact }: { to: string | Date; className?: string; compact?: boolean }) {
  const p = useCountdown(to);
  if (compact) {
    return (
      <span className={cn("tabular-nums", className)}>
        {p.done ? "now" : p.days > 0 ? `${p.days}d ${p.hours}h` : `${p.hours}h ${p.minutes}m`}
      </span>
    );
  }
  const cells = [
    ["days", p.days],
    ["hrs", p.hours],
    ["min", p.minutes],
    ["sec", p.seconds],
  ] as const;
  return (
    <div className={cn("flex gap-2", className)} role="timer" aria-label={`${p.days} days, ${p.hours} hours, ${p.minutes} minutes remaining`}>
      {cells.map(([label, v]) => (
        <div key={label} className="flex min-w-14 flex-col items-center rounded-2xl bg-white/70 px-2 py-2 text-ink dark:bg-surface">
          <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl" aria-hidden>
            {String(v).padStart(2, "0")}
          </span>
          <span className="text-xs font-medium text-ink-soft" aria-hidden>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
