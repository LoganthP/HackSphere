import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { Button, Field, FormError, Input, Toggle } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", college: "", wantsToOrganize: params.get("host") === "1" });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Couldn't create your account."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-semibold text-violet-deep underline-offset-4 hover:underline dark:text-[#b7a9ff]">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={error && !error.fields ? error.message : null} />
        <Field label="Full name" error={error?.fields?.name}>
          <Input autoComplete="name" value={form.name} onChange={set("name")} required autoFocus />
        </Field>
        <Field label="Email" error={error?.fields?.email}>
          <Input type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={error?.fields?.password}>
          <Input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required minLength={8} />
        </Field>
        <Field label="College or organization" optional error={error?.fields?.college}>
          <Input autoComplete="organization" value={form.college} onChange={set("college")} />
        </Field>
        <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-2 p-4">
          <div>
            <p id="host-label" className="font-semibold">
              I want to host hackathons
            </p>
            <p className="text-sm text-ink-soft">Organizer accounts are verified by an administrator before events can be created.</p>
          </div>
          <Toggle checked={form.wantsToOrganize} onChange={(v) => setForm((f) => ({ ...f, wantsToOrganize: v }))} label="I want to host hackathons" />
        </div>
        <Button type="submit" loading={busy} size="lg" className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
