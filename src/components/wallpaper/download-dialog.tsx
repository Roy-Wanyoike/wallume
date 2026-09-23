"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  Film,
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
  const [progress, setProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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
      setMode("idle");
      setVideoMode("idle");
      setProgress(0);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photo" className="gap-2">
              <ImageIcon className="h-4 w-4" /> Photo
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2" disabled={!canVideo}>
              <Film className="h-4 w-4" /> Live video
              {!canVideo && <Badge variant="secondary" className="ml-1 text-[10px]">N/A</Badge>}
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
