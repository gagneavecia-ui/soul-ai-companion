"use client";

import { Languages } from "@/components/Icons";
import { useSettings } from "@/contexts/SettingsContext";
import { LANGS, type Lang } from "@/i18n";

export function LanguageView() {
  const { t, lang, setLang } = useSettings();
  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-soul-violet/15">
          <Languages className="h-5 w-5 text-soul-violet" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">{t.lang.title}</h1>
          <p className="text-xs text-muted-foreground">{t.lang.subtitle}</p>
        </div>
      </div>
      <div className="space-y-2">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLang(l.id as Lang)}
            className={`glass flex w-full items-center justify-between rounded-2xl p-4 text-left transition-all ${
              lang === l.id ? "border-soul-blue/50 glow-blue" : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-soul-blue/20 to-soul-violet/20 font-display text-xs font-bold">
                {l.flag}
              </span>
              <span className="text-[15px] font-medium">{l.label}</span>
            </div>
            {lang === l.id && <span className="text-soul-blue">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
