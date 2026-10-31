import { useId, type KeyboardEvent } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeControl() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const hintId = useId();
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": next = (index + 1) % OPTIONS.length; break;
      case "ArrowLeft":
      case "ArrowUp": next = (index + OPTIONS.length - 1) % OPTIONS.length; break;
      case "Home": next = 0; break;
      case "End": next = OPTIONS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setPreference(OPTIONS[next].value);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next].focus();
  }
  return (
    <div>
      <div role="radiogroup" aria-label="Theme" aria-describedby={hintId} className="neu flex gap-1 rounded-2xl p-1">
        {OPTIONS.map(({ value, label, icon: Icon }, index) => (
          <button key={value} type="button" role="radio" aria-checked={preference === value} tabIndex={preference === value ? 0 : -1}
            onClick={() => setPreference(value)} onKeyDown={(event) => navigate(event, index)}
            className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-sm font-semibold", preference === value ? "neu-pressed text-violet-ink" : "text-ink-soft hover:text-ink")}>
            <Icon className="size-4" aria-hidden />{label}
          </button>
        ))}
      </div>
      <p id={hintId} className="mt-3 text-sm text-ink-soft" aria-live="polite">
        {preference === "system" ? `Currently ${resolvedTheme}, following your device.` : "HackSphere is designed light-first."}
      </p>
    </div>
  );
}

/** Shared by the account menu and the signed-out header. Radix handles focus and arrow keys. */
export function ThemeMenuItems() {
  const { preference, setPreference } = useTheme();
  return (
    <>
      <DM.Label className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-soft">Theme</DM.Label>
      <DM.RadioGroup value={preference} onValueChange={(value) => setPreference(value as ThemePreference)} aria-label="Theme">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DM.RadioItem key={value} value={value} onSelect={(event) => event.preventDefault()}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-violet-ink">
            <Icon className="size-4" aria-hidden />{label}
            <DM.ItemIndicator className="ml-auto"><Check className="size-4" aria-hidden /></DM.ItemIndicator>
          </DM.RadioItem>
        ))}
      </DM.RadioGroup>
    </>
  );
}

export function ThemeMenu() {
  const { preference } = useTheme();
  const Icon = OPTIONS.find((option) => option.value === preference)!.icon;
  return (
    <DM.Root>
      <DM.Trigger className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label="Theme menu">
        <Icon className="size-4" aria-hidden />
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={8} className="z-50 min-w-40 rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-[var(--shadow-lift)]">
          <ThemeMenuItems />
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
