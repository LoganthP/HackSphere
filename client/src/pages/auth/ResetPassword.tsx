import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { api, ApiError } from "@/lib/api";
import { Button, Field, FormError, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-2xl bg-mint-tint p-4 font-medium text-mint-ink">Password updated. You've been signed out everywhere else.</p>
          <Link to="/login" className="font-semibold text-violet-ink underline-offset-4 hover:underline">
            Sign in with your new password
          </Link>
        </div>
      ) : !token ? (
        <FormError message="This page needs a reset link. Request one from the sign-in page." />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <FormError message={error} />
          <Field label="New password" hint="At least 8 characters.">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <Button type="submit" loading={busy} className="w-full" size="lg">
            Save new password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
