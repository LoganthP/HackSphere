import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-5 pt-10 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:pt-16">
      <div className="tile p-6 sm:p-10">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
      <div className={aside ? "block" : "hidden lg:block"}>{aside ?? <ClayPanel />}</div>
    </div>
  );
}

function ClayPanel() {
  return (
    <div className="clay relative h-full min-h-96 overflow-hidden rounded-[var(--radius-tile)] p-8 text-ink" style={{ ["--clay" as string]: "var(--auth-clay)" }}>
      <p className="relative z-10 max-w-xs font-display text-3xl font-bold leading-tight">Teams, challenges, judging and results, all in one place.</p>
      <span className="clay absolute bottom-10 right-10 size-32 rounded-full" style={{ ["--clay" as string]: "#7058F5" }} aria-hidden />
      <span className="clay absolute bottom-32 right-40 size-16 rounded-2xl rotate-12" style={{ ["--clay" as string]: "#FFC857" }} aria-hidden />
      <span className="clay absolute bottom-12 left-10 size-20 rounded-full" style={{ ["--clay" as string]: "#3DCFAE" }} aria-hidden />
      <span className="clay absolute right-12 top-44 size-10 rounded-full" style={{ ["--clay" as string]: "#FF7890" }} aria-hidden />
    </div>
  );
}
