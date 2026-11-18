"use client";

import { Sparkles, Mic3d, Brain, Languages } from "@/components/Icons";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import type { Route } from "@/hooks/useHashRoute";

export function HomeView({ navigate, onStartVoice }: { navigate: (r: Route) => void; onStartVoice: () => void }) {
  const { t } = useSettings();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center gap-8 pt-6 text-center">
      <div className="space-y-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {t.home.welcome} <span className="text-gradient">SOUL</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">{t.tagline}</p>
      </div>

      <div className="soul-float flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-soul-blue/20 to-soul-violet/20 border border-soul-violet/30 glow-violet">
        <Sparkles className="h-10 w-10 text-soul-blue" />
      </div>

      <p className="max-w-md text-[15px] leading-relaxed text-foreground/80">{t.home.intro}</p>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button
          onClick={onStartVoice}
          size="lg"
          className="h-13 bg-gradient-to-r from-soul-blue to-soul-violet py-6 text-base glow-blue"
        >
          {t.home.startVoice}
        </Button>
        <Button onClick={() => navigate("chat")} variant="outline" size="lg" className="h-13 py-6 text-base border-white/15">
          {t.home.startText}
        </Button>
      </div>

      <div className="grid w-full max-w-lg grid-cols-2 gap-3 pt-2">
        {[
          { icon: <Mic3d className="h-5 w-5" />, ...t.home.features.avatar },
          { icon: <Brain className="h-5 w-5" />, ...t.home.features.voice },
          { icon: <Sparkles className="h-5 w-5" />, ...t.home.features.memory },
          { icon: <Languages className="h-5 w-5" />, ...t.home.features.langs },
        ].map((f, i) => (
          <div key={i} className="glass rounded-2xl p-4 text-left">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-soul-blue/10 text-soul-blue">
              {f.icon}
            </div>
            <h3 className="font-display text-sm font-semibold">{f.t}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>

      <p className="pb-2 text-[11px] text-muted-foreground/70">{t.home.aiNotice}</p>
      {!user && (
        <button onClick={() => navigate("signup")} className="text-xs text-soul-blue underline-offset-4 hover:underline">
          {t.nav.signup} →
        </button>
      )}
    </div>
  );
}
