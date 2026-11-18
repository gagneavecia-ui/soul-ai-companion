"use client";

/**
 * Coque applicative : en-tête, navigation inférieure mobile, bandeau hors-ligne
 * honnête, bouton d'installation PWA.
 */
import { useEffect, useState } from "react";
import { Home, MessageCircle, History, Settings, WifiOff, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Route } from "@/hooks/useHashRoute";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppShell({
  route,
  navigate,
  children,
}: {
  route: Route;
  navigate: (r: Route) => void;
  children: React.ReactNode;
}) {
  const { t } = useSettings();
  const { user, demoMode } = useAuth();
  const [online, setOnline] = useState(true);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHidden, setInstallHidden] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const NAV_MAIN: { route: Route; label: string; icon: typeof Home }[] = [
    { route: "home", label: t.nav.home, icon: Home },
    { route: "chat", label: t.nav.chat, icon: MessageCircle },
    { route: "history", label: t.nav.history, icon: History },
    { route: "settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <div className="soul-bg min-h-screen flex flex-col">
      {/* En-tête */}
      <header className="safe-top sticky top-0 z-40 border-b border-white/5 bg-[#05060f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-2 no-select"
            aria-label="SOUL AI — accueil"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-soul-blue to-soul-violet glow-blue">
              <span className="font-display text-sm font-bold text-white">S</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight">SOUL<span className="text-gradient"> AI</span></span>
          </button>
          <div className="flex items-center gap-1.5">
            {installEvt && !installHidden && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-soul-violet/40 text-xs"
                onClick={async () => {
                  await installEvt.prompt();
                  const choice = await installEvt.userChoice;
                  if (choice.outcome === "accepted") setInstallHidden(true);
                }}
              >
                <Download className="h-3.5 w-3.5" />
                {t.common.install}
              </Button>
            )}
            {!demoMode && user && (
              <button
                onClick={() => navigate("admin")}
                aria-label="Administration"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
              >
                <Shield className="h-4 w-4 text-foreground/60" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bandeau hors-ligne honnête */}
      {!online && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="h-3.5 w-3.5" />
            {t.common.offlineBanner}
          </span>
        </div>
      )}

      {/* Mode démonstration */}
      {demoMode && user && (
        <div className="border-b border-soul-violet/20 bg-soul-violet/10 px-4 py-1.5 text-center text-[11px] text-soul-violet">
          {t.common.demoMode}
        </div>
      )}

      {/* Contenu */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4">{children}</main>

      {/* Navigation inférieure (mobile d'abord) */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#05060f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-1.5">
          {NAV_MAIN.map(({ route: r, label, icon: Icon }) => {
            const active = route === r;
            return (
              <button
                key={r}
                onClick={() => navigate(r)}
                className={`flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 no-select transition-colors ${
                  active ? "text-soul-blue" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_rgba(79,127,255,0.6)]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
