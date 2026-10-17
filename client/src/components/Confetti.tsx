import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const COLORS = ["#7058F5", "#4285FF", "#FF7890", "#FFC857", "#3DCFAE"];

/** A short celebratory burst reserved for milestones (registration, final submission). */
export function Confetti({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 900,
        y: -(Math.random() * 380 + 160),
        r: Math.random() * 540 - 270,
        size: Math.random() * 8 + 6,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    [],
  );
  if (reduce) return null;
  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center" aria-hidden>
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute bottom-10"
              style={{ width: p.size, height: p.round ? p.size : p.size * 0.5, background: p.color, borderRadius: p.round ? 999 : 2 }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 520], rotate: p.r, opacity: [1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: [0.2, 0.7, 0.4, 1] }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
