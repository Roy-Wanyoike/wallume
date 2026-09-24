"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Mail, MessageCircle, Send, Share2, Twitter, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { WALLPAPERS, getWallpaper } from "@/lib/wallpapers/catalog";
import {
  configFromPreset,
  defaultConfig,
  randomConfig,
  toPresetPayload,
} from "@/lib/wallpapers/render";
import { fnv1a } from "@/lib/wallpapers/helpers";
import { pickForNowId } from "@/lib/wallpapers/time-pick";
import type { StatsMap, WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";
import { Studio } from "./studio";
import type { DeviceMode } from "./studio";
import { GalleryGrid } from "./gallery-grid";
import { CommunitySection } from "./community";
import { SceneOfTheDay } from "./scene-of-the-day";
import { ScrollProgress } from "./scroll-progress";
import { DownloadDialog } from "./download-dialog";
import { AmbientMode } from "./ambient-mode";
import { ZenMode } from "./zen-mode";
import { CommandPalette } from "./command-palette";
import type { PaletteMode } from "./command-palette";
import { WallpaperCanvas } from "./wallpaper-canvas";
import { useFavorites } from "@/hooks/use-favorites";

const LIKES_KEY = "wallume:likes";

export function WallumeApp({ initialStats }: { initialStats: StatsMap }) {
  const [def, setDef] = useState<WallpaperDef>(WALLPAPERS[0]);
  const [config, setConfig] = useState<WallpaperConfig>(() => defaultConfig(WALLPAPERS[0]));
  const [stats, setStats] = useState<StatsMap>(initialStats);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likePending, setLikePending] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceMode>("phone");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zen, setZen] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoTour, setAutoTour] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("main");
  // dialog only renders after user interaction, so a lazy initializer is hydration-safe
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const { toast } = useToast();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  /* ------------- scene-tinted UI: accent colors follow the selection ------------- */
  useEffect(() => {
    const colors =
      config.customColors ?? def.palettes[config.paletteIndex % def.palettes.length].colors;
    const root = document.documentElement;
    root.style.setProperty("--wallume-a1", colors[2]);
    root.style.setProperty("--wallume-a2", colors[3]);
    root.style.setProperty("--wallume-a3", colors[4]);
  }, [def, config.paletteIndex, config.customColors]);

  /* ---------------- restore likes + shared preset ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIKES_KEY);
      if (raw) setLikedIds(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("p");
    if (!code) return;
    fetch(`/api/presets?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const parsed = data?.preset ? configFromPreset(data.preset) : null;
        if (parsed) {
          setDef(parsed.def);
          setConfig(parsed.config);
          toast({
            title: "Shared design loaded ✨",
            description: `“${parsed.def.name}” with its custom styling is now in your studio.`,
          });
        }
      })
      .catch(() => {
        /* silently ignore broken links */
      });
  }, [toast]);

  /* ------------------------------ mutations ------------------------------ */
  const patch = useCallback((p: Partial<WallpaperConfig>) => {
    setConfig((c) => ({ ...c, ...p }));
  }, []);

  const selectDef = useCallback((d: WallpaperDef) => {
    setDef(d);
    setConfig((c) => ({ ...c, paletteIndex: 0, customColors: null }));
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const reset = useCallback(() => setConfig(defaultConfig(def)), [def]);
  const randomize = useCallback(() => setConfig(randomConfig(def)), [def]);

  const shuffleAll = useCallback(() => {
    let next = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
    if (WALLPAPERS.length > 1) {
      while (next.id === def.id) {
        next = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
      }
    }
    setDef(next);
    setConfig(randomConfig(next));
    toast({ title: `${next.icon} ${next.name}`, description: next.tagline });
  }, [def.id, toast]);

  /** Step ±1 through the collection (arrow keys / palette). */
  const stepScene = useCallback(
    (dir: 1 | -1) => {
      const idx = WALLPAPERS.findIndex((w) => w.id === def.id);
      const next = WALLPAPERS[(idx + dir + WALLPAPERS.length) % WALLPAPERS.length];
      setDef(next);
      setConfig((c) => ({ ...c, paletteIndex: 0, customColors: null }));
      toast({ title: `${next.icon} ${next.name}`, description: next.tagline });
    },
    [def.id, toast],
  );

  /** Pick a scene whose mood matches the current hour — stable per hour. */
  const pickForNow = useCallback(() => {
    const validIds = new Set(WALLPAPERS.map((wp) => wp.id));
    const { id, bucket } = pickForNowId(new Date().getHours(), validIds);
    const next = id ? getWallpaper(id) : WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
    setDef(next);
    setConfig(randomConfig(next));
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast({
      title: `${bucket.label} pick — ${next.icon} ${next.name}`,
      description: next.tagline,
    });
  }, [toast]);

  /* --------------------------- community remix --------------------------- */

  /** Paint a live scene with colors extracted from a community image. */
  const remixCommunity = useCallback(
    (colors: string[], title: string) => {
      // deterministic engine pick from the touch-reactive families
      const remixable = [
        "coral-drift",
        "nebula-storm",
        "plasma-orbs",
        "moon-jellies",
        "festival-night",
        "meadow-whimsy",
        "warp-speed",
        "lava-lamp",
        "kaleidoscope",
        "bubble-rise",
      ];
      const heroId = remixable[fnv1a(title) % remixable.length];
      const remixDef = getWallpaper(heroId);
      setDef(remixDef);
      setConfig({
        paletteIndex: 0,
        customColors: colors,
        speed: remixDef.defaults?.speed ?? 1,
        density: remixDef.defaults?.density ?? 1,
        glow: remixDef.defaults?.glow ?? 1,
        seed: fnv1a(title + colors.join("")),
      });
      document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast({
        title: `🎨 Remixing “${title}”`,
        description: `${remixDef.icon} ${remixDef.name} — repainted with colors from the community wall.`,
      });
    },
    [toast],
  );

  /* hero “Surprise me” button talks over a custom event */
  useEffect(() => {
    const onSurprise = () => {
      shuffleAll();
      document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("wallume:surprise", onSurprise);
    return () => window.removeEventListener("wallume:surprise", onSurprise);
  }, [shuffleAll]);

  /* ------------------------------- likes -------------------------------- */
  const toggleLike = useCallback(
    async (id: string) => {
      if (likePending) return;
      const liked = likedIds.includes(id);
      const nextIds = liked ? likedIds.filter((x) => x !== id) : [...likedIds, id];
      setLikedIds(nextIds);
      setLikePending(id);
      setStats((s) => ({
        ...s,
        [id]: {
          likes: Math.max(0, (s[id]?.likes ?? 0) + (liked ? -1 : 1)),
          downloads: s[id]?.downloads ?? 0,
        },
      }));
      try {
        localStorage.setItem(LIKES_KEY, JSON.stringify(nextIds));
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch(`/api/wallpapers/${id}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: liked ? "unlike" : "like" }),
        });
        if (res.ok) {
          const data = await res.json();
          setStats((s) => ({
            ...s,
            [id]: { likes: data.likes, downloads: data.downloads },
          }));
        }
      } catch {
        toast({
          title: "Like not saved",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        setLikePending(null);
      }
    },
    [likedIds, likePending, toast],
  );

  const recordDownload = useCallback(() => {
    const id = def.id;
    setStats((s) => ({
      ...s,
      [id]: { likes: s[id]?.likes ?? 0, downloads: (s[id]?.downloads ?? 0) + 1 },
    }));
    fetch(`/api/wallpapers/${id}/download`, { method: "POST" }).catch(() => {
      /* stats are best-effort */
    });
  }, [def.id]);

  /* ------------------------------- auto-tour ------------------------------- */
  const autoTourRef = useRef(def);
  autoTourRef.current = def;
  useEffect(() => {
    if (!autoTour) return;
    // pause the tour while an immersive overlay covers the studio
    if (fullscreen || ambient || zen) return;
    const id = setInterval(() => {
      const cur = autoTourRef.current;
      const idx = WALLPAPERS.findIndex((w) => w.id === cur.id);
      const next = WALLPAPERS[(idx + 1) % WALLPAPERS.length];
      setDef(next);
      setConfig((c) => ({ ...c, paletteIndex: 0, customColors: null }));
    }, 15_000);
    return () => clearInterval(id);
  }, [autoTour, fullscreen, ambient, zen]);

  const toggleAutoTour = useCallback(() => {
    setAutoTour((v) => {
      toast(
        v
          ? { title: "Auto-tour paused", description: "The studio stays on the current scene." }
          : { title: "Auto-tour started 🎬", description: "A new scene every 15 seconds — press T to stop." },
      );
      return !v;
    });
  }, [toast]);

  /* ------------------------------- share -------------------------------- */
  const openShare = useCallback(async () => {
    setShareOpen(true);
    setShareSaving(true);
    setShareUrl(null);
    setCopied(false);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPresetPayload(def, config)),
      });
      const data = await res.json();
      if (data?.code) {
        setShareUrl(`${window.location.origin}/?p=${data.code}`);
      } else {
        throw new Error("no code");
      }
    } catch {
      toast({
        title: "Could not create share link",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      setShareOpen(false);
    } finally {
      setShareSaving(false);
    }
  }, [def, config, toast]);

  const copyShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        description: "Copy failed — long-press the link to copy it manually.",
      });
    }
  }, [shareUrl, toast]);

  /** hand the link to the OS share sheet (Android/iOS) when available */
  const nativeShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({
        title: "Wallume",
        text: `Check out my “${def.name}” live wallpaper — it even reacts to touch`,
        url: shareUrl,
      });
    } catch {
      /* user dismissed the share sheet */
    }
  }, [shareUrl, def.name]);

  /* ----------------------------- fullscreen ----------------------------- */
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  /* -------------------------- keyboard shortcuts -------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof Element &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest("[role=dialog]"))
      )
        return;
      // ⌘K / Ctrl+K — command palette (before the modifier bail-out)
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteMode("main");
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (zen) return; // zen mode owns the keyboard — Esc handled inside the overlay

      // palette quick keys
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setPaletteMode("shortcuts");
        setPaletteOpen(true);
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPaletteMode("main");
        setPaletteOpen(true);
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          stepScene(1);
          break;
        case "ArrowLeft":
          stepScene(-1);
          break;
        case "f":
        case "F":
          setFullscreen((v) => !v);
          break;
        case "z":
        case "Z":
          setZen(true);
          break;
        case "a":
        case "A":
          setAmbient((v) => !v);
          break;
        case "d":
        case "D":
          setDownloadOpen(true);
          break;
        case "n":
        case "N":
          pickForNow();
          break;
        case "t":
        case "T":
          setAutoTour((v) => {
            toast(
              v
                ? { title: "Auto-tour paused", description: "The studio stays on the current scene." }
                : { title: "Auto-tour started 🎬", description: "A new scene every 15 seconds — press T to stop." },
            );
            return !v;
          });
          break;
        case "r":
        case "R":
          setConfig(randomConfig(def));
          break;
        case "s":
        case "S": {
          let next = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
          while (next.id === def.id) {
            next = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
          }
          setDef(next);
          setConfig(randomConfig(next));
          toast({ title: `${next.icon} ${next.name}`, description: next.tagline });
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [def, pickForNow, toast, zen, stepScene]);

  return (
    <>
      <ScrollProgress />

      <SceneOfTheDay
        stats={stats}
        likedIds={likedIds}
        isFavorite={isFavorite}
        onToggleLike={toggleLike}
        onLoad={selectDef}
      />

      <div className="pt-8">
        <Studio
        def={def}
        config={config}
        stats={stats[def.id] ?? { likes: 0, downloads: 0 }}
        liked={likedIds.includes(def.id)}
        likePending={likePending === def.id}
        fav={isFavorite(def.id)}
        onToggleFav={() => toggleFavorite(def.id)}
        device={device}
        onDeviceChange={setDevice}
        onToggleLike={() => toggleLike(def.id)}
        onOpenDownload={() => setDownloadOpen(true)}
        onOpenFullscreen={() => setFullscreen(true)}
        onOpenZen={() => setZen(true)}
        onOpenAmbient={() => setAmbient(true)}
        onOpenShare={openShare}
        onShuffle={shuffleAll}
        autoTour={autoTour}
        onToggleAutoTour={toggleAutoTour}
        onDefChange={selectDef}
        onPatch={patch}
        onReset={reset}
        onRandomize={randomize}
        onPickForNow={pickForNow}
        />
      </div>

      <div className="mt-20">
        <GalleryGrid
          selectedId={def.id}
          stats={stats}
          likedIds={likedIds}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelect={selectDef}
          onToggleLike={toggleLike}
        />
      </div>

      <CommunitySection onRemix={remixCommunity} />

      <DownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        def={def}
        config={config}
        device={device}
        onDownloaded={recordDownload}
      />

      <CommandPalette
        open={paletteOpen}
        mode={paletteMode}
        onOpenChange={setPaletteOpen}
        onModeChange={setPaletteMode}
        def={def}
        favorites={favorites}
        isFavorite={isFavorite}
        onSelect={selectDef}
        actions={{
          shuffle: shuffleAll,
          nextScene: () => stepScene(1),
          prevScene: () => stepScene(-1),
          toggleFullscreen: () => setFullscreen((v) => !v),
          openZen: () => setZen(true),
          toggleAmbient: () => setAmbient((v) => !v),
          openDownload: () => setDownloadOpen(true),
          toggleAutoTour: toggleAutoTour,
          randomStyle: randomize,
          pickForNow: pickForNow,
        }}
      />

      {/* share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save this design</DialogTitle>
            <DialogDescription>
              Anyone with the link opens Wallume with exactly this scene, palette and mood.
            </DialogDescription>
          </DialogHeader>
          {shareSaving ? (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your link…
            </div>
          ) : (
            shareUrl && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input readOnly value={shareUrl} className="font-mono text-xs" aria-label="Share link" />
                  {canShare && (
                    <Button
                      className="shrink-0 gap-2 bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
                      onClick={nativeShare}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  )}
                  <Button className="shrink-0 gap-2" onClick={copyShare}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                {/* quick-share targets — plain intent URLs, no trackers */}
                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <span className="text-xs text-muted-foreground">Send it to</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      {
                        label: "WhatsApp",
                        href: `https://wa.me/?text=${encodeURIComponent(`Check out my “${def.name}” live wallpaper on Wallume 🎨 ${shareUrl}`)}`,
                        cls: "hover:border-emerald-400/60 hover:text-emerald-300",
                      },
                      {
                        label: "Telegram",
                        href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`My “${def.name}” live wallpaper — it reacts to touch`)}`,
                        cls: "hover:border-sky-400/60 hover:text-sky-300",
                      },
                      {
                        label: "X",
                        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`My “${def.name}” live wallpaper — it reacts to touch 🎨`)}&url=${encodeURIComponent(shareUrl)}`,
                        cls: "hover:border-white/60 hover:text-white",
                      },
                      {
                        label: "Email",
                        href: `mailto:?subject=${encodeURIComponent(`My “${def.name}” Wallume wallpaper`)}&body=${encodeURIComponent(`Made this live wallpaper in Wallume — it even reacts to touch:\n${shareUrl}`)}`,
                        cls: "hover:border-amber-400/60 hover:text-amber-300",
                      },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Share via ${s.label}`}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 ${s.cls}`}
                      >
                        {s.label === "WhatsApp" && <MessageCircle className="h-3.5 w-3.5" />}
                        {s.label === "Telegram" && <Send className="h-3.5 w-3.5" />}
                        {s.label === "X" && <Twitter className="h-3.5 w-3.5" />}
                        {s.label === "Email" && <Mail className="h-3.5 w-3.5" />}
                        {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      <AmbientMode open={ambient} onOpenChange={setAmbient} favoriteIds={favorites} />

      {/* zen mode — chrome-free fullscreen with wake lock */}
      {zen && <ZenMode def={def} config={config} onExit={() => setZen(false)} />}

      {/* fullscreen immersive preview */}
      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fullscreen preview of ${def.name}`}
          className="fixed inset-0 z-[80] bg-black"
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
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            <span className="text-sm font-medium">
              {def.icon} {def.name} · fullscreen · {def.interact?.label ?? "cursor parallax"}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFullscreen(false)}
              aria-label="Close fullscreen preview"
              className="border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="absolute inset-x-0 bottom-5 text-center text-xs text-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            Move your finger or cursor across the screen — the scene reacts.
          </p>
        </div>
      )}
    </>
  );
}
