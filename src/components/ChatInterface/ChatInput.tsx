"use client";

/**
 * Saisie conversationnelle : champ texte + bouton micro + envoi.
 * Cibles tactiles ≥ 44 px, utilisable sans zoom sur mobile.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onMicPress: () => void;
  micActive: boolean;
  micSupported: boolean;
  disabled?: boolean;
  placeholder: string;
  interim?: string;
}

export function ChatInput({
  onSend,
  onMicPress,
  micActive,
  micSupported,
  disabled,
  placeholder,
  interim,
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    setValue("");
    onSend(v);
  };

  return (
    <div className="w-full space-y-2">
      {interim ? (
        <p className="text-xs text-soul-violet italic px-2 truncate">“{interim}”</p>
      ) : null}
      <div className="flex items-center gap-2 glass rounded-2xl p-2">
        <button
          type="button"
          onClick={onMicPress}
          disabled={disabled || !micSupported}
          aria-label="Parler"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all no-select ${
            micActive
              ? "bg-cyan-500/20 text-cyan-300 glow-blue scale-105"
              : "bg-white/5 text-foreground/80 hover:bg-white/10"
          } disabled:opacity-40`}
        >
          {micActive ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-0 h-12 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
          enterKeyHint="send"
          autoComplete="off"
        />
        {micActive ? (
          <Button
            onClick={onMicPress}
            variant="destructive"
            size="icon"
            aria-label="Arrêter l'écoute"
            className="h-12 w-12 rounded-xl shrink-0"
          >
            <Square className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Envoyer"
            className="h-12 w-12 rounded-xl shrink-0 bg-gradient-to-r from-soul-blue to-soul-violet text-white glow-blue"
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
