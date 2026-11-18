/*
 * SOUL AI — Service Worker (PWA)
 *
 * Stratégie de cache HONNÊTE :
 *  - Coquille applicative et icônes : cache-first (l'interface démarre hors-ligne).
 *  - /api/* et tout ce qui dépend d'internet (IA, TTS, STT, historique distant) :
 *    JAMAIS mis en cache. Hors connexion, la conversation IA et la voix ne
 *    fonctionnent pas — l'application l'affiche clairement à l'utilisateur.
 */
const VERSION = "soul-v1.0.0";
const CORE = `${VERSION}-core`;

const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/avatar-fallback.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CORE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Jamais de cache pour l'API, l'auth et les requêtes non-GET
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("openrouter") ||
    url.hostname.includes("groq")
  ) {
    return; // réseau direct
  }

  // Actifs statiques Next.js : cache-first
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CORE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  // Navigation : réseau d'abord, coquille en secours (affichera le bandeau hors-ligne)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CORE);
          return (await cache.match("/")) || new Response("Hors connexion", { status: 503 });
        }
      })()
    );
    return;
  }

  // Autres : réseau avec repli cache
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const hit = await caches.match(req);
        return hit || new Response("", { status: 504 });
      }
    })()
  );
});
