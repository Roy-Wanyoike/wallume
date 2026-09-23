"use client";

import { useMemo } from "react";
import { History } from "lucide-react";
import { WallpaperCanvas } from "./wallpaper-canvas";
import { defaultConfig } from "@/lib/wallpapers/render";
import { getSceneOfTheDay } from "@/lib/wallpapers/sotd";
import type { WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";

type Props = {
  onLoad: (def: WallpaperDef) => void;
};

/**
 * Scene of the Day archive — the last 14 daily picks as live mini
 * thumbnails in a horizontal snap-scroll strip. Deterministic UTC keys
 * keep every entry stable (and hydration-safe).
 */
export function SotdArchive({ onLoad }: Props) {
  const days = useMemo(() => {
    const out: { def: WallpaperDef; key: string; label: string; isToday: boolean }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const def = getSceneOfTheDay(d);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      out.push({ def, key: `sotd-${i}`, label, isToday: i === 0 });
    }
    return out;
  }, []);

  return (
    <div className="border-t border-white/5 bg-black/25 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5 text-amber-300" />
        Past 14 daily scenes
        <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground/70">
          scroll for more
        </span>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map(({ def, key, label, isToday }) => (
          <button
            key={key}
            onClick={() => onLoad(def)}
            title={`Load ${def.name} into the studio`}
            aria-label={`Load ${def.name} (featured ${label}) into the studio`}
            className={`group relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border text-left transition-transform hover:scale-[1.04] focus-visible:outline-none sm:w-36 ${
              isToday ? "border-amber-400/70 shadow-[0_0_14px_rgba(251,191,36,0.25)]" : "border-white/10"
            }`}
          >
            <span className="relative block aspect-video w-full overflow-hidden">
              <WallpaperCanvas
                def={def}
                config={defaultConfig(def) as WallpaperConfig}
                fps={24}
                maxPixels={45_000}
                className="absolute inset-0"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </span>
            <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/85 backdrop-blur">
              {isToday ? "Today" : label}
            </span>
            <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-[10px] font-semibold text-white/90">
              <span aria-hidden className="mr-1">{def.icon}</span>
              {def.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
