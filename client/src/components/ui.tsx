import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link, type LinkProps } from "react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials, readableOn, STAGE_LABEL, STAGE_STYLE } from "@/lib/format";
import type { EventStage } from "@/lib/types";

/* ---------- Button ---------- */

export const buttonStyles = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,background-color,box-shadow,color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-violet-deep text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_22px_-12px_rgb(90_65_230/0.9)] hover:bg-violet active:shadow-[inset_0_3px_8px_rgb(0_0_0/0.25)]",
        secondary: "neu border border-line text-ink hover:bg-surface-2 active:neu-pressed",
        soft: "bg-violet-soft text-violet-deep hover:bg-[#dfd8ff] dark:bg-violet/20 dark:text-[#c9bfff]",
        ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
        danger: "bg-coral-soft text-coral-deep hover:bg-[#ffd3dc]",
        sun: "bg-sun text-navy shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] hover:bg-[#ffbf3d]",
      },
      size: {
        sm: "h-9 rounded-xl px-3.5 text-sm",
        md: "h-11 rounded-[var(--radius-control)] px-5 text-[0.95rem]",
        lg: "h-13 rounded-2xl px-7 text-base",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, children, disabled, ...props }, ref) => (
  <button ref={ref} className={cn(buttonStyles({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
    {children}
  </button>
));
Button.displayName = "Button";

export function ButtonLink({ className, variant, size, ...props }: LinkProps & VariantProps<typeof buttonStyles>) {
  return <Link className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

/* ---------- Surfaces ---------- */

export function Tile({ className, children, as: As = "section", ...props }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("tile p-5 sm:p-6", className)} {...props}>
      {children}
    </As>
  );
}

export function TileHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/* ---------- Form controls ---------- */

const control =
  "w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 text-ink placeholder:text-ink-soft/70 transition-colors focus-visible:border-violet focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet/15 aria-[invalid=true]:border-coral-deep aria-[invalid=true]:ring-coral/20 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(control, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(control, "h-11 cursor-pointer pr-8", className)} {...props} />
));
Select.displayName = "Select";

/** Label + control + hint/error, wired up with ids and aria attributes. */
export function Field({ label, hint, error, children, className, optional }: { label: string; hint?: ReactNode; error?: string; children: ReactElement; className?: string; optional?: boolean }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })
    : children;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-soft">(optional)</span>}
      </label>
      {control}
      {error ? (
        <p id={`${id}-err`} className="text-sm font-medium text-coral-deep">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-coral-soft px-4 py-3 text-sm font-medium text-coral-deep">
      {message}
    </p>
  );
}

/* ---------- Status & identity ---------- */

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", className)}>{children}</span>;
}

export function StageBadge({ stage, className }: { stage: EventStage; className?: string }) {
  return (
    <Badge className={cn(STAGE_STYLE[stage], className)}>
      {stage === "IN_PROGRESS" && <span className="size-1.5 rounded-full bg-blue-deep motion-safe:animate-pulse" aria-hidden />}
      {STAGE_LABEL[stage]}
    </Badge>
  );
}

const REG_STYLE = {
  PENDING: "bg-sun-soft text-sun-deep",
  APPROVED: "bg-mint-soft text-mint-deep",
  REJECTED: "bg-coral-soft text-coral-deep",
} as const;
const REG_LABEL = { PENDING: "Awaiting review", APPROVED: "Registered", REJECTED: "Declined" } as const;

export function RegistrationBadge({ status }: { status: keyof typeof REG_STYLE | null | undefined }) {
  if (!status) return <Badge className="bg-surface-2 text-ink-soft">Not registered</Badge>;
  return <Badge className={REG_STYLE[status]}>{REG_LABEL[status]}</Badge>;
}

export function Avatar({ name, color, size = 36, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("clay inline-grid shrink-0 place-items-center rounded-full font-display font-bold", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, ["--clay" as string]: color ?? "#7058F5", color: readableOn(color ?? "#7058F5") }}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = 32 }: { people: { id: string; name: string; avatarColor: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  return (
    <div className="flex items-center" aria-label={people.map((p) => p.name).join(", ")}>
      {shown.map((p, i) => (
        <Avatar key={p.id} name={p.name} color={p.avatarColor} size={size} className={cn("ring-2 ring-surface", i > 0 && "-ml-2")} />
      ))}
      {people.length > max && <span className="-ml-2 grid place-items-center rounded-full bg-surface-2 text-xs font-bold ring-2 ring-surface" style={{ width: size, height: size }}>+{people.length - max}</span>}
    </div>
  );
}

/* ---------- Feedback ---------- */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid place-items-center py-16 text-ink-soft" role="status">
      <Loader2 className="size-7 animate-spin text-violet" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-panel)] border-2 border-dashed border-line px-6 py-10 text-center", className)}>
      {icon && <div className="clay mb-4 grid size-14 place-items-center rounded-2xl text-navy" style={{ ["--clay" as string]: "#FFC857" }}>{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div role="alert" className="mx-auto my-10 max-w-md rounded-[var(--radius-panel)] bg-coral-soft p-6 text-center text-coral-deep">
      <p className="font-semibold">{msg}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Progress({ value, max = 100, className, tone = "violet", label }: { value: number; max?: number; className?: string; tone?: "violet" | "mint" | "coral" | "blue" | "sun"; label: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = { violet: "bg-violet", mint: "bg-mint", coral: "bg-coral", blue: "bg-blue", sun: "bg-sun" }[tone];
  return (
    <div className={cn("neu-pressed h-2.5 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A tactile on/off switch (neumorphic control). */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("neu-pressed relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-mint" : "bg-surface-2")}
    >
      <span className={cn("neu absolute left-0 top-1 size-5 rounded-full transition-transform duration-200 [transition-timing-function:var(--ease-spring)]", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}
