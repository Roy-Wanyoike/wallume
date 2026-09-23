"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Download, Heart, Search, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WallpaperCanvas } from "./wallpaper-canvas";
import { LikeButton } from "./like-button";
import { WALLPAPERS, CATEGORIES } from "@/lib/wallpapers/catalog";
import { defaultConfig } from "@/lib/wallpapers/render";
import type { StatsMap, WallpaperCategory, WallpaperDef } from "@/lib/wallpapers/types";
import { cn } from "@/lib/utils";

/** deterministic per-wallpaper seed so each thumbnail has its own personality */
function seedForId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 9999);
}

type SortMode = "trending" | "loved" | "newest" | "az";

const PAGE_SIZE = 24;

const CATEGORY_EMOJI: Record<string, string> = {
  All: "✨",
  Favorites: "⭐",
  Nature: "🌿",
  Ocean: "🌊",
  Space: "🌌",
  Abstract: "🎨",
  Urban: "🌃",
  Dreamy: "☁️",
  Retro: "📼",
  Geometric: "🔷",
};

/* Curated collections — cross-category moods you can filter the grid by */
type Collection = {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  match: (wp: WallpaperDef) => boolean;
};

const COLLECTIONS: Collection[] = [
  {
    id: "midnight",
    emoji: "🌙",
    name: "Midnight Vibes",
    blurb: "Dark skies, moons & quiet glow",
    match: (wp) =>
      (wp.tags ?? []).some((t) => ["night", "midnight", "moon", "dark"].includes(t)) ||
      /night|moon|midnight|nocturn/i.test(wp.name),
  },
  {
    id: "oceanic",
    emoji: "🐚",
    name: "Oceanic",
    blurb: "Water worlds & living reefs",
    match: (wp) =>
      wp.category === "Ocean" ||
      /pond|tide|wave|tide|rain|bubble/i.test(wp.name) ||
      (wp.tags ?? []).some((t) => ["fish", "koi", "pond", "water"].includes(t)),
  },
  {
    id: "energy",
    emoji: "⚡",
    name: "High Energy",
    blurb: "Scenes that love your taps",
    match: (wp) =>
      ["strike", "warp", "spawn", "glow", "magnet", "swirl"].includes(wp.interact?.kind ?? "") ||
      /firework|storm|warp|plasma|forge|kaleido/i.test(wp.name),
  },
  {
    id: "zen",
    emoji: "🧘",
    name: "Zen & Calm",
    blurb: "Slow motion for quiet minds",
    match: (wp) =>
      /zen|calm|quiet|slow|gentle|koi|pond|jelly|lava|lantern|whisper|drift|silk/i.test(wp.name) ||
      (wp.tags ?? []).some((t) => ["zen", "calm", "meditation"].includes(t)),
  },
  {
    id: "citylights",
    emoji: "🌆",
    name: "City Lights",
    blurb: "Neon streets & urban nights",
    match: (wp) =>
      wp.category === "Urban" || /neon|city|street|jukebox|club/i.test(wp.name),
  },
  {
    id: "playground",
    emoji: "👆",
    name: "Touch Playground",
    blurb: "Every scene answers your finger",
    match: (wp) => wp.interact !== undefined && wp.interact.kind !== "parallax",
  },
];

function collectionArt(list: WallpaperDef[]): [string, string, string] {
  // representative accent colors for the rail card gradient
  const wp = list.find((w) => (w.tags ?? []).includes("new")) ?? list[0];
  const c = wp?.palettes[0].colors ?? ["#1a1a22", "#2a1a2e", "#f472b6", "#fb923c", "#fde047"];
  return [c[1], c[2], c[3]];
}

type Props = {
  selectedId: string;
  stats: StatsMap;
  likedIds: string[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelect: (def: WallpaperDef) => void;
  onToggleLike: (id: string) => void;
};

export function GalleryGrid({ selectedId, stats, likedIds, favorites, onToggleFavorite, onSelect, onToggleLike }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<WallpaperCategory | "All" | "Favorites">("All");
  const [collection, setCollection] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("trending");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const trendingIds = useMemo(() => {
    return [...WALLPAPERS]
      .map((w) => ({ id: w.id, score: (stats[w.id]?.downloads ?? 0) + (stats[w.id]?.likes ?? 0) * 3 }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.id);
  }, [stats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const coll = COLLECTIONS.find((c) => c.id === collection);
    let list = WALLPAPERS.filter((wp) => {
      if (coll && !coll.match(wp)) return false;
      if (category === "Favorites") {
        if (!favorites.includes(wp.id)) return false;
      } else if (category !== "All" && wp.category !== category) return false;
      if (!q) return true;
      return (
        wp.name.toLowerCase().includes(q) ||
        wp.tagline.toLowerCase().includes(q) ||
        wp.category.toLowerCase().includes(q) ||
        (wp.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
    const score = (id: string) => (stats[id]?.likes ?? 0) * 3 + (stats[id]?.downloads ?? 0);
    switch (sort) {
      case "trending":
        list = [...list].sort((a, b) => score(b.id) - score(a.id));
        break;
      case "loved":
        list = [...list].sort((a, b) => (stats[b.id]?.likes ?? 0) - (stats[a.id]?.likes ?? 0));
        break;
      case "newest":
        list = [...list].sort((a, b) => {
          const an = (a.tags ?? []).includes("new") ? 1 : 0;
          const bn = (b.tags ?? []).includes("new") ? 1 : 0;
          return bn - an;
        });
        break;
      case "az":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [query, category, sort, stats, favorites, collection]);

  // reset pagination whenever filters change (state-adjust-during-render)
  const [prevFilterKey, setPrevFilterKey] = useState("");
  const filterKey = `${query}|${category}|${sort}|${collection ?? ""}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setLimit(PAGE_SIZE);
  }

  // auto-load more when the sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLimit((l) => (l < filtered.length ? l + PAGE_SIZE : l));
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const visible = filtered.slice(0, limit);

  const chips: (WallpaperCategory | "All" | "Favorites")[] = ["All", ...CATEGORIES];
  if (favorites.length > 0) chips.push("Favorites");

  return (
    <section id="gallery" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-accent section-accent-left flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-fuchsia-400" />
            The collection
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {WALLPAPERS.length} living scenes — tap any card to load it into the studio.
          </p>
        </div>

        {/* search + sort */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search wallpapers…"
              aria-label="Search wallpapers"
              className="h-10 border-white/10 bg-white/[0.04] pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="h-10 w-[150px] border-white/10 bg-white/[0.04]" aria-label="Sort wallpapers">
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">🔥 Trending</SelectItem>
              <SelectItem value="loved">❤️ Most loved</SelectItem>
              <SelectItem value="newest">✨ Newest</SelectItem>
              <SelectItem value="az">🔤 A – Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* curated collections rail */}
      <div
        className="mb-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Curated collections"
      >
        {COLLECTIONS.map((coll) => {
          const list = WALLPAPERS.filter(coll.match);
          const [c0, c1, c2] = collectionArt(list);
          const active = collection === coll.id;
          return (
            <button
              key={coll.id}
              onClick={() => setCollection(active ? null : coll.id)}
              aria-pressed={active}
              className={cn(
                "group/coll relative shrink-0 overflow-hidden rounded-2xl border p-3.5 pr-5 text-left transition-all duration-300 hover:-translate-y-0.5",
                active
                  ? "border-white/40 shadow-lg shadow-white/10"
                  : "border-white/10 hover:border-white/25",
              )}
              style={{ background: `linear-gradient(120deg, ${c0} 0%, ${c1}33 55%, ${c2}26 100%)` }}
            >
              <span aria-hidden className="absolute -right-3 -top-4 text-5xl opacity-20 transition-transform duration-500 group-hover/coll:scale-125 group-hover/coll:rotate-6">
                {coll.emoji}
              </span>
              <span className="relative flex items-center gap-2 text-sm font-bold text-white">
                <span aria-hidden className="text-base">{coll.emoji}</span>
                {coll.name}
              </span>
              <span className="relative mt-0.5 block text-[11px] text-white/70">{coll.blurb}</span>
              <span className="relative mt-1.5 inline-block rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur">
                {list.length} scenes
              </span>
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-fuchsia-400 via-rose-400 to-amber-300" />
              )}
            </button>
          );
        })}
      </div>

      {/* active collection indicator */}
      {collection && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-200">
            {COLLECTIONS.find((c) => c.id === collection)?.emoji} {COLLECTIONS.find((c) => c.id === collection)?.name}
          </span>
          <button
            onClick={() => setCollection(null)}
            className="underline-offset-2 hover:underline"
          >
            clear collection
          </button>
        </div>
      )}

      {/* category chips */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filter by category">
        {chips.map((cat) => {
          const count =
            cat === "All"
              ? WALLPAPERS.length
              : cat === "Favorites"
                ? favorites.length
                : WALLPAPERS.filter((w) => w.category === cat).length;
          const active = category === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-all active:scale-95",
                active
                  ? cat === "Favorites"
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-200 shadow-[0_0_16px_-4px] shadow-amber-400/40"
                    : "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_16px_-4px] shadow-fuchsia-500/40"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground",
              )}
            >
              <span aria-hidden className="mr-1">{CATEGORY_EMOJI[cat] ?? ""}</span>
              {cat} <span className="ml-0.5 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-muted-foreground">
          {category === "Favorites"
            ? "No favorites yet — tap the ⭐ on any wallpaper to keep it here."
            : `No wallpapers match “${query}”. Try another word — or just clear the search.`}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {visible.map((wp) => {
            const selected = wp.id === selectedId;
            const st = stats[wp.id] ?? { likes: 0, downloads: 0 };
            const liked = likedIds.includes(wp.id);
            const fav = favorites.includes(wp.id);
            const isNew = (wp.tags ?? []).includes("new");
            return (
              <article
                key={wp.id}
                className={cn(
                  "gallery-card-shine group relative overflow-hidden rounded-2xl border bg-zinc-900/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                  selected ? "selected-card border-fuchsia-400/70 shadow-fuchsia-500/20" : "border-white/10 hover:border-white/25",
                )}
              >
                <button
                  onClick={() => onSelect(wp)}
                  className="block w-full text-left focus-visible:outline-none"
                  aria-label={`Open ${wp.name} in the studio`}
                >
                  <div className="relative aspect-[9/16] overflow-hidden">
                    <WallpaperCanvas
                      def={wp}
                      config={{ ...defaultConfig(wp), seed: seedForId(wp.id) }}
                      fps={24}
                      maxPixels={85_000}
                      className="absolute inset-0"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                    {/* hover call-to-action */}
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
                        Open in studio <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </span>

                    {selected && (
                      <span className="absolute left-2 top-2 rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                        In studio
                      </span>
                    )}
                    {isNew && !selected && (
                      <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        NEW
                      </span>
                    )}
                    {trendingIds.includes(wp.id) && !selected && !isNew && (
                      <span className="absolute left-2 top-2 rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        🔥 Trending
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="live-dot" title="Live animation" aria-label="Live animation" />
                        <span aria-hidden>{wp.icon}</span>
                        <h3 className="truncate text-sm font-semibold text-white">{wp.name}</h3>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/70">{wp.tagline}</p>
                      {/* deterministic palette swatch dots for this variant */}
                      <div className="mt-1.5 flex items-center gap-1" aria-hidden>
                        {wp.palettes[0].colors.slice(2).map((c, i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full ring-1 ring-white/30"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <span className="ml-1 h-1.5 w-1.5 rounded-full ring-1 ring-white/30" style={{ backgroundColor: wp.palettes[0].colors[1] }} />
                      </div>
                      {wp.interact && wp.interact.kind !== "parallax" && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/85 backdrop-blur">
                          👆 {wp.interact.label}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center justify-between gap-2 border-t border-white/5 px-2.5 py-2">
                  <LikeButton liked={liked} likes={st.likes} onToggle={() => onToggleLike(wp.id)} />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleFavorite(wp.id)}
                      aria-pressed={fav}
                      aria-label={fav ? `Remove ${wp.name} from favorites` : `Add ${wp.name} to favorites`}
                      className={cn(
                        "rounded-full p-1.5 transition-all active:scale-90",
                        fav ? "text-amber-300" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", fav && "fill-amber-300")} />
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Download className="h-3 w-3" />
                      {st.downloads.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="absolute right-2 top-2 border border-white/10 bg-black/45 text-[10px] text-white/85 backdrop-blur"
                >
                  {wp.category}
                </Badge>
              </article>
            );
          })}
        </div>
      )}

      {/* load more */}
      {limit < filtered.length && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          <Button variant="outline" className="h-11 gap-2 border-white/15" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Load more wallpapers
            <span className="text-xs text-muted-foreground">
              {limit} / {filtered.length}
            </span>
          </Button>
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Heart className="h-3 w-3 text-rose-400" />
        Likes and downloads are counted live across everyone using Wallume.
      </p>
    </section>
  );
}
