"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WallpaperCanvas } from "./wallpaper-canvas";
import { WALLPAPERS } from "@/lib/wallpapers/catalog";
import { defaultConfig } from "@/lib/wallpapers/render";
import type { WallpaperDef } from "@/lib/wallpapers/types";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 12_000;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** wallpaper ids to cycle — favorites first, everything when empty */
  favoriteIds: string[];
};

/**
 * Ambient mode — a fullscreen slideshow that slowly cross-fades between
 * live wallpapers. Uses your favorites when you have some, the whole
 * collection otherwise. Built for idle screens and "living painting" vibe.
 */
export function AmbientMode({ open, onOpenChange, favoriteIds }: Props) {
  const playlist = useMemo<WallpaperDef[]>(() => {
    const favs = favoriteIds
      .map((id) => WALLPAPERS.find((w) => w.id === id))
      .filter((w): w is WallpaperDef => !!w);
    if (favs.length >= 2) return favs;
    return WALLPAPERS;
  }, [favoriteIds]);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const slideStartRef = useRef(0);
  const favsKey = favoriteIds.join(",");

  // reset when opened (state-adjust-during-render — no effect needed)
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = open ? favsKey : null;
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (open) {
      setIdx(0);
      setPaused(false);
      setProgress(0);
    }
    slideStartRef.current = performance.now();
  }

  // advance + progress via rAF (no re-render per frame except progress rounding)
  useEffect(() => {
    if (!open || paused) return;
    slideStartRef.current = performance.now() - progress * INTERVAL_MS;
    const loop = (now: number) => {
      const elapsed = now - slideStartRef.current;
      if (elapsed >= INTERVAL_MS) {
        slideStartRef.current = now;
        setProgress(0);
        setIdx((i) => (i + 1) % playlist.length);
      } else {
        setProgress(Math.min(0.99, elapsed / INTERVAL_MS));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, paused, playlist.length]);

  // escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      if (e.key === "ArrowRight") {
        setIdx((i) => (i + 1) % playlist.length);
        slideStartRef.current = performance.now();
      }
      if (e.key === "ArrowLeft") {
        setIdx((i) => (i - 1 + playlist.length) % playlist.length);
        slideStartRef.current = performance.now();
      }
      if (e.key === " ") {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange, playlist.length]);

  if (!open) return null;

  const current = playlist[idx % playlist.length];
  const next = playlist[(idx + 1) % playlist.length];

  const goTo = (i: number) => {
    setIdx(((i % playlist.length) + playlist.length) % playlist.length);
    slideStartRef.current = performance.now();
    setProgress(0);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ambient mode — live wallpaper slideshow"
      className="fixed inset-0 z-[85] bg-black"
    >
      {/* two stacked live canvases cross-fade */}
      <WallpaperCanvas
        key={`a-${current.id}-${idx}`}
        def={current}
        config={{ ...defaultConfig(current), seed: (current.defaults?.seed ?? 42) + idx * 37 }}
        interactive
        fps={60}
        maxPixels={1_300_000}
        touchAction="pan-y"
        className="absolute inset-0 animate-[ambient-fade_2s_ease-out_forwards]"
      />
      {/* pre-render next slide hidden so the swap is instant */}
      <div className="pointer-events-none absolute inset-0 opacity-0">
        <WallpaperCanvas
          def={next}
          config={{ ...defaultConfig(next), seed: (next.defaults?.seed ?? 42) + (idx + 1) * 37 }}
          fps={24}
          maxPixels={500_000}
          className="absolute inset-0"
        />
      </div>

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
        <div className="text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Ambient mode {favoriteIds.length >= 2 ? "· favorites" : ""}
          </p>
          <p className="text-lg font-semibold">
            {current.icon} {current.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
            className="border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Exit ambient mode"
            className="border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-5">
        {/* progress bar */}
        <div className="h-1 w-56 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-amber-300 transition-[width] duration-200 ease-linear"
            style={{ width: paused ? `${progress * 100}%` : `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(idx - 1)}
            aria-label="Previous wallpaper"
            className="h-9 w-9 rounded-full border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex max-w-[40vw] flex-wrap items-center justify-center gap-1.5 sm:max-w-[50vw]">
            {playlist.slice(0, 12).map((w, i) => (
              <button
                key={w.id}
                onClick={() => goTo(i)}
                aria-label={`Show ${w.name}`}
                aria-current={i === idx % Math.min(12, playlist.length)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === idx % Math.min(12, playlist.length)
                    ? "w-6 bg-white"
                    : "w-2 bg-white/35 hover:bg-white/60",
                )}
              />
            ))}
            {playlist.length > 12 && (
              <span className="text-[10px] text-white/50">+{playlist.length - 12}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(idx + 1)}
            aria-label="Next wallpaper"
            className="h-9 w-9 rounded-full border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-[11px] text-white/60 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
          Touch the scene — it still reacts · Space pauses · Esc exits
        </p>
      </div>
    </div>
  );
}
