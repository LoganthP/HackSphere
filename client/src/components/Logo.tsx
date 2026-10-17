import { Link } from "react-router";
import { cn } from "@/lib/cn";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5 font-display text-xl font-bold tracking-tight", className)} aria-label="HackSphere home">
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#7058F5" />
        <circle cx="40" cy="24" r="10" fill="#FFC857" />
        <circle cx="24" cy="40" r="12" fill="#3DCFAE" />
        <circle cx="42" cy="44" r="6" fill="#FF7890" />
      </svg>
      <span>HackSphere</span>
    </Link>
  );
}
