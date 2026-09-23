"use client";

import { useEffect, useState } from "react";
import {
  BatteryFull,
  Dices,
  Download,
  Lock,
  Maximize2,
  Monitor,
  Share2,
  Signal,
  Smartphone,
  Star,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WallpaperCanvas } from "./wallpaper-canvas";
import { LikeButton } from "./like-button";
import { StudioControls } from "./controls";
import type { WallpaperConfig, WallpaperDef, WallpaperStats } from "@/lib/wallpapers/types";
import { cn } from "@/lib/utils";

export type DeviceMode = "phone" | "desktop";

type Props = {
  def: WallpaperDef;
  config: WallpaperConfig;
  stats: WallpaperStats;
  liked: boolean;
  likePending: boolean;
  fav: boolean;
  onToggleFav: () => void;
  device: DeviceMode;
  onDeviceChange: (d: DeviceMode) => void;
  onToggleLike: () => void;
  onOpenDownload: () => void;
  onOpenFullscreen: () => void;
  onOpenShare: () => void;
  onShuffle: () => void;
  onDefChange: (def: WallpaperDef) => void;
  onPatch: (patch: Partial<WallpaperConfig>) => void;
  onReset: () => void;
  onRandomize: () => void;
};

function useClock() {
  const [now, setNow] = useState<{ time: string; date: string } | null>(null);
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow({
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        date: d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }),
      });
    };
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Live lock-screen mockup: real clock, status icons, subtle parallax. */
function PhonePreview({
  def,
  config,
  onOpenFullscreen,
}: {
  def: WallpaperDef;
  config: WallpaperConfig;
  onOpenFullscreen: () => void;
}) {
  const now = useClock();
  return (
    <button
      onClick={onOpenFullscreen}
      aria-label="Open fullscreen phone preview"
      className="group relative mx-auto block w-full max-w-[330px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:max-w-[360px]"
    >
      {/* ambient glow behind the device */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[3.5rem] bg-gradient-to-b from-fuchsia-500/25 via-rose-500/10 to-amber-400/20 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100 sm:-inset-8 sm:blur-3xl"
      />
      <div className="rounded-[2.6rem] border border-white/10 bg-zinc-950 p-2 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/5 transition-transform duration-300 group-hover:-translate-y-1">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2rem] bg-black">
          <WallpaperCanvas def={def} config={config} interactive fps={60} className="absolute inset-0" />

          {/* readability scrims */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

          {/* status bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-3.5 text-[11px] font-medium text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
            <span suppressHydrationWarning>{now?.time ?? ""}</span>
            <span className="flex items-center gap-1.5">
              <Signal className="h-3.5 w-3.5" />
              <Wifi className="h-3.5 w-3.5" />
              <BatteryFull className="h-4 w-4" />
            </span>
          </div>

          {/* dynamic island */}
          <div className="absolute left-1/2 top-2.5 h-[22px] w-24 -translate-x-1/2 rounded-full bg-black/90" />

          {/* clock widget */}
          <div className="pointer-events-none absolute inset-x-0 top-[15%] px-6 text-left text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
            <div className="text-[56px] font-extralight leading-none tracking-tight" suppressHydrationWarning>
              {now?.time ?? "12:45"}
            </div>
            <div className="mt-1.5 text-sm font-medium text-white/85" suppressHydrationWarning>
              {now?.date ?? "Tuesday, January 1"}
            </div>
          </div>

          {/* lock hint */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-1 text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
            <Lock className="h-4 w-4 animate-pulse" />
            <span className="text-[10px] font-medium tracking-wide">Swipe up to unlock</span>
          </div>
        </div>
      </div>

      {/* hover hint */}
      <span className="pointer-events-none absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3 w-3" /> Tap for fullscreen
      </span>
    </button>
  );
}

/** Desktop / laptop mockup: monitor frame with a menu bar and clock. */
function DesktopPreview({
  def,
  config,
  onOpenFullscreen,
}: {
  def: WallpaperDef;
  config: WallpaperConfig;
  onOpenFullscreen: () => void;
}) {
  const now = useClock();
  return (
    <button
      onClick={onOpenFullscreen}
      aria-label="Open fullscreen desktop preview"
      className="group relative mx-auto block w-full max-w-[430px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:max-w-[460px]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-b from-amber-400/20 via-fuchsia-500/15 to-rose-500/10 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100 sm:-inset-6 sm:blur-3xl"
      />
      <div className="transition-transform duration-300 group-hover:-translate-y-1">
        {/* monitor */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/5">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black">
            <WallpaperCanvas def={def} config={config} interactive fps={60} className="absolute inset-0" />

            {/* top menu bar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-black/35 px-3 py-1.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
              <span suppressHydrationWarning>{now?.time ?? ""}</span>
              <span className="flex items-center gap-2">
                <Wifi className="h-3 w-3" />
                <BatteryFull className="h-3.5 w-3.5" />
                <Signal className="h-3 w-3" />
              </span>
            </div>

            {/* centered clock */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]">
              <div className="text-5xl font-extralight tracking-tight" suppressHydrationWarning>
                {now?.time ?? "12:45"}
              </div>
              <div className="mt-1 text-xs font-medium text-white/85" suppressHydrationWarning>
                {now?.date ?? "Tuesday, January 1"}
              </div>
            </div>

            {/* dock hint */}
            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center">
              <span className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 px-3 py-1.5 backdrop-blur-sm">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-4 w-4 rounded-md bg-white/20" />
                ))}
              </span>
            </div>
          </div>
        </div>
        {/* stand */}
        <div className="mx-auto h-5 w-16 rounded-b-lg bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-lg" />
        <div className="mx-auto h-1.5 w-32 rounded-full bg-zinc-800" />
      </div>

      <span className="pointer-events-none absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3 w-3" /> Tap for fullscreen
      </span>
    </button>
  );
}

export function Studio({
  def,
  config,
  stats,
  liked,
  likePending,
  fav,
  onToggleFav,
  device,
  onDeviceChange,
  onToggleLike,
  onOpenDownload,
  onOpenFullscreen,
  onOpenShare,
  onShuffle,
  onDefChange,
  onPatch,
  onReset,
  onRandomize,
}: Props) {
  return (
    <section id="studio" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(300px,460px)_1fr]">
        {/* left — device preview + actions */}
        <div className="mx-auto w-full max-w-[460px] min-w-0 lg:sticky lg:top-20">
          {/* device toggle */}
          <div className="mx-auto mb-4 flex w-fit rounded-full border border-white/10 bg-zinc-900/70 p-1 backdrop-blur">
            <button
              onClick={() => onDeviceChange("phone")}
              aria-pressed={device === "phone"}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all",
                device === "phone"
                  ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Smartphone className="h-4 w-4" /> Phone
            </button>
            <button
              onClick={() => onDeviceChange("desktop")}
              aria-pressed={device === "desktop"}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all",
                device === "desktop"
                  ? "bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Monitor className="h-4 w-4" /> Desktop
            </button>
          </div>

          {device === "phone" ? (
            <PhonePreview def={def} config={config} onOpenFullscreen={onOpenFullscreen} />
          ) : (
            <DesktopPreview def={def} config={config} onOpenFullscreen={onOpenFullscreen} />
          )}

          <div className="mt-6 space-y-3">
            <Button
              onClick={onOpenDownload}
              className="h-12 w-full gap-2 bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:opacity-90 hover:shadow-rose-500/40"
            >
              <Download className="h-5 w-5" />
              Get this wallpaper
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 gap-2" onClick={onShuffle}>
                <Dices className="h-4 w-4" /> Shuffle all
              </Button>
              <Button variant="outline" className="h-11 gap-2" onClick={onOpenFullscreen}>
                <Maximize2 className="h-4 w-4" /> Fullscreen
              </Button>
              <LikeButton variant="full" liked={liked} likes={stats.likes} pending={likePending} onToggle={onToggleLike} />
              <Button
                variant="outline"
                className={cn("h-11 gap-2", fav && "border-amber-400/50 bg-amber-400/10 text-amber-200")}
                onClick={onToggleFav}
                aria-pressed={fav}
              >
                <Star className={cn("h-4 w-4", fav && "fill-amber-300 text-amber-300")} />
                {fav ? "Favorited" : "Favorite"}
              </Button>
              <Button variant="outline" className="h-11 gap-2" onClick={onOpenShare}>
                <Share2 className="h-4 w-4" /> Save &amp; share
              </Button>
            </div>

            <p className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {stats.downloads.toLocaleString()} downloads
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3 rotate-45" /> free for personal use
              </span>
            </p>

            {def.interact && (
              <p className="flex items-center justify-center gap-2 text-center text-xs text-fuchsia-300/90">
                <span aria-hidden>👆</span> {def.interact.label}
              </p>
            )}
          </div>
        </div>

        {/* right — controls */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {def.icon} {def.name}
            </h2>
            <Badge variant="secondary">{def.category}</Badge>
            <span className="hidden text-sm text-muted-foreground sm:inline">— {def.tagline}</span>
          </div>
          <StudioControls
            def={def}
            config={config}
            onDefChange={onDefChange}
            onPatch={onPatch}
            onReset={onReset}
            onRandomize={onRandomize}
          />
        </div>
      </div>
    </section>
  );
}
