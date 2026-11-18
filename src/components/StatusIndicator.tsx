"use client";

import type { SoulState } from "@/hooks/useChat";

const STATE_CONFIG: Record<SoulState, { color: string; pulse: boolean }> = {
  idle: { color: "bg-soul-blue", pulse: false },
  listening: { color: "bg-cyan-400", pulse: true },
  thinking: { color: "bg-soul-violet", pulse: true },
  speaking: { color: "bg-emerald-400", pulse: true },
  error: { color: "bg-rose-500", pulse: false },
};

export function StatusIndicator({ state, label }: { state: SoulState; label: string }) {
  const cfg = STATE_CONFIG[state];
  return (
    <div className="flex items-center gap-2 glass rounded-full px-4 py-1.5 no-select">
      <span className="relative flex h-2.5 w-2.5">
        {cfg.pulse && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-60 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.color}`} />
      </span>
      <span className="text-xs font-medium text-foreground/90">{label}</span>
    </div>
  );
}
