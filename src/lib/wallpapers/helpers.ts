/**
 * Shared drawing helpers + per-canvas persistent state + interaction
 * decorators used by every Wallume engine. All helpers are deterministic
 * unless a DrawEnv is provided, so static exports stay reproducible.
 */
import type { DrawEnv, DrawFn, EngineParams } from "./types";

export const TAU = Math.PI * 2;

/** Tiny deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** hex + alpha → rgba() string */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** linear blend between two hex colors */
export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

/** amt > 0 → lighten towards white, amt < 0 → darken towards black */
export function shade(hex: string, amt: number): string {
  return amt >= 0 ? mixHex(hex, "#ffffff", amt) : mixHex(hex, "#000000", -amt);
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Number of particles should grow gently with canvas area so desktop
 * (landscape) canvases don't feel empty and thumbnails don't overflow.
 */
export function areaScale(w: number, h: number): number {
  return clamp(Math.sqrt((w * h) / (390 * 844)), 0.72, 2.4);
}

/* ------------------------------------------------------------------ */
/* per-canvas persistent state (keyed by rendering context)            */
/* ------------------------------------------------------------------ */

const stateMap = new WeakMap<
  CanvasRenderingContext2D,
  { sig: string; data: unknown }
>();

/**
 * Fetch (or lazily create) state that lives for as long as this canvas
 * context lives. `sig` should summarize everything the state depends on
 * (seed + palette + density …) so tweaking a slider rebuilds cleanly.
 */
export function canvasState<T>(
  ctx: CanvasRenderingContext2D,
  sig: string,
  init: () => T,
): T {
  const entry = stateMap.get(ctx);
  if (entry && entry.sig === sig) return entry.data as T;
  const data = init();
  stateMap.set(ctx, { sig, data });
  return data;
}

/* ------------------------------------------------------------------ */
/* basic paint helpers                                                 */
/* ------------------------------------------------------------------ */

export function fillBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom: string,
  horizontal = false,
) {
  const g = ctx.createLinearGradient(0, 0, horizontal ? w : 0, horizontal ? 0 : h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function glowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  blur: number,
  coreAlpha = 0.9,
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = rgba("#ffffff", coreAlpha);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r * 0.45), 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function softOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/* interaction decorators — layer touch-reactivity onto existing scenes */
/* ------------------------------------------------------------------ */

type RippleState = { taps: { x: number; y: number; t: number }[] };

/** Expanding glowing rings wherever the user taps. */
export function withRipple(draw: DrawFn): DrawFn {
  return (ctx, w, h, t, p, env) => {
    draw(ctx, w, h, t, p, env);
    if (!env) return;
    const st = canvasState<RippleState>(ctx, `ripple${p.seed}`, () => ({
      taps: [],
    }));
    for (const tap of env.pointer.taps) {
      st.taps.push({ x: tap.x * w, y: tap.y * h, t });
    }
    if (st.taps.length > 16) st.taps.splice(0, st.taps.length - 16);
    st.taps = st.taps.filter((tap) => t - tap.t < 1.4);
    if (st.taps.length === 0) return;
    const m = Math.min(w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const tap of st.taps) {
      const age = t - tap.t;
      for (let k = 0; k < 3; k++) {
        const a = clamp(age * 1.6 - k * 0.18, 0, 1);
        if (a <= 0) continue;
        const r = a * m * 0.34;
        const alpha = (1 - a) * (1 - a) * 0.55 * (0.5 + p.glow * 0.5);
        ctx.strokeStyle = rgba(p.colors[2 + (k % 3)], alpha);
        ctx.lineWidth = Math.max(1, m * 0.006 * (1 - a) + 0.4);
        ctx.beginPath();
        ctx.arc(tap.x, tap.y, r, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
}

type BurstState = {
  parts: { x: number; y: number; vx: number; vy: number; t0: number; c: number; r: number }[];
};

/** Additive sparkle bursts at tap points. */
export function withBurst(draw: DrawFn): DrawFn {
  return (ctx, w, h, t, p, env) => {
    draw(ctx, w, h, t, p, env);
    if (!env) return;
    const st = canvasState<BurstState>(ctx, `burst${p.seed}`, () => ({
      parts: [],
    }));
    for (const tap of env.pointer.taps) {
      const n = Math.round(26 * clamp(p.density, 0.5, 1.6));
      const rnd = mulberry32(Math.floor(tap.x * 977 + tap.y * 131 + t * 91));
      for (let i = 0; i < n; i++) {
        const ang = rnd() * TAU;
        const sp = (0.25 + rnd() * 1) * Math.min(w, h) * 0.16;
        st.parts.push({
          x: tap.x * w,
          y: tap.y * h,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          t0: t + rnd() * 0.08,
          c: 2 + Math.floor(rnd() * 3),
          r: 0.8 + rnd() * 1.8,
        });
      }
    }
    const dt = clamp(env.dt, 0.001, 0.05);
    st.parts = st.parts.filter((pt) => t - pt.t0 < 0.9);
    if (st.parts.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const pt of st.parts) {
      const age = t - pt.t0;
      if (age < 0) continue;
      const drag = Math.exp(-age * 2.4);
      const x = pt.x + pt.vx * age * drag;
      const y = pt.y + pt.vy * age * drag + Math.min(w, h) * 0.03 * age * age;
      const alpha = (1 - age / 0.9) * 0.8;
      glowDot(ctx, x, y, pt.r * (0.5 + p.glow * 0.5), p.colors[pt.c], 8 * p.glow, alpha);
    }
    ctx.restore();
  };
}

/**
 * Wrap a scene so taps queue-spend and the pointer position/velocity is
 * available as `env`. Scenes that never read env keep working unchanged.
 */
export function tapCount(env: DrawEnv | undefined): number {
  return env ? env.pointer.taps.length : 0;
}

/** Deterministic hash for seeds derived from strings. */
export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 99991);
}

/** Convenience: normalized pointer in pixel space + activity radius. */
export function pointerPx(env: DrawEnv | undefined, w: number, h: number) {
  if (!env || !env.pointer.inside) return null;
  return {
    x: env.pointer.x * w,
    y: env.pointer.y * h,
    vx: env.pointer.vx * w,
    vy: env.pointer.vy * h,
    speed: env.pointer.speed,
    down: env.pointer.down,
  };
}

/** repel force helper — returns impulse vector pointing away from pointer */
export function repelFrom(
  px: number,
  py: number,
  x: number,
  y: number,
  radius: number,
  strength: number,
): { ix: number; iy: number; dist: number } {
  const dx = x - px;
  const dy = y - py;
  const dist = Math.hypot(dx, dy) || 0.0001;
  if (dist > radius) return { ix: 0, iy: 0, dist };
  const f = (1 - dist / radius) * strength;
  return { ix: (dx / dist) * f, iy: (dy / dist) * f, dist };
}

export type { DrawEnv, DrawFn, EngineParams };
