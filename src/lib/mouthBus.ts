"use client";

/**
 * Bus partagé du niveau de bouche (entre le TTS et l'avatar 3D).
 * Objet mutable lu chaque frame par R3F — sans re-render React.
 * Synchronisation labiale APPROXIMATIVE (enveloppe rythmée par les mots
 * prononcés), pas une synchronisation phonétique réelle.
 */
export const mouthBus = { level: 0 };
