# SOUL AI

> **Une présence virtuelle. Une conversation naturelle.**

SOUL AI est une application web progressive (PWA) qui permet de discuter avec un
compagnon IA incarné par un avatar humain 3D, doté d'une voix masculine grave,
d'une personnalité propre et d'une conversation naturelle en **français, anglais
et espagnol**.

| | |
|---|---|
| Stack | Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui |
| Avatar 3D | Three.js · React Three Fiber — modèle 100 % procédural, optimisé Android |
| IA | Groq · OpenRouter · Google Gemini (+ xAI Grok prêt) — basculement automatique |
| Voix | STT/TTS natifs du navigateur (Web Speech API), architecture interchangeable |
| Auth & données | Firebase Auth (email + Google) · Firestore via API serveur (SDK admin) |
| Hébergement | Vercel (clés API exclusivement côté serveur) |
| PWA | Installable Android · service worker · écran de lancement · mode hors-ligne honnête |

---

## Fonctionnalités

- **Avatar 3D humain masculin** : visage expressif, yeux qui clignent, sourcils,
  nez, bouche animée pendant la parole, micro-mouvements de tête naturels.
- **5 états animés** : `IDLE` (veille, clignements) · `LISTENING` (regard attentif)
  · `THINKING` (regard détourné) · `SPEAKING` (bouche synchronisée sur le rythme
  de la parole) · `ERROR` (halo rouge, sourcils froncés).
- **Conversation vocale** : bouton micro (reconnaissance vocale du navigateur),
  réponses lues avec une voix grave (heuristique de sélection masculine + pitch
  ajustable), interruption immédiate, contrôle du volume, mode silencieux.
- **Chat texte** complet, historique consultable et reprenable, nouvelle conversation.
- **Trois fournisseurs IA interchangeables** avec ordre de basculement configurable,
  délais d'attente, gestion des limites d'usage et journalisation des erreurs.
- **Personnalité SOUL** : prompt système centralisé, modifiable depuis
  l'administration. SOUL affirme toujours être une IA.
- **Mémoire conversationnelle** : contexte de la conversation courante,
  historique persistant, mémoire de préférences **avec consentement explicite**
  (consultable et supprimable à tout moment).
- **Administration sécurisée** : statistiques, fournisseurs actifs, modèles,
  journal des erreurs, prompt système — accès contrôlé **côté serveur** (claim
  Firebase), jamais une simple condition frontend. Les clés API ne sont jamais
  affichées.
- **PWA Android** : manifest, icônes (y compris maskable), service worker,
  bouton d'installation, bandeau hors-ligne explicite (la conversation IA et la
  voix nécessitent internet — l'application ne prétend pas le contraire).
- **3 langues** : FR / EN / ES, partout dans l'interface.

## Démarrage rapide

```bash
# 1. Dépendances
bun install        # ou npm install

# 2. Variables d'environnement
cp .env.example .env.local
#    → renseigner GROQ_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY
#    → renseigner la config Firebase web (NEXT_PUBLIC_FIREBASE_*)
#    → FIREBASE_SERVICE_ACCOUNT_B64 = base64 du JSON du compte de service
#      (linux: base64 -w0 firebase-adminsdk-xxx.json)

# 3. Développement
bun run dev        # http://localhost:3000

# 4. Qualité
bun run lint
bunx tsc --noEmit
```

## Structure

```
src/
  app/
    page.tsx              # Application SPA (routeur par hash, une seule route)
    api/
      chat/               # Orchestration IA (fallback multi-fournisseurs)
      health/             # État des services
      data/               # conversations · memory · profile (SDK admin, par utilisateur)
      admin/              # claim · stats · config · errors (claim admin serveur)
  components/
    Avatar3D/             # Canvas 3D + avatar procédural + secours anti-écran-vide
    ChatInterface/        # Bulles, saisie, micro
    Layout/               # Coque applicative, navigation mobile, PWA install
    Views/                # Accueil, Auth, Chat, Historique, Paramètres, Voix, Langue, Admin
  contexts/               # AuthContext (Firebase) · SettingsContext (langue, voix, mémoire)
  hooks/                  # useChat (machine à états) · useSpeechRecognition · useHashRoute
  lib/
    ai/                   # groq · openrouter · gemini · xai · manager · soul (prompt)
    firebase.ts           # Client (auth uniquement)
    firebaseAdmin.ts      # Serveur (clé jamais exposée)
    tts.ts / stt.ts       # Voix navigateur, interfaces interchangeables
  i18n/                   # Dictionnaires FR / EN / ES
public/
  manifest.webmanifest    # PWA
  sw.js                   # Service worker (cache coquille, jamais l'API/IA)
  icons/                  # Icônes 192/512/maskable + avatar de secours
firestore.rules           # Règles de sécurité strictes (à déployer, voir docs)
```

## Sécurité

- Les clés API (Groq, OpenRouter, Gemini, Firebase admin) vivent **exclusivement**
  dans les variables d'environnement serveur (`.env.local` local, environnements
  chiffrés Vercel). Aucune clé n'est présente dans le code, le bundle client ou
  le dépôt.
- Les données utilisateurs passent par les routes API serveur qui vérifient le
  token ID Firebase et n'utilisent que le SDK admin : chaque utilisateur ne peut
  accéder qu'à ses propres données.
- L'accès administrateur repose sur un **custom claim** Firebase vérifié côté
  serveur sur chaque route `/api/admin/*`.
- `firestore.rules` interdit tout accès client direct non couvert (défense en
  profondeur ; le client n'accède de toute façon jamais à Firestore directement).

## Déploiement

Voir [docs/TECHNICAL.md](docs/TECHNICAL.md) pour l'architecture détaillée,
les règles Firebase et la procédure de déploiement Vercel.

---

SOUL AI — une intelligence artificielle qui ne prétend jamais être humain.
