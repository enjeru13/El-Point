import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const msg = await signIn(email.trim(), password);
    setLoading(false);
    if (msg) setError(msg.includes("Invalid login") ? "Correo o contraseña incorrectos." : msg);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-xl font-black text-white">
            P
          </div>
          <h1 className="font-display text-xl font-bold text-text">El Point · Admin</h1>
          <p className="text-sm text-text-soft">Entra con tu cuenta de administrador.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">Correo</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand"
              placeholder="admin@elpoint.app"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">Contraseña</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <Button type="submit" loading={loading} className="mt-2 w-full">
            Ingresar
          </Button>
        </form>
      </Card>
    </div>
  );
}
