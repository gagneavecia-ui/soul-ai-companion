"use client";

/**
 * Machine à états de la conversation : IDLE → LISTENING → THINKING →
 * SPEAKING (→ ERROR). Gère l'envoi au serveur, la voix et l'interruption.
 */
import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { tts } from "@/lib/tts";
import { ttsLocaleFor, type Lang } from "@/i18n";

export type SoulState = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: number;
  provider?: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  lang: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMsg[];
}

interface ChatApiReply {
  reply: string;
  provider: string;
  model: string;
}

export function useChat(opts: {
  lang: Lang;
  userName?: string | null;
  memoryConsent: boolean;
  ttsEnabled: boolean;
  onStateChange?: (s: SoulState) => void;
  onAssistantDone?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [state, setState] = useState<SoulState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [memory, setMemory] = useState<string[]>([]);
  const memoryLoaded = useRef(false);
  const cancelRequested = useRef(false);

  const setStateBoth = useCallback(
    (s: SoulState) => {
      setState(s);
      opts.onStateChange?.(s);
    },
    [opts]
  );

  const loadMemory = useCallback(async () => {
    if (!opts.memoryConsent || memoryLoaded.current) return;
    memoryLoaded.current = true;
    try {
      const r = await apiFetch<{ memory: { text: string }[] }>("/api/data/memory");
      setMemory(r.memory.map((m) => m.text).slice(0, 12));
    } catch {
      // mémoire indisponible : on continue sans
    }
  }, [opts.memoryConsent]);

  const persistConversation = useCallback(
    async (msgs: ChatMsg[], id: string | null, lang: Lang) => {
      if (!id) return;
      const first = msgs.find((m) => m.role === "user")?.content || "Conversation";
      try {
        await apiFetch("/api/data/conversations", {
          method: "POST",
          body: {
            id,
            title: first.slice(0, 80),
            lang,
            createdAt: msgs[0]?.ts || Date.now(),
            messages: msgs.map((m) => ({ role: m.role, content: m.content, ts: m.ts })),
          },
        });
      } catch {
        // persistance best-effort ; la conversation reste en mémoire locale
      }
    },
    []
  );

  const speak = useCallback(
    async (text: string, lang: Lang) => {
      if (!opts.ttsEnabled) {
        setStateBoth("idle");
        opts.onAssistantDone?.();
        return;
      }
      setStateBoth("speaking");
      try {
        await tts.speak(text, ttsLocaleFor(lang));
      } catch {
        // la synthèse a échoué : on revient au repos sans bloquer
      }
      setStateBoth("idle");
      opts.onAssistantDone?.();
    },
    [opts, setStateBoth]
  );

  const send = useCallback(
    async (text: string, langOverride?: Lang) => {
      const clean = text.trim();
      if (!clean) return;
      const lang = langOverride || opts.lang;
      setError(null);
      setInterim("");
      cancelRequested.current = false;

      const userMsg: ChatMsg = { role: "user", content: clean, ts: Date.now() };
      const history = [...messages, userMsg];
      setMessages(history);
      setStateBoth("thinking");
      void loadMemory();

      const convId = conversationId || crypto.randomUUID();
      if (!conversationId) setConversationId(convId);

      try {
        const r = await apiFetch<ChatApiReply>("/api/chat", {
          body: {
            message: clean,
            lang,
            history: history.slice(-10, -1).map((m) => ({ role: m.role, content: m.content })),
            memory: opts.memoryConsent ? memory : [],
            userName: opts.userName || null,
            isNewConversation: !conversationId,
          },
        });
        setLastProvider(r.provider);
        const assistantMsg: ChatMsg = { role: "assistant", content: r.reply, ts: Date.now(), provider: r.provider };
        const updated = [...history, assistantMsg];
        setMessages(updated);
        void persistConversation(updated, convId, lang);
        if (cancelRequested.current) {
          setStateBoth("idle");
          return;
        }
        await speak(r.reply, lang);
      } catch (e) {
        setStateBoth("error");
        setError(e instanceof Error ? e.message : "Erreur inconnue");
        setTimeout(() => setStateBoth("idle"), 3200);
      }
    },
    [conversationId, loadMemory, memory, messages, opts, persistConversation, setStateBoth, speak]
  );

  const interrupt = useCallback(() => {
    cancelRequested.current = true;
    tts.cancel();
    setStateBoth("idle");
    opts.onAssistantDone?.();
  }, [opts, setStateBoth]);

  const reset = useCallback(() => {
    tts.cancel();
    setMessages([]);
    setConversationId(null);
    setError(null);
    setInterim("");
    setStateBoth("idle");
  }, [setStateBoth]);

  const loadConversation = useCallback(
    (conv: ConversationMeta, lang: Lang) => {
      tts.cancel();
      setConversationId(conv.id);
      setMessages(conv.messages.map((m) => ({ role: m.role, content: m.content, ts: m.ts })));
      setError(null);
      setStateBoth("idle");
    },
    [setStateBoth]
  );

  return {
    messages,
    state,
    error,
    interim,
    conversationId,
    lastProvider,
    memory,
    send,
    speak,
    interrupt,
    reset,
    loadConversation,
    setInterim,
    setState: setStateBoth,
    setError,
  };
}
