"use client";

/**
 * TTS navigateur (Web Speech API) avec voix masculine grave par heuristique,
 * interruption immédiate et enveloppe de bouche partagée via mouthBus.
 * Architecture interchangeable : BrowserTTSProvider implémente TTSProvider ;
 * des fournisseurs externes pourront être ajoutés sans changer l'appelant.
 */

import { mouthBus } from "@/lib/mouthBus";

export interface TTSProvider {
  speak: (text: string, locale: string) => Promise<void>;
  cancel: () => void;
  speaking: () => boolean;
}

const MALE_HINTS = [
  "thomas", "paul", "hugo", "nicolas", "claude", "guillaume", "jorge", "diego",
  "daniel", "david", "alex", "fred", "george", "rishi", "male", "homme", "alvaro",
  "juan", "carlos", "luca", "henri", "arnaud", "aurelien", "bruno", "google français",
];

function stripForSpeech(text: string): string {
  return text
    .replace(/[*_#`~>|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1200);
}

class BrowserTTS implements TTSProvider {
  private current: SpeechSynthesisUtterance | null = null;
  private voicesCache: SpeechSynthesisVoice[] = [];

  voices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    const v = window.speechSynthesis.getVoices();
    if (v.length) this.voicesCache = v;
    return this.voicesCache;
  }

  /** Voix grave : préférence masculine, sinon pitch abaissé. */
  pickVoice(locale: string, preferredURI: string | null): { voice: SpeechSynthesisVoice | null; pitch: number } {
    const voices = this.voices();
    if (!voices.length) return { voice: null, pitch: 0.75 };
    if (preferredURI) {
      const exact = voices.find((v) => v.voiceURI === preferredURI);
      if (exact) return { voice: exact, pitch: 0.85 };
    }
    const base = voices.filter((v) => v.lang.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()));
    const pool = base.length ? base : voices;
    const male = pool.find((v) => MALE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
    if (male) return { voice: male, pitch: 0.8 };
    // Pas de voix masculine connue : on grave le timbre d'une voix locale
    return { voice: pool[0], pitch: 0.62 };
  }

  speak(text: string, locale: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        reject(new Error("TTS non supporté"));
        return;
      }
      const clean = stripForSpeech(text);
      if (!clean) {
        resolve();
        return;
      }
      this.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const settings = readVoicePrefs();
      const { voice, pitch } = this.pickVoice(locale, settings.voiceURI);
      if (voice) u.voice = voice;
      u.lang = locale;
      u.pitch = settings.pitch ?? pitch;
      u.rate = settings.rate ?? 0.95;
      u.volume = settings.volume ?? 1;

      u.onstart = () => {
        this.current = u;
        startEnvelope();
      };
      u.onboundary = () => {
        pulseEnvelope();
      };
      u.onend = () => {
        this.current = null;
        stopEnvelope();
        resolve();
      };
      u.onerror = (ev) => {
        this.current = null;
        stopEnvelope();
        if (ev.error === "interrupted" || ev.error === "canceled") resolve();
        else reject(new Error(`TTS: ${ev.error}`));
      };
      this.current = u;
      window.speechSynthesis.speak(u);
    });
  }

  cancel() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    this.current = null;
    stopEnvelope();
  }

  speaking() {
    return typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking;
  }
}

// Préférences lues directement (le hook Settings peut être absent du scope TTS)
function readVoicePrefs(): { voiceURI: string | null; pitch?: number; rate?: number; volume?: number } {
  try {
    const raw = localStorage.getItem("soul-settings");
    if (raw) {
      const p = JSON.parse(raw);
      return p.voice || { voiceURI: null };
    }
  } catch {
    // ignore
  }
  return { voiceURI: null };
}

// ---- Enveloppe de bouche (approximation du rythme de parole) ----
let envelopeRAF: number | null = null;
let pulse = 0;
let noiseSeed = 0;

function startEnvelope() {
  stopEnvelope();
  const loop = () => {
    noiseSeed += 0.08;
    // bruit pseudo-aléatoire doux + pulsations par mot
    const noise = (Math.sin(noiseSeed * 1.7) + Math.sin(noiseSeed * 3.1) * 0.5) * 0.18 + 0.24;
    pulse = Math.max(0, pulse - 0.06);
    mouthBus.level = Math.min(1, noise + pulse);
    envelopeRAF = requestAnimationFrame(loop);
  };
  envelopeRAF = requestAnimationFrame(loop);
}

function pulseEnvelope() {
  pulse = Math.min(0.85, pulse + 0.45);
}

function stopEnvelope() {
  if (envelopeRAF !== null) {
    cancelAnimationFrame(envelopeRAF);
    envelopeRAF = null;
  }
  mouthBus.level = 0;
}

export const tts = new BrowserTTS();

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
