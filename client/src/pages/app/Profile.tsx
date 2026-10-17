import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getTheme, setTheme } from "@/lib/theme";
import { useAuth } from "@/auth/AuthContext";
import { Avatar, Badge, Button, Field, FormError, Input, PageHeader, Textarea, Tile, TileHeader, Toggle } from "@/components/ui";
import { useToast } from "@/components/Toast";

const COLORS = ["#7058F5", "#4285FF", "#FF7890", "#FFC857", "#3DCFAE"];
const ROLE_LABEL = { PARTICIPANT: "Participant", ORGANIZER: "Organizer", ADMIN: "Administrator" } as const;

export default function Profile() {
  const { user, context } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: user!.name, college: user!.college ?? "", skills: user!.skills ?? "", bio: user!.bio ?? "", avatarColor: user!.avatarColor });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [dark, setDark] = useState(getTheme() === "dark");

  const save = useMutation({
    mutationFn: () => api("/auth/profile", { method: "PATCH", body: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Profile saved", tone: "success" });
    },
  });
  const changePw = useMutation({
    mutationFn: () => api("/auth/change-password", { body: pw }),
    onSuccess: () => {
      setPw({ current: "", next: "" });
      toast({ title: "Password changed", tone: "success" });
    },
  });
  const err = save.error instanceof ApiError ? save.error : null;
  const pwErr = changePw.error instanceof ApiError ? changePw.error : null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Profile and settings" />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Tile>
          <TileHeader title="Your profile" />
          <form
            className="grid gap-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <FormError message={err && !err.fields ? err.message : null} />
            <div className="flex items-center gap-4">
              <Avatar name={form.name || "?"} color={form.avatarColor} size={64} />
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Avatar colour</legend>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, avatarColor: c }))}
                      className={cn("clay grid size-9 place-items-center rounded-full text-navy", form.avatarColor === c && "ring-4 ring-violet/30")}
                      style={{ ["--clay" as string]: c }}
                      aria-label={`Colour ${c}`}
                      aria-pressed={form.avatarColor === c}
                    >
                      {form.avatarColor === c && <Check className="size-4" aria-hidden />}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <Field label="Full name" error={err?.fields?.name}>
              <Input value={form.name} onChange={set("name")} required />
            </Field>
            <Field label="College or organization" optional>
              <Input value={form.college} onChange={set("college")} />
            </Field>
            <Field label="Skills" optional hint="Comma separated. Used to recommend hackathons and shown to team leaders.">
              <Input value={form.skills} onChange={set("skills")} placeholder="React, Python, UI design" />
            </Field>
            <Field label="About you" optional>
              <Textarea value={form.bio} onChange={set("bio")} maxLength={400} className="min-h-24" />
            </Field>
            <div>
              <Button type="submit" loading={save.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </Tile>

        <div className="space-y-4">
          <Tile>
            <TileHeader title="Account" />
            <p className="text-sm text-ink-soft">{user!.email}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge className="bg-violet-soft text-violet-deep">{ROLE_LABEL[user!.role]}</Badge>
              {user!.role === "ORGANIZER" && (user!.organizerVerified ? <Badge className="bg-mint-soft text-mint-deep">Verified organizer</Badge> : <Badge className="bg-sun-soft text-sun-deep">Verification pending</Badge>)}
              {context?.isJudge && <Badge className="bg-coral-soft text-coral-deep">Judge</Badge>}
              {context?.isTeamLeader && <Badge className="bg-sun-soft text-sun-deep">Team leader</Badge>}
            </div>
          </Tile>
          <Tile>
            <TileHeader title="Appearance" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Dark mode</p>
                <p className="text-sm text-ink-soft">HackSphere is designed light-first.</p>
              </div>
              <Toggle
                checked={dark}
                onChange={(v) => {
                  setDark(v);
                  setTheme(v ? "dark" : "light");
                }}
                label="Dark mode"
              />
            </div>
          </Tile>
          <Tile>
            <TileHeader title="Change password" />
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                changePw.mutate();
              }}
            >
              <FormError message={pwErr && !pwErr.fields ? pwErr.message : null} />
              <Field label="Current password" error={pwErr?.fields?.current}>
                <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required />
              </Field>
              <Field label="New password" error={pwErr?.fields?.next} hint="At least 8 characters.">
                <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required minLength={8} />
              </Field>
              <Button type="submit" variant="secondary" loading={changePw.isPending}>
                Update password
              </Button>
            </form>
          </Tile>
        </div>
      </div>
    </>
  );
}
