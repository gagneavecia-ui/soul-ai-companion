"use client";

/**
 * Icônes locales légères (évite une dépendance particulière).
 */
import { Sparkles } from "lucide-react";

export { Sparkles };

export function Mic3d({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="5" />
      <path d="M10 10c0 .7.9 1.3 2 1.3s2-.6 2-1.3" />
      <circle cx="9.5" cy="7" r="0.4" fill="currentColor" />
      <circle cx="14.5" cy="7" r="0.4" fill="currentColor" />
      <path d="M12 13v3M8 21h8M12 16c-2 0-4 1-4 3M12 16c2 0 4 1 4 3" />
    </svg>
  );
}

export function Brain({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 4a3.5 3.5 0 0 0-3.5 3.5v.6A3 3 0 0 0 6 11a3 3 0 0 0 1 2.2V15a3 3 0 0 0 3 3h2V4z" />
      <path d="M12 4a3.5 3.5 0 0 1 3.5 3.5v.6A3 3 0 0 1 18 11a3 3 0 0 1-1 2.2V15a3 3 0 0 1-3 3h-2" />
    </svg>
  );
}

export function Languages({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 5h10M8 3v2M11 5c-.5 4-3.5 7.5-6 9M5 8c1.5 3 4 5.5 7 7" />
      <path d="m14 20 3.5-8 3.5 8M15.5 17h4" />
    </svg>
  );
}
