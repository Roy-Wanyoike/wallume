"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";
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
import { WALLPAPERS } from "@/lib/wallpapers/catalog";
import {
  configFromPreset,
  defaultConfig,
  randomConfig,
  toPresetPayload,
} from "@/lib/wallpapers/render";
import type { StatsMap, WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";
import { Studio } from "./studio";
import type { DeviceMode } from "./studio";
import { GalleryGrid } from "./gallery-grid";
import { CommunitySection } from "./community";
import { DownloadDialog } from "./download-dialog";
import { WallpaperCanvas } from "./wallpaper-canvas";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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

  return (
    <>
      <Studio
        def={def}
        config={config}
        stats={stats[def.id] ?? { likes: 0, downloads: 0 }}
        liked={likedIds.includes(def.id)}
        likePending={likePending === def.id}
        device={device}
        onDeviceChange={setDevice}
        onToggleLike={() => toggleLike(def.id)}
        onOpenDownload={() => setDownloadOpen(true)}
        onOpenFullscreen={() => setFullscreen(true)}
        onOpenShare={openShare}
        onShuffle={shuffleAll}
        onDefChange={selectDef}
        onPatch={patch}
        onReset={reset}
        onRandomize={randomize}
      />

      <div className="mt-20">
        <GalleryGrid
          selectedId={def.id}
          stats={stats}
          likedIds={likedIds}
          onSelect={selectDef}
          onToggleLike={toggleLike}
        />
      </div>

      <CommunitySection />

      <DownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        def={def}
        config={config}
        device={device}
        onDownloaded={recordDownload}
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
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} className="font-mono text-xs" aria-label="Share link" />
                <Button className="shrink-0 gap-2" onClick={copyShare}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

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
