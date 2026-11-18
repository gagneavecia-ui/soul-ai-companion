"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Route } from "@/hooks/useHashRoute";
import { FirebaseError } from "firebase/app";

function mapAuthError(e: unknown, kind: "login" | "signup"): string {
  const { t } = { t: null };
  if (e instanceof FirebaseError) {
    const code = e.code;
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
      return "invalid";
    if (code.includes("email-already-in-use")) return "exists";
    if (code.includes("weak-password")) return "weak";
    if (code.includes("popup-closed") || code.includes("unauthorized-domain")) return "google";
  }
  return "generic";
}

export function LoginView({ navigate }: { navigate: (r: Route) => void }) {
  const { t } = useSettings();
  const { signIn, signInGoogle, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate("chat");
    } catch (err) {
      setError(t.auth.errors[mapAuthError(err, "login") as keyof typeof t.auth.errors]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="font-display text-2xl font-bold text-center">{t.auth.loginTitle}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 glass rounded-2xl p-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-white/5" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-white/5" />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full bg-gradient-to-r from-soul-blue to-soul-violet text-base">
          {busy ? t.common.loading : t.auth.loginBtn}
        </Button>
        <Button type="button" variant="outline" onClick={() => signInGoogle().then(() => navigate("chat")).catch(() => setError(t.auth.errors.google))} className="h-12 w-full border-white/15">
          {t.auth.googleBtn}
        </Button>
        {demoMode && <p className="text-xs text-amber-300/80">{t.auth.demoNote}</p>}
        <button type="button" onClick={() => navigate("signup")} className="w-full text-center text-sm text-soul-blue hover:underline">
          {t.auth.toSignup}
        </button>
      </form>
    </div>
  );
}

export function SignupView({ navigate }: { navigate: (r: Route) => void }) {
  const { t } = useSettings();
  const { signUp, signInGoogle, demoMode } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, name || undefined);
      navigate("chat");
    } catch (err) {
      setError(t.auth.errors[mapAuthError(err, "signup") as keyof typeof t.auth.errors]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="font-display text-2xl font-bold text-center">{t.auth.signupTitle}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 glass rounded-2xl p-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.auth.name}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 bg-white/5" autoComplete="given-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-white/5" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-white/5" />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full bg-gradient-to-r from-soul-blue to-soul-violet text-base">
          {busy ? t.common.loading : t.auth.signupBtn}
        </Button>
        <Button type="button" variant="outline" onClick={() => signInGoogle().then(() => navigate("chat")).catch(() => setError(t.auth.errors.google))} className="h-12 w-full border-white/15">
          {t.auth.googleBtn}
        </Button>
        {demoMode && <p className="text-xs text-amber-300/80">{t.auth.demoNote}</p>}
        <button type="button" onClick={() => navigate("login")} className="w-full text-center text-sm text-soul-blue hover:underline">
          {t.auth.toLogin}
        </button>
      </form>
    </div>
  );
}
