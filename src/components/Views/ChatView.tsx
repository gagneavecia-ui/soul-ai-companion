"use client";

/**
 * Écran principal : l'avatar 3D au centre, conversation au-dessus,
 * saisie + contrôles vocaux en dessous. Mobile d'abord.
 */
import { useEffect, useRef, useState } from "react";
import { AvatarCanvas } from "@/components/Avatar3D/AvatarCanvas";
import { StatusIndicator } from "@/components/StatusIndicator";
import { ChatInput } from "@/components/ChatInterface/ChatInput";
import { MessageBubble } from "@/components/ChatInterface/MessageBubble";
import { VoiceControls } from "@/components/VoiceControls";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useChat } from "@/hooks/useChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { sttSupported } from "@/lib/stt";
import { tts } from "@/lib/tts";
import { ttsLocaleFor } from "@/i18n";

export function ChatView({ initialText }: { initialText?: string }) {
  const { t, lang, voice, setVoice, displayName } = useSettings();
  const [micActive, setMicActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const chat = useChat({
    lang,
    userName: displayName,
    memoryConsent: true,
    ttsEnabled: voice.ttsEnabled,
  });

  const stt = useSpeechRecognition({
    locale: ttsLocaleFor(lang),
    onFinal: (text) => {
      void chat.send(text);
    },
    onInterim: (text) => chat.setInterim(text),
    onState: (listening) => setMicActive(listening),
    onError: (code) => {
      if (code === "mic-denied") chat.setError(t.chat.micDenied);
      else if (code === "unsupported") chat.setError(t.chat.micUnsupported);
    },
  });

  // Message d'accueil initial (optionnel, texte seulement)
  useEffect(() => {
    if (initialText && !sentInitial.current) {
      sentInitial.current = true;
      void chat.send(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.interim]);

  const micPress = () => {
    if (micActive) {
      stt.stop();
    } else {
      tts.cancel();
      if (chat.state === "speaking") chat.interrupt();
      stt.start();
    }
  };

  const statusLabel =
    !navigator.onLine
      ? t.chat.status.offline
      : chat.error
        ? t.chat.status.error
        : (t.chat.status[chat.state] as string);

  return (
    <div className="flex flex-col gap-3">
      {/* Zone avatar */}
      <div className="relative h-[38vh] min-h-[240px] w-full">
        <AvatarCanvas state={chat.error ? "error" : chat.state} />
        <div className="absolute left-1/2 top-2 -translate-x-1/2">
          <StatusIndicator state={chat.error ? "error" : chat.state} label={statusLabel} />
        </div>
        {chat.state === "speaking" && (
          <button
            onClick={chat.interrupt}
            className="absolute right-2 top-2 flex h-9 items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 text-xs text-rose-300 hover:bg-rose-500/20"
          >
            ⏹ {t.chat.interrupt}
          </button>
        )}
      </div>

      {/* Conversation */}
      <div className="max-h-[32vh] min-h-[120px] space-y-3 overflow-y-auto rounded-2xl p-1">
        {chat.messages.length === 0 && !chat.interim ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.chat.empty}</p>
        ) : (
          chat.messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} provider={m.provider} />
          ))
        )}
        {chat.state === "thinking" && (
          <div className="flex items-center gap-2 pl-1 text-sm text-soul-violet">
            <span className="soul-pulse">◆</span> {t.chat.status.thinking}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {chat.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{chat.error}</span>
          <button onClick={() => chat.setError(null)} className="text-xs underline">OK</button>
        </div>
      )}

      {/* Contrôles vocaux compacts */}
      <div className="glass rounded-2xl p-3">
        <VoiceControls
          voice={voice}
          setVoice={setVoice}
          onInterrupt={chat.interrupt}
          speaking={chat.state === "speaking"}
          compact
        />
      </div>

      {/* Saisie */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={chat.reset}
          aria-label={t.chat.newConversation}
          className="h-11 w-11 shrink-0 border-white/15"
          title={t.chat.newConversation}
        >
          <Plus className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <ChatInput
            onSend={(v) => void chat.send(v)}
            onMicPress={micPress}
            micActive={micActive}
            micSupported={sttSupported()}
            disabled={chat.state === "thinking" || chat.state === "speaking"}
            placeholder={t.chat.placeholder}
            interim={chat.interim}
          />
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground/50">{t.chat.lipSyncNote}</p>
    </div>
  );
}
