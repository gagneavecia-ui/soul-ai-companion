"use client";

/**
 * Paramètres utilisateur : langue, voix, consentement mémoire.
 * Persistés en local + synchronisés avec le profil serveur si connecté.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Lang } from "@/i18n";
import { DICTS, type Dict } from "@/i18n";
import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "./AuthContext";

export interface VoiceSettings {
  ttsEnabled: boolean;
  voiceURI: string | null;
  pitch: number;
  rate: number;
  volume: number;
}

interface SettingsState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  voice: VoiceSettings;
  setVoice: (v: Partial<VoiceSettings>) => void;
  memoryConsent: boolean;
  setMemoryConsent: (v: boolean) => void;
  displayName: string | null;
  setDisplayName: (v: string) => void;
  hydrated: boolean;
}

const LS_KEY = "soul-settings";

const defaults: VoiceSettings = {
  ttsEnabled: true,
  voiceURI: null,
  pitch: 0.75,
  rate: 0.95,
  volume: 1,
};

const SettingsContext = createContext<SettingsState | null>(null);

interface Persisted {
  lang?: Lang;
  voice?: VoiceSettings;
  memoryConsent?: boolean;
  displayName?: string | null;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>("fr");
  const [voice, setVoiceState] = useState<VoiceSettings>(defaults);
  const [memoryConsent, setMemoryConsentState] = useState(false);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const serverSynced = useRef(false);

  // Chargement local au démarrage
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Persisted;
          if (p.lang && ["fr", "en", "es"].includes(p.lang)) setLangState(p.lang);
          if (p.voice) setVoiceState({ ...defaults, ...p.voice });
          if (typeof p.memoryConsent === "boolean") setMemoryConsentState(p.memoryConsent);
          if (p.displayName) setDisplayNameState(p.displayName);
        }
      } catch {
        // ignore
      }
      setHydrated(true);
    })();
  }, []);

  // Synchronisation avec le profil serveur à la connexion
  useEffect(() => {
    if (!user || !hydrated || serverSynced.current) return;
    serverSynced.current = true;
    let alive = true;
    (async () => {
      try {
        const { profile } = await apiFetch<{
          profile: Persisted & { memoryConsent?: boolean; displayName?: string | null };
        }>("/api/data/profile");
        if (!alive) return;
        if (profile.lang && ["fr", "en", "es"].includes(profile.lang)) setLangState(profile.lang as Lang);
        if (profile.voice) setVoiceState({ ...defaults, ...profile.voice });
        if (typeof profile.memoryConsent === "boolean") setMemoryConsentState(profile.memoryConsent);
        if (profile.displayName) setDisplayNameState(profile.displayName);
      } catch {
        // profil serveur indisponible : les réglages locaux restent utilisés
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, hydrated]);

  const persist = useCallback((p: Partial<Persisted>) => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const cur = raw ? (JSON.parse(raw) as Persisted) : {};
      localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...p }));
    } catch {
      // ignore
    }
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      persist({ lang: l });
      if (user) apiFetch("/api/data/profile", { method: "PUT", body: { lang: l } }).catch(() => undefined);
    },
    [persist, user]
  );

  const setVoice = useCallback(
    (v: Partial<VoiceSettings>) => {
      setVoiceState((prev) => {
        const next = { ...prev, ...v };
        persist({ voice: next });
        if (user) apiFetch("/api/data/profile", { method: "PUT", body: { voice: next } }).catch(() => undefined);
        return next;
      });
    },
    [persist, user]
  );

  const setMemoryConsent = useCallback(
    (v: boolean) => {
      setMemoryConsentState(v);
      persist({ memoryConsent: v });
      if (user) apiFetch("/api/data/profile", { method: "PUT", body: { memoryConsent: v } }).catch(() => undefined);
    },
    [persist, user]
  );

  const setDisplayName = useCallback(
    (v: string) => {
      setDisplayNameState(v);
      persist({ displayName: v });
      if (user) apiFetch("/api/data/profile", { method: "PUT", body: { displayName: v } }).catch(() => undefined);
    },
    [persist, user]
  );

  return (
    <SettingsContext.Provider
      value={{
        lang,
        setLang,
        t: DICTS[lang],
        voice,
        setVoice,
        memoryConsent,
        setMemoryConsent,
        displayName,
        setDisplayName,
        hydrated,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings hors SettingsProvider");
  return ctx;
}
