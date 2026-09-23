"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { addTickerTask } from "@/lib/wallpapers/ticker";
import { renderFrame } from "@/lib/wallpapers/render";
import { subscribeEco, isEcoOn } from "@/lib/eco-store";
import type { DrawEnv, PointerEnv, WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";

type Props = {
  def: WallpaperDef;
  config: WallpaperConfig;
  /** target frames per second for this canvas */
  fps?: number;
  /** hard cap on internal pixels (performance guard) */
  maxPixels?: number;
  className?: string;
  /** subtle pointer parallax + full touch interactivity when the scene supports it */
  interactive?: boolean;
  /** when set, never animate — render one beautiful static frame */
  static?: boolean;
  /** externally pause the animation (e.g. when a fullscreen overlay covers it) */
  paused?: boolean;
  /** css touch-action for the wrapper ("pan-y" keeps page scroll alive on mobile) */
  touchAction?: "pan-y" | "none";
};

export function WallpaperCanvas({
  def,
  config,
  fps = 60,
  maxPixels = 520_000,
  className,
  interactive = false,
  static: isStatic = false,
  paused = false,
  touchAction = "pan-y",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallax = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const stateRef = useRef({ def, config, maxPixels });
  const taskRef = useRef<{ setPaused: (p: boolean) => void } | null>(null);
  // eco mode scales fps + pixel budgets down for battery-friendly playback
  const eco = useSyncExternalStore(subscribeEco, isEcoOn, () => false);
  const effFps = eco ? Math.max(12, Math.min(fps, 20)) : fps;
  const effPixels = eco ? Math.round(maxPixels * 0.5) : maxPixels;
  const pointerRef = useRef({
    x: 0.5,
    y: 0.5,
    tx: 0.5,
    ty: 0.5,
    vx: 0,
    vy: 0,
    down: false,
    inside: false,
    taps: [] as { x: number; y: number }[],
    lastTx: 0.5,
    lastTy: 0.5,
  });

  // keep the latest props reachable from the ticker without re-subscribing
  useEffect(() => {
    stateRef.current = { def, config, maxPixels: effPixels };
  }, [def, config, effPixels]);

  useEffect(() => {
    taskRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let size = { w: 0, h: 0 };
    let ctx: CanvasRenderingContext2D | null = null;
    let lastT: number | null = null;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.max(2, Math.round(rect.width * dpr));
      let h = Math.max(2, Math.round(rect.height * dpr));
      const pixels = w * h;
      const cap = stateRef.current.maxPixels;
      if (pixels > cap) {
        const k = Math.sqrt(cap / pixels);
        w = Math.max(2, Math.round(w * k));
        h = Math.max(2, Math.round(h * k));
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      // always keep the ticker closure's size/ctx fresh — the canvas node
      // is reused across effect re-runs (e.g. when the scene changes)
      size = { w: canvas.width, h: canvas.height };
      ctx = canvas.getContext("2d");
      drawNow();
    };

    const drawNow = () => {
      if (!ctx || size.w === 0) return;
      const { def: d, config: c } = stateRef.current;
      renderFrame(ctx, size.w, size.h, 0, d, c);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    fit();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // static render — either forced or reduced-motion preference
    if (isStatic || reduced) {
      const heroCtx = canvas.getContext("2d");
      if (heroCtx) {
        renderFrame(heroCtx, size.w || canvas.width, size.h || canvas.height, stateRef.current.def.heroTime, stateRef.current.def, stateRef.current.config);
      }
      const roStatic = ro;
      return () => roStatic.disconnect();
    }

    // animated render through the shared ticker
    const task = addTickerTask((t) => {
      if (!ctx || size.w === 0) return;
      const { def: d, config: c } = stateRef.current;
      const par = parallax.current;
      const ptr = pointerRef.current;

      // per-canvas delta time (clamped so pauses never explode the sim)
      const dt = lastT === null ? 0.016 : Math.min(0.05, Math.max(0.001, t - lastT));
      lastT = t;

      // ease pointer towards its target & estimate velocity
      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 14);
      ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 14);
      if (dt > 0) {
        ptr.vx = (ptr.tx - ptr.lastTx) / dt;
        ptr.vy = (ptr.ty - ptr.lastTy) / dt;
      }
      ptr.lastTx = ptr.tx;
      ptr.lastTy = ptr.ty;

      // ease towards target offset for buttery parallax motion
      par.x += (par.tx - par.x) * 0.08;
      par.y += (par.ty - par.y) * 0.08;

      const env: DrawEnv = {
        pointer: {
          x: ptr.x,
          y: ptr.y,
          vx: ptr.vx,
          vy: ptr.vy,
          speed: Math.hypot(ptr.vx, ptr.vy),
          down: ptr.down,
          inside: ptr.inside,
          taps: ptr.taps,
        },
        dt,
      };

      if (interactive && (Math.abs(par.x) > 0.001 || Math.abs(par.y) > 0.001)) {
        // scale the scene up slightly and offset it so edges never show.
        // scale about the canvas CENTER (not the origin) — scaling about the
        // origin exposed an unpainted strip on the top/left whenever the
        // pointer offset was positive, freezing ghost trails there.
        const k = 1.06;
        const ox = par.x * size.w * 0.022;
        const oy = par.y * size.h * 0.022;
        ctx.setTransform(k, 0, 0, k, ox + (size.w * (1 - k)) / 2, oy + (size.h * (1 - k)) / 2);
        renderFrame(ctx, size.w, size.h, t, d, c, env);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        renderFrame(ctx, size.w, size.h, t, d, c, env);
      }
      // taps are consumed by the engine this frame
      ptr.taps.length = 0;
    }, effFps);
    taskRef.current = task;

    // redraw immediately when config changes
    drawConfigNow();
    function drawConfigNow() {
      if (!ctx || size.w === 0) return;
      const { def: d, config: c } = stateRef.current;
      renderFrame(ctx, size.w, size.h, d.heroTime, d, c);
    }

    // pause when scrolled out of view
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => task.setVisible(e.isIntersecting)),
      { rootMargin: "80px" },
    );
    io.observe(wrap);

    const onPointer = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      const ptr = pointerRef.current;
      ptr.tx = nx;
      ptr.ty = ny;
      ptr.inside = true;
      parallax.current.tx = nx * 2 - 1;
      parallax.current.ty = ny * 2 - 1;
    };
    const onDown = (e: PointerEvent) => {
      onPointer(e);
      const rect = wrap.getBoundingClientRect();
      pointerRef.current.down = true;
      pointerRef.current.taps.push({
        x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      });
      if (pointerRef.current.taps.length > 8) pointerRef.current.taps.shift();
    };
    const onUp = () => {
      pointerRef.current.down = false;
    };
    const onLeave = () => {
      pointerRef.current.inside = false;
      pointerRef.current.tx = 0.5;
      pointerRef.current.ty = 0.5;
      parallax.current.tx = 0;
      parallax.current.ty = 0;
    };
    if (interactive) {
      wrap.addEventListener("pointermove", onPointer);
      wrap.addEventListener("pointerdown", onDown);
      wrap.addEventListener("pointerup", onUp);
      wrap.addEventListener("pointercancel", onUp);
      wrap.addEventListener("pointerleave", onLeave);
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      task.destroy();
      taskRef.current = null;
      lastT = null;
      if (interactive) {
        wrap.removeEventListener("pointermove", onPointer);
        wrap.removeEventListener("pointerdown", onDown);
        wrap.removeEventListener("pointerup", onUp);
        wrap.removeEventListener("pointercancel", onUp);
        wrap.removeEventListener("pointerleave", onLeave);
      }
    };
  }, [def.id, interactive, isStatic, effFps, eco]);

  // react to config changes without rebuilding observers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width < 2) return;
    renderFrame(ctx, canvas.width, canvas.height, def.heroTime, def, config);
  }, [config, def]);

  return (
    <div
      ref={wrapRef}
      className={className}
      aria-hidden="true"
      style={interactive ? { touchAction } : undefined}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

export type { PointerEnv };
