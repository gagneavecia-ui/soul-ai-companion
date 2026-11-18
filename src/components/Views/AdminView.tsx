"use client";

/**
 * Tableau de bord administrateur.
 * L'accès est contrôlé par le claim serveur (jamais une condition frontend) :
 * toutes les données viennent de /api/admin/* qui vérifie le token.
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Shield, Users, MessageSquare, Coins, Activity } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/apiClient";

interface AdminStats {
  users: number;
  recentUsers: { email: string | null; createdAt: string; lastSignIn: string }[] | null;
  usage: { totalMessages: number; totalConversations: number; byProvider: Record<string, number> };
  providers: { id: string; label: string; configured: boolean; model: string }[];
  activeOrder: string[];
  errors: { recentCount: number; byKind: Record<string, number>; recent: { ts: number; provider: string; code: string; message: string }[] };
}

interface AdminConfig {
  providerOrder: string[];
  models: Record<string, string>;
  systemPrompt: string;
  timeoutMs: number;
  maxTokens: number;
}

export function AdminView() {
  const { t } = useSettings();
  const { user, isAdmin, refreshAdmin, setAdminFlag } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [key, setKey] = useState("");
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const s = await apiFetch<AdminStats>("/api/admin/stats");
      setStats(s);
      const c = await apiFetch<{ config: AdminConfig }>("/api/admin/config");
      setConfig(c.config);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = async () => {
    setClaimMsg(null);
    try {
      await apiFetch("/api/admin/claim", { body: { setupKey: key.trim() } });
      const ok = await refreshAdmin();
      setAdminFlag(ok);
      setClaimMsg(ok ? t.admin.claimOk : t.admin.accessDenied);
      if (ok) void load();
    } catch (e) {
      setClaimMsg(e instanceof Error ? e.message : "Erreur");
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    await apiFetch("/api/admin/config", {
      method: "POST",
      body: {
        providerOrder: config.providerOrder,
        models: config.models,
        systemPrompt: config.systemPrompt,
        timeoutMs: config.timeoutMs,
        maxTokens: config.maxTokens,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    void load();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 pt-16 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t.admin.accessDenied}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-sm space-y-4 pt-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-soul-violet/15">
          <Shield className="h-7 w-7 text-soul-violet" />
        </div>
        <p className="text-sm text-muted-foreground">{t.admin.claimHint}</p>
        <div className="glass space-y-3 rounded-2xl p-4 text-left">
          <Label className="text-xs text-muted-foreground">{t.admin.claimKey}</Label>
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} className="h-11 bg-white/5" />
          <Button onClick={() => void claim()} className="h-11 w-full bg-gradient-to-r from-soul-blue to-soul-violet">
            {t.admin.claimBtn}
          </Button>
          {claimMsg && <p className="text-xs text-amber-300">{claimMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{t.admin.title}</h1>
        <Button variant="outline" size="sm" onClick={() => void load()} className="border-white/15" disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t.admin.refresh}
        </Button>
      </div>

      {stats && (
        <>
          {/* Statistiques générales */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Users, label: t.admin.users, value: stats.users >= 0 ? stats.users : "—" },
              { icon: MessageSquare, label: t.admin.conversations, value: stats.usage.totalConversations },
              { icon: Coins, label: t.admin.messages, value: stats.usage.totalMessages },
            ].map((c, i) => (
              <div key={i} className="glass rounded-2xl p-3 text-center">
                <c.icon className="mx-auto mb-1 h-4 w-4 text-soul-blue" />
                <p className="font-display text-xl font-bold">{c.value}</p>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Fournisseurs */}
          <section className="glass space-y-3 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.admin.providers}</h2>
            {stats.providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.model}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.configured ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                  {p.configured ? "✓" : t.admin.missing}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground/60">{t.admin.keysNote}</p>
          </section>

          {/* Configuration */}
          {config && (
            <section className="glass space-y-3 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t.admin.order} · {t.admin.activeModel}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {["groq", "openrouter", "gemini", "xai"].map((id) => (
                  <div key={id} className="space-y-1">
                    <Label className="text-[11px] uppercase text-muted-foreground">{id}</Label>
                    <Input
                      value={config.models[id] || ""}
                      onChange={(e) => setConfig({ ...config, models: { ...config.models, [id]: e.target.value } })}
                      className="h-10 bg-white/5 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.admin.prompt}</Label>
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  rows={6}
                  className="bg-white/5 text-sm"
                />
              </div>
              <Button onClick={() => void saveConfig()} className="h-11 w-full bg-gradient-to-r from-soul-blue to-soul-violet">
                {saved ? t.admin.configSaved : t.admin.saveConfig}
              </Button>
            </section>
          )}

          {/* Erreurs */}
          <section className="glass space-y-2 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.admin.errors}</h2>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                {stats.errors.recentCount}
              </span>
            </div>
            {stats.errors.recent.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">{t.admin.errorsEmpty}</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                {stats.errors.recent.map((e, i) => (
                  <li key={i} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                    <span className="text-rose-400">{e.provider}/{e.code}</span>
                    <span className="text-muted-foreground"> · {new Date(e.ts).toLocaleTimeString()}</span>
                    <p className="mt-0.5 truncate text-muted-foreground/80">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Utilisateurs récents */}
          {stats.recentUsers && stats.recentUsers.length > 0 && (
            <section className="glass space-y-2 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.admin.users}</h2>
              <ul className="space-y-1.5">
                {stats.recentUsers.map((u, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                    <span>{u.email || "—"}</span>
                    <span className="text-muted-foreground">{new Date(u.lastSignIn).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
