"use client";

import { useMemo, useRef, useState } from "react";
import { zipSync } from "fflate";
import {
  Check,
  ClipboardCopy,
  Download,
  Film,
  FolderArchive,
  Image as ImageIcon,
  Info,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RESOLUTIONS,
  VIDEO_RESOLUTIONS,
  canvasToBlob,
  exportCanvas,
  exportVideo,
  videoExportSupported,
} from "@/lib/wallpapers/render";
import { WALLPAPERS } from "@/lib/wallpapers/catalog";
import { defaultConfig } from "@/lib/wallpapers/render";
import type { DeviceMode } from "./studio";
import type { WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  def: WallpaperDef;
  config: WallpaperConfig;
  device: DeviceMode;
  onDownloaded: () => void;
};

type Mode = "idle" | "working" | "done";

export function DownloadDialog({ open, onOpenChange, def, config, device, onDownloaded }: Props) {
  const [deviceTab, setDeviceTab] = useState<DeviceMode>(device);
  const [res, setRes] = useState(device === "phone" ? "auto" : "auto-desktop");
  const [vres, setVres] = useState("hd");
  const [mode, setMode] = useState<Mode>("idle");
  const [videoMode, setVideoMode] = useState<Mode>("idle");
  const [packMode, setPackMode] = useState<Mode>("idle");
  const [progress, setProgress] = useState(0);
  const [packProgress, setPackProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [packUrl, setPackUrl] = useState<string | null>(null);
  const [packSize, setPackSize] = useState("6");
  const [packDevice, setPackDevice] = useState<DeviceMode>(device);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const urlsRef = useRef<string[]>([]);
  const photoBlobRef = useRef<Blob | null>(null);

  const canCopyImage =
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    !!navigator.clipboard?.write;

  const canVideo = useMemo(() => videoExportSupported(), []);

  // keep the dialog's device tab in sync when the studio device changes
  // (state-adjust-during-render pattern — see react.dev "you might not need an effect")
  const [prevDevice, setPrevDevice] = useState(device);
  if (prevDevice !== device) {
    setPrevDevice(device);
    setDeviceTab(device);
    setRes(device === "phone" ? "auto" : "auto-desktop");
    setPackDevice(device);
  }

  const photoResolutions = RESOLUTIONS.filter((r) => r.device === deviceTab);

  // free object URLs when the dialog closes (event handler, not an effect)
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
      photoBlobRef.current = null;
      setPhotoUrl(null);
      setVideoUrl(null);
      setPackUrl(null);
      setMode("idle");
      setVideoMode("idle");
      setPackMode("idle");
      setProgress(0);
      setPackProgress(0);
      setError(null);
    }
    onOpenChange(v);
  };

  const track = (url: string) => {
    urlsRef.current.push(url);
    return url;
  };

  const copyImage = async () => {
    if (!photoBlobRef.current) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": photoBlobRef.current }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Your browser blocked clipboard access — use the download button instead.");
    }
  };

  const generatePhoto = async () => {
    setError(null);
    setMode("working");
    try {
      // let the button repaint before the heavy synchronous render
      await new Promise((r) => setTimeout(r, 30));
      const preset = RESOLUTIONS.find((r) => r.id === res) ?? RESOLUTIONS[0];
      const { w, h } = preset.size();
      const canvas = exportCanvas(def, config, w, h);
      const blob = await canvasToBlob(canvas);
      photoBlobRef.current = blob;
      setDims({ w, h });
      setPhotoUrl(track(URL.createObjectURL(blob)));
      setMode("done");
      onDownloaded();
    } catch (e) {
      console.error(e);
      setError("Could not render the image. Try a smaller resolution.");
      setMode("idle");
    }
  };

  const recordVideo = async () => {
    setError(null);
    setVideoMode("working");
    setProgress(0);
    try {
      const preset = VIDEO_RESOLUTIONS.find((r) => r.id === vres) ?? VIDEO_RESOLUTIONS[0];
      const { w, h } = preset.size();
      const blob = await exportVideo(def, config, w, h, 5, (p) => setProgress(Math.round(p * 100)));
      setDims({ w, h });
      setVideoUrl(track(URL.createObjectURL(blob)));
      setVideoMode("done");
      onDownloaded();
    } catch (e) {
      console.error(e);
      setError("Video recording is not supported in this browser. Try Chrome or Edge.");
      setVideoMode("idle");
    }
  };

  /** Build a surprise pack of N wallpapers as a ZIP of PNGs. */
  const buildPack = async () => {
    setError(null);
    setPackMode("working");
    setPackProgress(0);
    try {
      const n = Math.max(2, Math.min(12, parseInt(packSize, 10) || 6));
      const isPhone = packDevice === "phone";
      const W = isPhone ? 1080 : 1920;
      const H = isPhone ? 2340 : 1080;

      // deterministic-ish shuffle: current design first, then random picks
      const pool = [...WALLPAPERS];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const picks = [def, ...pool.filter((p) => p.id !== def.id).slice(0, n - 1)];

      const files: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (let i = 0; i < picks.length; i++) {
        const wp = picks[i];
        // yield to the UI thread between heavy renders
        await new Promise((r) => setTimeout(r, 16));
        const canvas = exportCanvas(wp, defaultConfig(wp), W, H);
        const blob = await canvasToBlob(canvas);
        const buf = new Uint8Array(await blob.arrayBuffer());
        files[`wallume-${wp.id}-${W}x${H}.png`] = [buf, { level: 0 }];
        setPackProgress(Math.round(((i + 1) / picks.length) * 100));
      }

      const zipped = zipSync(files, { level: 0 });
      const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
      setPackUrl(track(URL.createObjectURL(blob)));
      setPackMode("done");
      onDownloaded();
    } catch (e) {
      console.error(e);
      setError("Could not build the pack. Try a smaller pack size.");
      setPackMode("idle");
    }
  };

  const fileName = useMemo(() => {
    const base = `wallume-${def.id}`;
    if (!dims) return base;
    return `${base}-${dims.w}x${dims.h}`;
  }, [def.id, dims]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Export &quot;{def.name}&quot;
          </DialogTitle>
          <DialogDescription>
            High-resolution photo for your phone, tablet or desktop — or a live looping video.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="photo" className="mt-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="photo" className="gap-1.5">
              <ImageIcon className="h-4 w-4" /> Photo
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-1.5" disabled={!canVideo}>
              <Film className="h-4 w-4" /> Live
              {!canVideo && <Badge variant="secondary" className="ml-1 text-[10px]">N/A</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pack" className="gap-1.5">
              <FolderArchive className="h-4 w-4" /> Pack
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------ PHOTO ------------------------------ */}
          <TabsContent value="photo" className="space-y-4 pt-2">
            {/* device segmented control */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() => {
                  setDeviceTab("phone");
                  setRes("auto");
                }}
                aria-pressed={deviceTab === "phone"}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                  deviceTab === "phone"
                    ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Smartphone className="h-4 w-4" /> Phone / Tablet
              </button>
              <button
                onClick={() => {
                  setDeviceTab("desktop");
                  setRes("auto-desktop");
                }}
                aria-pressed={deviceTab === "desktop"}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                  deviceTab === "desktop"
                    ? "bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Monitor className="h-4 w-4" /> Laptop / Desktop
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Resolution</label>
              <Select value={res} onValueChange={setRes}>
                <SelectTrigger className="w-full" aria-label="Choose resolution">
                  <SelectValue placeholder="Pick a resolution" />
                </SelectTrigger>
                <SelectContent>
                  {photoResolutions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="font-medium">{r.label}</span>
                      {r.hint && <span className="ml-2 text-xs text-muted-foreground">{r.hint}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode !== "done" ? (
              <Button
                onClick={generatePhoto}
                disabled={mode === "working"}
                className="h-12 w-full gap-2 bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 text-base font-semibold text-white shadow-lg shadow-rose-500/20 hover:opacity-90"
              >
                {mode === "working" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Rendering…
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" /> Render wallpaper
                  </>
                )}
              </Button>
            ) : (
              photoUrl && (
                <div className="space-y-4">
                  <div className="mx-auto w-fit rounded-2xl border-4 border-zinc-800 bg-zinc-900 p-1 shadow-2xl">
                    <img
                      src={photoUrl}
                      alt={`Exported ${def.name} wallpaper preview`}
                      className="max-h-[46dvh] rounded-xl object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <a href={photoUrl} download={`${fileName}.png`} className="flex-1">
                      <Button className="h-12 w-full gap-2 bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 text-base font-semibold text-white hover:opacity-90">
                        <Download className="h-5 w-5" /> PNG{dims ? ` · ${dims.w}×${dims.h}` : ""}
                      </Button>
                    </a>
                    {canCopyImage && (
                      <Button
                        variant="outline"
                        className="h-12 shrink-0 gap-2 border-white/15"
                        onClick={copyImage}
                        aria-label="Copy image to clipboard"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <ClipboardCopy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      <strong>iPhone / iPad:</strong> press &amp; hold the preview above, then choose{" "}
                      <em>&ldquo;Add to Photos&rdquo;</em>, and set it from Settings → Wallpaper.
                      <br />
                      <strong>Android:</strong> the PNG downloads to your gallery — set it as wallpaper from your
                      home screen menu.
                      <br />
                      <strong>Desktop:</strong> download, right-click the file and choose{" "}
                      <em>&ldquo;Set as desktop background&rdquo;</em>.
                    </p>
                  </div>
                </div>
              )
            )}
          </TabsContent>

          {/* ------------------------------ LIVE ------------------------------- */}
          <TabsContent value="live" className="space-y-4 pt-2">
            {!canVideo ? (
              <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                Your browser does not support in-browser video recording. Try Chrome, Edge or Firefox to export a
                live looping wallpaper.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Video size (5-second loop)</label>
                  <Select value={vres} onValueChange={setVres}>
                    <SelectTrigger className="w-full" aria-label="Choose video size">
                      <SelectValue placeholder="Pick a size" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_RESOLUTIONS.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="font-medium">{r.label}</span>
                          {r.hint && <span className="ml-2 text-xs text-muted-foreground">{r.hint}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {videoMode !== "done" ? (
                  <div className="space-y-3">
                    <Button
                      onClick={recordVideo}
                      disabled={videoMode === "working"}
                      className={cn(
                        "h-12 w-full gap-2 text-base font-semibold text-white",
                        videoMode === "working"
                          ? "bg-rose-600"
                          : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 hover:opacity-90",
                      )}
                    >
                      {videoMode === "working" ? (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                          </span>
                          Recording… {progress}%
                        </>
                      ) : (
                        <>
                          <Film className="h-5 w-5" /> Record 5s live loop
                        </>
                      )}
                    </Button>
                    {videoMode === "working" && <Progress value={progress} className="h-2" />}
                  </div>
                ) : (
                  videoUrl && (
                    <div className="space-y-4">
                      <div className="mx-auto w-fit rounded-2xl border-4 border-zinc-800 bg-zinc-900 p-1 shadow-2xl">
                        <video
                          src={videoUrl}
                          className="max-h-[46dvh] rounded-xl"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      </div>
                      <a href={videoUrl} download={`${fileName}-live.webm`} className="block">
                        <Button className="h-12 w-full gap-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 text-base font-semibold text-white hover:opacity-90">
                          <Download className="h-5 w-5" /> Save live video
                          {dims ? ` · ${dims.w}×${dims.h}` : ""}
                        </Button>
                      </a>
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          <strong>Android:</strong> use any &ldquo;video → live wallpaper&rdquo; app to set this
                          looping clip as your animated home screen.
                          <br />
                          <strong>Desktop:</strong> use a looping-video wallpaper app (e.g. Wallpaper Engine,
                          Lively) with the downloaded clip.
                        </p>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </TabsContent>

          {/* ------------------------------ PACK ------------------------------- */}
          <TabsContent value="pack" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              A surprise bundle of {WALLPAPERS.length} scenes to pick from — we render your
              current design plus random picks into one ZIP of full-resolution PNGs.
            </p>

            {/* pack device */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() => setPackDevice("phone")}
                aria-pressed={packDevice === "phone"}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                  packDevice === "phone"
                    ? "bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Smartphone className="h-4 w-4" /> Phone · 1080×2340
              </button>
              <button
                onClick={() => setPackDevice("desktop")}
                aria-pressed={packDevice === "desktop"}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all",
                  packDevice === "desktop"
                    ? "bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Monitor className="h-4 w-4" /> Desktop · 1920×1080
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pack size</label>
              <Select value={packSize} onValueChange={setPackSize}>
                <SelectTrigger className="w-full" aria-label="Choose pack size">
                  <SelectValue placeholder="How many wallpapers?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 wallpapers · light</SelectItem>
                  <SelectItem value="6">6 wallpapers · classic</SelectItem>
                  <SelectItem value="8">8 wallpapers · generous</SelectItem>
                  <SelectItem value="12">12 wallpapers · the whole mood</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {packMode !== "done" ? (
              <div className="space-y-3">
                <Button
                  onClick={buildPack}
                  disabled={packMode === "working"}
                  className="h-12 w-full gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-fuchsia-500 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 hover:opacity-90"
                >
                  {packMode === "working" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Rendering pack… {packProgress}%
                    </>
                  ) : (
                    <>
                      <FolderArchive className="h-5 w-5" /> Build my pack
                    </>
                  )}
                </Button>
                {packMode === "working" && <Progress value={packProgress} className="h-2" />}
              </div>
            ) : (
              packUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <FolderArchive className="h-8 w-8 text-emerald-300" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-100">Your pack is ready 🎉</p>
                      <p className="text-xs text-emerald-200/70">
                        {packSize} wallpapers · {packDevice === "phone" ? "1080×2340" : "1920×1080"} PNGs
                      </p>
                    </div>
                  </div>
                  <a href={packUrl} download={`wallume-pack-${packSize}.zip`} className="block">
                    <Button className="h-12 w-full gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-fuchsia-500 text-base font-semibold text-white hover:opacity-90">
                      <Download className="h-5 w-5" /> Download ZIP
                    </Button>
                  </a>
                </div>
              )
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
