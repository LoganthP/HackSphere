import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: Tone;
}

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info };
const TONE = {
  success: "bg-mint-tint text-mint-ink",
  error: "bg-coral-tint text-coral-ink",
  info: "bg-violet-tint text-violet-ink",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICON[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 shadow-[var(--shadow-soft)]"
                role="status"
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE[t.tone])}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="font-semibold leading-snug">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-sm text-ink-soft">{t.body}</p>}
                </div>
                <button
                  onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                  className="rounded-lg p-1 text-ink-soft hover:bg-surface-2"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
