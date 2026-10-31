import * as RD from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay asChild>
          <motion.div className="fixed inset-0 z-[140] bg-navy/30 backdrop-blur-sm dark:bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        </RD.Overlay>
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-end p-0 sm:place-items-center sm:p-4">
          <RD.Content asChild aria-describedby={description ? undefined : undefined}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "pointer-events-auto max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-tile)] bg-surface p-6 shadow-[var(--shadow-lift)] sm:max-w-lg sm:rounded-[var(--radius-tile)]",
                className,
              )}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <RD.Title className="font-display text-xl font-bold">{title}</RD.Title>
                  {description ? (
                    <RD.Description className="mt-1 text-sm text-ink-soft">{description}</RD.Description>
                  ) : (
                    <RD.Description className="sr-only">{title}</RD.Description>
                  )}
                </div>
                <RD.Close className="rounded-xl p-2 text-ink-soft hover:bg-surface-2" aria-label="Close">
                  <X className="size-5" />
                </RD.Close>
              </div>
              {children}
            </motion.div>
          </RD.Content>
        </div>
      </RD.Portal>
    </RD.Root>
  );
}
