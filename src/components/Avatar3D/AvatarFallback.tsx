"use client";

/**
 * Avatar de secours (2D) — affiché si WebGL indisponible ou échec du rendu 3D.
 * Garantit : jamais d'écran vide. Reflète quand même l'état de SOUL.
 */
import { useEffect, useState } from "react";
import type { AvatarState } from "./SoulAvatar";

const STATE_STYLE: Record<AvatarState, { ring: string; label: string; glow: string }> = {
  idle: { ring: "border-soul-blue/50", label: "En veille active", glow: "shadow-[0_0_40px_rgba(79,127,255,0.25)]" },
  listening: { ring: "border-cyan-400/60", label: "À l'écoute", glow: "shadow-[0_0_40px_rgba(34,211,238,0.3)]" },
  thinking: { ring: "border-soul-violet/60", label: "En réflexion", glow: "shadow-[0_0_40px_rgba(139,92,246,0.3)]" },
  speaking: { ring: "border-soul-blue/60", label: "En train de parler", glow: "shadow-[0_0_40px_rgba(79,127,255,0.35)]" },
  error: { ring: "border-rose-500/60", label: "Erreur technique", glow: "shadow-[0_0_40px_rgba(244,63,94,0.3)]" },
};

export function AvatarFallback({ state }: { state: AvatarState }) {
  const style = STATE_STYLE[state];
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200 + Math.random() * 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div className={`relative w-40 h-40 rounded-full bg-gradient-to-b from-[#1a1f3d] to-[#0d1126] border-2 ${style.ring} ${style.glow} soul-float`}>
        {/* Visage minimal mais expressif */}
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 flex gap-8">
          <div className={`w-4 h-4 rounded-full bg-soul-blue ${blink ? "h-[2px] mt-2" : ""} transition-all duration-100`} />
          <div className={`w-4 h-4 rounded-full bg-soul-blue ${blink ? "h-[2px] mt-2" : ""} transition-all duration-100`} />
        </div>
        <div
          className={`absolute left-1/2 top-[62%] -translate-x-1/2 rounded-full bg-black/60 transition-all duration-100 ${
            state === "speaking" ? "w-8 h-5 soul-pulse" : "w-7 h-[3px]"
          }`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{style.label}</p>
      <p className="text-[10px] text-muted-foreground/60 max-w-[220px] text-center">
        Rendu 3D indisponible sur cet appareil — mode allégé actif.
      </p>
    </div>
  );
}
