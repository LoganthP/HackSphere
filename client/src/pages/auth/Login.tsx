import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { Button, Field, FormError, Input } from "@/components/ui";
import { AuthShell } from "./AuthShell";

const DEMO = [
  ["Participant", "student@hacksphere.dev"],
  ["Team leader", "leader@hacksphere.dev"],
  ["Organizer", "organizer@hacksphere.dev"],
  ["Judge", "judge@hacksphere.dev"],
  ["Admin", "admin@hacksphere.dev"],
] as const;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      const next = params.get("next");
      navigate(next && next.startsWith("/") ? next : "/app", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-violet-ink underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
      aside={
        import.meta.env.DEV ? (
          <div className="glass h-full rounded-[var(--radius-tile)] p-6">
            <h2 className="text-lg font-bold">Demo accounts</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Seeded for testing. Password for all: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-semibold">HackSphere@123</code>
            </p>
            <ul className="mt-4 space-y-2">
              {DEMO.map(([role, mail]) => (
                <li key={mail}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(mail);
                      setPassword("HackSphere@123");
                    }}
                    className="neu flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="font-semibold">{role}</span>
                    <span className="text-ink-soft">{mail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <FormError message={error} />
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="flex items-center justify-between gap-4">
          <Link to="/forgot-password" className="text-sm font-semibold text-ink-soft hover:text-ink">
            Forgot password?
          </Link>
          <Button type="submit" loading={busy} size="lg">
            Sign in
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
