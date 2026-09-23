"use client";

/**
 * Zen mode — the purest way to enjoy a Wallume scene:
 * fullscreen canvas, zero chrome, screen kept awake. Any tap briefly
 * reveals a floating pill with the scene name and an exit button, then
 * everything fades again so the wallpaper can just… be a wallpaper.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Flower2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WallpaperCanvas } from "./wallpaper-canvas";
import type { WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";

type WakeLockSentinel = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

export function ZenMode({
  def,
  config,
  onExit,
}: {
  def: WallpaperDef;
  config: WallpaperConfig;
  onExit: () => void;
}) {
  const [chrome, setChrome] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* keep the screen awake while zen is open (feature-detected, silent) */
  useEffect(() => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    let sentinel: WakeLockSentinel | null = null;
    let lost = false;
    const acquire = () => {
      nav.wakeLock
        .request("screen")
        .then((s) => {
          sentinel = s;
          lost = false;
        })
        .catch(() => {
          /* denied or unsupported — zen still works */
        });
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && lost) acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (sentinel) {
        lost = true;
        sentinel.release().catch(() => {
          /* already released */
        });
      }
    };
  }, []);

  /* any interaction pokes the chrome back to life, then it fades */
  const poke = useCallback(() => {
    setChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 3500);
  }, []);

  useEffect(() => {
    // chrome starts visible — just arm the fade, no state flip needed
    hideTimer.current = setTimeout(() => setChrome(false), 3500);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [onExit]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Zen view of ${def.name}`}
      className="fixed inset-0 z-[90] bg-black"
      onPointerDown={poke}
    >
      <WallpaperCanvas
        def={def}
        config={config}
        interactive
        fps={60}
        maxPixels={1_300_000}
        touchAction="none"
        className="absolute inset-0"
      />

      {/* floating chrome — fades out after inactivity */}
      <div
        className={`absolute inset-x-0 bottom-0 flex justify-center p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-opacity duration-700 ${
          chrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/55 py-2 pl-5 pr-2 text-white shadow-2xl backdrop-blur-md">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Flower2 className="h-4 w-4 text-emerald-300" aria-hidden />
            {def.icon} {def.name}
            <span className="hidden text-xs font-normal text-white/60 sm:inline">
              · {def.interact?.label ?? "cursor parallax"}
            </span>
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={onExit}
            aria-label="Exit zen mode"
            className="h-9 w-9 shrink-0 rounded-full border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* first-visit hint — also fades with the chrome */}
      <p
        aria-hidden
        className={`absolute inset-x-0 top-5 text-center text-xs text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)] transition-opacity duration-700 ${
          chrome ? "opacity-100" : "opacity-0"
        }`}
      >
        Tap anywhere to reveal controls · Esc to exit
      </p>
    </div>
  );
}
