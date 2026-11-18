"use client";

/**
 * SOUL — avatar humain masculin 3D procédural (Three.js / React Three Fiber).
 *
 * Choix d'architecture :
 *  - Modèle 100 % procédural (~0 octet à télécharger) : idéal mobile Android,
 *    aucun GLTF externe à charger, aucune ressource qui peut échouer.
 *  - Face crédible : crâne, mâchoire articulée, yeux avec iris/paupières,
 *    clignements aléatoires, sourcils expressifs, nez, barbe, cheveux.
 *    Tous les éléments du visage sont posés SUR la surface de l'ellipsoïde
 *    du crâne (coordonnées calculées), cheveux en calotte arrière, barbe en
 *    bande inférieure avant.
 *  - 5 états distincts : idle, listening, thinking, speaking, error.
 *  - Bouche animée par mouthBus (enveloppe approximative du rythme de parole)
 *    — ce n'est PAS une synchronisation labiale phonétique réelle.
 *  - Optimisation : géométries faibles (16-24 segments), dpr limité,
 *    rendu suspendu hors écran.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mouthBus } from "@/lib/mouthBus";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking" | "error";

const SKIN = "#c08562";
const SKIN_DARK = "#a86850";
const HAIR = "#241a1e";
const EYE_WHITE = "#f4f1ea";
const IRIS = "#4a3226";
const SHIRT = "#182036";
const STATE_TINT: Record<AvatarState, string> = {
  idle: "#4f7fff",
  listening: "#22d3ee",
  thinking: "#8b5cf6",
  speaking: "#4f7fff",
  error: "#f43f5e",
};

/* Crâne : ellipsoïde rx=0.46, ry=0.52, rz=0.44.
   Surface avant z(x,y) = 0.44·√(1−(x/0.46)²−(y/0.52)²) */
const EYE_POS: [number, number, number] = [0.16, 0.07, 0.39];
const BROW_POS: [number, number, number] = [0.155, 0.205, 0.388];
const NOSE_POS: [number, number, number] = [0, -0.02, 0.43];
const LIP_TOP_POS: [number, number, number] = [0, -0.155, 0.418];
const LIP_BOT_POS: [number, number, number] = [0, -0.185, 0.40];
const MOUTH_INNER_POS: [number, number, number] = [0, -0.17, 0.375];
const EAR_POS: [number, number, number] = [0.44, 0.0, 0.02];

function seededNoise(t: number, seed: number) {
  return Math.sin(t * 0.9 + seed) * 0.6 + Math.sin(t * 1.7 + seed * 2.1) * 0.4;
}

interface SoulAvatarProps {
  state: AvatarState;
  lowPower?: boolean;
}

export function SoulAvatar({ state, lowPower = false }: SoulAvatarProps) {
  const head = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const lidL = useRef<THREE.Mesh>(null);
  const lidR = useRef<THREE.Mesh>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);
  const mouthInner = useRef<THREE.Mesh>(null);
  const aura = useRef<THREE.Mesh>(null);
  const auraLight = useRef<THREE.PointLight>(null);

  const blink = useRef({ next: 2.2, closing: 0, phase: 0 });
  const mouthOpen = useRef(0);
  const expr = useRef({ browY: 0, browRot: 0, headPitch: 0, headYaw: 0, eyeLook: 0, tilt: 0 });
  const target = useRef({ browY: 0, browRot: 0, headPitch: 0, headYaw: 0, eyeLook: 0, tilt: 0 });

  const geometries = useMemo(() => {
    const seg = lowPower ? 0.6 : 1;
    return {
      skull: new THREE.SphereGeometry(0.5, Math.round(32 * seg), Math.round(24 * seg)),
      jaw: new THREE.SphereGeometry(0.5, Math.round(28 * seg), Math.round(20 * seg)),
      eye: new THREE.SphereGeometry(0.075, Math.round(18 * seg), Math.round(14 * seg)),
      iris: new THREE.SphereGeometry(0.038, Math.round(14 * seg), Math.round(12 * seg)),
      lid: new THREE.SphereGeometry(0.084, Math.round(16 * seg), Math.round(12 * seg), 0, Math.PI * 2, 0, Math.PI / 2),
      brow: new THREE.BoxGeometry(0.16, 0.03, 0.05),
      nose: new THREE.ConeGeometry(0.07, 0.18, Math.round(12 * seg)),
      ear: new THREE.SphereGeometry(0.07, Math.round(12 * seg), Math.round(10 * seg)),
      // Cheveux : calotte (hémisphère) légèrement plus large que le crâne
      hair: new THREE.SphereGeometry(0.53, Math.round(32 * seg), Math.round(22 * seg), 0, Math.PI * 2, 0, Math.PI * 0.52),
      // Barbe : bande inférieure AVANT (phi centré sur le visage)
      beard: new THREE.SphereGeometry(0.472, Math.round(28 * seg), Math.round(18 * seg), Math.PI * 0.5 - 1.25, 2.5, Math.PI * 0.58, Math.PI * 0.34),
      lip: new THREE.BoxGeometry(0.15, 0.02, 0.04),
      mouthInner: new THREE.SphereGeometry(0.1, Math.round(14 * seg), Math.round(12 * seg)),
      neck: new THREE.CylinderGeometry(0.16, 0.2, 0.34, Math.round(16 * seg)),
      torso: new THREE.CapsuleGeometry(0.44, 0.5, Math.round(8 * seg), Math.round(20 * seg)),
      aura: new THREE.SphereGeometry(0.9, 16, 12),
    };
  }, [lowPower]);

  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.65, metalness: 0.02 }),
      skinDark: new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.7, metalness: 0.02 }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.55, metalness: 0.05 }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: EYE_WHITE, roughness: 0.25 }),
      iris: new THREE.MeshStandardMaterial({ color: IRIS, roughness: 0.3 }),
      pupil: new THREE.MeshBasicMaterial({ color: "#0a0a0a" }),
      lid: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.65 }),
      mouthInner: new THREE.MeshStandardMaterial({ color: "#4a1a1e", roughness: 0.6 }),
      shirt: new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.85, metalness: 0.08 }),
      aura: new THREE.MeshBasicMaterial({
        color: STATE_TINT[state],
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    }),
    [state]
  );

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    const dt = Math.min(delta, 0.05);

    // ---- Cibles par état ----
    const T = target.current;
    switch (state) {
      case "listening":
        T.headPitch = 0.06;
        T.headYaw = seededNoise(t, 1) * 0.05;
        T.browY = 0.02;
        T.browRot = 0;
        T.eyeLook = 0;
        T.tilt = 0.08;
        break;
      case "thinking":
        T.headPitch = -0.1;
        T.headYaw = -0.16;
        T.browY = -0.015;
        T.browRot = -0.18;
        T.eyeLook = 0.22; // regard légèrement détourné
        T.tilt = -0.06;
        break;
      case "speaking":
        T.headPitch = 0.02 + seededNoise(t, 3) * 0.03;
        T.headYaw = seededNoise(t, 2) * 0.06;
        T.browY = 0.005 + (mouthBus.level > 0.5 ? 0.012 : 0);
        T.browRot = 0;
        T.eyeLook = 0;
        T.tilt = 0;
        break;
      case "error":
        T.headPitch = -0.04;
        T.headYaw = 0.05;
        T.browY = -0.03;
        T.browRot = -0.25;
        T.eyeLook = 0.1;
        T.tilt = 0.12;
        break;
      default:
        // IDLE : micro-mouvements naturels
        T.headPitch = Math.sin(t * 0.45) * 0.035;
        T.headYaw = Math.sin(t * 0.3) * 0.05 + seededNoise(t, 1) * 0.02;
        T.browY = Math.sin(t * 0.2) > 0.85 ? 0.02 : 0;
        T.browRot = 0;
        T.eyeLook = Math.sin(t * 0.13) * 0.1;
        T.tilt = Math.sin(t * 0.22) * 0.035;
    }

    // ---- Interpolation douce des expressions ----
    const E = expr.current;
    const k = 1 - Math.exp(-4 * dt);
    E.headPitch += (T.headPitch - E.headPitch) * k;
    E.headYaw += (T.headYaw - E.headYaw) * k;
    E.browY += (T.browY - E.browY) * k;
    E.browRot += (T.browRot - E.browRot) * k;
    E.eyeLook += (T.eyeLook - E.eyeLook) * k;
    E.tilt += (T.tilt - E.tilt) * k;

    // ---- Tête ----
    if (head.current) {
      head.current.rotation.x = E.headPitch;
      head.current.rotation.y = E.headYaw;
      head.current.rotation.z = E.tilt;
      head.current.position.y = 0.14 + Math.sin(t * 0.9) * 0.008;
    }

    // ---- Clignement des yeux ----
    const B = blink.current;
    B.next -= dt;
    if (B.next <= 0 && B.phase === 0) {
      B.phase = 1;
      B.next = 2.2 + Math.random() * 3.6;
    }
    if (B.phase === 1) {
      B.closing += dt * 9;
      if (B.closing >= 1) {
        B.closing = 1;
        B.phase = 2;
      }
    } else if (B.phase === 2) {
      B.closing -= dt * 7;
      if (B.closing <= 0) {
        B.closing = 0;
        B.phase = 0;
      }
    }
    const lidAngle = -0.35 - B.closing * 1.1;
    if (lidL.current) lidL.current.rotation.x = lidAngle;
    if (lidR.current) lidR.current.rotation.x = lidAngle;

    // ---- Regard ----
    const look = E.eyeLook * 0.14;
    if (eyeL.current) eyeL.current.rotation.y = look;
    if (eyeR.current) eyeR.current.rotation.y = look;

    // ---- Sourcils ----
    if (browL.current) {
      browL.current.position.y = BROW_POS[1] + E.browY;
      browL.current.rotation.z = -0.14 + E.browRot;
    }
    if (browR.current) {
      browR.current.position.y = BROW_POS[1] + E.browY;
      browR.current.rotation.z = 0.14 - E.browRot;
    }

    // ---- Bouche (synchronisation approximative pendant la parole) ----
    let openness = 0;
    if (state === "speaking") openness = mouthBus.level;
    mouthOpen.current += (openness - mouthOpen.current) * (1 - Math.exp(-18 * dt));
    if (jaw.current) {
      jaw.current.rotation.x = mouthOpen.current * 0.14;
      jaw.current.position.y = mouthOpen.current * -0.02;
    }
    if (mouthInner.current) {
      const s = 0.45 + mouthOpen.current * 0.9;
      mouthInner.current.scale.set(1.0, s, 0.55);
      mouthInner.current.visible = mouthOpen.current > 0.05;
    }

    // ---- Aura d'état ----
    if (aura.current) {
      const mat = aura.current.material as THREE.MeshBasicMaterial;
      mat.color.set(STATE_TINT[state]);
      const targetOpacity = state === "error" ? 0.08 : state === "idle" ? 0.04 : 0.06;
      mat.opacity += (targetOpacity * (0.8 + Math.sin(t * 2.2) * 0.2) - mat.opacity) * k;
      aura.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.015);
    }
    if (auraLight.current) {
      auraLight.current.color.set(STATE_TINT[state]);
      auraLight.current.intensity = 0.7 + Math.sin(t * 2.2) * 0.15 + (state === "speaking" ? mouthBus.level * 0.6 : 0);
    }
  });

  return (
    <group position={[0, -0.12, 0]}>
      {/* Aura lumineuse de l'état */}
      <mesh ref={aura} geometry={geometries.aura} material={materials.aura} position={[0, 0.2, 0]} />
      <pointLight ref={auraLight} position={[0, 0.3, 1.1]} intensity={0.8} distance={4} color={STATE_TINT[state]} />

      {/* Torse (chemise sombre premium) */}
      <mesh geometry={geometries.torso} material={materials.shirt} position={[0, -0.86, 0]} scale={[1, 0.85, 0.7]} />
      <mesh geometry={geometries.neck} material={materials.skin} position={[0, -0.42, 0.01]} />

      {/* Tête */}
      <group ref={head} position={[0, 0.14, 0]}>
        {/* Crâne */}
        <mesh geometry={geometries.skull} material={materials.skin} scale={[0.92, 1.04, 0.88]} />

        {/* Yeux + paupières */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * EYE_POS[0], EYE_POS[1], EYE_POS[2]]}>
            <group ref={side === -1 ? eyeL : eyeR}>
              <mesh geometry={geometries.eye} material={materials.eyeWhite} scale={[1, 1, 0.72]} />
              <mesh geometry={geometries.iris} material={materials.iris} position={[0, 0, 0.05]} scale={[1, 1, 0.5]} />
              <mesh geometry={geometries.iris} material={materials.pupil} position={[0, 0, 0.066]} scale={[0.45, 0.45, 0.3]} />
            </group>
            {/* Paupière : hémisphère peau qui tourne pour cligner */}
            <mesh ref={side === -1 ? lidL : lidR} geometry={geometries.lid} material={materials.lid} position={[0, 0.004, 0.004]} rotation={[-0.35, 0, 0]} scale={[1.04, 1.04, 0.9]} />
          </group>
        ))}

        {/* Sourcils */}
        <mesh ref={browL} geometry={geometries.brow} material={materials.hair} position={[-BROW_POS[0], BROW_POS[1], BROW_POS[2]]} rotation={[0, 0, -0.14]} />
        <mesh ref={browR} geometry={geometries.brow} material={materials.hair} position={[BROW_POS[0], BROW_POS[1], BROW_POS[2]]} rotation={[0, 0, 0.14]} />

        {/* Nez */}
        <mesh geometry={geometries.nose} material={materials.skin} position={NOSE_POS} rotation={[1.75, 0, 0]} scale={[0.85, 0.9, 0.9]} />

        {/* Oreilles */}
        <mesh geometry={geometries.ear} material={materials.skin} position={[-EAR_POS[0], EAR_POS[1], EAR_POS[2]]} scale={[0.42, 1, 0.75]} />
        <mesh geometry={geometries.ear} material={materials.skin} position={[EAR_POS[0], EAR_POS[1], EAR_POS[2]]} scale={[0.42, 1, 0.75]} />

        {/* Mâchoire articulée (parle) */}
        <group ref={jaw} position={[0, 0, 0]}>
          {/* Menton / mâchoire inférieure */}
          <mesh geometry={geometries.jaw} material={materials.skin} position={[0, -0.185, 0.02]} scale={[0.72, 0.52, 0.76]} />
          {/* Barbe : bande inférieure avant */}
          <mesh geometry={geometries.beard} material={materials.hair} position={[0, -0.02, 0.01]} scale={[0.94, 1.0, 0.9]} />
          {/* Lèvre inférieure */}
          <mesh geometry={geometries.lip} material={materials.skinDark} position={[0, -0.19, 0.4]} rotation={[0.1, 0, 0]} scale={[0.78, 0.8, 0.8]} />
        </group>

        {/* Intérieur de bouche */}
        <mesh ref={mouthInner} geometry={geometries.mouthInner} material={materials.mouthInner} position={MOUTH_INNER_POS} scale={[1, 0.45, 0.55]} visible={false} />

        {/* Lèvre supérieure */}
        <mesh geometry={geometries.lip} material={materials.skinDark} position={LIP_TOP_POS} rotation={[-0.08, 0, 0]} scale={[0.9, 0.85, 0.8]} />

        {/* Cheveux : calotte inclinée vers l'arrière (visage dégagé) */}
        <mesh geometry={geometries.hair} material={materials.hair} position={[0, 0.045, -0.05]} rotation={[-0.5, 0, 0]} scale={[0.98, 1.02, 1.0]} />
      </group>
    </group>
  );
}
