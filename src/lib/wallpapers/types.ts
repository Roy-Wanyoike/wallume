/**
 * Core type definitions for the Wallume live-wallpaper engines.
 * Every engine is a pure, time-driven draw function so the same code
 * renders the live animated preview AND the static high-res export.
 * Engines that react to touch/cursor receive an optional DrawEnv.
 */

/** Normalized pointer state for one canvas, in 0..1 canvas space. */
export type PointerEnv = {
  /** smoothed pointer position, 0..1 (0,0 = top-left) */
  x: number;
  y: number;
  /** pointer velocity in normalized units per second */
  vx: number;
  vy: number;
  /** |v| magnitude, handy shortcut */
  speed: number;
  /** pointer currently pressed */
  down: boolean;
  /** pointer is over the canvas */
  inside: boolean;
  /** recent taps (unconsumed), newest last — engines may drain these */
  taps: { x: number; y: number }[];
};

export type DrawEnv = {
  pointer: PointerEnv;
  /** seconds since previous frame (clamped, 0 on first frame) */
  dt: number;
};

export type EngineParams = {
  /** [bgTop, bgBottom, accent1, accent2, accent3] resolved palette colors */
  colors: string[];
  /** 0 .. 2 — animation speed multiplier (1 = designed default) */
  speed: number;
  /** 0.2 .. 2 — amount of elements / intensity */
  density: number;
  /** 0 .. 2 — glow strength */
  glow: number;
  /** deterministic seed so every render is reproducible */
  seed: number;
};

export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  /** seconds since animation start */
  t: number,
  p: EngineParams,
  /** present only in live animated previews — absent on static exports */
  env?: DrawEnv,
) => void;

export type InteractionKind =
  | "flee"
  | "attract"
  | "repel"
  | "ripple"
  | "spawn"
  | "swirl"
  | "strike"
  | "gust"
  | "shimmer"
  | "warp"
  | "bloom"
  | "glow"
  | "magnet"
  | "parallax";

export type WallpaperCategory =
  | "Nature"
  | "Abstract"
  | "Retro"
  | "Dreamy"
  | "Geometric"
  | "Space"
  | "Ocean"
  | "Urban";

export type Palette = {
  name: string;
  /** 5 colors: [bgTop, bgBottom, accent1, accent2, accent3] */
  colors: string[];
};

export type WallpaperDef = {
  id: string;
  name: string;
  tagline: string;
  category: WallpaperCategory;
  palettes: Palette[];
  /** time (s) that produces a beautiful static frame for exports */
  heroTime: number;
  /** short emoji shown in the picker */
  icon: string;
  draw: DrawFn;
  /** how the scene reacts to touch / cursor — surfaced in the UI */
  interact?: { kind: InteractionKind; label: string };
  /** per-wallpaper default tuning (variants differ from engine defaults) */
  defaults?: Partial<{
    paletteIndex: number;
    speed: number;
    density: number;
    glow: number;
    seed: number;
  }>;
  /** extra search keywords */
  tags?: string[];
};

export type WallpaperConfig = {
  paletteIndex: number;
  /** length-5 override when the user edits colors individually */
  customColors: string[] | null;
  speed: number;
  density: number;
  glow: number;
  seed: number;
};

export type WallpaperStats = { likes: number; downloads: number };

export type StatsMap = Record<string, WallpaperStats>;

export type PresetPayload = {
  w: string; // wallpaper id
  paletteIndex: number;
  customColors: string[] | null;
  speed: number;
  density: number;
  glow: number;
  seed: number;
};

export type CommunityItem = {
  id: string;
  title: string;
  author: string;
  image: string;
  palette: string[] | null;
  createdAt: string;
};
