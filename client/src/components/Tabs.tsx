import * as RT from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
  id,
}: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { value: string; label: ReactNode; count?: number }[];
  children: ReactNode;
  id: string;
}) {
  return (
    <RT.Root value={value} onValueChange={onValueChange}>
      <RT.List className="scrollbar-none -mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Sections">
        {tabs.map((t) => (
          <RT.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "relative shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink data-[state=active]:text-violet-ink dark:data-[state=active]:text-white",
            )}
          >
            {value === t.value && (
              <motion.span layoutId={`tab-${id}`} className="neu absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            <span className="relative flex items-center gap-2">
              {t.label}
              {t.count !== undefined && t.count > 0 && <span className="rounded-full bg-coral px-1.5 text-xs leading-5 text-navy">{t.count}</span>}
            </span>
          </RT.Trigger>
        ))}
      </RT.List>
      {children}
    </RT.Root>
  );
}

export const TabPanel = ({ value, children }: { value: string; children: ReactNode }) => (
  <RT.Content value={value} className="focus-visible:outline-none">
    {children}
  </RT.Content>
);
