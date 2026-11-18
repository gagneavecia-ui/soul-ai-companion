# SOUL AI — Documentation technique

## 1. Architecture

```
Navigateur (PWA)                          Serveur (Vercel Functions)
┌─────────────────────────┐               ┌──────────────────────────────┐
│ Next.js SPA (route /)   │   POST /api/  │ /api/chat ──► ai/manager     │
│ Avatar 3D (R3F)         │────  chat ───►│   1. Groq                    │
│ Web Speech (STT/TTS)    │               │   2. OpenRouter (fallback)   │
│ Firebase Auth (client)  │──── data ────►│   3. Gemini  (fallback)      │
│ localStorage (cache)    │               │   4. xAI Grok (fallback)     │
└─────────────────────────┘               │ /api/data/* ──► Firestore    │
                                          │    (SDK admin, par uid)      │
                                          │ /api/admin/* ──► claim admin │
                                          └──────────────────────────────┘
```

### Choix clés

- **Une seule route de page** (`src/app/page.tsx`) avec routeur par hash
  (`#/chat`, `#/settings`…) : fonctionne parfaitement en PWA installée et hors
  ligne, sans configuration de rewrites.
- **Avatar procédural** plutôt que GLTF : zéro téléchargement de modèle, aucun
  point de défaillance réseau, poids mémoire minimal. Le rendu 3D peut échouer
  (WebGL absent) → image/avatar de secours 2D animé : **jamais d'écran vide**.
- **Données via API serveur** (SDK admin) et non via le client Firestore : la
  clé de service ne quitte jamais le serveur et l'application fonctionne même
  si les règles Firestore client ne sont pas encore déployées.
- **Basculement IA** : `/api/chat` essaie chaque fournisseur dans l'ordre
  configuré, avec timeout (AbortController), classification d'erreurs
  (auth / rate-limit / timeout / réseau) et journalisation.

## 2. Avatar 3D — détails

- Crâne : ellipsoïde (0.46 × 0.52 × 0.44). Chaque élément du visage est posé à
  la surface calculée (`z(x, y) = rz·√(1−(x/rx)²−(y/ry)²)`).
- Yeux : blanc + iris + pupille, paupières = hémisphères de couleur peau qui
  pivotent (`rotation.x`) pour cligner (aléatoire 2,2–5,8 s).
- Bouche : mâchoire articulée (groupe pivot) + intérieur de bouche qui s'ouvre
  selon `mouthBus.level`.
- `mouthBus` : enveloppe générée pendant la synthèse vocale (pulsations sur les
  événements `onboundary` de l'utterance + bruit doux). **Approximation** assumée :
  pas de synchronisation labiale phonétique réelle (l'UI le précise).
- États : cibles d'expression par état + interpolation exponentielle douce.
- Performance : `dpr` limité (1.25 sur appareils faibles), géométries 16–32
  segments, rendu suspendu quand l'onglet est masqué, `powerPreference:
  low-power`.

## 3. Voix

- **TTS** : `BrowserTTS` implémente l'interface `TTSProvider`. Sélection de voix
  par heuristique masculine (noms connus), sinon pitch abaissé (0.62) pour un
  timbre grave. Réglages utilisateur : voix, pitch (0.4–1.3), vitesse, volume.
  Nettoyage du texte avant lecture (markdown, URLs, émojis supprimés).
- **STT** : `BrowserSTT` implémente le contrat `SpeechRecognitionProvider`.
  Résultats intermédiaires affichés, envoi à la première phrase finale.
  Erreurs traduites (micro refusé, non supporté, réseau).
- Fournisseurs externes (ElevenLabs, Azure…) : ajouter une classe implémentant
  `TTSProvider` / le contrat STT et l'injecter — aucun appelant à modifier.

## 4. IA — fournisseurs

| Fournisseur | Endpoint | Auth | Modèle par défaut |
|---|---|---|---|
| Groq | `api.groq.com/openai/v1/chat/completions` | Bearer | `openai/gpt-oss-120b` |
| OpenRouter | `openrouter.ai/api/v1/chat/completions` | Bearer | `inclusionai/ling-3.2-flash:free` |
| Gemini | `generativelanguage.googleapis.com/v1beta/models/{m}:generateContent` | `x-goog-api-key` | `gemini-3.8-flash` |
| xAI (option) | `api.x.ai/v1/chat/completions` | Bearer | `grok-3-mini` |

- L'ordre et les modèles sont surchargeables via Firestore `app/config`
  (tableau d'administration) ou variables d'environnement.
- Prompt système centralisé : `src/lib/ai/soul.ts` (par défaut) ou
  `app/config.systemPrompt` (admin). Contraintes : oral, sans markdown,
  transparent sur sa nature d'IA, langue de l'utilisateur.

## 5. Sécurité

### Secrets
- `.env.local` (git-ignoré) et Vercel Environment Variables (chiffrés).
- `FIREBASE_SERVICE_ACCOUNT_B64` : JSON du compte de service en base64.
- Aucune clé dans le bundle client : seules les variables `NEXT_PUBLIC_FIREBASE_*`
  (publiques par conception Firebase) sont exposées.

### Authentification
- Firebase Auth email/mot de passe + Google (si domaine autorisé).
- Requêtes données : `Authorization: Bearer <ID token>` vérifié par
  `verifyRequest()` (`firebase-admin.verifyIdToken(checkRevoked=true)`).

### Administration
- Claim `admin: true` posé par `/api/admin/claim` : soit email dans
  `ADMIN_EMAILS`, soit clé unique `ADMIN_SETUP_KEY` (premier propriétaire).
- Chaque route `/api/admin/*` revérifie le claim **à chaque appel**.

### Règles Firestore (firestore.rules)
- `users/{uid}` + sous-collections : propriétaire uniquement.
- `app/config` : lecture connectée, écriture admin uniquement.
- `admin_errors`, `stats` : lecture admin, écriture serveur seulement.
- Refus par défaut partout ailleurs.
- Déploiement (nécessite les droits firebaserules, absents du compte de service
  fourni) :
  ```bash
  firebase deploy --only firestore:rules
  ```
  En attendant, le client n'accède de toute façon pas à Firestore directement
  (toutes les données passent par le serveur).

## 6. PWA

- `public/manifest.webmanifest` : standalone, portrait, icônes any + maskable,
  raccourci « Parler à SOUL ».
- `public/sw.js` : cache-first sur la coquille et les icônes, **réseau direct**
  pour `/api/*`, Firebase et fournisseurs IA ; navigation avec repli cache.
  Hors ligne : bandeau explicite, conversation IA et voix indisponibles (affiché
  honnêtement, jamais simulé).
- Installation : bouton natif déclenché sur `beforeinstallprompt`.

## 7. Variables d'environnement

Voir [.env.example](.env.example). Points sensibles :

| Variable | Rôle | Où |
|---|---|---|
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `XAI_API_KEY` | Fournisseurs IA | Serveur uniquement |
| `NEXT_PUBLIC_FIREBASE_*` | Config web Firebase (publiques) | Client |
| `FIREBASE_SERVICE_ACCOUNT_B64` | SDK admin (Firestore, claims) | Serveur uniquement |
| `ADMIN_EMAILS` | Promotions admin automatiques | Serveur |
| `ADMIN_SETUP_KEY` | Clé unique du premier claim admin | Serveur |

## 8. Limites connues (MVP)

- Synchronisation labiale approximative (rythme des mots), pas phonétique.
- Voix = synthèse du navigateur (qualité variable selon appareil) ;
  fournisseurs TTS externes prévus par l'architecture mais non activés.
- Limitation de débit simple en mémoire (20 req/min/IP) — à remplacer par un
  store partagé si scalabilité forte.
- Les règles Firestore doivent être déployées par un compte disposant des
  droits `firebaserules.*` (le client n'y accède pas directement entre-temps).
