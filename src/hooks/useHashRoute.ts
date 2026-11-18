"use client";

/**
 * Routeur SPA minimaliste basé sur le hash (#/chat, #/settings…).
 * Fonctionne en PWA installée, hors-ligne, et sans routes serveur.
 */
import { useEffect, useState, useCallback } from "react";

export type Route =
  | "home"
  | "login"
  | "signup"
  | "chat"
  | "history"
  | "settings"
  | "voice"
  | "language"
  | "admin";

const ROUTES: Route[] = ["home", "login", "signup", "chat", "history", "settings", "voice", "language", "admin"];

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return (ROUTES.includes(h as Route) ? h : "home") as Route;
}

export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>("home");

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    onChange();
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = `/${r}`;
    setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);

  return [route, navigate];
}
