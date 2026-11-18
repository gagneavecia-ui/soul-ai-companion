"use client";

/**
 * Reconnaissance vocale — moteur natif du navigateur (Web Speech API).
 * Architecture interchangeable : SpeechRecognitionProvider définit le
 * contrat ; le moteur navigateur est la première implémentation, des
 * fournisseurs externes (clé serveur) pourront s'y substituer.
 */

interface SRResult {
  transcript: string;
  isFinal: boolean;
}

declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

export interface STTError {
  code: string;
  message: string;
}

type SRConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export function sttSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: SRConstructor }).webkitSpeechRecognition);
}

function getSR(): SRConstructor | null {
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export class BrowserSTT {
  private rec: SpeechRecognitionLike | null = null;
  private finalChunks: string[] = [];

  start(opts: {
    locale: string;
    onResult: (r: SRResult) => void;
    onEnd: (finalText: string) => void;
    onError: (e: STTError) => void;
    onStart?: () => void;
  }) {
    const SR = getSR();
    if (!SR) {
      opts.onError({ code: "unsupported", message: "unsupported" });
      return;
    }
    this.stop();
    this.finalChunks = [];
    const rec = new SR();
    rec.lang = opts.locale;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => opts.onStart?.();
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const text = res[0]?.transcript || "";
        if (res.isFinal) {
          this.finalChunks.push(text.trim());
          opts.onResult({ transcript: text.trim(), isFinal: true });
        } else {
          interim += text;
        }
      }
      if (interim) opts.onResult({ transcript: interim, isFinal: false });
    };
    rec.onerror = (ev) => {
      const messages: Record<string, string> = {
        "not-allowed": "mic-denied",
        "service-not-allowed": "mic-denied",
        network: "network",
        "no-speech": "no-speech",
        aborted: "aborted",
      };
      opts.onError({ code: messages[ev.error] || ev.error, message: ev.error });
    };
    rec.onend = () => {
      this.rec = null;
      opts.onEnd(this.finalChunks.join(" ").trim());
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      opts.onError({ code: "start-failed", message: "start failed" });
    }
  }

  stop() {
    if (this.rec) {
      try {
        this.rec.stop();
      } catch {
        // ignore
      }
      this.rec = null;
    }
  }

  abort() {
    if (this.rec) {
      try {
        this.rec.abort();
      } catch {
        // ignore
      }
      this.rec = null;
    }
  }
}
