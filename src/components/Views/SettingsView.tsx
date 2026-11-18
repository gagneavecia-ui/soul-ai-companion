"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Database, LogOut } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/apiClient";
import type { Route } from "@/hooks/useHashRoute";

export function SettingsView({ navigate }: { navigate: (r: Route) => void }) {
  const { t, lang, setLang, memoryConsent, setMemoryConsent, displayName, setDisplayName, voice } = useSettings();
  const { user, logout, demoMode, isAdmin } = useAuth();
  const [name, setName] = useState(displayName || "");
  const [memory, setMemory] = useState<{ id: string; text: string }[] | null>(null);
  const [newMem, setNewMem] = useState("");
  const [saved, setSaved] = useState(false);
  const [memTick, setMemTick] = useState(0);

  useEffect(() => {
    if (!user || !memoryConsent) return;
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch<{ memory: { id: string; text: string }[] }>("/api/data/memory");
        if (alive) setMemory(r.memory);
      } catch {
        if (alive) setMemory([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, memoryConsent, memTick]);

  const reloadMemory = () => setMemTick((n) => n + 1);

  const saveProfile = () => {
    setDisplayName(name.trim() || "");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addMemory = async () => {
    const v = newMem.trim();
    if (!v || !user) return;
    await apiFetch("/api/data/memory", { method: "POST", body: { text: v } }).catch(() => undefined);
    setNewMem("");
    reloadMemory();
  };

  const delMemory = async (id?: string) => {
    if (!user) return;
    await apiFetch(`/api/data/memory${id ? `?id=${encodeURIComponent(id)}` : ""}`, { method: "DELETE" }).catch(() => undefined);
    reloadMemory();
  };

  return (
    <div className="space-y-6 pt-2">
      <h1 className="font-display text-xl font-bold">{t.settings.title}</h1>

      {/* Compte */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.settings.account}</h2>
        {user ? (
          <>
            <p className="text-sm">{user.email || "—"}</p>
            <div className="space-y-1.5">
              <Label htmlFor="display-name" className="text-xs text-muted-foreground">{t.settings.name}</Label>
              <div className="flex gap-2">
                <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-white/5" />
                <Button onClick={saveProfile} variant="outline" className="h-11 shrink-0 border-soul-blue/40 text-soul-blue">
                  {saved ? t.settings.saved : t.settings.save}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              {isAdmin && (
                <Button size="sm" variant="outline" className="border-soul-violet/40 text-soul-violet" onClick={() => navigate("admin")}>
                  {t.nav.admin}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void logout()}>
                <LogOut className="mr-1 h-4 w-4" /> {t.settings.signOut}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate("login")} className="bg-gradient-to-r from-soul-blue to-soul-violet">{t.nav.login}</Button>
            <Button size="sm" variant="outline" onClick={() => navigate("signup")} className="border-white/15">{t.nav.signup}</Button>
          </div>
        )}
      </section>

      {/* Langue */}
      <section className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.settings.language}</h2>
        <div className="flex gap-2">
          {(["fr", "en", "es"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                lang === l ? "border-soul-blue/60 bg-soul-blue/15 text-soul-blue glow-blue" : "border-white/10 text-muted-foreground hover:bg-white/5"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Mémoire persistante */}
      <section className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.settings.memory}</h2>
          <Database className="h-4 w-4 text-soul-violet" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{t.settings.memoryConsent}</p>
          <Switch checked={memoryConsent} onCheckedChange={setMemoryConsent} aria-label={t.settings.memory} />
        </div>
        <p className={`text-xs font-medium ${memoryConsent ? "text-emerald-400" : "text-muted-foreground"}`}>
          {memoryConsent ? t.settings.memoryConsentOn : t.settings.memoryConsentOff}
        </p>
        {memoryConsent && user && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t.settings.memoryList}</p>
            {memory === null ? (
              <p className="text-xs text-muted-foreground/70">{t.common.loading}</p>
            ) : memory.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">{t.settings.memoryEmpty}</p>
            ) : (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {memory.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs">
                    <span className="flex-1">{m.text}</span>
                    <button onClick={() => void delMemory(m.id)} aria-label={t.history.delete} className="text-muted-foreground hover:text-rose-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input value={newMem} onChange={(e) => setNewMem(e.target.value)} placeholder={t.settings.memoryAdd} className="h-10 bg-white/5 text-sm" />
              <Button size="icon" variant="outline" onClick={() => void addMemory()} className="h-10 w-10 shrink-0 border-soul-violet/40 text-soul-violet" aria-label={t.settings.memoryAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Voix résumé */}
      <section className="glass rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.voice.title}</h2>
        <p className="text-sm text-foreground/80">
          {voice.ttsEnabled ? t.voice.ttsEnabled : t.voice.ttsDisabled} · pitch {voice.pitch.toFixed(2)} · {voice.rate.toFixed(2)}×
        </p>
        <Button size="sm" variant="outline" className="border-soul-blue/40 text-soul-blue" onClick={() => navigate("voice")}>
          {t.nav.voice} →
        </Button>
      </section>

      {/* À propos */}
      <section className="glass rounded-2xl p-4 space-y-1.5 text-center">
        <p className="font-display text-sm font-semibold">SOUL AI <span className="text-gradient">v1.0</span></p>
        <p className="text-xs text-muted-foreground">{t.tagline}</p>
        <p className="text-[10px] text-muted-foreground/60">{t.home.aiNotice}</p>
        {demoMode && <p className="text-[10px] text-amber-300/70">{t.common.demoMode}</p>}
      </section>
    </div>
  );
}
