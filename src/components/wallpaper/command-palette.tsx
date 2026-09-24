"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Command as CommandIcon,
  Download,
  Film,
  Fuel,
  Keyboard,
  Palette,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Timer,
  Maximize,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { WALLPAPERS, CATEGORIES, getWallpaper } from "@/lib/wallpapers/catalog";
import type { WallpaperDef } from "@/lib/wallpapers/types";
import { cn } from "@/lib/utils";

export type PaletteMode = "main" | "shortcuts";

type PaletteActions = {
  shuffle: () => void;
  nextScene: () => void;
  prevScene: () => void;
  toggleFullscreen: () => void;
  openZen: () => void;
  toggleAmbient: () => void;
  openDownload: () => void;
  toggleAutoTour: () => void;
  randomStyle: () => void;
  pickForNow: () => void;
};

type Props = {
  open: boolean;
  mode: PaletteMode;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: PaletteMode) => void;
  def: WallpaperDef;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  onSelect: (d: WallpaperDef) => void;
  actions: PaletteActions;
};

/** lightweight relevance score — fast enough to scan 500 scenes per keystroke */
function scoreScene(w: WallpaperDef, q: string): number {
  const name = w.name.toLowerCase();
  const tag = w.tagline.toLowerCase();
  const cat = w.category.toLowerCase();
  const tags = (w.tags ?? []).join(" ").toLowerCase();
  if (name.startsWith(q)) return 100 - name.length;
  if (name.includes(q)) return 80 - name.indexOf(q);
  if (tags.includes(q)) return 60;
  if (tag.includes(q)) return 50;
  if (cat.includes(q)) return 40;
  return 0;
}

const MATCH_CAP = 48;

export function CommandPalette({
  open,
  mode,
  onOpenChange,
  onModeChange,
  def,
  favorites,
  isFavorite,
  onSelect,
  actions,
}: Props) {
  const [query, setQuery] = useState("");
  const [browseCat, setBrowseCat] = useState<string | null>(null);

  // fresh palette state each time it opens (adjust-during-render pattern)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setQuery("");
      setBrowseCat(null);
    }
  }

  const favScenes = useMemo(
    () => favorites.map((id) => getWallpaper(id)),
    [favorites],
  );

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (browseCat && !q) {
      return WALLPAPERS.filter((w) => w.category === browseCat).slice(0, MATCH_CAP);
    }
    if (!q) return [];
    const scored: { w: WallpaperDef; s: number }[] = [];
    for (const w of WALLPAPERS) {
      const s = scoreScene(w, q);
      if (s > 0) scored.push({ w, s });
      if (scored.length > 240) break;
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, MATCH_CAP).map((x) => x.w);
  }, [query, browseCat]);

  const actionDefs = useMemo(
    () => [
      { id: "shuffle", icon: <Shuffle className="h-4 w-4" />, label: "Shuffle — jump to a random scene", hint: "S", keywords: "random surprise dice", run: actions.shuffle },
      { id: "next", icon: <ArrowRight className="h-4 w-4" />, label: "Next scene", hint: "→", keywords: "forward", run: actions.nextScene },
      { id: "prev", icon: <ArrowLeftRight className="h-4 w-4" />, label: "Previous scene", hint: "←", keywords: "back", run: actions.prevScene },
      { id: "style", icon: <Palette className="h-4 w-4" />, label: "Randomize this scene's style", hint: "R", keywords: "shuffle colors palette remix", run: actions.randomStyle },
      { id: "now", icon: <Timer className="h-4 w-4" />, label: "Scene for right now", hint: "N", keywords: "time of day hour mood clock", run: actions.pickForNow },
      { id: "fullscreen", icon: <Maximize className="h-4 w-4" />, label: "Fullscreen preview", hint: "F", keywords: "expand maximize immerse", run: actions.toggleFullscreen },
      { id: "zen", icon: <Fuel className="h-4 w-4" />, label: "Zen mode — just the scene", hint: "Z", keywords: "calm quiet focus minimal", run: actions.openZen },
      { id: "tour", icon: <Film className="h-4 w-4" />, label: "Auto-tour the collection", hint: "T", keywords: "slideshow play demo", run: actions.toggleAutoTour },
      { id: "ambient", icon: <Sparkles className="h-4 w-4" />, label: "Ambient mode — favorites playlist", hint: "A", keywords: "shuffle favorites mood", run: actions.toggleAmbient },
      { id: "download", icon: <Download className="h-4 w-4" />, label: "Download / export this wallpaper", hint: "D", keywords: "save export picture pack live", run: actions.openDownload },
      { id: "keys", icon: <Keyboard className="h-4 w-4" />, label: "Keyboard shortcuts", hint: "?", keywords: "help cheat sheet keys", run: () => onModeChange("shortcuts") },
    ],
    [actions, onModeChange],
  );

  const matchedActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (browseCat) return [];
    if (!q) return actionDefs;
    return actionDefs.filter(
      (a) => a.label.toLowerCase().includes(q) || a.keywords.includes(q),
    );
  }, [query, browseCat, actionDefs]);

  const runScene = (w: WallpaperDef) => {
    onSelect(w);
    onOpenChange(false);
  };

  const act = (fn: () => void) => () => {
    fn();
    onOpenChange(false);
  };

  const isMac =
    typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.userAgent ?? "");
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcutRows: { keys: string[]; label: string }[] = [
    { keys: [modKey, "K"], label: "Open this command palette" },
    { keys: ["P"], label: "Search all 500 scenes" },
    { keys: ["?"], label: "Keyboard shortcuts cheat-sheet" },
    { keys: ["←", "→"], label: "Previous / next scene" },
    { keys: ["S"], label: "Shuffle — random scene" },
    { keys: ["R"], label: "Randomize the current scene's style" },
    { keys: ["F"], label: "Fullscreen preview" },
    { keys: ["Z"], label: "Zen mode — just the scene" },
    { keys: ["A"], label: "Ambient mode — favorites playlist" },
    { keys: ["T"], label: "Auto-tour the collection" },
    { keys: ["D"], label: "Download / export dialog" },
    { keys: ["N"], label: "Scene for right now (time-of-day)" },
    { keys: ["Esc"], label: "Close overlays" },
  ];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Wallume command palette"
      description="Search scenes or run actions"
      className="border-white/10 bg-[#0b0910]/95 backdrop-blur-2xl [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/40"
    >
      {mode === "shortcuts" ? (
        <div data-testid="shortcut-sheet">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <Keyboard className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Keyboard shortcuts</p>
            <span className="ml-auto text-[11px] text-white/40">press Esc to close</span>
          </div>
          <CommandList className="max-h-[60vh]">
            <CommandGroup heading="Navigation & Scenes">
              {shortcutRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                >
                  <span>{row.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {row.keys.map((k) => (
                      <kbd
                        key={k}
                        className="min-w-6 rounded border border-white/15 bg-white/8 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white/90 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden="true" />
            <CommandInput
              value={query}
              onValueChange={(v) => {
                setQuery(v);
                if (v) setBrowseCat(null);
              }}
              placeholder={browseCat ? `Search in ${browseCat}…` : "Search fish, rain, galaxy, neon…"}
              className="border-0 pl-10 text-base focus-visible:ring-0"
            />
          </div>
          <CommandList className="max-h-[min(62vh,460px)]">
            {matched.length === 0 && matchedActions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-white/50">
                <Sparkles className="mx-auto mb-2 h-5 w-5 text-fuchsia-300/70" aria-hidden="true" />
                No scene or action matches “{query}”. Try “rain”, “fish”, “neon”…
              </div>
            )}

            {browseCat && (
              <CommandGroup heading={`${browseCat} — ${WALLPAPERS.filter((w) => w.category === browseCat).length} scenes`}>
                {matched.map((w) => (
                  <SceneRow key={w.id} w={w} active={w.id === def.id} fav={isFavorite(w.id)} onSelect={() => runScene(w)} />
                ))}
                {WALLPAPERS.filter((w) => w.category === browseCat).length > MATCH_CAP && !query && (
                  <p className="px-3 py-2 text-xs text-white/35">
                    Type to search all {WALLPAPERS.filter((w) => w.category === browseCat).length} {browseCat} scenes…
                  </p>
                )}
              </CommandGroup>
            )}

            {!browseCat && query && (
              <CommandGroup heading={`${matched.length >= MATCH_CAP ? MATCH_CAP + "+" : matched.length} matching scenes`}>
                {matched.map((w) => (
                  <SceneRow key={w.id} w={w} active={w.id === def.id} fav={isFavorite(w.id)} onSelect={() => runScene(w)} />
                ))}
              </CommandGroup>
            )}

            {!query && favScenes.length > 0 && (
              <CommandGroup heading="⭐ Your favorites">
                {favScenes.slice(0, 8).map((w) => (
                  <SceneRow key={w.id} w={w} active={w.id === def.id} fav onSelect={() => runScene(w)} />
                ))}
              </CommandGroup>
            )}

            {matchedActions.length > 0 && (
              <CommandGroup heading={query ? "Matching actions" : "Actions"}>
                {matchedActions.map((a) => (
                  <ActionRow
                    key={a.id}
                    value={`${a.label} ${a.keywords}`}
                    icon={a.icon}
                    label={a.label}
                    hint={a.hint}
                    onSelect={() => {
                      a.run();
                      onOpenChange(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}

            {!query && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Browse categories">
                  {CATEGORIES.map((c) => {
                    const count = WALLPAPERS.filter((w) => w.category === c).length;
                    return (
                      <CommandItem
                        key={c}
                        value={`category-${c}`}
                        onSelect={() => setBrowseCat(c)}
                        className="gap-3 rounded-lg aria-selected:bg-white/8"
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
                          style={{ background: "linear-gradient(135deg, var(--wallume-a1, #d946ef), var(--wallume-a2, #fb7185))" }}
                          aria-hidden="true"
                        >
                          {c.slice(0, 1)}
                        </span>
                        <span className="text-sm text-white/85">{c}</span>
                        <span className="ml-auto text-xs text-white/40">{count}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
          <div className="flex items-center gap-3 border-t border-white/8 px-4 py-2 text-[11px] text-white/35">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-white/15 bg-white/8 px-1 text-[10px] font-semibold text-white/70">{modKey} K</kbd>
              toggle
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-white/15 bg-white/8 px-1 text-[10px] font-semibold text-white/70">↑↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-white/15 bg-white/8 px-1 text-[10px] font-semibold text-white/70">↵</kbd>
              run
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-white/45">
              <CommandIcon className="h-3 w-3" aria-hidden="true" />
              {WALLPAPERS.length} live scenes
            </span>
          </div>
        </>
      )}
    </CommandDialog>
  );
}

function SceneRow({
  w,
  active,
  fav,
  onSelect,
}: {
  w: WallpaperDef;
  active: boolean;
  fav: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${w.name} ${w.tagline} ${w.category} ${(w.tags ?? []).join(" ")}`}
      onSelect={onSelect}
      className="gap-3 rounded-lg aria-selected:bg-white/8"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/6 text-base" aria-hidden="true">
        {w.icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-white/90">
          <span className="truncate">{w.name}</span>
          {fav && <Star className="h-3 w-3 shrink-0 fill-amber-300 text-amber-300" aria-label="favorite" />}
          {active && (
            <span className="shrink-0 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-fuchsia-300">
              on stage
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-white/45">{w.tagline}</span>
      </span>
      <span className={cn("ml-auto shrink-0 rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-medium text-white/50")}>
        {w.category}
      </span>
    </CommandItem>
  );
}

function ActionRow({
  value,
  icon,
  label,
  hint,
  onSelect,
}: {
  value?: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={value ?? label} onSelect={onSelect} className="gap-3 rounded-lg aria-selected:bg-white/8">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/6 text-white/70" aria-hidden="true">
        {icon}
      </span>
      <span className="text-sm text-white/85">{label}</span>
      <kbd className="ml-auto rounded border border-white/15 bg-white/8 px-1.5 text-[10px] font-semibold text-white/70">
        {hint}
      </kbd>
    </CommandItem>
  );
}
