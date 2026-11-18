"use client";

/**
 * Hook de reconnaissance vocale (navigateur) relié à la machine à états.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserSTT, sttSupported } from "@/lib/stt";

export function useSpeechRecognition(opts: {
  locale: string;
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onState: (listening: boolean) => void;
  onError: (code: string) => void;
}) {
  const sttRef = useRef<BrowserSTT | null>(null);
  const [listening, setListening] = useState(false);
  const optsRef = useRef(opts);

  useEffect(() => {
    optsRef.current = opts;
  });

  const stop = useCallback(() => {
    sttRef.current?.stop();
    sttRef.current = null;
    setListening(false);
    optsRef.current.onState(false);
  }, []);

  const start = useCallback(() => {
    if (!sttSupported()) {
      optsRef.current.onError("unsupported");
      return;
    }
    sttRef.current?.abort();
    const stt = new BrowserSTT();
    sttRef.current = stt;
    let finalText = "";
    let gotAny = false;

    stt.start({
      locale: optsRef.current.locale,
      onStart: () => {
        setListening(true);
        optsRef.current.onState(true);
      },
      onResult: (r) => {
        gotAny = true;
        if (r.isFinal) {
          finalText += (finalText ? " " : "") + r.transcript;
          optsRef.current.onInterim("");
          // Envoi dès la première phrase finale reconnue
          optsRef.current.onFinal(finalText.trim());
          stop();
        } else {
          optsRef.current.onInterim(r.transcript);
        }
      },
      onEnd: () => {
        setListening(false);
        optsRef.current.onState(false);
        if (finalText.trim()) {
          optsRef.current.onFinal(finalText.trim());
        } else if (!gotAny) {
          // fin sans résultat : retour au repos silencieux
        }
      },
      onError: (e) => {
        setListening(false);
        optsRef.current.onState(false);
        optsRef.current.onError(e.code);
      },
    });
  }, [stop]);

  return { start, stop, listening, supported: sttSupported() };
}
