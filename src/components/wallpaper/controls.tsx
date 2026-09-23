"use client";

import { useState } from "react";
import { Paintbrush, RotateCcw, Shuffle, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { WALLPAPERS } from "@/lib/wallpapers/catalog";
import type { WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";
import { cn } from "@/lib/utils";

const COLOR_LABELS = ["Sky top", "Sky bottom", "Accent 1", "Accent 2", "Accent 3"];

type Props = {
  def: WallpaperDef;
  config: WallpaperConfig;
  onDefChange: (def: WallpaperDef) => void;
  onPatch: (patch: Partial<WallpaperConfig>) => void;
  onReset: () => void;
  onRandomize: () => void;
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground/90">{label}</Label>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {format ? format(value) : value.toFixed(2) + "×"}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
    </div>
  );
}

export function StudioControls({ def, config, onDefChange, onPatch, onReset, onRandomize }: Props) {
  const [editColors, setEditColors] = useState(false);
  const activeColors =
    config.customColors ?? def.palettes[config.paletteIndex % def.palettes.length].colors;

  return (
    <Card className="border-white/10 bg-zinc-900/50 shadow-xl backdrop-blur">
      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* wallpaper picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/90">Wallpaper</Label>
            <Badge variant="secondary" className="text-[11px]">
              {WALLPAPERS.length} live scenes
            </Badge>
          </div>
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
            role="listbox"
            aria-label="Choose a wallpaper"
          >
            {WALLPAPERS.map((wp) => {
              const selected = wp.id === def.id;
              return (
                <button
                  key={wp.id}
                  role="option"
                  aria-selected={selected}
                  onClick={() => onDefChange(wp)}
                  className={cn(
                    "group flex w-[82px] shrink-0 flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                    "hover:border-white/25 hover:bg-white/5 active:scale-95",
                    selected
                      ? "border-fuchsia-400/70 bg-fuchsia-500/10 shadow-[0_0_18px_-4px] shadow-fuchsia-500/40"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <span className="text-xl transition-transform group-hover:scale-110" aria-hidden>
                    {wp.icon}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-center text-[11px] font-medium",
                      selected ? "text-fuchsia-200" : "text-muted-foreground",
                    )}
                  >
                    {wp.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* palettes */}
        <div className="space-y-2">
          <Label className="text-sm text-foreground/90">Palette</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {def.palettes.map((pal, i) => {
              const selected = !config.customColors && config.paletteIndex === i;
              return (
                <button
                  key={pal.name}
                  onClick={() => onPatch({ paletteIndex: i, customColors: null })}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2 transition-all active:scale-[0.97]",
                    selected
                      ? "border-fuchsia-400/70 bg-fuchsia-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25",
                  )}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
                    {pal.colors.map((c, j) => (
                      <span key={j} className="h-4 w-2.5" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[11px] font-medium",
                      selected ? "text-fuchsia-200" : "text-muted-foreground",
                    )}
                  >
                    {pal.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* per-color fine tuning */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Paintbrush className="h-3.5 w-3.5" />
              Fine-tune colors
              {config.customColors && (
                <Badge className="h-5 bg-fuchsia-500/20 px-1.5 text-[10px] text-fuchsia-200">
                  custom
                </Badge>
              )}
            </span>
            <div className="flex items-center gap-2">
              {config.customColors && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => onPatch({ customColors: null })}
                >
                  Reset
                </Button>
              )}
              <Switch
                checked={editColors}
                onCheckedChange={setEditColors}
                aria-label="Toggle color editing"
              />
            </div>
          </div>

          {editColors && (
            <div className="grid grid-cols-5 gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              {activeColors.map((c, i) => (
                <label key={i} className="space-y-1 text-center">
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => {
                      const next = [...activeColors];
                      next[i] = e.target.value;
                      onPatch({ customColors: next });
                    }}
                    aria-label={COLOR_LABELS[i]}
                    className="h-8 w-full cursor-pointer rounded-md border border-white/20 bg-transparent p-0.5"
                  />
                  <span className="block text-[9px] leading-tight text-muted-foreground">
                    {COLOR_LABELS[i]}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* motion & mood */}
        <div className="space-y-4">
          <Label className="text-sm text-foreground/90">Motion &amp; mood</Label>
          <SliderRow
            label="Speed"
            value={config.speed}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => onPatch({ speed: v })}
          />
          <SliderRow
            label="Density"
            value={config.density}
            min={0.2}
            max={2}
            step={0.05}
            onChange={(v) => onPatch({ density: v })}
          />
          <SliderRow
            label="Glow"
            value={config.glow}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => onPatch({ glow: v })}
          />
        </div>

        {/* actions */}
        <div className="flex gap-2 border-t border-white/10 pt-4">
          <Button variant="ghost" size="sm" className="flex-1 gap-2" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onRandomize}>
            <Wand2 className="h-3.5 w-3.5" /> Randomize
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onPatch({ seed: Math.floor(Math.random() * 9999) })}
          >
            <Shuffle className="h-3.5 w-3.5" /> Re-seed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
