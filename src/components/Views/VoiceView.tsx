"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Volume2, Mic, Info } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { tts, ttsSupported } from "@/lib/tts";
import { sttSupported } from "@/lib/stt";
import { ttsLocaleFor } from "@/i18n";

const TEST_PHRASES = {
  fr: "Bonjour, je suis SOUL, votre compagnon virtuel. Voici ma voix.",
  en: "Hello, I am SOUL, your virtual companion. This is my voice.",
  es: "Hola, soy SOUL, tu compañero virtual. Esta es mi voz.",
};

export function VoiceView() {
  const { t, lang, voice, setVoice } = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ttsSupported()) return;
    const load = () => setVoices(tts.voices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const id = setTimeout(() => {
      load();
      setReady(true);
    }, 400);
    return () => {
      clearTimeout(id);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const localeVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));

  return (
    <div className="space-y-6 pt-2">
      <h1 className="font-display text-xl font-bold">{t.voice.title}</h1>

      {/* Voix de SOUL */}
      <section className="glass space-y-4 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.voice.ttsTitle}</h2>
          <Volume2 className="h-4 w-4 text-soul-blue" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">{voice.ttsEnabled ? t.voice.ttsEnabled : t.voice.ttsDisabled}</span>
          <Switch checked={voice.ttsEnabled} onCheckedChange={(v) => setVoice({ ttsEnabled: v })} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t.voice.voiceSelect}</Label>
          <select
            value={voice.voiceURI || ""}
            onChange={(e) => setVoice({ voiceURI: e.target.value || null })}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none"
          >
            <option value="">{t.voice.voiceAuto}</option>
            {localeVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>{t.voice.pitch}</Label>
              <span>{voice.pitch.toFixed(2)}</span>
            </div>
            <Slider value={[voice.pitch]} min={0.4} max={1.3} step={0.05} onValueChange={([v]) => setVoice({ pitch: v })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>{t.voice.rate}</Label>
              <span>{voice.rate.toFixed(2)}×</span>
            </div>
            <Slider value={[voice.rate]} min={0.6} max={1.3} step={0.05} onValueChange={([v]) => setVoice({ rate: v })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>{t.voice.volume}</Label>
              <span>{Math.round(voice.volume * 100)}%</span>
            </div>
            <Slider value={[voice.volume]} min={0} max={1} step={0.05} onValueChange={([v]) => setVoice({ volume: v })} />
          </div>
        </div>

        <Button
          className="h-11 w-full bg-gradient-to-r from-soul-blue to-soul-violet"
          onClick={() => void tts.speak(TEST_PHRASES[lang], ttsLocaleFor(lang))}
        >
          {t.voice.test}
        </Button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {t.voice.lipSync}
        </p>
      </section>

      {/* Reconnaissance vocale */}
      <section className="glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.voice.sttTitle}</h2>
          <Mic className={`h-4 w-4 ${sttSupported() ? "text-emerald-400" : "text-rose-400"}`} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t.voice.sttEngine}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sttSupported() ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
            {sttSupported() ? "OK" : "N/A"}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.voice.sttNote}</p>
        <p className="text-xs leading-relaxed text-muted-foreground/70">{t.voice.providerNote}</p>
        <p className="text-[11px] text-muted-foreground/50">
          TTS : {t.voice.browser} {ready && voices.length > 0 ? `· ${voices.length} voix détectées` : ""}
        </p>
      </section>
    </div>
  );
}
