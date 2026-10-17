import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, ApiError } from "@/lib/api";
import { Button, Field, FormError, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<{ message: string; devResetLink?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setDone(await api<{ message: string; devResetLink?: string }>("/auth/forgot", { body: { email } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we'll send a link to choose a new password.">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-2xl bg-mint-soft p-4 font-medium text-mint-deep">{done.message}</p>
          {done.devResetLink && (
            <p className="text-sm text-ink-soft">
              Development mode has no mail server, so here's the link:{" "}
              <a href={done.devResetLink} className="break-all font-semibold text-violet-deep underline">
                open reset page
              </a>
            </p>
          )}
          <Link to="/login" className="inline-block font-semibold text-violet-deep underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <FormError message={error} />
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Button type="submit" loading={busy} className="w-full" size="lg">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
