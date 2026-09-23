/**
 * Wallume wallpaper engines — 10 hand-crafted, deterministic canvas scenes.
 * All engines are resolution independent and time driven (t in seconds),
 * so the very same code powers live previews and static high-res exports.
 *
 * Palette convention: colors = [bgTop, bgBottom, accent1, accent2, accent3]
 */
import type { DrawFn, WallpaperDef } from "./types";
import {
  TAU,
  mulberry32,
  rgba,
  mixHex,
  shade,
  clamp,
  fillBg,
  glowDot,
  softOrb,
} from "./helpers";

/* ------------------------------------------------------------------ */
/* 1 · Aurora Veil                                                     */
/* ------------------------------------------------------------------ */

const auroraVeil: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);

  const m = Math.min(w, h);
  const rand = mulberry32(p.seed);
  const sp = p.speed;

  // twinkling stars
  const stars = Math.round(90 * p.density);
  ctx.save();
  for (let i = 0; i < stars; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.75;
    const r = (0.4 + rand() * 1.1) * (m / 420);
    const ph = rand() * TAU;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rand()) * sp + ph));
    ctx.fillStyle = rgba("#ffffff", tw * 0.75);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // flowing ribbons
  const accents = [a1, a2, a3];
  const ribbons = clamp(Math.round(3 + p.density * 1.6), 3, 6);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < ribbons; i++) {
    const color = accents[i % accents.length];
    const baseY = h * (0.16 + (0.46 * i) / ribbons) + Math.sin(t * 0.23 * sp + i * 1.9) * h * 0.015;
    const amp = h * (0.045 + 0.012 * i);
    const thickness = h * (0.1 + 0.025 * (i % 3));
    const freq = (TAU / w) * (1.1 + i * 0.35);
    const phase = t * (0.3 + i * 0.08) * sp + i * 2.1;

    const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + thickness + amp);
    grad.addColorStop(0, rgba(color, 0));
    grad.addColorStop(0.4, rgba(color, 0.34 + p.glow * 0.14));
    grad.addColorStop(0.72, rgba(color, 0.16));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.shadowColor = rgba(color, 0.8);
    ctx.shadowBlur = 34 * p.glow;

    ctx.beginPath();
    const steps = Math.max(28, Math.floor(w / 18));
    const yAt = (x: number, off: number) =>
      baseY +
      off +
      Math.sin(x * freq + phase) * amp +
      Math.sin(x * freq * 0.37 + phase * 0.6) * amp * 0.55;
    ctx.moveTo(-4, yAt(0, 0));
    for (let s = 1; s <= steps; s++) {
      const x = ((w + 8) * s) / steps - 4;
      ctx.lineTo(x, yAt(x, 0));
    }
    for (let s = steps; s >= 0; s--) {
      const x = ((w + 8) * s) / steps - 4;
      ctx.lineTo(x, yAt(x, thickness));
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // horizon haze
  const haze = ctx.createLinearGradient(0, h * 0.72, 0, h);
  haze.addColorStop(0, rgba(a2, 0));
  haze.addColorStop(1, rgba(a2, 0.1 + p.glow * 0.05));
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
};

/* ------------------------------------------------------------------ */
/* 2 · Starfall                                                        */
/* ------------------------------------------------------------------ */

const starfall: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  // moon with halo
  const mx = w * 0.72;
  const my = h * 0.15;
  const mr = m * 0.075;
  softOrb(ctx, mx, my, mr * 3.4, a2, 0.22 + p.glow * 0.1);
  ctx.fillStyle = shade(a2, 0.55);
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.fill();
  // crater hints
  ctx.fillStyle = rgba(shade(a2, 0.2), 0.5);
  ctx.beginPath();
  ctx.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.22, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + mr * 0.28, my + mr * 0.3, mr * 0.14, 0, TAU);
  ctx.fill();

  // star field
  const rand = mulberry32(p.seed);
  const stars = Math.round(150 * p.density);
  for (let i = 0; i < stars; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.4 + rand() * 1.2) * (m / 420);
    const ph = rand() * TAU;
    const big = rand() > 0.965;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + rand() * 1.4) * sp + ph));
    ctx.fillStyle = rgba(i % 7 === 0 ? a3 : "#ffffff", tw * (big ? 1 : 0.8));
    ctx.beginPath();
    ctx.arc(x, y, big ? r * 1.9 : r, 0, TAU);
    ctx.fill();
    if (big) {
      ctx.strokeStyle = rgba("#ffffff", tw * 0.5);
      ctx.lineWidth = m / 900;
      const L = r * 6;
      ctx.beginPath();
      ctx.moveTo(x - L, y);
      ctx.lineTo(x + L, y);
      ctx.moveTo(x, y - L);
      ctx.lineTo(x, y + L);
      ctx.stroke();
    }
  }

  // deterministic shooting stars
  const rate = 0.28 * sp;
  const k = Math.floor(t * rate);
  for (let j = k - 1; j <= k + 1; j++) {
    const prog = t * rate - j;
    const cycle = 0.16;
    if (prog < 0 || prog > cycle) continue;
    const rj = mulberry32(p.seed * 7919 + j * 131);
    const sx = w * (0.08 + rj() * 0.66);
    const sy = h * (0.04 + rj() * 0.3);
    const len = m * (0.12 + rj() * 0.1);
    const ang = (0.42 + rj() * 0.25) * Math.PI; // down-right
    const travel = m * 0.55 * (prog / cycle);
    const fade = Math.sin((prog / cycle) * Math.PI);
    const hx = sx + Math.cos(ang) * travel;
    const hy = sy + Math.sin(ang) * travel;
    const tx = hx - Math.cos(ang) * len;
    const ty = hy - Math.sin(ang) * len;
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, rgba("#ffffff", 0));
    grad.addColorStop(1, rgba(a1, 0.9 * fade));
    ctx.strokeStyle = grad;
    ctx.lineWidth = m / 320;
    ctx.lineCap = "round";
    ctx.shadowColor = rgba(a1, fade);
    ctx.shadowBlur = 14 * p.glow;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
};

/* ------------------------------------------------------------------ */
/* 3 · Tidal Waves                                                     */
/* ------------------------------------------------------------------ */

const tidalWaves: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  const horizon = h * 0.5;
  // sun near the horizon
  const sunY = h * 0.36;
  softOrb(ctx, w * 0.5, sunY, m * 0.3, a2, 0.3 + p.glow * 0.12);
  ctx.fillStyle = shade(a2, 0.35);
  ctx.beginPath();
  ctx.arc(w * 0.5, sunY, m * 0.085, 0, TAU);
  ctx.fill();

  // light column on the sea
  const beam = ctx.createLinearGradient(0, horizon, 0, h);
  beam.addColorStop(0, rgba(a2, 0.28));
  beam.addColorStop(1, rgba(a2, 0.02));
  ctx.fillStyle = beam;
  ctx.fillRect(w * 0.5 - m * 0.09, horizon, m * 0.18, h - horizon);

  // wave layers
  const layers = clamp(Math.round(5 + p.density * 3), 5, 9);
  for (let i = 0; i < layers; i++) {
    const d = i / (layers - 1); // 0 far → 1 near
    const yi = horizon + (h - horizon) * Math.pow(d, 1.18);
    const amp = (h - horizon) * (0.018 + 0.05 * d);
    const sp1 = (0.5 + d * 0.9) * sp;
    const sp2 = (0.8 + d * 1.4) * sp;
    const k1 = TAU / (w * (0.9 - d * 0.25));
    const k2 = TAU / (w * 0.31);
    const colA = [a1, a2, a3][i % 3];
    const dark = mixHex(a3, bg0, 0.55 + d * 0.2);

    const grad = ctx.createLinearGradient(0, yi - amp * 2, 0, yi + (h - yi) * 0.9);
    grad.addColorStop(0, mixHex(colA, dark, 0.25 + d * 0.3));
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;

    ctx.beginPath();
    const steps = Math.max(32, Math.floor(w / 14));
    ctx.moveTo(-4, yi);
    const yAt = (x: number) =>
      yi +
      Math.sin(x * k1 + t * sp1 + i * 1.7) * amp +
      Math.sin(x * k2 - t * sp2 + i) * amp * 0.35;
    for (let s = 1; s <= steps; s++) {
      const x = ((w + 8) * s) / steps - 4;
      ctx.lineTo(x, yAt(x));
    }
    ctx.lineTo(w + 4, h + 4);
    ctx.lineTo(-4, h + 4);
    ctx.closePath();
    ctx.fill();

    // crest highlight
    ctx.strokeStyle = rgba(shade(colA, 0.55), 0.22 + d * 0.15);
    ctx.lineWidth = (m / 380) * (0.7 + d);
    ctx.beginPath();
    ctx.moveTo(-4, yAt(0));
    for (let s = 1; s <= steps; s++) {
      const x = ((w + 8) * s) / steps - 4;
      ctx.lineTo(x, yAt(x));
    }
    ctx.stroke();
  }
};

/* ------------------------------------------------------------------ */
/* 4 · Alpine Dusk                                                     */
/* ------------------------------------------------------------------ */

const alpineDusk: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  // low sun
  const sunY = h * 0.42;
  softOrb(ctx, w * 0.5, sunY, m * 0.34, a1, 0.34 + p.glow * 0.12);
  ctx.fillStyle = shade(a1, 0.4);
  ctx.beginPath();
  ctx.arc(w * 0.5, sunY, m * 0.075, 0, TAU);
  ctx.fill();

  // birds
  const birds = Math.round(2 + p.density * 2.5);
  ctx.strokeStyle = rgba(shade(bg0, -0.4), 0.65);
  ctx.lineWidth = m / 500;
  for (let i = 0; i < birds; i++) {
    const rj = mulberry32(p.seed * 31 + i * 17);
    const speed = (26 + rj() * 18) * sp;
    const span = w + m * 0.2;
    const bx = ((t * speed + rj() * span) % span) - m * 0.1;
    const by = h * (0.14 + rj() * 0.2) + Math.sin(t * 1.3 + i) * m * 0.008;
    const s = m * (0.011 + rj() * 0.006);
    const flap = Math.sin(t * 7 * sp + i * 2.4) * s * 0.7;
    ctx.beginPath();
    ctx.moveTo(bx - s, by - flap);
    ctx.quadraticCurveTo(bx, by + s * 0.4, bx + s, by - flap);
    ctx.stroke();
  }

  // ridge layers, far → near
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const d = i / (layers - 1);
    const rj = mulberry32(p.seed * 101 + i * 53);
    const f1 = 1.1 + rj() * 1.6;
    const f2 = 2.3 + rj() * 2.2;
    const f3 = 5 + rj() * 3;
    const baseY = h * (0.5 + 0.115 * i);
    const amp = h * (0.05 + 0.035 * i);
    const drift = t * sp * (2 + i * 3); // slow parallax drift
    const ridgeCol =
      i === layers - 1
        ? shade(bg0, -0.55)
        : mixHex(i % 2 === 0 ? a2 : a3, bg0, 0.32 + d * 0.22);

    const yAt = (x: number) =>
      baseY -
      Math.abs(Math.sin(x * (TAU / w) * f1 + i * 5 + drift * 0.01)) * amp -
      Math.sin(x * (TAU / w) * f2 + i * 9 + drift * 0.013) * amp * 0.4 -
      Math.sin(x * (TAU / w) * f3 + drift * 0.017) * amp * 0.14;

    const grad = ctx.createLinearGradient(0, baseY - amp * 1.6, 0, h);
    grad.addColorStop(0, shade(ridgeCol, -0.12));
    grad.addColorStop(1, shade(ridgeCol, -0.55));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-4, yAt(0));
    const steps = Math.max(40, Math.floor(w / 9));
    for (let s = 1; s <= steps; s++) {
      const x = ((w + 8) * s) / steps - 4;
      ctx.lineTo(x, yAt(x));
    }
    ctx.lineTo(w + 4, h + 4);
    ctx.lineTo(-4, h + 4);
    ctx.closePath();
    ctx.fill();

    // mist band on the ridge
    const mist = ctx.createLinearGradient(0, baseY - amp * 1.2, 0, baseY + h * 0.05);
    mist.addColorStop(0, rgba(bg1, 0));
    mist.addColorStop(0.65, rgba(bg1, 0.14));
    mist.addColorStop(1, rgba(bg1, 0));
    ctx.fillStyle = mist;
    ctx.fillRect(0, baseY - amp * 1.2, w, h * 0.05 + amp * 1.6);
  }
};

/* ------------------------------------------------------------------ */
/* 5 · Particle Bloom                                                  */
/* ------------------------------------------------------------------ */

const particleBloom: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1, true);
  const m = Math.min(w, h);
  const sp = p.speed;

  const count = clamp(Math.round(64 * p.density), 16, 150);
  const rand = mulberry32(p.seed);
  const pts: { x: number; y: number; r: number; c: string; ph: number; s: number }[] = [];
  for (let i = 0; i < count; i++) {
    pts.push({
      x: rand() * w,
      y: rand() * h,
      r: (1 + rand() * 1.9) * (m / 430),
      c: [a1, a2, a3][i % 3],
      ph: rand() * TAU,
      s: 0.4 + rand() * 0.8,
    });
  }

  const pos = (i: number) => {
    const pt = pts[i];
    return {
      x: pt.x + Math.sin(t * pt.s * sp + pt.ph) * m * 0.045,
      y: pt.y + Math.cos(t * pt.s * 0.8 * sp + pt.ph * 1.3) * m * 0.045,
    };
  };

  // connections
  const link = m * 0.15;
  ctx.lineWidth = m / 900;
  for (let i = 0; i < count; i++) {
    const pi = pos(i);
    for (let j = i + 1; j < count; j++) {
      const pj = pos(j);
      const dx = pi.x - pj.x;
      const dy = pi.y - pj.y;
      const d = Math.hypot(dx, dy);
      if (d < link) {
        ctx.strokeStyle = rgba(pts[i].c, (1 - d / link) * 0.32);
        ctx.beginPath();
        ctx.moveTo(pi.x, pi.y);
        ctx.lineTo(pj.x, pj.y);
        ctx.stroke();
      }
    }
  }

  // glowing dots
  for (let i = 0; i < count; i++) {
    const pt = pts[i];
    const pp = pos(i);
    const pulse = 0.75 + 0.25 * Math.sin(t * 2 * sp + pt.ph);
    glowDot(ctx, pp.x, pp.y, pt.r * pulse, pt.c, 12 * p.glow, 0.85);
  }

  // soft center aura
  softOrb(ctx, w / 2, h * 0.42, m * 0.55, a1, 0.05 + p.glow * 0.03);
};

/* ------------------------------------------------------------------ */
/* 6 · Liquid Dreams                                                   */
/* ------------------------------------------------------------------ */

const liquidDreams: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const accents = [a1, a2, a3];
  const orbs = clamp(Math.round(6 + p.density * 3), 5, 10);
  const rand = mulberry32(p.seed);
  for (let i = 0; i < orbs; i++) {
    const bx = rand() * w;
    const by = rand() * h;
    const orbR = m * (0.16 + rand() * 0.2);
    const orbit = m * (0.08 + rand() * 0.18);
    const s = (0.12 + rand() * 0.3) * sp;
    const ph = rand() * TAU;
    const wob = rand() * TAU;
    const x = bx + Math.cos(t * s + ph) * orbit;
    const y = by + Math.sin(t * s * 0.83 + ph) * orbit * 0.9 + Math.sin(t * s * 1.7 + wob) * orbit * 0.16;
    const color = accents[i % accents.length];
    softOrb(ctx, x, y, orbR * (1 + 0.08 * Math.sin(t * s * 2 + wob)), color, 0.34 + p.glow * 0.12);
  }
  ctx.restore();

  // dreamy sparkles
  const rand2 = mulberry32(p.seed + 99);
  const sparkles = Math.round(40 * p.density);
  for (let i = 0; i < sparkles; i++) {
    const x = rand2() * w;
    const y = rand2() * h;
    const ph = rand2() * TAU;
    const r = (0.5 + rand2() * 0.9) * (m / 420);
    const tw = Math.abs(Math.sin(t * (0.8 + rand2()) * sp + ph));
    ctx.fillStyle = rgba("#ffffff", tw * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r * tw, 0, TAU);
    ctx.fill();
  }
};

/* ------------------------------------------------------------------ */
/* 7 · Neon Horizon                                                    */
/* ------------------------------------------------------------------ */

const neonHorizon: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const horizon = h * 0.58;

  fillBg(ctx, w, h, bg0, bg1);

  // sparse stars in the sky
  const rand = mulberry32(p.seed);
  const stars = Math.round(70 * p.density);
  for (let i = 0; i < stars; i++) {
    const x = rand() * w;
    const y = rand() * horizon * 0.85;
    const ph = rand() * TAU;
    const r = (0.4 + rand()) * (m / 430);
    const tw = 0.25 + 0.75 * Math.abs(Math.sin(t * (0.7 + rand()) * sp + ph));
    ctx.fillStyle = rgba("#ffffff", tw * 0.7);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // striped retro sun
  const sunR = m * 0.21;
  const sunY = horizon - sunR * 0.35;
  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, shade(a1, 0.35));
  sunGrad.addColorStop(0.55, a2);
  sunGrad.addColorStop(1, mixHex(a2, a1, 0.4));
  ctx.save();
  ctx.shadowColor = rgba(a2, 0.85);
  ctx.shadowBlur = 60 * p.glow;
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w / 2, sunY, sunR, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  // punch horizontal gaps (classic synthwave stripes)
  ctx.globalCompositeOperation = "destination-out";
  let gap = sunR * 0.055;
  for (let y = sunY + sunR * 0.12; y < sunY + sunR; y += gap * 2.6) {
    ctx.fillRect(w / 2 - sunR - 4, y, sunR * 2 + 8, gap);
    gap *= 1.24;
  }
  ctx.restore();

  // distant silhouette ridge
  const rj = mulberry32(p.seed * 13 + 7);
  ctx.fillStyle = shade(bg0, -0.6);
  ctx.beginPath();
  ctx.moveTo(-4, horizon);
  const steps = Math.max(30, Math.floor(w / 16));
  for (let s = 0; s <= steps; s++) {
    const x = ((w + 8) * s) / steps - 4;
    const y =
      horizon -
      Math.abs(Math.sin(x * (TAU / w) * (1.3 + rj())) + Math.sin(x * (TAU / w) * 3.7 + 2)) *
        h *
        0.028;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 4, horizon);
  ctx.closePath();
  ctx.fill();

  // ground
  const ground = ctx.createLinearGradient(0, horizon, 0, h);
  ground.addColorStop(0, shade(bg0, -0.45));
  ground.addColorStop(1, shade(bg0, -0.85));
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, w, h - horizon);

  // perspective grid
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(a3, 0.75);
  ctx.shadowColor = rgba(a3, 0.9);
  ctx.shadowBlur = 10 * p.glow;
  ctx.lineWidth = m / 460;

  // vertical rays converging to vanishing point
  const rays = 11;
  for (let i = 0; i < rays; i++) {
    const xBottom = w / 2 + ((i - (rays - 1) / 2) / ((rays - 1) / 2)) * w * 0.85;
    ctx.beginPath();
    ctx.moveTo(w / 2, horizon);
    ctx.lineTo(xBottom, h + 4);
    ctx.stroke();
  }

  // horizontal lines rushing toward the viewer
  const lines = 13;
  for (let i = 0; i < lines; i++) {
    const prog = ((i / lines + t * 0.22 * sp) % 1 + 1) % 1;
    const y = horizon + (h - horizon) * Math.pow(prog, 2.4);
    const alpha = 0.12 + prog * 0.75;
    ctx.strokeStyle = rgba(a3, alpha);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // glowing horizon line
  ctx.strokeStyle = rgba(a1, 0.95);
  ctx.shadowColor = rgba(a1, 1);
  ctx.shadowBlur = 18 * p.glow;
  ctx.lineWidth = m / 300;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w, horizon);
  ctx.stroke();
  ctx.restore();
};

/* ------------------------------------------------------------------ */
/* 8 · Firefly Grove                                                   */
/* ------------------------------------------------------------------ */

const fireflyGrove: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  // moonlit haze
  softOrb(ctx, w * 0.24, h * 0.2, m * 0.4, a2, 0.1 + p.glow * 0.05);

  // bokeh depth dots (big, blurred feel)
  const rj = mulberry32(p.seed + 5);
  for (let i = 0; i < 8; i++) {
    const x = rj() * w;
    const y = h * (0.25 + rj() * 0.6);
    const r = m * (0.03 + rj() * 0.05);
    const ph = rj() * TAU;
    const a = 0.05 + 0.04 * Math.sin(t * 0.9 * sp + ph);
    softOrb(ctx, x, y, r, i % 2 ? a1 : a2, Math.max(0.02, a));
  }

  // rolling hills
  for (let i = 0; i < 2; i++) {
    const baseY = h * (0.78 + i * 0.11);
    const amp = h * 0.035 * (i + 1);
    ctx.fillStyle = i === 0 ? mixHex(a3, bg0, 0.4) : shade(bg0, -0.75);
    ctx.beginPath();
    ctx.moveTo(-4, baseY);
    for (let s = 0; s <= 24; s++) {
      const x = ((w + 8) * s) / 24 - 4;
      ctx.lineTo(x, baseY - Math.sin(x * (TAU / w) * (1.2 + i) + i * 3) * amp);
    }
    ctx.lineTo(w + 4, h + 4);
    ctx.lineTo(-4, h + 4);
    ctx.closePath();
    ctx.fill();
  }

  // fireflies
  const count = clamp(Math.round(42 * p.density), 12, 90);
  const rand = mulberry32(p.seed);
  for (let i = 0; i < count; i++) {
    const bx = rand() * w;
    const by = h * (0.18 + rand() * 0.72);
    const ax = m * (0.02 + rand() * 0.05);
    const ay = m * (0.012 + rand() * 0.035);
    const s1 = (0.3 + rand() * 0.7) * sp;
    const s2 = (0.2 + rand() * 0.5) * sp;
    const ph = rand() * TAU;
    const pulsePh = rand() * TAU;
    const pulse = Math.max(0.12, Math.sin(t * 1.7 * sp + pulsePh));
    const size = (1.1 + rand() * 1.4) * (m / 430);
    const x = bx + Math.sin(t * s1 + ph) * ax + Math.sin(t * s1 * 2.3 + ph * 2) * ax * 0.3;
    const y = by + Math.cos(t * s2 + ph) * ay;
    const color = i % 4 === 0 ? a2 : a1;
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.75;
    glowDot(ctx, x, y, size * (0.7 + pulse * 0.5), color, 18 * p.glow, 0.95);
    ctx.restore();
  }
};

/* ------------------------------------------------------------------ */
/* 9 · Petal Drift                                                     */
/* ------------------------------------------------------------------ */

const petalDrift: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  // soft bokeh
  const rj = mulberry32(p.seed + 3);
  for (let i = 0; i < 7; i++) {
    softOrb(
      ctx,
      rj() * w,
      rj() * h,
      m * (0.08 + rj() * 0.14),
      i % 2 ? "#ffffff" : a2,
      0.06 + 0.03 * Math.sin(t * 0.7 * sp + rj() * TAU),
    );
  }

  // petals
  const count = clamp(Math.round(26 * p.density), 8, 48);
  const rand = mulberry32(p.seed);
  const margin = m * 0.1;
  for (let i = 0; i < count; i++) {
    const bx = rand() * w;
    const fall = m * (0.06 + rand() * 0.1); // px per second-ish
    const swayAmp = w * (0.03 + rand() * 0.05);
    const sway = 0.5 + rand() * 0.9;
    const ph = rand() * TAU;
    const size = m * (0.018 + rand() * 0.024);
    const spin = (0.4 + rand() * 1.1) * (rand() > 0.5 ? 1 : -1);
    const color = [a1, a2, a3][i % 3];

    const y = (((bx * 0 + t * fall * sp) % (h + margin * 2)) + h + margin * 2) % (h + margin * 2) - margin;
    const x = bx + Math.sin(t * sway * sp + ph) * swayAmp;
    const rot = t * spin * sp + ph;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = rgba(color, 0.88);
    ctx.shadowColor = rgba(color, 0.4);
    ctx.shadowBlur = 8 * p.glow;
    const s = size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.85, 0, 0, s);
    ctx.quadraticCurveTo(-s * 0.85, 0, 0, -s);
    ctx.closePath();
    ctx.fill();
    // center vein
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba("#ffffff", 0.35);
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(0, s * 0.7);
    ctx.stroke();
    ctx.restore();
  }
};

/* ------------------------------------------------------------------ */
/* 10 · Solaris Mandala                                                */
/* ------------------------------------------------------------------ */

const solarisMandala: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const cx = w / 2;
  const cy = h * 0.44;
  const sp = p.speed;

  // radial vignette background
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
  g.addColorStop(0, bg1);
  g.addColorStop(1, bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // breathing core
  const coreR = m * (0.07 + 0.012 * Math.sin(t * 1.4 * sp));
  softOrb(ctx, cx, cy, coreR * 3, a1, 0.4 + p.glow * 0.15);
  ctx.fillStyle = shade(a1, 0.55);
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, TAU);
  ctx.fill();

  const accents = [a1, a2, a3];
  const rings = clamp(Math.round(5 + p.density * 2), 5, 8);
  for (let i = 0; i < rings; i++) {
    const radius = m * (0.14 + i * 0.068);
    const n = 6 + i * 3;
    const dir = i % 2 === 0 ? 1 : -1;
    const rot = t * dir * (0.14 + i * 0.03) * sp;
    const color = accents[i % 3];
    const shape = i % 3; // 0 diamond, 1 dot, 2 triangle

    // faint guide circle
    ctx.strokeStyle = rgba(color, 0.14);
    ctx.lineWidth = m / 800;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();

    for (let j = 0; j < n; j++) {
      const ang = rot + (TAU * j) / n;
      const x = cx + Math.cos(ang) * radius;
      const y = cy + Math.sin(ang) * radius;
      const s = m * (0.011 + 0.004 * Math.sin(t * 2 * sp + j)) + m * 0.004 * (1 - i / rings);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + (shape === 2 ? Math.PI / 2 : rot * 0.3));
      ctx.fillStyle = rgba(color, 0.85);
      ctx.shadowColor = rgba(color, 0.7);
      ctx.shadowBlur = 12 * p.glow;
      ctx.beginPath();
      if (shape === 0) {
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
      } else if (shape === 1) {
        ctx.arc(0, 0, s * 0.55, 0, TAU);
      } else {
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.85, s * 0.6);
        ctx.lineTo(-s * 0.85, s * 0.6);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }
  }

  // floating dust
  const rand = mulberry32(p.seed + 11);
  const dust = Math.round(36 * p.density);
  for (let i = 0; i < dust; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const ph = rand() * TAU;
    const r = (0.4 + rand() * 0.8) * (m / 430);
    ctx.fillStyle = rgba("#ffffff", Math.abs(Math.sin(t * 0.9 * sp + ph)) * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
};

/* ------------------------------------------------------------------ */
/* 11 · Rain Glass                                                     */
/* ------------------------------------------------------------------ */

const rainGlass: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  fillBg(ctx, w, h, bg0, bg1);
  const m = Math.min(w, h);
  const sp = p.speed;

  // out-of-focus city lights behind the glass
  const rj = mulberry32(p.seed);
  const lights = clamp(Math.round(10 + p.density * 6), 8, 18);
  const accents = [a1, a2, a3];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < lights; i++) {
    const bx = rj() * w;
    const by = rj() * h * 0.9;
    const r = m * (0.04 + rj() * 0.09);
    const drift = m * (0.02 + rj() * 0.05);
    const s = (0.1 + rj() * 0.25) * sp;
    const ph = rj() * TAU;
    const x = bx + Math.sin(t * s + ph) * drift;
    const y = by + Math.cos(t * s * 0.8 + ph) * drift * 0.7;
    const color = accents[i % accents.length];
    softOrb(ctx, x, y, r, color, 0.22 + p.glow * 0.1 + 0.08 * Math.sin(t * 0.8 * sp + ph * 2));
  }
  ctx.restore();

  // fast rain streaks behind the glass
  const streaks = Math.round(60 * p.density);
  const rs = mulberry32(p.seed * 3 + 1);
  ctx.save();
  ctx.strokeStyle = rgba("#ffffff", 0.16);
  ctx.lineCap = "round";
  const slant = w * 0.012;
  for (let i = 0; i < streaks; i++) {
    const x = rs() * (w + slant * 4);
    const speedFrac = 0.55 + rs() * 0.9; // relative to h per second
    const len = h * (0.05 + rs() * 0.08);
    const ph = rs();
    const y = (((t * speedFrac * sp + ph) % 1) + 1) % 1 * (h + len) - len;
    const fade = 0.5 + 0.5 * Math.sin((t * 3 + i) * sp);
    ctx.strokeStyle = rgba("#ffffff", 0.05 + fade * 0.16);
    ctx.lineWidth = (0.6 + rs() * 1.2) * (m / 430);
    ctx.beginPath();
    ctx.moveTo(x - slant, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
  ctx.restore();

  // droplets clinging to the glass — some slide down leaving trails
  const drops = clamp(Math.round(26 * p.density), 12, 46);
  const rd = mulberry32(p.seed * 7 + 3);
  for (let i = 0; i < drops; i++) {
    const bx = rd() * w;
    const r0 = (2.2 + rd() * 4.2) * (m / 430);
    const slides = rd() > 0.45; // sliding drop with trail
    const slideSpeed = (0.014 + rd() * 0.05) * sp; // h per second
    const ph = rd() * TAU;
    const cycle = h + m * 0.1;
    let y: number;
    let trail = 0;
    if (slides) {
      const prog = (((t * slideSpeed + ph) % 1) + 1) % 1;
      y = prog * cycle - m * 0.05;
      trail = r0 * 9;
    } else {
      y = rd() * h;
      // static drops tremble very slightly
      y += Math.sin(t * 2.2 * sp + ph) * r0 * 0.12;
    }
    const x = bx + (slides ? Math.sin(t * 0.9 * sp + ph) * r0 * 0.6 : 0);

    // motion trail
    if (trail > 0) {
      const tg = ctx.createLinearGradient(0, y - trail, 0, y);
      tg.addColorStop(0, rgba("#ffffff", 0));
      tg.addColorStop(1, rgba("#ffffff", 0.14));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.ellipse(x, y - trail / 2, r0 * 0.32, trail / 2, 0, 0, TAU);
      ctx.fill();
    }

    // droplet body: refractive glass bead
    const dg = ctx.createRadialGradient(x - r0 * 0.3, y - r0 * 0.35, r0 * 0.1, x, y, r0);
    dg.addColorStop(0, rgba("#ffffff", 0.5));
    dg.addColorStop(0.35, rgba("#ffffff", 0.14));
    dg.addColorStop(0.85, rgba(accents[i % 3], 0.18));
    dg.addColorStop(1, rgba("#000000", 0.28));
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(x, y, r0 * 0.82, r0, 0, 0, TAU);
    ctx.fill();
    // rim light
    ctx.strokeStyle = rgba("#ffffff", 0.35);
    ctx.lineWidth = r0 * 0.16;
    ctx.beginPath();
    ctx.arc(x, y, r0 * 0.78, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // glass vignette + bottom fog
  const vig = ctx.createRadialGradient(w / 2, h / 2, m * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const fog = ctx.createLinearGradient(0, h * 0.8, 0, h);
  fog.addColorStop(0, rgba(bg1, 0));
  fog.addColorStop(1, rgba(bg1, 0.4));
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
};

/* ------------------------------------------------------------------ */
/* 12 · Orbit Bloom                                                    */
/* ------------------------------------------------------------------ */

const orbitBloom: DrawFn = (ctx, w, h, t, p) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const cx = w / 2;
  const cy = h * 0.42;
  const sp = p.speed;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.72);
  g.addColorStop(0, bg1);
  g.addColorStop(1, bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // breathing core
  const coreR = m * (0.055 + 0.01 * Math.sin(t * 1.6 * sp));
  softOrb(ctx, cx, cy, coreR * 4.2, a1, 0.34 + p.glow * 0.14);
  glowDot(ctx, cx, cy, coreR, shade(a1, 0.5), 26 * p.glow, 0.95);

  // orbiting bodies with elliptical paths + fading trails
  const accents = [a1, a2, a3];
  const planets = clamp(Math.round(4 + p.density * 3), 4, 8);
  const rand = mulberry32(p.seed);
  for (let i = 0; i < planets; i++) {
    const rx = m * (0.16 + (i / planets) * 0.3);
    const ry = rx * (0.32 + rand() * 0.12);
    const tilt = (rand() - 0.5) * 0.5;
    const s = ((0.25 + rand() * 0.4) / (1 + i * 0.18)) * sp;
    const ph = rand() * TAU;
    const ang = t * s * TAU * 0.35 + ph;
    const size = (2.2 + rand() * 3.4) * (m / 430);
    const color = accents[i % 3];

    // path guide
    ctx.strokeStyle = rgba(color, 0.1);
    ctx.lineWidth = m / 850;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, tilt, 0, TAU);
    ctx.stroke();

    // trail: fading arc segments behind the body
    const segs = 9;
    const span = 1.1; // radians of trail
    ctx.lineCap = "round";
    for (let k = 0; k < segs; k++) {
      const a0 = ang - (span * (k + 1)) / segs;
      const a1s = ang - (span * k) / segs;
      ctx.strokeStyle = rgba(color, (1 - k / segs) * 0.4);
      ctx.lineWidth = size * (1 - k / segs) * 0.9;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, tilt, a0, a1s);
      ctx.stroke();
    }

    // the body — brighter when passing "in front" (lower half of ellipse)
    const front = Math.sin(ang) > 0 ? 1 : 0.72;
    const x = cx + Math.cos(ang) * rx * Math.cos(tilt) - Math.sin(ang) * ry * Math.sin(tilt);
    const y = cy + Math.cos(ang) * rx * Math.sin(tilt) + Math.sin(ang) * ry * Math.cos(tilt);
    ctx.save();
    ctx.globalAlpha = front;
    glowDot(ctx, x, y, size, color, 16 * p.glow, 0.9);
    ctx.restore();
  }

  // stardust
  const rs = mulberry32(p.seed + 17);
  const dust = Math.round(40 * p.density);
  for (let i = 0; i < dust; i++) {
    const x = rs() * w;
    const y = rs() * h;
    const ph = rs() * TAU;
    const r = (0.35 + rs() * 0.8) * (m / 430);
    ctx.fillStyle = rgba("#ffffff", Math.abs(Math.sin(t * (0.7 + rs()) * sp + ph)) * 0.4);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
};

/* ------------------------------------------------------------------ */
/* registry — 12 foundational scenes (the catalog expands these into   */
/* many named variants; see catalog.ts)                                */
/* ------------------------------------------------------------------ */

export const BASE_WALLPAPERS: WallpaperDef[] = [
  {
    id: "aurora-veil",
    name: "Aurora Veil",
    tagline: "Silky light ribbons dancing over a sleepy sky",
    category: "Nature",
    icon: "🌌",
    heroTime: 2.4,
    palettes: [
      { name: "Emerald Night", colors: ["#0c0a14", "#071710", "#3dffa0", "#8b5cf6", "#f472b6"] },
      { name: "Polar Rose", colors: ["#120a14", "#1a0b18", "#ff7ac6", "#b78cff", "#7cffcb"] },
      { name: "Solar Storm", colors: ["#140d08", "#0d1410", "#ffb347", "#ff5e7e", "#9dff70"] },
      { name: "Amethyst", colors: ["#0e0a18", "#150b20", "#a78bfa", "#f0abfc", "#5eead4"] },
      { name: "Mint Horizon", colors: ["#071410", "#0a1a14", "#4ade80", "#fbbf24", "#f87171"] },
    ],
    draw: auroraVeil,
  },
  {
    id: "starfall",
    name: "Starfall",
    tagline: "Twinkling constellations and the occasional wish",
    category: "Nature",
    icon: "🌙",
    heroTime: 3.7,
    palettes: [
      { name: "Deep Violet", colors: ["#0a0812", "#1c1230", "#e9d5ff", "#fbbf24", "#f0abfc"] },
      { name: "Rose Dusk", colors: ["#170a12", "#331226", "#ffe4e6", "#fda4af", "#f9a8d4"] },
      { name: "Forest Night", colors: ["#07100c", "#12281c", "#ecfccb", "#fcd34d", "#86efac"] },
      { name: "Ember Sky", colors: ["#140806", "#2e100a", "#fed7aa", "#fb923c", "#fbbf24"] },
    ],
    draw: starfall,
  },
  {
    id: "tidal-waves",
    name: "Tidal Waves",
    tagline: "Endless ocean layers rolling into a warm horizon",
    category: "Nature",
    icon: "🌊",
    heroTime: 1.2,
    palettes: [
      { name: "Peach Sunset", colors: ["#241033", "#ff8f6b", "#ff5e7e", "#ffb347", "#3d1d4e"] },
      { name: "Coral Lagoon", colors: ["#33101e", "#ff7e6b", "#ff4d6d", "#ffa869", "#40142a"] },
      { name: "Emerald Sea", colors: ["#082620", "#f4c26b", "#0f9b76", "#63e6a5", "#06251f"] },
      { name: "Golden Hour", colors: ["#301b0c", "#ffc46b", "#e86a33", "#ffd166", "#3a1f10"] },
    ],
    draw: tidalWaves,
  },
  {
    id: "alpine-dusk",
    name: "Alpine Dusk",
    tagline: "Layered peaks breathing under a glowing dusk",
    category: "Nature",
    icon: "⛰️",
    heroTime: 0.8,
    palettes: [
      { name: "Amber Peaks", colors: ["#1d0f22", "#ff9e64", "#ffd9a0", "#4a2545", "#2b1220"] },
      { name: "Rose Ridge", colors: ["#200d18", "#ff8fab", "#ffe3ec", "#5c2a3e", "#2b1220"] },
      { name: "Matcha Hills", colors: ["#0f1a12", "#d9f099", "#fff7c2", "#37503a", "#172418"] },
      { name: "Plum Dusk", colors: ["#170d24", "#c86dd7", "#ffd1ff", "#452757", "#221335"] },
    ],
    draw: alpineDusk,
  },
  {
    id: "particle-bloom",
    name: "Particle Bloom",
    tagline: "A living constellation linking drift into patterns",
    category: "Abstract",
    icon: "✨",
    heroTime: 1.5,
    palettes: [
      { name: "Rose Quartz", colors: ["#0e0a10", "#241322", "#ff8fab", "#ffd166", "#b78cff"] },
      { name: "Aurora Dust", colors: ["#07110d", "#0f2420", "#5eead4", "#f472b6", "#fbbf24"] },
      { name: "Copper Field", colors: ["#120b08", "#2b1a10", "#fb923c", "#fcd34d", "#ff5e7e"] },
      { name: "Orchid Net", colors: ["#120a18", "#2a1636", "#e879f9", "#c4b5fd", "#fda4af"] },
    ],
    draw: particleBloom,
  },
  {
    id: "liquid-dreams",
    name: "Liquid Dreams",
    tagline: "Weightless color orbs melting into each other",
    category: "Dreamy",
    icon: "🫧",
    heroTime: 2.0,
    palettes: [
      { name: "Nebula", colors: ["#0a0714", "#170f2b", "#a78bfa", "#f472b6", "#5eead4"] },
      { name: "Magma", colors: ["#160607", "#2b0d10", "#ff5e5e", "#ffb347", "#ff2e63"] },
      { name: "Emerald Silk", colors: ["#06120d", "#0d2618", "#34d399", "#a7f3d0", "#fde68a"] },
      { name: "Orchid Haze", colors: ["#150a16", "#2b1230", "#f0abfc", "#e879f9", "#fbbf24"] },
    ],
    draw: liquidDreams,
  },
  {
    id: "neon-horizon",
    name: "Neon Horizon",
    tagline: "Retro-future grid running into a striped sun",
    category: "Retro",
    icon: "🌇",
    heroTime: 2.8,
    palettes: [
      { name: "Miami", colors: ["#1f0a33", "#ff4d8f", "#ffd166", "#ff9e64", "#3dffa0"] },
      { name: "Tokyo Drive", colors: ["#12081f", "#e84393", "#ffe66d", "#ff8f6b", "#64ffda"] },
      { name: "Vice Garden", colors: ["#1c0b2e", "#c86dd7", "#fff5b8", "#ff7ac6", "#7cffb2"] },
    ],
    draw: neonHorizon,
  },
  {
    id: "firefly-grove",
    name: "Firefly Grove",
    tagline: "Warm sparks drifting through the summer dark",
    category: "Nature",
    icon: "🐞",
    heroTime: 1.9,
    palettes: [
      { name: "Summer Night", colors: ["#060d08", "#0e2012", "#d4ff5e", "#ffe97a", "#1c3322"] },
      { name: "Amber Dusk", colors: ["#0d0906", "#241505", "#ffbf47", "#ff8f5e", "#2e1c0a"] },
      { name: "Fairy Rose", colors: ["#0d060c", "#241020", "#ff9ff3", "#ffd166", "#2e1230"] },
    ],
    draw: fireflyGrove,
  },
  {
    id: "petal-drift",
    name: "Petal Drift",
    tagline: "Soft petals swaying down a pastel breeze",
    category: "Dreamy",
    icon: "🌸",
    heroTime: 1.4,
    palettes: [
      { name: "Sakura", colors: ["#ffeef2", "#ffd6de", "#ff8fab", "#ffb7c5", "#e5637f"] },
      { name: "Peach Blossom", colors: ["#fff3e8", "#ffdcb8", "#ff9e7a", "#ffc49e", "#e07a5f"] },
      { name: "Cream Gardenia", colors: ["#fdf8ee", "#f7e8c8", "#e9c46a", "#f4a261", "#c97b4a"] },
      { name: "Lilac Fall", colors: ["#f5effa", "#e3d3f5", "#b78cff", "#d8b8ff", "#8d5fb8"] },
    ],
    draw: petalDrift,
  },
  {
    id: "solaris-mandala",
    name: "Solaris Mandala",
    tagline: "A hypnotic geometric relic forever turning",
    category: "Geometric",
    icon: "🔮",
    heroTime: 0.9,
    palettes: [
      { name: "Sun Temple", colors: ["#140a06", "#2b130a", "#ffb347", "#ff5e7e", "#ffd166"] },
      { name: "Jade Sigil", colors: ["#071310", "#0f2b22", "#5eead4", "#a7f3d0", "#fbbf24"] },
      { name: "Rosetta", colors: ["#170a12", "#2e1020", "#ff8fab", "#f0abfc", "#ffe0ac"] },
    ],
    draw: solarisMandala,
  },
  {
    id: "rain-glass",
    name: "Rain Glass",
    tagline: "Raindrops sliding down a window over city lights",
    category: "Dreamy",
    icon: "🌧️",
    heroTime: 2.6,
    palettes: [
      { name: "City Night", colors: ["#0e0b12", "#1a1420", "#ffb86b", "#ff6b9d", "#ffd9a0"] },
      { name: "Neon Alley", colors: ["#120818", "#221030", "#ff5e7e", "#9dff70", "#ffb347"] },
      { name: "Cozy Cafe", colors: ["#140e08", "#241708", "#ffbf47", "#ff8f5e", "#ffe3b3"] },
      { name: "Storm Violet", colors: ["#0d0a16", "#1c1330", "#b78cff", "#f472b6", "#a78bfa"] },
    ],
    draw: rainGlass,
  },
  {
    id: "orbit-bloom",
    name: "Orbit Bloom",
    tagline: "Glowing worlds tracing quiet ellipses around a star",
    category: "Abstract",
    icon: "🪐",
    heroTime: 1.8,
    palettes: [
      { name: "Solar Family", colors: ["#0d0906", "#1d1108", "#ffb347", "#ff5e7e", "#ffd166"] },
      { name: "Lavender Void", colors: ["#0e0a16", "#1a1230", "#b78cff", "#f0abfc", "#5eead4"] },
      { name: "Emerald Orbit", colors: ["#071310", "#0e2620", "#5eead4", "#a7f3d0", "#fbbf24"] },
      { name: "Rose Nebula", colors: ["#150a12", "#2a1024", "#ff8fab", "#f0abfc", "#ffe0ac"] },
    ],
    draw: orbitBloom,
  },
];
