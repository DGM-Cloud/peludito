"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { hasSupabaseEnv } from "@/lib/env";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const configured = hasSupabaseEnv();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesión.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold">PELUDITO</h1>
        <p className="mt-1 text-sm text-muted">Ingresa con tu cuenta de la clínica.</p>
        {configured ? (
          <div className="mt-6 grid gap-4">
            <Input
              label="Correo"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Ingresando…" : "Ingresar"}
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">
            Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en
            .env.local. Luego aplica la migración y ejecuta npm run seed.
          </p>
        )}
      </form>
    </main>
  );
}
