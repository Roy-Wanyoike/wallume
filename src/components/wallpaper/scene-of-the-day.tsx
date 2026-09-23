"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WallpaperCanvas } from "./wallpaper-canvas";
import { SotdArchive } from "./sotd-archive";
import { defaultConfig } from "@/lib/wallpapers/render";
import { formatCountdown, getSceneOfTheDay, msUntilNextScene } from "@/lib/wallpapers/sotd";
import type { StatsMap, WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";

type Props = {
  stats: StatsMap;
  likedIds: string[];
  isFavorite: (id: string) => boolean;
  onToggleLike: (id: string) => void;
  onLoad: (def: WallpaperDef) => void;
};

/**
 * Scene of the Day — deterministic daily featured wallpaper, rendered in
 * a widescreen (landscape) frame to show off desktop composition.
 */
export function SceneOfTheDay({ stats, likedIds, isFavorite, onToggleLike, onLoad }: Props) {
  // deterministic daily pick — computed lazily so it never cascades a render
  const [sotd] = useState<WallpaperDef>(() => getSceneOfTheDay());
  // empty initial value keeps server & client markup identical (no hydration diff);
  // the live value appears on the first interval tick
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(msUntilNextScene())), 1000);
    return () => clearInterval(id);
  }, []);

  const st = stats[sotd.id] ?? { likes: 0, downloads: 0 };
  const liked = likedIds.includes(sotd.id);

  const load = () => {
    onLoad(sotd);
  };

  return (
    <section id="sotd" aria-label="Scene of the Day" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-8">
      <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 shadow-2xl">
        {/* ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-24 -z-10 bg-gradient-to-r from-fuchsia-500/15 via-rose-500/10 to-amber-400/15 blur-3xl"
        />

        {/* widescreen live canvas */}
        <button
          onClick={load}
          aria-label={`Open the Scene of the Day: ${sotd.name}`}
          className="relative block aspect-[21/9] max-h-[380px] w-full cursor-pointer overflow-hidden focus-visible:outline-none sm:aspect-[21/8]"
        >
          <WallpaperCanvas
            def={sotd}
            config={defaultConfig(sotd) as WallpaperConfig}
            interactive
            fps={60}
            maxPixels={600_000}
            className="absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />

          {/* top-left badge */}
          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <CalendarDays className="h-3.5 w-3.5 text-amber-300" />
            Scene of the Day
          </span>

          {/* countdown */}
          <span className="absolute right-4 top-4 hidden items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-medium tabular-nums text-white/85 backdrop-blur sm:flex">
            <Clock3 className="h-3.5 w-3.5 text-fuchsia-300" />
            rotates in {countdown}
          </span>
        </button>

        {/* info bar */}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
                <span aria-hidden>{sotd.icon}</span>
                {sotd.name}
              </h2>
              <Badge variant="secondary" className="text-[11px]">
                {sotd.category}
              </Badge>
              {sotd.interact && sotd.interact.kind !== "parallax" && (
                <Badge className="border-white/10 bg-white/5 text-[10px] text-foreground/80">
                  👆 {sotd.interact.label}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Today&rsquo;s featured living wallpaper — here for{" "}
              <span className="tabular-nums text-foreground/80">{countdown}</span> before the next one takes
              the stage.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={load}
              className="h-11 gap-2 bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 font-semibold text-white shadow-lg shadow-rose-500/25 hover:opacity-90"
            >
              Load in studio <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onToggleLike(sotd.id)}
              aria-pressed={liked}
              aria-label={liked ? "Unlike today's scene" : "Like today's scene"}
              className="h-11 gap-2 border-white/15"
            >
              <Heart className={liked ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4"} />
              {st.likes.toLocaleString()}
            </Button>
          </div>
        </div>

        {/* favorite indicator dot */}
        {isFavorite(sotd.id) && (
          <span className="absolute bottom-[86px] right-5 hidden rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-zinc-950 sm:block">
            ⭐ In your favorites
          </span>
        )}
      </div>

      {/* archive of the last 14 daily picks */}
      <div className="group/arch relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-xl">
        <SotdArchive onLoad={onLoad} />
      </div>
    </section>
  );
}
