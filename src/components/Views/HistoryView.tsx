"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiClient";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationMeta } from "@/hooks/useChat";
import { Trash2, MessageSquare, LogIn } from "lucide-react";

export function HistoryView({ onResume }: { onResume: (c: ConversationMeta) => void }) {
  const { t } = useSettings();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch<{ conversations: ConversationMeta[] }>("/api/data/conversations");
        if (!alive) return;
        setConversations(r.conversations);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setConversations([]);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, reloadTick]);

  const reload = () => setReloadTick((n) => n + 1);

  const remove = async (id: string) => {
    await apiFetch(`/api/data/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
    reload();
  };

  const removeAll = async () => {
    if (!confirm(t.history.confirmAll)) return;
    await apiFetch("/api/data/conversations", { method: "DELETE" }).catch(() => undefined);
    reload();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <p className="max-w-xs text-sm text-muted-foreground">{t.history.loginRequired}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{t.history.title}</h1>
        {conversations && conversations.length > 0 && (
          <Button variant="ghost" size="sm" onClick={removeAll} className="text-rose-400 hover:bg-rose-500/10">
            <Trash2 className="mr-1 h-4 w-4" />
            {t.history.deleteAll}
          </Button>
        )}
      </div>

      {conversations === null && !error && (
        <p className="pt-10 text-center text-sm text-muted-foreground">{t.common.loading}</p>
      )}
      {error && <p className="pt-10 text-center text-sm text-rose-400">{error}</p>}
      {conversations && conversations.length === 0 && (
        <p className="pt-10 text-center text-sm text-muted-foreground">{t.history.empty}</p>
      )}

      <div className="space-y-2">
        {conversations?.map((c) => (
          <div key={c.id} className="glass flex items-center gap-3 rounded-2xl p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soul-blue/10">
              <MessageSquare className="h-5 w-5 text-soul-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.updatedAt).toLocaleString()} · {c.messages?.length ?? 0} msg · {c.lang.toUpperCase()}
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-9 shrink-0 border-soul-blue/40 text-soul-blue" onClick={() => onResume(c)}>
              {t.history.open}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400" onClick={() => void remove(c.id)} aria-label={t.history.delete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
