import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { Button, Card } from "../components/ui";
import { Brand } from "../components/Brand";
import { FoodPattern } from "../components/FoodPattern";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

export function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const msg = await signIn(email.trim(), password);
    setLoading(false);
    if (msg) setError(msg.includes("Invalid login") ? "Correo o contraseña incorrectos." : msg);
  }

  async function onGoogle() {
    setGoogleLoading(true);
    setError(null);
    const msg = await signInWithGoogle();
    // Si no hubo error la página ya está navegando a Google — no hace
    // falta apagar el loading, se va a ir de esta pantalla.
    if (msg) {
      setGoogleLoading(false);
      setError(msg);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <FoodPattern />

      <Card className="relative w-full max-w-sm p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Brand size="lg" />
          <p className="text-sm text-text-soft">Panel de moderación · entra con tu cuenta de admin.</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          loading={googleLoading}
          onClick={onGoogle}
          className="w-full"
        >
          {!googleLoading && <GoogleIcon />}
          Continuar con Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">o con contraseña</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">Correo</span>
            <input
              type="email"
              required
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

          <Button type="submit" loading={loading} className="w-full">
            Ingresar
          </Button>
        </form>
      </Card>
    </div>
  );
}
