import { NavLink, Outlet } from "react-router";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/cn";

export function PublicLayout() {
  const { user } = useAuth();
  return (
    <div className="canvas-field min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <nav className="glass mx-auto flex max-w-6xl items-center gap-3 rounded-2xl px-3 py-2 sm:px-4" aria-label="Main">
          <Logo />
          <div className="ml-4 hidden items-center gap-1 sm:flex">
            {[
              ["/hackathons", "Explore hackathons"],
              ["/#how-it-works", "How it works"],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn("rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink", isActive && to !== "/#how-it-works" && "text-ink")}>
                {label}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <ButtonLink to="/app" size="sm">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/login" size="sm" className="sm:hidden">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/register" size="sm" className="hidden sm:inline-flex">
                  Create account
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="mx-auto mt-20 max-w-6xl px-6 pb-10 text-sm text-ink-soft">
        <div className="flex flex-col justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <Logo className="text-base" />
          <p>Built for students, organizers and judges. A Human–Computer Interaction project.</p>
        </div>
      </footer>
    </div>
  );
}
