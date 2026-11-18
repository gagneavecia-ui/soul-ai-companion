"use client";

/**
 * SOUL AI — Application à page unique (routeur par hash).
 * Une seule route Next.js : toutes les vues sont des composants client,
 * ce qui garantit un fonctionnement parfait en PWA installée et hors-ligne.
 */
import { useState } from "react";
import { AppShell } from "@/components/Layout/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HomeView } from "@/components/Views/HomeView";
import { LoginView, SignupView } from "@/components/Views/AuthViews";
import { ChatView } from "@/components/Views/ChatView";
import { HistoryView } from "@/components/Views/HistoryView";
import { SettingsView } from "@/components/Views/SettingsView";
import { VoiceView } from "@/components/Views/VoiceView";
import { LanguageView } from "@/components/Views/LanguageView";
import { AdminView } from "@/components/Views/AdminView";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { useHashRoute, type Route } from "@/hooks/useHashRoute";
import type { ConversationMeta } from "@/hooks/useChat";

function SoulApp() {
  const [route, navigate] = useHashRoute();
  const { hydrated } = useSettings();
  const [pendingText, setPendingText] = useState<string | undefined>(undefined);

  const goChat = (text?: string) => {
    setPendingText(text);
    navigate("chat");
  };

  const resumeConversation = (c: ConversationMeta) => {
    // Reprise : on pré-charge le premier message dans le champ via pendingText non —
    // la conversation est rechargée par HistoryView → ChatView via initialText simple.
    goChat();
  };

  return (
    <AppShell route={route} navigate={navigate}>
      {!hydrated ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-soul-violet/40 border-t-soul-blue animate-spin" />
        </div>
      ) : (
        <ErrorBoundary
          fallback={
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
              <p className="text-lg font-display font-bold">SOUL AI</p>
              <p className="text-sm text-muted-foreground">Une erreur s'est produite. Rechargez la page.</p>
              <button onClick={() => location.reload()} className="text-sm text-soul-blue hover:underline">
                Recharger
              </button>
            </div>
          }
        >
          {route === "home" && <HomeView navigate={navigate} onStartVoice={() => goChat()} />}
          {route === "login" && <LoginView navigate={navigate} />}
          {route === "signup" && <SignupView navigate={navigate} />}
          {route === "chat" && <ChatView key={pendingText || "chat"} initialText={pendingText} />}
          {route === "history" && <HistoryView onResume={resumeConversation} />}
          {route === "settings" && <SettingsView navigate={navigate} />}
          {route === "voice" && <VoiceView />}
          {route === "language" && <LanguageView />}
          {route === "admin" && <AdminView />}
        </ErrorBoundary>
      )}
    </AppShell>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SoulApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
