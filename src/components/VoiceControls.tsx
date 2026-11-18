"use client";

/**
 * Contrôles vocaux : interruption, volume, activation/désactivation de la voix.
 */
import { Volume2, VolumeX, StopCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { VoiceSettings } from "@/contexts/SettingsContext";
import { tts } from "@/lib/tts";

interface VoiceControlsProps {
  voice: VoiceSettings;
  setVoice: (v: Partial<VoiceSettings>) => void;
  onInterrupt: () => void;
  speaking: boolean;
  compact?: boolean;
}

export function VoiceControls({ voice, setVoice, onInterrupt, speaking, compact }: VoiceControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {voice.ttsEnabled ? (
            <Volume2 className="h-4 w-4 shrink-0 text-soul-blue" />
          ) : (
            <VolumeX className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm text-foreground/85">{voice.ttsEnabled ? "Voix activée" : "Voix désactivée"}</span>
        </div>
        <div className="flex items-center gap-2">
          {speaking && (
            <Button
              size="sm"
              variant="outline"
              onClick={onInterrupt}
              className="h-8 gap-1.5 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            >
              <StopCircle className="h-3.5 w-3.5" />
              Interrompre
            </Button>
          )}
          <Switch
            checked={voice.ttsEnabled}
            onCheckedChange={(v) => {
              if (!v) tts.cancel();
              setVoice({ ttsEnabled: v });
            }}
            aria-label="Activer ou désactiver la voix"
          />
        </div>
      </div>
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Volume</Label>
            <Slider
              value={[voice.volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => setVoice({ volume: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
