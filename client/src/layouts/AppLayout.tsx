import { useState, type ComponentType } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import * as DM from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CalendarCog, Compass, Gavel, LayoutGrid, LogOut, Mail, Menu, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Logo } from "@/components/Logo";
import { Avatar, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ThemeMenuItems } from "@/components/ThemeControl";
import { useRealtime } from "@/lib/useRealtime";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
  end?: boolean;
}

function useNav(): NavItem[][] {
  const { user, context } = useAuth();
  const notes = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ unread: number }>("/notifications"), enabled: !!user, refetchInterval: 60_000 });
  if (!user) return [];
  const main: NavItem[] = [
    { to: "/app", label: "Dashboard", icon: LayoutGrid, end: true },
    { to: "/hackathons", label: "Explore", icon: Compass },
    { to: "/app/teams", label: "My teams", icon: Users },
    { to: "/app/inbox", label: "Invitations", icon: Mail, badge: context?.pendingInvites },
    { to: "/app/notifications", label: "Notifications", icon: Bell, badge: notes.data?.unread },
  ];
  const roles: NavItem[] = [];
  if (context?.isJudge) roles.push({ to: "/app/judging", label: "Judging", icon: Gavel });
  if (user.role === "ORGANIZER" || user.role === "ADMIN" || context?.organizesEvents) roles.push({ to: "/app/organize", label: "Organize", icon: CalendarCog });
  if (user.role === "ADMIN") roles.push({ to: "/app/admin", label: "Administration", icon: ShieldCheck });
  return [main, roles];
}

function NavList({ groups, onNavigate, layoutKey }: { groups: NavItem[][]; onNavigate?: () => void; layoutKey: string }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="App" className="flex flex-col gap-5">
      {groups
        .filter((g) => g.length)
        .map((group, gi) => (
          <ul key={gi} className="flex flex-col gap-1">
            {gi === 1 && <li className="mb-1 px-3 text-xs font-semibold text-ink-soft">Your roles</li>}
            {group.map((item) => {
              const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={onNavigate} className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-semibold transition-colors", active ? "text-ink" : "text-ink-soft hover:text-ink")}>
                    {active && <motion.span layoutId={`nav-${layoutKey}`} className="neu absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                    <Icon className={cn("relative size-5", active && "text-violet-ink")} />
                    <span className="relative">{item.label}</span>
                    {!!item.badge && <span className="relative ml-auto rounded-full bg-coral px-2 text-xs font-bold leading-5 text-navy">{item.badge}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        ))}
    </nav>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const itemCls = "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-surface-2";
  return (
    <DM.Root>
      <DM.Trigger className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2" aria-label="Account menu">
        <Avatar name={user.name} color={user.avatarColor} size={38} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-ink-soft">{user.email}</span>
        </span>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="start" sideOffset={8} className="z-50 min-w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]">
          <DM.Item className={itemCls} onSelect={() => navigate("/app/profile")}>
            <UserRound className="size-4" /> Profile and settings
          </DM.Item>
          <DM.Separator className="my-1 h-px bg-line" />
          <ThemeMenuItems />
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item
            className={cn(itemCls, "text-coral-ink")}
            onSelect={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut className="size-4" /> Sign out
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const groups = useNav();
  const [open, setOpen] = useState(false);
  useRealtime(user?.id);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  return (
    <div className="canvas-field min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh p-3 lg:block">
        <div className="glass flex h-full flex-col rounded-[var(--radius-tile)] p-4">
          <Logo to="/app" className="mb-8 px-2 pt-1" />
          <NavList groups={groups} layoutKey="desk" />
          <div className="mt-auto">
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-40 p-3 lg:hidden">
        <div className="glass flex items-center justify-between rounded-2xl px-3 py-2">
          <Logo to="/app" />
          <div className="flex items-center gap-1">
            <Link to="/app/notifications" className="rounded-xl p-2 hover:bg-surface-2" aria-label="Notifications">
              <Bell className="size-5" />
            </Link>
            <button onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-surface-2" aria-label="Open menu" aria-expanded={open}>
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-navy/30 backdrop-blur-sm dark:bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col bg-surface p-4 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              aria-label="Menu"
            >
              <div className="mb-6 flex items-center justify-between">
                <Logo to="/app" />
                <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-surface-2" aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              <NavList groups={groups} onNavigate={() => setOpen(false)} layoutKey="mobile" />
              <div className="mt-auto">
                <UserMenu />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main id="app-main" className="min-w-0 px-4 pb-16 pt-2 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: ("ORGANIZER" | "ADMIN" | "JUDGE")[]; children: React.ReactNode }) {
  const { user, context } = useAuth();
  const ok = roles.some((r) => (r === "JUDGE" ? context?.isJudge : r === "ORGANIZER" ? user?.role === "ORGANIZER" || user?.role === "ADMIN" || context?.organizesEvents : user?.role === r));
  if (!ok)
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="text-2xl font-bold">This area isn't part of your account</h1>
        <p className="mt-2 text-ink-soft">Ask a platform administrator if you need access.</p>
        <Link to="/app" className="mt-6 inline-block font-semibold text-violet-ink underline-offset-4 hover:underline">
          Back to your dashboard
        </Link>
      </div>
    );
  return <>{children}</>;
}
