/**
 * Config resolution, static export (PNG) and live-loop video export.
 */
import type { DrawEnv, WallpaperConfig, WallpaperDef } from "./types";
import { WALLPAPERS } from "./catalog";

export function resolveColors(def: WallpaperDef, config: WallpaperConfig): string[] {
  if (config.customColors && config.customColors.length === 5) return config.customColors;
  return def.palettes[config.paletteIndex % def.palettes.length].colors;
}

export function defaultConfig(def: WallpaperDef): WallpaperConfig {
  return {
    paletteIndex: def.defaults?.paletteIndex ?? 0,
    customColors: null,
    speed: def.defaults?.speed ?? 1,
    density: def.defaults?.density ?? 1,
    glow: def.defaults?.glow ?? 1,
    seed: def.defaults?.seed ?? 42,
  };
}

export function randomConfig(def: WallpaperDef): WallpaperConfig {
  return {
    paletteIndex: Math.floor(Math.random() * def.palettes.length),
    customColors: null,
    speed: 0.5 + Math.random() * 1.2,
    density: 0.55 + Math.random() * 1.05,
    glow: 0.5 + Math.random(),
    seed: Math.floor(Math.random() * 9999),
  };
}

/** Draw one frame of `def` with `config` into ctx at any size. */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  def: WallpaperDef,
  config: WallpaperConfig,
  env?: DrawEnv,
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  try {
    def.draw(ctx, w, h, t, {
      colors: resolveColors(def, config),
      speed: config.speed,
      density: config.density,
      glow: config.glow,
      seed: config.seed,
    }, env);
  } catch (err) {
    // one bad frame must never take the whole app down — paint a safe
    // fallback gradient and let the rest of the page keep running
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[wallume] scene "${def.id}" threw while drawing:`, err);
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#111015");
    g.addColorStop(1, "#1c1424");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/** Create an offscreen canvas with a single high-res frame. */
export function exportCanvas(
  def: WallpaperDef,
  config: WallpaperConfig,
  w: number,
  h: number,
  t?: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  renderFrame(ctx, w, h, t ?? def.heroTime, def, config);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob failed"));
    }, "image/png");
  });
}

/* ------------------------------------------------------------------ */
/* Live video export (webm/mp4 via MediaRecorder)                      */
/* ------------------------------------------------------------------ */

export function videoExportSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

function pickMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

/**
 * Record a seamless-ish loop of the live wallpaper.
 * Resolves with the video Blob after `seconds` of capture.
 * onProgress receives 0..1.
 */
export async function exportVideo(
  def: WallpaperDef,
  config: WallpaperConfig,
  w: number,
  h: number,
  seconds = 5,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const canvas = exportCanvas(def, config, w, h, 0);
  const stream = canvas.captureStream(30);
  const mime = pickMime();
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: Math.min(12_000_000, w * h * 6),
  });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
    rec.onerror = () => reject(new Error("Recording failed"));
  });

  rec.start();

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const loop = () => {
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed >= seconds) {
        resolve();
        return;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) renderFrame(ctx, w, h, elapsed, def, config);
      onProgress?.(elapsed / seconds);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  rec.stop();
  stream.getTracks().forEach((tr) => tr.stop());
  return done;
}

/* ------------------------------------------------------------------ */
/* device-appropriate resolution                                       */
/* ------------------------------------------------------------------ */

export type ResolutionPreset = {
  id: string;
  label: string;
  hint?: string;
  device: "phone" | "desktop";
  size: () => { w: number; h: number };
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export const RESOLUTIONS: ResolutionPreset[] = [
  {
    id: "auto",
    label: "Auto — match my device",
    hint: "Uses your screen size & pixel ratio",
    device: "phone",
    size: () => {
      if (typeof window === "undefined") return { w: 1080, h: 1920 };
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const portrait = window.innerHeight >= window.innerWidth;
      let w = even(Math.min(window.screen.width, window.screen.height) * dpr);
      let h = even(Math.max(window.screen.width, window.screen.height) * dpr);
      if (!portrait) [w, h] = [h, w];
      w = Math.min(w, 1440);
      h = Math.min(h, 3200);
      return { w, h };
    },
  },
  { id: "fhd", label: "FHD+ · 1080 × 1920", hint: "Most Android phones", device: "phone", size: () => ({ w: 1080, h: 1920 }) },
  { id: "qhd", label: "QHD+ · 1440 × 2560", hint: "Flagship Android", device: "phone", size: () => ({ w: 1440, h: 2560 }) },
  { id: "iphone", label: "iPhone · 1179 × 2556", hint: "iPhone 14/15/16 Pro", device: "phone", size: () => ({ w: 1179, h: 2556 }) },
  { id: "iphone15", label: "iPhone · 1170 × 2532", hint: "iPhone 13/14", device: "phone", size: () => ({ w: 1170, h: 2532 }) },
  { id: "tablet", label: "Tablet · 2048 × 2732", hint: "iPad Pro", device: "phone", size: () => ({ w: 2048, h: 2732 }) },
  // desktop / laptop
  {
    id: "auto-desktop",
    label: "Auto — match my display",
    hint: "Uses your screen size & pixel ratio",
    device: "desktop",
    size: () => {
      if (typeof window === "undefined") return { w: 1920, h: 1080 };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const portrait = window.innerHeight >= window.innerWidth;
      let w = even(Math.max(window.screen.width, window.screen.height) * dpr);
      let h = even(Math.min(window.screen.width, window.screen.height) * dpr);
      if (!portrait) [w, h] = [w, h];
      w = Math.min(w, 3840);
      h = Math.min(h, 2400);
      return { w, h };
    },
  },
  { id: "desktop-fhd", label: "Full HD · 1920 × 1080", hint: "Standard laptop & monitors", device: "desktop", size: () => ({ w: 1920, h: 1080 }) },
  { id: "desktop-qhd", label: "Quad HD · 2560 × 1440", hint: "Gaming & pro monitors", device: "desktop", size: () => ({ w: 2560, h: 1440 }) },
  { id: "desktop-uhd", label: "4K UHD · 3840 × 2160", hint: "4K displays", device: "desktop", size: () => ({ w: 3840, h: 2160 }) },
  { id: "desktop-uw", label: "Ultrawide · 3440 × 1440", hint: "21:9 curved displays", device: "desktop", size: () => ({ w: 3440, h: 1440 }) },
  { id: "macbook", label: "MacBook · 3024 × 1964", hint: "MacBook Pro 14″ class", device: "desktop", size: () => ({ w: 3024, h: 1964 }) },
];

export const VIDEO_RESOLUTIONS: ResolutionPreset[] = [
  { id: "hd", label: "Portrait HD · 720 × 1280", hint: "Smooth & light", device: "phone", size: () => ({ w: 720, h: 1280 }) },
  { id: "fhd", label: "Portrait FHD · 1080 × 1920", hint: "Crisp", device: "phone", size: () => ({ w: 1080, h: 1920 }) },
  { id: "land-hd", label: "Landscape HD · 1280 × 720", hint: "Desktop loop", device: "desktop", size: () => ({ w: 1280, h: 720 }) },
  { id: "land-fhd", label: "Landscape FHD · 1920 × 1080", hint: "Desktop loop, crisp", device: "desktop", size: () => ({ w: 1920, h: 1080 }) },
];

/** Serialization helpers for presets/sharing */
export function toPresetPayload(def: WallpaperDef, config: WallpaperConfig) {
  return {
    w: def.id,
    paletteIndex: config.paletteIndex,
    customColors: config.customColors,
    speed: config.speed,
    density: config.density,
    glow: config.glow,
    seed: config.seed,
  };
}

export function configFromPreset(payload: Record<string, unknown>): {
  def: WallpaperDef;
  config: WallpaperConfig;
} | null {
  const def = WALLPAPERS.find((wp) => wp.id === payload.w);
  if (!def) return null;
  const clamp01 = (v: unknown, lo: number, hi: number, dflt: number) =>
    typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
  return {
    def,
    config: {
      paletteIndex: clamp01(payload.paletteIndex, 0, 99, def.defaults?.paletteIndex ?? 0),
      customColors:
        Array.isArray(payload.customColors) && payload.customColors.length === 5
          ? (payload.customColors as string[]).map((c) =>
              typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : "#000000",
            )
          : null,
      speed: clamp01(payload.speed, 0, 2, def.defaults?.speed ?? 1),
      density: clamp01(payload.density, 0.2, 2, def.defaults?.density ?? 1),
      glow: clamp01(payload.glow, 0, 2, def.defaults?.glow ?? 1),
      seed: clamp01(payload.seed, 0, 99999, def.defaults?.seed ?? 42),
    },
  };
}
