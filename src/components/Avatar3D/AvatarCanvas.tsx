"use client";

/**
 * Canvas 3D de SOUL : chargement progressif, mode graphique allégé,
 * détection GPU/erreurs et image de secours si le rendu échoue.
 * Jamais d'écran vide : en cas d'échec, l'avatar de secours s'affiche.
 */
import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { SoulAvatar, type AvatarState } from "./SoulAvatar";
import { AvatarFallback } from "./AvatarFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface AvatarCanvasProps {
  state: AvatarState;
}

function isLowPowerDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return mobile && ((mem !== undefined && mem <= 4) || cores <= 4);
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function AvatarCanvas({ state }: AvatarCanvasProps) {
  const [lowPower] = useState(isLowPowerDevice);
  const [webglOk] = useState(detectWebGL);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  // Pause du rendu quand l'onglet est masqué (économie mémoire/batterie)
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!webglOk || failed) {
    return <AvatarFallback state={state} />;
  }

  return (
    <div className="relative w-full h-full">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-soul-violet/40 border-t-soul-blue animate-spin" />
            <p className="text-xs text-muted-foreground">SOUL arrive…</p>
          </div>
        </div>
      )}
      <ErrorBoundary onError={() => setFailed(true)}>
        <Canvas
          key={visible ? "on" : "off"}
          frameloop={visible ? "always" : "demand"}
          dpr={lowPower ? [1, 1.25] : [1, 1.75]}
          gl={{ antialias: !lowPower, alpha: true, powerPreference: "low-power" }}
          camera={{ position: [0, 0.08, 1.75], fov: 36 }}
          onCreated={() => setReady(true)}
          style={{ opacity: ready ? 1 : 0, transition: "opacity 700ms ease" }}
        >
          <Suspense fallback={null}>
            {/* Éclairage : key douce + rim bleu/violet premium */}
            <ambientLight intensity={0.55} />
            <directionalLight position={[1.6, 2.2, 2.4]} intensity={1.15} color="#fff2e2" />
            <directionalLight position={[-2.2, 1.4, -1.6]} intensity={0.5} color="#4f7fff" />
            <directionalLight position={[2.0, -0.8, -1.8]} intensity={0.4} color="#8b5cf6" />
            <SoulAvatar state={state} lowPower={lowPower} />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
