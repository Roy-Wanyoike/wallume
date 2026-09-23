"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, Users, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { extractPalette } from "@/lib/wallpapers/palette-extract";
import type { CommunityItem } from "@/lib/wallpapers/types";

/** downscale + compress an uploaded image entirely on-device */
async function fileToDataUrl(file: File, maxEdge = 1080): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = bitmapUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(2, Math.round(img.width * scale));
    const h = Math.max(2, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    if (dataUrl.length > 2_400_000) throw new Error("Image is too large even after resizing");
    return dataUrl;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

type Props = {
  onRemix: (colors: string[], title: string) => void;
};

export function CommunitySection({ onRemix }: Props) {
  const [items, setItems] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[] | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {
      /* community is best-effort */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Images only", description: "Please choose a PNG, JPEG or WebP file.", variant: "destructive" });
      return;
    }
    if (f.size > 12_000_000) {
      toast({ title: "Image too large", description: "Please pick an image under 12 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    try {
      const dataUrl = await fileToDataUrl(f);
      setPreview(dataUrl);
      // extract a remixable palette from the image — best-effort
      try {
        const pal = await extractPalette(dataUrl);
        setPalette(pal);
      } catch {
        setPalette(null);
      }
    } catch (e) {
      toast({
        title: "Could not process image",
        description: e instanceof Error ? e.message : "Try a different image.",
        variant: "destructive",
      });
      setFile(null);
      setPreview(null);
      setPalette(null);
    }
  };

  const submit = async () => {
    if (!preview) return;
    if (!title.trim()) {
      toast({ title: "Give it a name", description: "Your wallpaper needs a title." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim().slice(0, 48),
          author: (author.trim() || "Anonymous").slice(0, 24),
          image: preview,
          ...(palette ? { palette } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }
      toast({
        title: "Submitted to the community wall 🎉",
        description: "Everyone can now remix your colors into a live scene.",
      });
      setOpen(false);
      setFile(null);
      setPreview(null);
      setPalette(null);
      setTitle("");
      setAuthor("");
      await load();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="community" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-accent section-accent-left flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-5 w-5 text-amber-300" />
            Community wall
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Add your own images — they appear here for everyone instantly. Every upload is
            color-scanned, so anyone can hit <Wand2 className="inline h-3.5 w-3.5 text-fuchsia-300" /> Remix and
            paint a live scene in your colors.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="h-11 gap-2 bg-gradient-to-r from-amber-400 to-rose-500 font-semibold text-white shadow-lg shadow-amber-500/20 hover:opacity-90"
        >
          <ImagePlus className="h-4 w-4" /> Add an image
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading community picks…
        </div>
      ) : items.length === 0 ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-muted-foreground transition-colors hover:border-amber-400/40 hover:text-foreground"
        >
          <Upload className="h-6 w-6" />
          Be the first to share an image with the community
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <article
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl"
            >
              <div className="relative aspect-[9/16] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
                {item.palette && item.palette.length === 5 && (
                  <div className="absolute left-2 top-2 flex gap-1" aria-hidden>
                    {item.palette.slice(2).map((c, i) => (
                      <span key={i} className="h-3 w-3 rounded-full border border-white/40 shadow" style={{ background: c }} />
                    ))}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="truncate text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] text-white/70">by {item.author}</p>
                  {item.palette && item.palette.length === 5 && (
                    <Button
                      size="sm"
                      onClick={() => onRemix(item.palette as string[], item.title)}
                      className="mt-2 h-8 w-full gap-1.5 bg-gradient-to-r from-fuchsia-500 to-rose-500 text-xs font-semibold text-white opacity-100 shadow transition-all duration-300 hover:opacity-90 focus-visible:opacity-90 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
                      aria-label={`Remix ${item.title} colors in the studio`}
                    >
                      <Wand2 className="h-3.5 w-3.5" /> Remix in studio
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* upload dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to the community wall</DialogTitle>
            <DialogDescription>
              Your image goes live for everyone right away — its colors become a remixable
              palette for the studio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />

            {preview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative mx-auto block w-fit overflow-hidden rounded-xl border border-white/10"
                aria-label="Change image"
              >
                <img src={preview} alt="Selected upload preview" className="max-h-52 object-contain" />
              </button>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-sm text-muted-foreground transition-colors hover:border-amber-400/40 hover:text-foreground"
              >
                <ImagePlus className="h-5 w-5" />
                Choose an image (PNG · JPEG · WebP)
              </button>
            )}

            {palette && palette.length === 5 && (
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-fuchsia-200">
                  <Wand2 className="h-3.5 w-3.5" /> Remixable palette detected
                </p>
                <div className="mt-2 flex gap-1.5" aria-hidden>
                  {palette.map((c, i) => (
                    <span
                      key={i}
                      className="h-6 flex-1 rounded-md border border-white/15"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="community-title">Wallpaper name</Label>
              <Input
                id="community-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunset over the bay"
                maxLength={48}
                className="border-white/10 bg-white/[0.04]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="community-author">Your name (optional)</Label>
              <Input
                id="community-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Anonymous"
                maxLength={24}
                className="border-white/10 bg-white/[0.04]"
              />
            </div>

            <Button
              onClick={submit}
              disabled={submitting || !preview}
              className="h-12 w-full gap-2 bg-gradient-to-r from-amber-400 to-rose-500 text-base font-semibold text-white hover:opacity-90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Publishing…
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" /> Publish to community
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
