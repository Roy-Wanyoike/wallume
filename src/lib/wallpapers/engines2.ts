/**
 * Wallume interactive engine families v2.
 * These scenes read the optional DrawEnv and react to touch/cursor:
 * fish scatter, jellies repel, fireworks launch, ink blooms, lightning
 * strikes… Every scene stays deterministic when env is absent, so
 * static high-res exports keep working unchanged.
 *
 * Palette convention: colors = [bgTop, bgBottom, accent1, accent2, accent3]
 */
import type { DrawFn } from "./types";
import {
  TAU,
  mulberry32,
  rgba,
  shade,
  clamp,
  lerp,
  fillBg,
  glowDot,
  softOrb,
  canvasState,
  areaScale,
  pointerPx,
} from "./helpers";

/* ------------------------------------------------------------------ */
/* 13 · Aquarium — touch makes the fish scatter                        */
/* ------------------------------------------------------------------ */

type Fish = {
  ph: number;
  size: number;
  c: number;
  z: number;
  vx: number;
  vy: number;
  x0: number;
  y0: number;
  ox: number;
  oy: number;
  panic: number;
};

type FishState = { fish: Fish[]; bubbles: { x: number; y: number; r: number; sp: number; ph: number }[] };

const aquarium: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const rnd = mulberry32(p.seed);
  const sp = p.speed;
  const count = Math.round(clamp(9 * p.density * areaScale(w, h), 4, 22));

  fillBg(ctx, w, h, shade(bg0, -0.25), bg1);

  // drifting light pools near the surface
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const lx = w * (0.2 + 0.3 * i) + Math.sin(t * 0.18 * sp + i * 2.2) * w * 0.08;
    softOrb(ctx, lx, h * 0.1, m * 0.5, i % 2 ? a2 : a3, 0.05 + p.glow * 0.03);
  }
  ctx.restore();

  // god rays
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const rx = w * (0.12 + 0.24 * i) + Math.sin(t * 0.14 * sp + i * 1.7) * w * 0.03;
    const g = ctx.createLinearGradient(rx, 0, rx + m * 0.12, h * 0.8);
    g.addColorStop(0, rgba("#ffffff", 0.1 + p.glow * 0.05));
    g.addColorStop(1, rgba("#ffffff", 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(rx - m * 0.02, 0);
    ctx.lineTo(rx + m * 0.05, 0);
    ctx.lineTo(rx + m * 0.16, h * 0.85);
    ctx.lineTo(rx - m * 0.09, h * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // sandy floor + swaying kelp
  const floorY = h * 0.9;
  const sand = ctx.createLinearGradient(0, floorY - m * 0.05, 0, h);
  sand.addColorStop(0, rgba(shade(a3, -0.55), 0.5));
  sand.addColorStop(1, rgba(shade(bg0, -0.4), 0.9));
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, floorY + m * 0.01);
  for (let x = 0; x <= w; x += Math.max(8, w / 24)) {
    ctx.lineTo(x, floorY + Math.sin(x * 0.02 + p.seed) * m * 0.015);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const kelpN = Math.round(clamp(5 * p.density, 3, 9));
  for (let i = 0; i < kelpN; i++) {
    const kx = rnd() * w;
    const len = m * (0.16 + rnd() * 0.2);
    const sway = Math.sin(t * 0.7 * sp + i * 1.3 + p.seed) * m * 0.045;
    const dark = shade(a3, -0.62);
    ctx.strokeStyle = rgba(dark, 0.75);
    ctx.lineCap = "round";
    for (const [wd, reach] of [[m * 0.014, 1], [m * 0.008, 0.96]] as const) {
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(kx, floorY + m * 0.01);
      ctx.bezierCurveTo(
        kx + sway * 0.3, floorY - len * 0.4,
        kx + sway * 0.8, floorY - len * 0.75,
        kx + sway, floorY - len * reach,
      );
      ctx.stroke();
    }
  }

  const st = canvasState<FishState>(ctx, `aq${p.seed}|${p.density}|${count}`, () => {
    const r = mulberry32(p.seed * 7 + 13);
    const fish: Fish[] = [];
    for (let i = 0; i < count; i++) {
      fish.push({
        ph: r() * TAU,
        size: m * (0.018 + r() * 0.032),
        c: Math.floor(r() * 3),
        z: 0.55 + r() * 0.85,
        vx: (r() < 0.5 ? -1 : 1) * (0.02 + r() * 0.045),
        vy: (r() - 0.5) * 0.012,
        x0: r(),
        y0: 0.12 + r() * 0.68,
        ox: 0,
        oy: 0,
        panic: 0,
      });
    }
    const bubbles = [];
    for (let i = 0; i < 22; i++) {
      bubbles.push({ x: r(), y: r(), r: 0.004 + r() * 0.01, sp: 0.05 + r() * 0.1, ph: r() * TAU });
    }
    return { fish, bubbles };
  });

  // ambient bubbles
  ctx.save();
  for (const b of st.bubbles) {
    const by = h + m * 0.05 - (((t * b.sp * sp * m + b.y * h) % (h + m * 0.1)));
    const bx = b.x * w + Math.sin(t * 1.4 * sp + b.ph) * m * 0.012;
    ctx.strokeStyle = rgba("#ffffff", 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, b.r * m, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  const ptr = pointerPx(env, w, h);
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const fleeR = m * 0.24;

  // fish — sorted by depth so near fish overlap far fish
  const fish = [...st.fish].sort((a, b) => a.z - b.z);
  for (const f of fish) {
    const pad = f.size * 2.4;
    const bx = ((f.x0 * w + f.vx * t * sp * m * 0.14) % (w + pad * 2) + w + pad * 2) % (w + pad * 2) - pad;
    const by =
      ((f.y0 * h + f.vy * t * sp * m * 0.14) % (h + pad * 2) + h + pad * 2) % (h + pad * 2) - pad +
      Math.sin(t * 0.8 * sp + f.ph) * m * 0.02;

    if (ptr) {
      const dx = bx + f.ox - ptr.x;
      const dy = by + f.oy - ptr.y;
      const dist = Math.hypot(dx, dy);
      if (dist < fleeR) {
        const force = (1 - dist / fleeR) * (ptr.down ? 3.4 : 2.2);
        f.ox += (dx / (dist || 1)) * force * m * 0.02 * dt * 60 * 0.14;
        f.oy += (dy / (dist || 1)) * force * m * 0.02 * dt * 60 * 0.14;
        f.panic = Math.min(1.6, f.panic + force * dt * 6);
      }
    }
    f.panic *= Math.exp(-dt * 1.6);
    const decay = Math.exp(-dt * 0.9);
    f.ox *= decay;
    f.oy *= decay;

    const x = bx + f.ox;
    const y = by + f.oy;
    const dir = f.vx >= 0 ? 1 : -1;
    const wag = Math.sin(t * (7 + f.panic * 9) * sp + f.ph);
    const size = f.size * f.z;
    const color = [a1, a2, a3][f.c];
    const alpha = 0.55 + f.z * 0.4;

    ctx.save();
    ctx.translate(x, y);
    if (ptr) {
      // while panicking, lean away from the pointer
      const away = Math.atan2(y - ptr.y, x - ptr.x);
      const lean = clamp(f.panic, 0, 1) * 0.5;
      ctx.rotate(dir > 0 ? -away * 0 : 0);
      void lean;
      void away;
    }
    ctx.scale(dir * (1 + f.panic * 0.12), 1);

    // speed lines when scared
    if (f.panic > 0.25) {
      ctx.strokeStyle = rgba("#ffffff", f.panic * 0.2);
      ctx.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(-size * 1.4, (-0.4 + s * 0.4) * size);
        ctx.lineTo(-size * (2.2 + f.panic), (-0.4 + s * 0.4) * size);
        ctx.stroke();
      }
    }

    // body
    ctx.fillStyle = rgba(color, alpha * 0.9);
    ctx.shadowColor = rgba(color, 0.5);
    ctx.shadowBlur = 10 * p.glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    // tail
    ctx.fillStyle = rgba(color, alpha * 0.75);
    ctx.beginPath();
    ctx.moveTo(-size * 0.85, 0);
    ctx.lineTo(-size * 1.5, size * (0.34 + wag * 0.22));
    ctx.lineTo(-size * 1.5, size * (-0.34 + wag * 0.22));
    ctx.closePath();
    ctx.fill();

    // dorsal fin + stripe
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.36);
    ctx.quadraticCurveTo(size * 0.12, -size * 0.72, size * 0.34, -size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(shade(color, 0.4), alpha * 0.5);
    ctx.beginPath();
    ctx.ellipse(size * 0.15, 0, size * 0.28, size * 0.16, 0, 0, TAU);
    ctx.fill();

    // eye
    ctx.fillStyle = rgba("#ffffff", 0.95);
    ctx.beginPath();
    ctx.arc(size * 0.62, -size * 0.08, size * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba("#0b0b12", 0.95);
    ctx.beginPath();
    ctx.arc(size * 0.66, -size * 0.08, size * 0.055, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
};

/* ------------------------------------------------------------------ */
/* 14 · Jelly Realm — glowing jellies drift away from your touch       */
/* ------------------------------------------------------------------ */

type Jelly = { ph: number; size: number; c: number; x0: number; rise: number; ox: number; oy: number };

const jellyRealm: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  const rnd = mulberry32(p.seed);
  const st = canvasState<{ jellies: Jelly[] }>(ctx, `jl${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed * 3 + 5);
    const n = Math.round(clamp(7 * p.density * areaScale(w, h), 4, 14));
    const jellies: Jelly[] = [];
    for (let i = 0; i < n; i++) {
      jellies.push({
        ph: r() * TAU,
        size: m * (0.05 + r() * 0.075),
        c: Math.floor(r() * 3),
        x0: 0.12 + r() * 0.76,
        rise: 0.5 + r() * 0.7,
        ox: 0,
        oy: 0,
      });
    }
    return { jellies };
  });

  // plankton motes
  const motes = Math.round(50 * p.density * areaScale(w, h));
  for (let i = 0; i < motes; i++) {
    const mx = rnd() * w;
    const my = ((rnd() * h + t * sp * m * 0.008 * (0.4 + (i % 5) / 5)) % (h + 20)) - 10;
    const tw = 0.25 + 0.6 * Math.abs(Math.sin(t * (0.5 + (i % 7) * 0.14) + i));
    ctx.fillStyle = rgba("#ffffff", tw * 0.35);
    ctx.beginPath();
    ctx.arc(mx, h - my, (0.6 + (i % 3) * 0.4) * (m / 500), 0, TAU);
    ctx.fill();
  }

  const ptr = pointerPx(env, w, h);
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const jellies = [...st.jellies].sort((a, b) => a.size - b.size);

  for (const j of jellies) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 * sp + j.ph);
    const bx = j.x0 * w + Math.sin(t * 0.22 * sp + j.ph) * w * 0.06;
    const travel = h + j.size * 3;
    const by = travel - (((t * j.rise * sp * m * 0.05 + j.ph * 40) % travel)) - j.size;
    const color = [a1, a2, a3][j.c];

    if (ptr) {
      const dx = bx + j.ox - ptr.x;
      const dy = by + j.oy - ptr.y;
      const dist = Math.hypot(dx, dy);
      const R = m * 0.3;
      if (dist < R) {
        const f = (1 - dist / R) * (ptr.down ? 2.6 : 1.5);
        j.ox += (dx / (dist || 1)) * f * m * 0.012 * dt * 60 * 0.12;
        j.oy += (dy / (dist || 1)) * f * m * 0.012 * dt * 60 * 0.12;
      }
    }
    const dec = Math.exp(-dt * 1.1);
    j.ox *= dec;
    j.oy *= dec;

    const x = bx + j.ox;
    const y = by + j.oy;
    const squish = 1 + Math.sin(t * 1.6 * sp + j.ph) * 0.1;
    const bw = j.size * (1.35 - squish * 0.35) * 2;
    const bh = j.size * squish * 1.5;

    ctx.save();
    ctx.translate(x, y);

    // tentacles
    const tentN = 6;
    for (let k = 0; k < tentN; k++) {
      const tx0 = (k / (tentN - 1) - 0.5) * bw * 0.8;
      const len = j.size * (1.8 + ((k * 7919) % 100) / 100 * 1.1);
      const sway = Math.sin(t * 1.1 * sp + j.ph + k) * j.size * 0.4;
      ctx.strokeStyle = rgba(color, 0.3);
      ctx.lineWidth = Math.max(1, j.size * 0.05);
      ctx.beginPath();
      ctx.moveTo(tx0, bh * 0.5);
      ctx.bezierCurveTo(
        tx0 + sway * 0.4, bh * 0.5 + len * 0.35,
        tx0 - sway * 0.4, bh * 0.5 + len * 0.7,
        tx0 + sway, bh * 0.5 + len,
      );
      ctx.stroke();
    }

    // bell
    const g = ctx.createRadialGradient(0, -bh * 0.1, 0, 0, 0, bw * 0.65);
    g.addColorStop(0, rgba(shade(color, 0.55), 0.85));
    g.addColorStop(0.45, rgba(color, 0.5));
    g.addColorStop(1, rgba(color, 0.05));
    ctx.fillStyle = g;
    ctx.shadowColor = rgba(color, 0.6);
    ctx.shadowBlur = 22 * p.glow;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, 0);
    ctx.bezierCurveTo(-bw / 2, -bh * 1.15, bw / 2, -bh * 1.15, bw / 2, 0);
    // scalloped bottom edge
    for (let k = 3; k >= 0; k--) {
      const xk = (-bw / 2) + (bw * (k + 0.5)) / 4;
      ctx.quadraticCurveTo(xk, bh * 0.18, (-bw / 2) + (bw * k) / 4, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // inner organ glow
    ctx.globalCompositeOperation = "lighter";
    softOrb(ctx, 0, -bh * 0.18, bw * 0.24, shade(color, 0.6), 0.5);
    ctx.restore();
  }
};

/* ------------------------------------------------------------------ */
/* 15 · Fireworks — tap the sky to launch a shell                      */
/* ------------------------------------------------------------------ */

type Rocket = { x: number; y: number; vy: number; ty: number; c: number };
type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; t0: number; life: number; c: number; r: number };

const fireworks: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;

  // night sky + city silhouette
  fillBg(ctx, w, h, bg0, bg1);
  const rnd0 = mulberry32(p.seed);
  const stars = Math.round(60 * p.density);
  for (let i = 0; i < stars; i++) {
    const sx = rnd0() * w;
    const sy = rnd0() * h * 0.6;
    const tw = 0.3 + 0.6 * Math.abs(Math.sin(t * (0.5 + rnd0()) * sp + i));
    ctx.fillStyle = rgba("#ffffff", tw * 0.6);
    ctx.fillRect(sx, sy, 1.4, 1.4);
  }
  const skyline = shade(bg0, -0.5);
  ctx.fillStyle = skyline;
  const rr = mulberry32(p.seed + 77);
  let bx = 0;
  while (bx < w) {
    const bw = w * (0.03 + rr() * 0.07);
    const bh = h * (0.05 + rr() * 0.13);
    ctx.fillRect(bx, h - bh, bw + 1, bh);
    // lit windows
    if (rr() < 0.8) {
      for (let wy = h - bh + m * 0.015; wy < h - m * 0.02; wy += m * 0.028) {
        for (let wx = bx + m * 0.008; wx < bx + bw - m * 0.008; wx += m * 0.02) {
          if (rr() < 0.28) {
            ctx.fillStyle = rgba(shade(a1, 0.2), 0.5);
            ctx.fillRect(wx, wy, m * 0.006, m * 0.009);
            ctx.fillStyle = skyline;
          }
        }
      }
    }
    bx += bw + w * 0.008;
  }

  type FwState = {
    next: number; rockets: Rocket[]; sparks: Spark[]; flash: number;
  };
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const st = canvasState<FwState>(ctx, `fw${p.seed}|${p.density}|${p.speed.toFixed(2)}`, () => ({
    next: t + 0.4,
    rockets: [],
    sparks: [],
    flash: 0,
  }));

  const gravity = m * 0.16;
  const accents = [a1, a2, a3];

  const explode = (x: number, y: number, c: number, scale = 1) => {
    const n = Math.round(clamp(64 * p.density, 40, 110));
    const r = mulberry32(Math.floor(x * 31 + y * 17 + t * 1000));
    const base = r() * TAU;
    for (let i = 0; i < n; i++) {
      const ring = i % 3 === 0 ? 0.55 : 1;
      const ang = base + (i / n) * TAU + r() * 0.25;
      const v = (0.35 + r() * 0.75) * m * 0.28 * ring * scale;
      st.sparks.push({
        x, y, px: x, py: y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        t0: t + r() * 0.06,
        life: 0.8 + r() * 0.9,
        c: (c + (r() < 0.3 ? 1 : 0)) % 3,
        r: 1 + r() * 2.2,
      });
    }
    st.flash = Math.min(1, st.flash + 0.35);
  };

  if (env) {
    // scheduled auto-show
    while (st.next <= t) {
      const idx = Math.floor(st.next * 13);
      const r = mulberry32(p.seed + idx * 991);
      st.rockets.push({
        x: w * (0.15 + r() * 0.7),
        y: h + 10,
        vy: -m * (0.5 + r() * 0.16),
        ty: h * (0.16 + r() * 0.3),
        c: Math.floor(r() * 3),
      });
      st.next += (1.1 + r() * 1.4) / Math.max(0.2, sp);
      if (st.rockets.length > 8) break;
    }
    // user-launched shells
    for (const tap of env.pointer.taps) {
      st.rockets.push({
        x: clamp(tap.x * w, m * 0.05, w - m * 0.05),
        y: h + 10,
        vy: -m * 0.75,
        ty: clamp(tap.y * h, h * 0.08, h * 0.7),
        c: Math.floor(Math.random() * 3),
      });
    }
  }

  // integrate + draw rockets
  for (let i = st.rockets.length - 1; i >= 0; i--) {
    const r = st.rockets[i];
    r.py = r.y;
    r.y += r.vy * dt * Math.max(0.4, sp);
    r.vy += gravity * dt * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glowDot(ctx, r.x, r.y, 2.2, "#ffe9c9", 12 * p.glow, 0.95);
    ctx.strokeStyle = rgba("#ffcf8f", 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x, r.y + m * 0.05);
    ctx.stroke();
    ctx.restore();
    if (r.y <= r.ty) {
      explode(r.x, r.y, r.c);
      st.rockets.splice(i, 1);
    }
  }

  // integrate + draw sparks
  if (st.sparks.length > 900) st.sparks.splice(0, st.sparks.length - 900);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = st.sparks.length - 1; i >= 0; i--) {
    const s = st.sparks[i];
    const age = t - s.t0;
    if (age < 0) continue;
    if (age > s.life) {
      st.sparks.splice(i, 1);
      continue;
    }
    s.px = s.x;
    s.py = s.y;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += gravity * dt;
    const drag = Math.exp(-dt * 0.9);
    s.vx *= drag;
    s.vy *= drag;
    const fade = 1 - age / s.life;
    const twinkle = 0.55 + 0.45 * Math.sin(age * 30 + i);
    const col = accents[s.c];
    ctx.strokeStyle = rgba(col, fade * 0.85 * twinkle);
    ctx.lineWidth = Math.max(1, s.r * fade);
    ctx.beginPath();
    ctx.moveTo(s.px, s.py);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    if (i % 4 === 0) glowDot(ctx, s.x, s.y, s.r * fade * 0.8, col, 8 * p.glow, fade * twinkle);
  }
  ctx.restore();

  // flash + afterglow
  if (st.flash > 0.01) {
    ctx.fillStyle = rgba("#ffffff", st.flash * 0.09 * p.glow);
    ctx.fillRect(0, 0, w, h);
    st.flash *= Math.exp(-dt * 4.5);
  }

  // static-mode hero frame: two frozen bursts
  if (!env) {
    const r = mulberry32(p.seed + Math.floor(p.glow * 100));
    for (let b = 0; b < 2; b++) {
      const x = w * (0.3 + r() * 0.4);
      const y = h * (0.2 + r() * 0.25);
      const col = accents[b % 3];
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * TAU;
        const v = m * (0.12 + (i % 3) * 0.05);
        const x2 = x + Math.cos(ang) * v;
        const y2 = y + Math.sin(ang) * v + m * 0.04;
        glowDot(ctx, x2, y2, 1.6, col, 10 * p.glow, 0.8);
      }
      ctx.restore();
    }
  }
};

/* ------------------------------------------------------------------ */
/* 16 · Ink Bloom — tap to drop fresh ink on wet paper                 */
/* ------------------------------------------------------------------ */

type Bloom = { x: number; y: number; t0: number; c: number; arms: number[]; maxR: number };

const inkBloom: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  fillBg(ctx, w, h, bg0, bg1);

  type InkState = { blooms: Bloom[]; next: number; idx: number };
  const st = canvasState<InkState>(ctx, `ink${p.seed}|${p.density}|${p.speed.toFixed(2)}`, () => {
    const blooms: Bloom[] = [];
    if (!env) {
      // static hero: a few settled blooms
      const r = mulberry32(p.seed + 5);
      for (let i = 0; i < 3; i++) {
        const arms: number[] = [];
        for (let k = 0; k < 9; k++) arms.push(0.6 + r() * 0.8);
        blooms.push({
          x: w * (0.25 + r() * 0.5), y: h * (0.2 + r() * 0.55),
          t0: -10, c: Math.floor(r() * 3),
          arms, maxR: m * (0.12 + r() * 0.14),
        });
      }
    }
    return { blooms, next: t + 0.6, idx: 0 };
  });

  const accents = [a1, a2, a3];

  const spawnBloom = (x: number, y: number, c: number) => {
    const r = mulberry32(Math.floor(x * 7 + y * 13 + t * 31 + p.seed));
    const arms: number[] = [];
    for (let k = 0; k < 9; k++) arms.push(0.55 + r() * 0.85);
    st.blooms.push({ x, y, t0: t, c, arms, maxR: m * (0.1 + r() * 0.16) });
    if (st.blooms.length > 10) st.blooms.shift();
  };

  if (env) {
    const interval = 2.8 / Math.max(0.3, p.speed);
    while (st.next <= t) {
      const r = mulberry32(p.seed + st.idx * 37);
      spawnBloom(w * (0.15 + r() * 0.7), h * (0.15 + r() * 0.65), Math.floor(r() * 3));
      st.idx++;
      st.next += interval;
    }
    for (const tap of env.pointer.taps) {
      spawnBloom(tap.x * w, tap.y * h, Math.floor(Math.random() * 3));
    }
  }

  ctx.save();
  for (const b of st.blooms) {
    const age = Math.max(0, t - b.t0);
    const grow = 1 - Math.exp(-age * 1.15);
    const fade = clamp(2.2 - age * 0.32, 0, 1) * 0.9;
    if (fade <= 0.01) continue;
    const col = accents[b.c];
    const ink = shade(col, -0.55);
    const R = b.maxR * grow;

    // layered organic blob
    for (let layer = 0; layer < 3; layer++) {
      const lr = R * (1 - layer * 0.26);
      ctx.beginPath();
      for (let k = 0; k <= 9; k++) {
        const ang = (k / 9) * TAU;
        const rr2 = lr * b.arms[k % 9] * (1 + Math.sin(t * 0.5 + k + layer) * 0.04);
        const px = b.x + Math.cos(ang) * rr2;
        const py = b.y + Math.sin(ang) * rr2 * 0.92 - layer * m * 0.01;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.quadraticCurveTo(
          b.x + Math.cos(ang - TAU / 18) * rr2 * 1.08,
          b.y + Math.sin(ang - TAU / 18) * rr2 * 1.02,
          px, py,
        );
      }
      ctx.closePath();
      ctx.fillStyle = rgba(ink, fade * (0.34 - layer * 0.08));
      ctx.fill();
    }

    // tendrils
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * TAU + b.arms[k] * 2;
      const len = R * (1.3 + b.arms[(k + 3) % 9] * 0.8);
      ctx.strokeStyle = rgba(ink, fade * 0.2);
      ctx.lineWidth = Math.max(1, m * 0.004);
      ctx.beginPath();
      ctx.moveTo(b.x + Math.cos(ang) * R * 0.6, b.y + Math.sin(ang) * R * 0.6);
      ctx.quadraticCurveTo(
        b.x + Math.cos(ang + 0.4) * len * 0.8,
        b.y + Math.sin(ang + 0.4) * len * 0.8,
        b.x + Math.cos(ang + 0.15) * len,
        b.y + Math.sin(ang + 0.15) * len,
      );
      ctx.stroke();
    }
  }
  ctx.restore();

  // paper vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, m * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, rgba(shade(bg1, -0.35), 0.5));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 17 · Nebula Storm — stars bend toward your cursor                   */
/* ------------------------------------------------------------------ */

const nebulaStorm: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // nebula clouds
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const clouds: [number, number, number, string][] = [
    [0.3, 0.35, 0.85, a1],
    [0.68, 0.55, 0.7, a2],
    [0.5, 0.2, 0.5, a3],
  ];
  for (let i = 0; i < clouds.length; i++) {
    const [cx, cy, cr, col] = clouds[i];
    const x = w * cx + Math.sin(t * 0.05 * sp + i * 2) * w * 0.04;
    const y = h * cy + Math.cos(t * 0.04 * sp + i) * h * 0.03;
    const r = m * cr * (1 + Math.sin(t * 0.1 * sp + i * 1.4) * 0.05);
    softOrb(ctx, x, y, r, col, 0.13 + p.glow * 0.05);
    softOrb(ctx, x, y, r * 0.45, shade(col, 0.3), 0.1 + p.glow * 0.05);
  }
  ctx.restore();

  const ptr = pointerPx(env, w, h);
  const pullR = m * 0.38;

  // star layers with cursor gravity
  const rnd = mulberry32(p.seed);
  const n = Math.round(130 * p.density * areaScale(w, h));
  for (let i = 0; i < n; i++) {
    const z = 0.3 + rnd() * 0.7;
    let x = rnd() * w;
    let y = rnd() * h;
    // gentle parallax with pointer
    if (ptr) {
      const dx = ptr.x - x;
      const dy = ptr.y - y;
      const d = Math.hypot(dx, dy);
      if (d < pullR) {
        const pull = (1 - d / pullR) * m * 0.045 * z * (ptr.down ? 1.8 : 1);
        x += (dx / (d || 1)) * pull;
        y += (dy / (d || 1)) * pull;
      }
      x += env!.pointer.x * 8 * z;
      y += env!.pointer.y * 8 * z;
    }
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.4 + z) * sp + i * 1.7));
    ctx.fillStyle = rgba(i % 9 === 0 ? a1 : "#ffffff", tw * (0.3 + z * 0.6));
    ctx.beginPath();
    ctx.arc(x, y, z * 1.4 * (m / 500) + 0.3, 0, TAU);
    ctx.fill();
  }

  // periodic shooting star (deterministic)
  const interval = 3.6 / Math.max(0.3, sp);
  const cycle = Math.floor(t / interval);
  const age = t - cycle * interval;
  if (age < 0.9) {
    const r = mulberry32(p.seed + cycle);
    const x0 = r() * w * 0.8;
    const y0 = r() * h * 0.3;
    const prog = age / 0.9;
    const mx = x0 + prog * w * 0.35;
    const my = y0 + prog * h * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba("#ffffff", (1 - prog) * 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx - w * 0.1, my - h * 0.065);
    ctx.stroke();
    glowDot(ctx, mx, my, 2, "#ffffff", 10 * p.glow, 1);
    ctx.restore();
  }
};

/* ------------------------------------------------------------------ */
/* 18 · Plasma Orbs — living light follows your finger                 */
/* ------------------------------------------------------------------ */

const plasmaOrbs: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // faint drifting dust
  const rnd = mulberry32(p.seed);
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const x = (rnd() * w + t * sp * m * 0.004 * (rnd() > 0.5 ? 1 : -1) + w) % w;
    const y = rnd() * h;
    ctx.fillStyle = rgba("#ffffff", 0.08);
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.restore();

  type PlasState = { pulse: number };
  const st = canvasState<PlasState>(ctx, `pl${p.seed}`, () => ({ pulse: 0 }));
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  if (env && env.pointer.taps.length > 0) st.pulse = 1;
  st.pulse *= Math.exp(-dt * 2.2);

  const ptr = pointerPx(env, w, h);
  const orbsN = Math.round(clamp(8 * p.density, 5, 13));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const accents = [a1, a2, a3];
  for (let i = 0; i < orbsN; i++) {
    const r1 = mulberry32(p.seed + i * 17);
    const ph1 = r1() * TAU;
    const ph2 = r1() * TAU;
    const ax = w * (0.18 + r1() * 0.24);
    const ay = h * (0.16 + r1() * 0.26);
    const fx = (0.2 + r1() * 0.4) * sp;
    const fy = (0.16 + r1() * 0.36) * sp;
    let x = w / 2 + Math.sin(t * fx * TAU * 0.16 + ph1) * ax;
    let y = h / 2 + Math.cos(t * fy * TAU * 0.14 + ph2) * ay;

    const color = accents[i % 3];
    const orbR = m * (0.07 + ((i * 37) % 10) / 10 * 0.075) * (1 + st.pulse * 0.18);

    // attraction with a swirl — orbs lean toward the pointer
    if (ptr) {
      const dx = ptr.x - x;
      const dy = ptr.y - y;
      const d = Math.hypot(dx, dy);
      const reach = m * 0.6;
      if (d < reach) {
        const pull = (1 - d / reach) * m * 0.14;
        const ang = Math.atan2(dy, dx) + 0.7; // swirl offset
        x += Math.cos(ang) * pull;
        y += Math.sin(ang) * pull;
      }
    }

    softOrb(ctx, x, y, orbR * 2.6, color, 0.08 + p.glow * 0.05 + st.pulse * 0.06);
    const g = ctx.createRadialGradient(x, y, 0, x, y, orbR);
    g.addColorStop(0, rgba(shade(color, 0.55), 0.85));
    g.addColorStop(0.6, rgba(color, 0.5));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, orbR, 0, TAU);
    ctx.fill();
    glowDot(ctx, x - orbR * 0.2, y - orbR * 0.2, orbR * 0.16, "#ffffff", 8 * p.glow, 0.8);
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, rgba("#000000", 0.4));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 19 · Code Rain — glyph storm that shoves away from touch            */
/* ------------------------------------------------------------------ */

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﬀﬁ0123456789ABCDEF*+-<>|=".split("");

type Col = { speed: number; len: number; off: number; c: number };
type RainState = { cols: Col[]; push: number[]; dv: number[] };

const codeRain: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  fillBg(ctx, w, h, bg0, bg1);

  const colW = Math.max(10, m * 0.033);
  const colsN = Math.min(64, Math.floor(w / colW));
  const step = colW * 1.06;
  const fontSize = colW * 0.92;

  const st = canvasState<RainState>(ctx, `cr${p.seed}|${colsN}|${p.density.toFixed(2)}`, () => {
    const r = mulberry32(p.seed);
    const cols: Col[] = [];
    const push: number[] = [];
    const dv: number[] = [];
    for (let i = 0; i < colsN; i++) {
      cols.push({
        speed: 0.5 + r() * 1.2,
        len: Math.round(6 + r() * 12 * p.density),
        off: r() * h * 1.6,
        c: r() < 0.12 ? 2 : r() < 0.5 ? 0 : 1,
      });
      push.push(0);
      dv.push(0);
    }
    return { cols, push, dv };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);
  const accents = [a1, a2, a3];

  // tap shockwave — shove column heads near the tap
  if (env) {
    for (const tap of env.pointer.taps) {
      const cx = tap.x * w;
      for (let i = 0; i < colsN; i++) {
        const d = Math.abs(i * colW + colW / 2 - cx);
        if (d < m * 0.4) {
          const f = 1 - d / (m * 0.4);
          st.dv[i] += f * m * 0.6;
          st.push[i] = Math.min(1, st.push[i] + f);
        }
      }
    }
  }

  ctx.save();
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "top";
  for (let i = 0; i < colsN; i++) {
    const col = st.cols[i];
    st.dv[i] *= Math.exp(-dt * 2.4);
    st.push[i] *= Math.exp(-dt * 1.8);
    const headY =
      (((col.off + t * col.speed * m * 0.22 * p.speed + st.dv[i]) % (h + col.len * step * 2)) +
        h + col.len * step * 2) % (h + col.len * step * 2) - col.len * step;

    // pointer repel — push heads away horizontally
    let x = i * colW;
    if (ptr) {
      const dx = x - ptr.x;
      const dy = headY - ptr.y;
      const d = Math.hypot(dx, dy);
      if (d < m * 0.22 && d > 0.001) {
        x += (dx / d) * (1 - d / (m * 0.22)) * m * 0.03;
      }
    }

    for (let g = 0; g < col.len; g++) {
      const y = headY - g * step;
      if (y < -step || y > h) continue;
      const fade = Math.pow(1 - g / col.len, 1.35);
      const chIdx =
        (Math.floor(p.seed * 7 + i * 131 + g * 17 + Math.floor(t * 2.2)) * 2654435761) % GLYPHS.length;
      const ch = GLYPHS[Math.abs(chIdx)];
      if (g === 0) {
        ctx.fillStyle = rgba("#ffffff", 0.85);
        ctx.shadowColor = rgba(accents[col.c], 0.9);
        ctx.shadowBlur = 8 * p.glow;
      } else {
        ctx.fillStyle = rgba(accents[col.c], fade * (0.16 + 0.5 * fade));
        ctx.shadowBlur = 0;
      }
      ctx.fillText(ch, x, y);
    }
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // scanline haze
  ctx.fillStyle = rgba(bg0, 0.14);
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
};

/* ------------------------------------------------------------------ */
/* 20 · Meadow Whimsy — butterflies flee your fingertip                */
/* ------------------------------------------------------------------ */

type Bfly = { ph: number; c: number; size: number; fx: number; fy: number; ox: number; oy: number; panic: number };

const meadowWhimsy: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // low warm sun
  softOrb(ctx, w * 0.7, h * 0.34, m * 0.5, a2, 0.16 + p.glow * 0.08);
  glowDot(ctx, w * 0.7, h * 0.34, m * 0.05, shade(a2, 0.4), 30 * p.glow, 0.8);

  // far hills
  ctx.fillStyle = rgba(shade(bg1, -0.35), 0.85);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  for (let x = 0; x <= w; x += w / 30) {
    ctx.lineTo(x, h * 0.72 + Math.sin(x * 0.008 + p.seed) * h * 0.035);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // grass blades (two depths)
  const blades = Math.round(clamp(70 * p.density * areaScale(w, h), 30, 130));
  for (let i = 0; i < blades; i++) {
    const r = mulberry32(p.seed + i * 13);
    const depth = i % 2;
    const gx = r() * w;
    const glen = m * (0.05 + r() * 0.09) * (depth ? 1 : 0.7);
    const sway = Math.sin(t * (1 + r()) * sp + gx * 0.02) * glen * 0.3;
    ctx.strokeStyle = rgba(shade(a3, depth ? -0.5 : -0.68), 0.8);
    ctx.lineWidth = Math.max(1, m * (depth ? 0.006 : 0.004));
    ctx.beginPath();
    ctx.moveTo(gx, h + 2);
    ctx.quadraticCurveTo(gx + sway * 0.4, h - glen * 0.6, gx + sway, h - glen);
    ctx.stroke();
  }

  type MwState = { flies: Bfly[] };
  const st = canvasState<MwState>(ctx, `mw${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed + 99);
    const n = Math.round(clamp(8 * p.density * areaScale(w, h), 4, 14));
    const flies: Bfly[] = [];
    for (let i = 0; i < n; i++) {
      flies.push({
        ph: r() * TAU,
        c: Math.floor(r() * 3),
        size: m * (0.016 + r() * 0.02),
        fx: 0.12 + r() * 0.3,
        fy: 0.1 + r() * 0.24,
        ox: 0,
        oy: 0,
        panic: 0,
      });
    }
    return { flies };
  });

  const ptr = pointerPx(env, w, h);
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const accents = [a1, a2, a3];

  for (const b of st.flies) {
    const bx = w * (0.5 + Math.sin(t * b.fx * sp * 0.35 + b.ph) * 0.36) + Math.sin(t * 2.1 * sp + b.ph * 2) * m * 0.02;
    const by = h * (0.32 + Math.sin(t * b.fy * sp * 0.3 + b.ph * 1.3) * 0.16) + Math.cos(t * 1.7 * sp + b.ph) * m * 0.02;

    if (ptr) {
      const dx = bx + b.ox - ptr.x;
      const dy = by + b.oy - ptr.y;
      const d = Math.hypot(dx, dy);
      const R = m * 0.2;
      if (d < R) {
        const f = (1 - d / R) * (ptr.down ? 3 : 2);
        b.ox += (dx / (d || 1)) * f * m * 0.016 * dt * 60 * 0.12;
        b.oy += (dy / (d || 1)) * f * m * 0.016 * dt * 60 * 0.12;
        b.panic = Math.min(1.4, b.panic + f * dt * 5);
      }
    }
    b.panic *= Math.exp(-dt * 1.8);
    const dec = Math.exp(-dt * 0.8);
    b.ox *= dec;
    b.oy *= dec;

    const x = bx + b.ox;
    const y = by + b.oy;
    const flap = Math.abs(Math.sin(t * (10 + b.panic * 14) * sp + b.ph));
    const size = b.size;
    const color = accents[b.c];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.9 * sp + b.ph) * 0.3);
    // wings
    ctx.fillStyle = rgba(color, 0.88);
    ctx.shadowColor = rgba(color, 0.5);
    ctx.shadowBlur = 8 * p.glow;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s * (0.25 + flap * 0.75), 1);
      ctx.beginPath();
      ctx.ellipse(size * 0.8, -size * 0.5, size * 0.85, size * 0.55, -0.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(size * 0.7, size * 0.45, size * 0.62, size * 0.42, 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    // body
    ctx.fillStyle = rgba(shade(color, -0.6), 0.95);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.16, size * 0.85, 0, 0, TAU);
    ctx.fill();
    // antennae
    ctx.strokeStyle = rgba(shade(color, -0.6), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(-size * 0.3, -size * 1.25);
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(size * 0.3, -size * 1.25);
    ctx.stroke();
    ctx.restore();
  }

  // fireflies
  const ffn = Math.round(16 * p.density);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < ffn; i++) {
    const r = mulberry32(p.seed * 3 + i * 7);
    const fx = (r() * w + Math.sin(t * (0.3 + r() * 0.3) * sp + i) * m * 0.05 + w) % w;
    const fy = h * (0.45 + r() * 0.45) + Math.sin(t * (0.5 + r() * 0.4) * sp + i * 2) * m * 0.03;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (1 + r()) * sp + i * 2.4));
    glowDot(ctx, fx, fy, 1.4 * (m / 430) + 0.4, shade(a2, 0.5), 10 * p.glow, tw * 0.8);
  }
  ctx.restore();
};

/* ------------------------------------------------------------------ */
/* 21 · Dusk Dunes — sweep the sky and wind whips the sand             */
/* ------------------------------------------------------------------ */

type DuneState = { wind: number; gust: number };

const duskDunes: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // stars in the upper sky
  const rnd = mulberry32(p.seed);
  const stars = Math.round(50 * p.density);
  for (let i = 0; i < stars; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h * 0.4;
    const tw = 0.25 + 0.6 * Math.abs(Math.sin(t * (0.4 + rnd() * 0.8) * sp + i));
    ctx.fillStyle = rgba("#ffffff", tw * 0.55);
    ctx.fillRect(sx, sy, 1.3, 1.3);
  }

  // low sun with haze
  const sunX = w * 0.68;
  const sunY = h * 0.46;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, sunX, sunY, m * 0.4, a2, 0.2 + p.glow * 0.1);
  ctx.restore();
  ctx.fillStyle = rgba(shade(a2, 0.45), 0.95);
  ctx.beginPath();
  ctx.arc(sunX, sunY, m * 0.075, 0, TAU);
  ctx.fill();

  // wind state — gusts follow pointer sweeps
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const st = canvasState<DuneState>(ctx, `dd${p.seed}`, () => ({ wind: 1, gust: 0 }));
  const ptr = pointerPx(env, w, h);
  if (ptr) {
    st.gust = clamp(st.gust + Math.abs(ptr.vx) * dt * 6 + (ptr.down ? dt * 2 : 0), 0, 3);
  }
  st.gust *= Math.exp(-dt * 1.4);
  const wind = (0.7 + st.gust * 1.6) * Math.max(0.3, sp);

  // dune layers
  const layers = 4;
  for (let L = 0; L < layers; L++) {
    const baseY = h * (0.55 + L * 0.12);
    const amp = h * (0.05 - L * 0.008);
    const k = 0.004 + L * 0.002;
    const drift = ptr ? (ptr.x / w - 0.5) * m * 0.015 * L : 0;
    const col = mixShade(a1, bg1, 0.32 + L * 0.2, -(0.1 + L * 0.16));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-w * 0.05 + drift, h);
    for (let x = -w * 0.05; x <= w * 1.05; x += Math.max(6, w / 60)) {
      const y =
        baseY +
        Math.sin((x + drift * 8) * k + p.seed * 0.7 + L * 2.4) * amp +
        Math.sin((x + drift * 8) * k * 2.7 + L) * amp * 0.4 +
        Math.sin(t * 0.05 * sp + L) * m * 0.004;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w * 1.05, h);
    ctx.closePath();
    ctx.fill();

    // ridge highlight
    ctx.strokeStyle = rgba(shade(a2, -0.1), 0.18);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = -w * 0.05; x <= w * 1.05; x += Math.max(6, w / 60)) {
      const y =
        baseY +
        Math.sin((x + drift * 8) * k + p.seed * 0.7 + L * 2.4) * amp +
        Math.sin((x + drift * 8) * k * 2.7 + L) * amp * 0.4 +
        Math.sin(t * 0.05 * sp + L) * m * 0.004;
      if (x <= -w * 0.05 + 6) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // wind-blown sand streaks
  const sandN = Math.round(clamp(60 * p.density * areaScale(w, h), 30, 120));
  ctx.strokeStyle = rgba(shade(a2, 0.3), 0.3);
  ctx.lineWidth = 1;
  for (let i = 0; i < sandN; i++) {
    const r = mulberry32(p.seed * 5 + i);
    const speed = (60 + r() * 160) * wind;
    const y = h * (0.5 + r() * 0.48);
    const x = ((r() * w + t * speed) % (w + m * 0.1)) - m * 0.05;
    const len = (6 + r() * 16) * clamp(wind, 0.5, 2.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + len * 0.08 * (r() - 0.5));
    ctx.stroke();
  }
};

/** small local helper — blend + shade in one go (dunes uses it a lot) */
function mixShade(a: string, b: string, mix: number, dark: number): string {
  const r1 = parseInt(a.slice(1, 3), 16);
  const g1 = parseInt(a.slice(3, 5), 16);
  const b1 = parseInt(a.slice(5, 7), 16);
  const r2 = parseInt(b.slice(1, 3), 16);
  const g2 = parseInt(b.slice(3, 5), 16);
  const b2 = parseInt(b.slice(5, 7), 16);
  const rr = Math.round(lerp(r1, r2, mix) * (1 + dark));
  const gg = Math.round(lerp(g1, g2, mix) * (1 + dark));
  const bb = Math.round(lerp(b1, b2, mix) * (1 + dark));
  const cl = (v: number) => clamp(v, 0, 255);
  return `#${((1 << 24) | (cl(rr) << 16) | (cl(gg) << 8) | cl(bb)).toString(16).slice(1)}`;
}

/* ------------------------------------------------------------------ */
/* 22 · Crystal Cave — tap and a shimmer sweeps the gems               */
/* ------------------------------------------------------------------ */

type Shard = { x: number; y: number; w: number; hh: number; tilt: number; c: number; ph: number; depth: number };
type CaveState = { waveX: number; waveT: number };

const crystalCave: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  fillBg(ctx, w, h, bg0, bg1);

  const rnd = mulberry32(p.seed);
  const st = canvasState<CaveState>(ctx, `cc${p.seed}`, () => ({ waveX: -1, waveT: -10 }));
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  if (env) {
    for (const tap of env.pointer.taps) {
      st.waveX = tap.x * w;
      st.waveT = t;
    }
  }
  const waveAge = t - st.waveT;
  const waveR = waveAge * m * 1.1;

  // ceiling shards
  const drawShard = (s: Shard) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 * p.speed + s.ph);
    const color = [a1, a2, a3][s.c];
    const shimmer =
      st.waveT > 0 && Math.abs(s.x - st.waveX) < waveR && waveAge < 1.4
        ? (1 - Math.abs(s.x - st.waveX) / waveR) * (1 - waveAge / 1.4)
        : 0;
    const ptr = pointerPx(env, w, h);
    const par = ptr ? (ptr.x / w - 0.5) * m * 0.02 * s.depth : 0;
    const x = s.x + par;
    const baseW = s.w;

    ctx.save();
    ctx.translate(x, s.y);
    ctx.rotate(s.tilt);

    // body
    const g = ctx.createLinearGradient(0, 0, 0, -s.hh);
    g.addColorStop(0, rgba(shade(color, -0.35), 0.9));
    g.addColorStop(0.5, rgba(color, 0.55 + pulse * 0.15 + shimmer * 0.4));
    g.addColorStop(1, rgba(shade(color, 0.5), 0.85 + shimmer * 0.15));
    ctx.fillStyle = g;
    ctx.shadowColor = rgba(color, 0.55 + shimmer * 0.4);
    ctx.shadowBlur = (12 + pulse * 10 + shimmer * 26) * p.glow;
    ctx.beginPath();
    ctx.moveTo(-baseW / 2, 0);
    ctx.lineTo(-baseW * 0.32, -s.hh * 0.72);
    ctx.lineTo(0, -s.hh);
    ctx.lineTo(baseW * 0.32, -s.hh * 0.72);
    ctx.lineTo(baseW / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // facets
    ctx.strokeStyle = rgba(shade(color, 0.6), 0.35 + shimmer * 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s.hh);
    ctx.lineTo(-baseW * 0.1, -s.hh * 0.3);
    ctx.moveTo(0, -s.hh);
    ctx.lineTo(baseW * 0.14, -s.hh * 0.4);
    ctx.stroke();

    // sparkle at the tip during shimmer
    if (shimmer > 0.3) glowDot(ctx, 0, -s.hh, 2 + shimmer * 3, "#ffffff", 14 * p.glow, shimmer);
    ctx.restore();
  };

  // floor crystals
  const floorN = Math.round(clamp(9 * p.density, 6, 14));
  const shards: Shard[] = [];
  for (let i = 0; i < floorN; i++) {
    shards.push({
      x: (i + 0.5) * (w / floorN) + (rnd() - 0.5) * w * 0.04,
      y: h + m * 0.02,
      w: m * (0.05 + rnd() * 0.05),
      hh: m * (0.16 + rnd() * 0.24),
      tilt: (rnd() - 0.5) * 0.24,
      c: Math.floor(rnd() * 3),
      ph: rnd() * TAU,
      depth: 1,
    });
  }
  // a few hanging from the ceiling
  const ceilN = Math.round(clamp(4 * p.density, 3, 7));
  for (let i = 0; i < ceilN; i++) {
    shards.push({
      x: rnd() * w,
      y: -m * 0.01,
      w: m * (0.03 + rnd() * 0.035),
      hh: -m * (0.1 + rnd() * 0.14),
      tilt: (rnd() - 0.5) * 0.2,
      c: Math.floor(rnd() * 3),
      ph: rnd() * TAU,
      depth: 0.5,
    });
  }
  for (const s of shards) drawShard(s);

  // floating sparkles
  const sparkN = Math.round(20 * p.density);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < sparkN; i++) {
    const r = mulberry32(p.seed * 9 + i * 3);
    const x = (r() * w + Math.sin(t * 0.2 * p.speed + i) * m * 0.03 + w) % w;
    const y = (r() * h + t * m * 0.01 * p.speed) % h;
    const tw = Math.abs(Math.sin(t * (0.8 + r()) + i * 1.9));
    ctx.fillStyle = rgba("#ffffff", tw * 0.5);
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();

  // ambient cave glow
  softOrb(ctx, w * 0.5, h * 0.85, m * 0.7, a1, 0.06 + p.glow * 0.04);
};

/* ------------------------------------------------------------------ */
/* 23 · Storm Cells — tap the sky to call down lightning               */
/* ------------------------------------------------------------------ */

type StormState = { boltX: number; boltT: number; flash: number };

const stormCells: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const st = canvasState<StormState>(ctx, `sc${p.seed}`, () => ({ boltX: -1, boltT: -10, flash: 0 }));

  // churning cloud deck
  ctx.save();
  const cr = mulberry32(p.seed);
  for (let i = 0; i < 9; i++) {
    const cx = ((cr() * w + t * sp * m * (0.008 + cr() * 0.012)) % (w + m * 0.5)) - m * 0.25;
    const cy = h * (0.04 + cr() * 0.18);
    const cr2 = m * (0.14 + cr() * 0.2);
    softOrb(ctx, cx, cy, cr2, shade(bg0, 0.12), 0.5);
    softOrb(ctx, cx, cy + cr2 * 0.2, cr2 * 0.7, shade(a3, -0.5), 0.25);
  }
  ctx.restore();

  // rain sheets
  const rainN = Math.round(clamp(110 * p.density * areaScale(w, h), 50, 200));
  ctx.strokeStyle = rgba(shade(a3, 0.25), 0.24);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < rainN; i++) {
    const r = mulberry32(p.seed * 11 + i);
    const speed = (h * 0.9 + r() * h * 0.6) * Math.max(0.4, sp);
    const ry = (r() * h + t * speed) % (h * 1.1);
    const rx = r() * w + ry * 0.06;
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + m * 0.008, ry + m * 0.05);
  }
  ctx.stroke();

  const drawBolt = (x0: number, seedN: number, alpha: number) => {
    const r = mulberry32(seedN);
    let x = x0;
    let y = h * 0.16;
    const pts: [number, number][] = [[x, y]];
    const segs = 9;
    for (let i = 0; i < segs; i++) {
      x += (r() - 0.5) * m * 0.09 + (x0 - x) * 0.08;
      y += (h * 0.62) / segs;
      pts.push([x, y]);
      // occasional branch
      if (r() < 0.3) {
        let bx = x;
        let by = y;
        const bdir = r() < 0.5 ? -1 : 1;
        ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          bx += bdir * m * (0.02 + r() * 0.05);
          by += m * (0.03 + r() * 0.04);
          ctx.lineTo(bx, by);
        }
      }
    }
    ctx.strokeStyle = rgba("#ffffff", alpha);
    ctx.lineWidth = Math.max(1.5, m * 0.008);
    ctx.shadowColor = rgba(a1, 0.9);
    ctx.shadowBlur = 24 * p.glow;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [px2, py2] of pts.slice(1)) ctx.lineTo(px2, py2);
    ctx.stroke();
    // glow pass
    ctx.strokeStyle = rgba(a1, alpha * 0.4);
    ctx.lineWidth = Math.max(3, m * 0.02);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // automatic strikes (deterministic cycle)
  const interval = 3.2 / Math.max(0.3, sp);
  const cycle = Math.floor(t / interval);
  const age = t - cycle * interval;
  if (age < 0.3) {
    const r = mulberry32(p.seed + cycle * 31);
    const alpha = (1 - age / 0.3) * 0.9;
    drawBolt(w * (0.15 + r() * 0.7), p.seed + cycle * 31, alpha);
    st.flash = Math.max(st.flash, (1 - age / 0.3) * 0.7);
  }

  // user-called strikes
  if (env) {
    for (const tap of env.pointer.taps) {
      st.boltX = tap.x * w;
      st.boltT = t;
      st.flash = 1;
    }
  }
  const boltAge = t - st.boltT;
  if (st.boltT > 0 && boltAge < 0.32) {
    drawBolt(st.boltX, p.seed + Math.floor(st.boltT * 97), (1 - boltAge / 0.32) * 0.95);
  }

  // screen flash
  if (st.flash > 0.02) {
    ctx.fillStyle = rgba("#ffffff", st.flash * 0.13 * (0.5 + p.glow * 0.5));
    ctx.fillRect(0, 0, w, h);
    st.flash *= Math.exp(-dt * 5);
  }

  // wet ground reflection hint
  const gr = ctx.createLinearGradient(0, h * 0.86, 0, h);
  gr.addColorStop(0, rgba(shade(bg1, -0.2), 0.6));
  gr.addColorStop(1, rgba(shade(a1, -0.6), 0.35));
  ctx.fillStyle = gr;
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
};

/* ------------------------------------------------------------------ */
/* 24 · Bubble Rise — drift bubbles pop under your finger              */
/* ------------------------------------------------------------------ */

type Bub = { x0: number; y0: number; r: number; sp: number; ph: number; z: number; ox: number; oy: number; poppedUntil: number };
type BubbleState = { bubs: Bub[]; bursts: { x: number; y: number; t0: number }[] };

const bubbleRise: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // soft depth light
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.3, h * 0.15, m * 0.7, a3, 0.08 + p.glow * 0.05);
  ctx.restore();

  const st = canvasState<BubbleState>(ctx, `bb${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed);
    const n = Math.round(clamp(24 * p.density * areaScale(w, h), 12, 44));
    const bubs: Bub[] = [];
    for (let i = 0; i < n; i++) {
      bubs.push({
        x0: 0.04 + r() * 0.92,
        y0: r(),
        r: m * (0.008 + r() * 0.038),
        sp: 0.35 + r() * 0.75,
        ph: r() * TAU,
        z: 0.4 + r() * 0.6,
        ox: 0,
        oy: 0,
        poppedUntil: -1,
      });
    }
    return { bubs, bursts: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);
  const popR = m * 0.13;

  if (env) {
    for (const tap of env.pointer.taps) {
      st.bursts.push({ x: tap.x * w, y: tap.y * h, t0: t });
      for (const b of st.bubs) {
        const bx = b.x0 * w + b.ox;
        const by = ((b.y0 * h - t * b.sp * m * 0.05 * sp) % (h + b.r * 3) + h + b.r * 3) % (h + b.r * 3);
        if (Math.hypot(bx - tap.x * w, by - tap.y * h) < popR + b.r) {
          b.poppedUntil = t + 0.5;
        }
      }
    }
  }

  // pop bursts (rings + droplets)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  st.bursts = st.bursts.filter((b) => t - b.t0 < 0.5);
  for (const b of st.bursts) {
    const age = (t - b.t0) / 0.5;
    ctx.strokeStyle = rgba("#ffffff", (1 - age) * 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, age * m * 0.05 + 2, 0, TAU);
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * TAU + b.t0;
      const d = age * m * 0.035;
      glowDot(ctx, b.x + Math.cos(ang) * d, b.y + Math.sin(ang) * d, 1.4, a2, 6 * p.glow, (1 - age) * 0.7);
    }
  }
  ctx.restore();

  // bubbles
  for (const b of st.bubs) {
    if (t < b.poppedUntil) continue;

    const travel = h + b.r * 3;
    const by =
      travel - (((b.y0 * travel + t * b.sp * m * 0.05 * sp) % travel)) - b.r +
      Math.sin(t * 0.9 * sp + b.ph) * m * 0.008;
    const bx = b.x0 * w + Math.sin(t * 0.7 * sp + b.ph) * m * 0.014;

    if (ptr) {
      const dx = bx + b.ox - ptr.x;
      const dy = by + b.oy - ptr.y;
      const d = Math.hypot(dx, dy);
      const R = m * 0.2;
      if (d < R && d > 0.001) {
        const f = (1 - d / R) * (ptr.down ? 2.4 : 1.4);
        b.ox += (dx / d) * f * m * 0.014 * dt * 60 * 0.12;
        b.oy += (dy / d) * f * m * 0.014 * dt * 60 * 0.12;
      }
    }
    const dec = Math.exp(-dt * 1.2);
    b.ox *= dec;
    b.oy *= dec;

    const x = bx + b.ox;
    const y = by + b.oy;
    const alpha = 0.2 + b.z * 0.55;

    // glassy sphere
    const g = ctx.createRadialGradient(x - b.r * 0.3, y - b.r * 0.35, b.r * 0.1, x, y, b.r);
    g.addColorStop(0, rgba("#ffffff", alpha * 0.25));
    g.addColorStop(0.7, rgba(a3, alpha * 0.1));
    g.addColorStop(0.92, rgba(a2, alpha * 0.55));
    g.addColorStop(1, rgba("#ffffff", alpha * 0.7));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, TAU);
    ctx.fill();

    // iridescent rim
    ctx.strokeStyle = rgba(a1, alpha * 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, b.r * 0.96, 0.4, 2.4);
    ctx.stroke();

    // highlight
    ctx.fillStyle = rgba("#ffffff", alpha * 0.85);
    ctx.beginPath();
    ctx.ellipse(x - b.r * 0.35, y - b.r * 0.4, b.r * 0.18, b.r * 0.11, -0.6, 0, TAU);
    ctx.fill();
  }
};

/* ------------------------------------------------------------------ */
/* 25 · Lava Lamp — blobs rise, your warmth draws them in              */
/* ------------------------------------------------------------------ */

type Blob = { x0: number; y0: number; r: number; sp: number; ph: number; c: number; ox: number; oy: number; heat: number };
type LavaState = { blobs: Blob[]; flashes: { x: number; y: number; t0: number }[] };

const lavaLamp: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // glass vessel edge vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, m * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.55));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  const st = canvasState<LavaState>(ctx, `lava${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed);
    const n = Math.round(clamp(11 * p.density * areaScale(w, h), 6, 20));
    const blobs: Blob[] = [];
    for (let i = 0; i < n; i++) {
      blobs.push({
        x0: 0.12 + r() * 0.76,
        y0: r(),
        r: m * (0.035 + r() * 0.075),
        sp: 0.3 + r() * 0.7,
        ph: r() * TAU,
        c: 2 + Math.floor(r() * 3),
        ox: 0,
        oy: 0,
        heat: 0,
      });
    }
    return { blobs, flashes: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      st.flashes.push({ x: tap.x * w, y: tap.y * h, t0: t });
      for (const b of st.blobs) {
        const bx = b.x0 * w + b.ox;
        const by = b.y0 * h + b.oy;
        const d = Math.hypot(bx - tap.x * w, by - tap.y * h);
        if (d < m * 0.4) b.heat = Math.min(1.6, b.heat + (1 - d / (m * 0.4)) * 1.2);
      }
    }
  }

  // warm base plate glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.5, h * 0.97, m * 0.55, a2, 0.16 + p.glow * 0.08);
  ctx.restore();

  // tap flashes
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  st.flashes = st.flashes.filter((f) => t - f.t0 < 0.7);
  for (const f of st.flashes) {
    const age = (t - f.t0) / 0.7;
    softOrb(ctx, f.x, f.y, m * (0.1 + age * 0.3), a3, (1 - age) * 0.5 * (0.5 + p.glow * 0.5));
  }
  ctx.restore();

  // blobs
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const b of st.blobs) {
    const travel = h + b.r * 4;
    const baseY = travel - ((b.y0 * travel + t * b.sp * m * 0.045 * sp) % travel) - b.r * 2;
    const bx = b.x0 * w + Math.sin(t * 0.5 * sp + b.ph) * m * 0.03;
    const by = baseY + Math.cos(t * 0.62 * sp + b.ph * 1.7) * m * 0.02;

    // cursor warmth — gentle attraction
    if (ptr) {
      const dx = ptr.x - (bx + b.ox);
      const dy = ptr.y - (by + b.oy);
      const d = Math.hypot(dx, dy);
      const R = m * 0.45;
      if (d < R && d > 0.001) {
        const f = (1 - d / R) * (ptr.down ? 1.5 : 0.7);
        b.ox += (dx / d) * f * m * 0.02 * dt * 60 * 0.1;
        b.oy += (dy / d) * f * m * 0.02 * dt * 60 * 0.1;
      }
    }

    // heat buoyancy — heated blobs shoot upward then cool
    if (b.heat > 0.01) {
      b.oy -= b.heat * m * 0.05 * dt * 60 * 0.12;
      b.heat *= Math.exp(-dt * 1.1);
    }
    const dec = Math.exp(-dt * 0.9);
    b.ox *= dec;
    b.oy *= dec;

    const color = p.colors[b.c];
    const wob = 1 + Math.sin(t * 1.1 * sp + b.ph * 2.3) * 0.07;
    const r2 = b.r * wob * (1 + b.heat * 0.15);
    softOrb(ctx, bx + b.ox, by + b.oy, r2 * 2.1, color, (0.14 + p.glow * 0.1) * (1 + b.heat * 0.4));

    // dense core
    const g = ctx.createRadialGradient(bx + b.ox - r2 * 0.2, by + b.oy - r2 * 0.3, r2 * 0.1, bx + b.ox, by + b.oy, r2);
    g.addColorStop(0, rgba(color, 0.85));
    g.addColorStop(0.75, rgba(shade(color, -0.15), 0.55));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx + b.ox, by + b.oy, r2, 0, TAU);
    ctx.fill();

    // highlight
    ctx.fillStyle = rgba("#ffffff", 0.28);
    ctx.beginPath();
    ctx.ellipse(bx + b.ox - r2 * 0.3, by + b.oy - r2 * 0.42, r2 * 0.22, r2 * 0.13, -0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // glass reflection streak
  const refl = ctx.createLinearGradient(w * 0.12, 0, w * 0.4, h);
  refl.addColorStop(0, rgba("#ffffff", 0.05));
  refl.addColorStop(0.5, rgba("#ffffff", 0.015));
  refl.addColorStop(1, rgba("#ffffff", 0));
  ctx.fillStyle = refl;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, 0);
  ctx.lineTo(w * 0.24, 0);
  ctx.lineTo(w * 0.42, h);
  ctx.lineTo(w * 0.3, h);
  ctx.closePath();
  ctx.fill();
};

/* ------------------------------------------------------------------ */
/* 26 · Lantern Drift — tap releases a lantern into the night          */
/* ------------------------------------------------------------------ */

type Lantern = { x0: number; y0: number; r: number; sp: number; ph: number; z: number; born: number; user: boolean };
type LanternState = { lanterns: Lantern[] };

const lanternDrift: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // stars
  const rs = mulberry32(p.seed + 7);
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const sx = rs() * w;
    const sy = rs() * h * 0.75;
    const tw = 0.25 + 0.75 * Math.abs(Math.sin(t * (0.4 + rs()) * sp + i));
    ctx.fillStyle = rgba("#ffffff", tw * 0.5);
    ctx.fillRect(sx, sy, 1.4, 1.4);
  }
  ctx.restore();

  // horizon glow + hills
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.5, h * 0.94, m * 0.9, a2, 0.1 + p.glow * 0.06);
  ctx.restore();
  const hillBase = h * 0.92;
  ctx.fillStyle = rgba(shade(bg0, -0.5), 0.9);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, hillBase);
  for (let x = 0; x <= w; x += Math.max(10, w / 20)) {
    ctx.lineTo(x, hillBase - Math.abs(Math.sin(x * 0.004 + p.seed * 0.13)) * m * 0.09);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const st = canvasState<LanternState>(ctx, `lant${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed);
    const n = Math.round(clamp(16 * p.density * areaScale(w, h), 8, 30));
    const lanterns: Lantern[] = [];
    for (let i = 0; i < n; i++) {
      lanterns.push({
        x0: 0.05 + r() * 0.9,
        y0: r(),
        r: m * (0.014 + r() * 0.03),
        sp: 0.5 + r() * 0.9,
        ph: r() * TAU,
        z: 0.35 + r() * 0.65,
        born: 0,
        user: false,
      });
    }
    return { lanterns };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  // taps release a fresh lantern
  if (env) {
    for (const tap of env.pointer.taps) {
      st.lanterns.push({
        x0: tap.x,
        y0: 1.08,
        r: m * (0.02 + Math.random() * 0.022),
        sp: 0.8 + Math.random() * 0.6,
        ph: Math.random() * TAU,
        z: 0.8,
        born: t,
        user: true,
      });
      if (st.lanterns.length > 70) {
        const idx = st.lanterns.findIndex((l) => !l.user);
        if (idx >= 0) st.lanterns.splice(idx, 1);
        else st.lanterns.shift();
      }
    }
  }

  // breeze from pointer movement
  let breeze = 0;
  if (ptr) breeze = clamp(ptr.vx / (w * 2.2), -0.6, 0.6);

  // lanterns
  for (const l of st.lanterns) {
    const travel = h + l.r * 10;
    let ly = travel - ((l.y0 * travel + t * l.sp * m * 0.05 * sp) % travel) - l.r * 2;
    if (l.user && t - l.born < 1.2) {
      // pop-in ease for user lanterns
      const k = clamp((t - l.born) / 1.2, 0, 1);
      ly = h * 1.08 + (ly - h * 1.08) * k;
    }
    const lx = l.x0 * w + Math.sin(t * 0.6 * sp + l.ph) * m * 0.02 + breeze * m * 0.14 * l.z;

    const flick = 0.85 + 0.15 * Math.sin(t * 7 * sp + l.ph * 3);
    const warm = l.user ? a3 : l.z > 0.6 ? a2 : a1;
    const size = l.r * (0.6 + l.z * 0.6);

    // halo
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    softOrb(ctx, lx, ly, size * 3.4, warm, 0.16 * flick * (0.4 + p.glow * 0.5) * l.z);
    ctx.restore();

    // paper body
    const g = ctx.createLinearGradient(lx, ly - size, lx, ly + size);
    g.addColorStop(0, rgba(shade(warm, 0.25), 0.95 * flick));
    g.addColorStop(0.55, rgba(warm, 0.95));
    g.addColorStop(1, rgba(shade(warm, -0.25), 0.95));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(lx, ly, size * 0.72, size, 0, 0, TAU);
    ctx.fill();

    // ribs
    ctx.strokeStyle = rgba(shade(warm, -0.4), 0.5);
    ctx.lineWidth = Math.max(0.6, size * 0.05);
    for (const off of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.ellipse(lx, ly, size * 0.72 * Math.abs(off) + size * 0.15, size, 0, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    // flame core
    ctx.fillStyle = rgba("#ffffff", 0.9 * flick);
    ctx.beginPath();
    ctx.arc(lx, ly + size * 0.25, Math.max(0.8, size * 0.16), 0, TAU);
    ctx.fill();
  }

  // gentle vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.4, m * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.72);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.42));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 27 · Warp Speed — hyperspace starfield you can steer                */
/* ------------------------------------------------------------------ */

type Star = { ang: number; dist: number; sp: number; c: number; size: number };
type WarpState = { stars: Star[]; boost: number; cx: number; cy: number };

const warpSpeed: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<WarpState>(ctx, `warp${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed);
    const n = Math.round(clamp(150 * p.density * areaScale(w, h), 80, 280));
    const stars: Star[] = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        ang: r() * TAU,
        dist: 0.02 + Math.pow(r(), 1.6) * 1.4,
        sp: 0.5 + r() * 1.4,
        c: 2 + Math.floor(r() * 3),
        size: 0.5 + r() * 1.6,
      });
    }
    return { stars, boost: 0, cx: 0, cy: 0 };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  // taps trigger a warp jump
  if (env) {
    for (const _tap of env.pointer.taps) st.boost = 1;
  }

  // steering — vanishing point eases toward the pointer
  const targetX = ptr ? (ptr.x / w - 0.5) : 0;
  const targetY = ptr ? (ptr.y / h - 0.5) : 0;
  st.cx = lerp(st.cx, targetX, 1 - Math.exp(-dt * 2.2));
  st.cy = lerp(st.cy, targetY, 1 - Math.exp(-dt * 2.2));

  const cx = w * (0.5 + st.cx * 0.34);
  const cy = h * (0.5 + st.cy * 0.34);
  const boost = st.boost;
  const speedMul = (1 + boost * 5) * sp;

  // nebula backdrop
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, cx, cy, m * 0.5, a2, 0.1 + p.glow * 0.06);
  softOrb(ctx, w * 0.75, h * 0.3, m * 0.35, a3, 0.05 + p.glow * 0.04);
  ctx.restore();

  // stars
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const s of st.stars) {
    const orbit = (s.dist + t * 0.055 * s.sp * speedMul * 0.28) % 1.65;
    const dist = orbit * Math.max(w, h) * 0.9;
    const x = cx + Math.cos(s.ang) * dist;
    const y = cy + Math.sin(s.ang) * dist * 0.98;
    const fade = clamp(1.4 - orbit, 0, 1) * clamp(orbit * 6, 0, 1);
    if (fade <= 0.01) continue;

    // streak length grows with speed & distance
    const streak = dist * 0.11 * speedMul * (0.35 + s.sp * 0.4);
    const nx = cx + Math.cos(s.ang) * (dist - streak);
    const ny = cy + Math.sin(s.ang) * (dist - streak) * 0.98;
    const color = p.colors[s.c];

    ctx.strokeStyle = rgba(color, fade * 0.85);
    ctx.lineWidth = s.size * (0.7 + boost * 0.9);
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (orbit < 0.25) glowDot(ctx, x, y, s.size * 1.2, color, 8 * p.glow, fade * 0.9);
  }
  ctx.restore();

  // warp flash + chromatic edge on jump
  if (boost > 0.02) {
    ctx.fillStyle = rgba("#ffffff", boost * 0.08 * (0.5 + p.glow * 0.5));
    ctx.fillRect(0, 0, w, h);
    st.boost *= Math.exp(-dt * 1.4);
  }

  // central glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, cx, cy, m * 0.08, "#ffffff", 0.35 * (0.5 + p.glow * 0.5));
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.5));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 28 · Kaleidoscope — mirrored geometry that follows your angle       */
/* ------------------------------------------------------------------ */

type KaleidoState = { rot: number; pulses: { t0: number; ang: number }[] };

const kaleidoscope: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, shade(bg0, -0.1), bg1);

  const st = canvasState<KaleidoState>(ctx, `kal${p.seed}`, () => ({
    rot: 0,
    pulses: [],
  }));

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      st.pulses.push({ t0: t, ang: Math.atan2(tap.y - 0.5, tap.x - 0.5) });
      if (st.pulses.length > 6) st.pulses.shift();
    }
  }

  // rotation: slow base + cursor angular steering
  let steer = 0;
  if (ptr) {
    const ang = Math.atan2(ptr.y - h / 2, ptr.x - w / 2);
    steer = (Math.sin(ang) * ptr.speed) * 0.35;
  }
  st.rot += dt * (0.12 * sp + steer);

  const cx = w / 2;
  const cy = h / 2;
  const R = m * 0.48;
  const segments = 10;
  const pulses = st.pulses.map((pu) => ({ ...pu, radius: (t - pu.t0) * m * 0.55 }));

  // soft center light
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, cx, cy, m * 0.3, a2, 0.1 + p.glow * 0.06);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(st.rot);
  ctx.globalCompositeOperation = "lighter";

  for (let seg = 0; seg < segments; seg++) {
    const base = (seg / segments) * TAU;
    ctx.save();
    ctx.rotate(base);

    // petal shape per segment
    for (let layer = 0; layer < 3; layer++) {
      const lr = R * (0.24 + layer * 0.24);
      const breath = 1 + Math.sin(t * 0.9 * sp + layer * 1.4 + seg * 0.6) * 0.06;
      const color = p.colors[2 + layer];
      let pulseGlow = 0;
      for (const pu of pulses) {
        const rel = Math.abs(((base + st.rot - pu.ang + Math.PI * 3) % TAU) - Math.PI);
        if (rel < 0.6 && Math.abs(pu.radius - lr) < m * 0.12) pulseGlow = Math.max(pulseGlow, 1 - Math.abs(pu.radius - lr) / (m * 0.12));
      }

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(lr * 0.4, -lr * 0.36 * breath, lr * 1.05, -lr * 0.2, lr * 1.18, 0);
      ctx.bezierCurveTo(lr * 1.05, lr * 0.2, lr * 0.4, lr * 0.36 * breath, 0, 0);
      const g = ctx.createLinearGradient(0, 0, lr * 1.2, 0);
      g.addColorStop(0, rgba(color, 0.05 + pulseGlow * 0.25));
      g.addColorStop(0.65, rgba(color, (0.12 + p.glow * 0.1) * (0.7 + layer * 0.2) + pulseGlow * 0.3));
      g.addColorStop(1, rgba(color, 0.02));
      ctx.fillStyle = g;
      ctx.fill();

      // edge line
      ctx.strokeStyle = rgba(color, 0.18 + pulseGlow * 0.4);
      ctx.lineWidth = Math.max(0.7, m * 0.003 * (1 + pulseGlow));
      ctx.stroke();
    }

    // gem dot
    const gd = R * 0.14;
    const gemC = p.colors[2 + ((seg + Math.floor(t)) % 3)];
    const twinkle = 0.5 + 0.5 * Math.sin(t * 1.7 * sp + seg * 2.1);
    ctx.beginPath();
    ctx.arc(gd, 0, m * 0.012 * (0.7 + twinkle * 0.6), 0, TAU);
    ctx.fillStyle = rgba(gemC, 0.4 + twinkle * 0.4);
    ctx.fill();

    ctx.restore();
  }

  // pulse rings across the whole wheel
  for (const pu of pulses) {
    const age = t - pu.t0;
    if (age > 1.6) continue;
    ctx.strokeStyle = rgba("#ffffff", (1 - age / 1.6) * 0.4 * (0.5 + p.glow * 0.5));
    ctx.lineWidth = Math.max(1, m * 0.006 * (1 - age / 1.6));
    ctx.beginPath();
    ctx.arc(0, 0, pu.radius, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // center jewel
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glowDot(ctx, cx, cy, m * 0.02, a3, 20 * p.glow, 0.9);
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.25);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.55));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 27 · Bioluminescent Tide — touch lights up the water                */
/* ------------------------------------------------------------------ */

type Plankton = { x0: number; y0: number; ph: number; sp: number; r: number; c: number };
type BioState = {
  plankton: Plankton[];
  trail: { x: number; y: number; t0: number }[];
  blooms: { x: number; y: number; t0: number }[];
};

const bioTide: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, shade(bg0, -0.2), bg1);

  // stars over the water
  const rnd = mulberry32(p.seed);
  const starN = Math.round(clamp(46 * p.density * areaScale(w, h), 24, 110));
  ctx.save();
  for (let i = 0; i < starN; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h * 0.5;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.4 + rnd() * 1.2) * sp + i * 2.7));
    ctx.fillStyle = rgba("#ffffff", tw * 0.5);
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.restore();

  // low moon haze near the horizon
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.78, h * 0.34, m * 0.34, a2, 0.1 + p.glow * 0.06);
  ctx.restore();

  const st = canvasState<BioState>(ctx, `bio${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed * 7 + 11);
    const n = Math.round(clamp(90 * p.density * areaScale(w, h), 40, 190));
    const plankton: Plankton[] = [];
    for (let i = 0; i < n; i++) {
      plankton.push({
        x0: r(),
        y0: 0.42 + r() * 0.58,
        ph: r() * TAU,
        sp: 0.5 + r() * 1.1,
        r: 0.9 + r() * 2.1,
        c: 2 + Math.floor(r() * 3),
      });
    }
    return { plankton, trail: [], blooms: [] };
  });

  const ptr = pointerPx(env, w, h);

  if (env) {
    // the finger leaves a bioluminescent wake
    if (ptr && ptr.speed > 0.05) {
      st.trail.push({ x: ptr.x, y: ptr.y, t0: t });
      if (st.trail.length > 90) st.trail.shift();
    }
    for (const tap of env.pointer.taps) {
      st.blooms.push({ x: tap.x * w, y: tap.y * h, t0: t });
    }
  }

  // dark wave silhouettes
  for (let layer = 0; layer < 3; layer++) {
    const baseY = h * (0.62 + layer * 0.13);
    const amp = m * (0.02 + layer * 0.012);
    ctx.fillStyle = rgba(shade(bg1, -0.25 - layer * 0.12), 0.5 + layer * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += Math.max(6, w / 48)) {
      const y =
        baseY +
        Math.sin(x * 0.012 + t * (0.5 + layer * 0.22) * sp + layer * 2.1) * amp +
        Math.sin(x * 0.031 - t * 0.8 * sp + layer) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // tap blooms — flare + expanding ring
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  st.blooms = st.blooms.filter((b) => t - b.t0 < 1.3);
  for (const b of st.blooms) {
    const age = (t - b.t0) / 1.3;
    softOrb(ctx, b.x, b.y, m * (0.08 + age * 0.34), a2, (1 - age) * 0.5 * (0.4 + p.glow * 0.5));
    ctx.strokeStyle = rgba(a3, (1 - age) * 0.5 * (0.5 + p.glow * 0.5));
    ctx.lineWidth = Math.max(1, m * 0.005 * (1 - age) + 0.4);
    ctx.beginPath();
    ctx.arc(b.x, b.y, age * m * 0.3, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // fading wake where the finger dragged
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  st.trail = st.trail.filter((pt) => t - pt.t0 < 1.5);
  for (const pt of st.trail) {
    const age = (t - pt.t0) / 1.5;
    softOrb(ctx, pt.x, pt.y, m * 0.05 * (1 - age * 0.6), a1, (1 - age) * 0.35 * (0.4 + p.glow * 0.6));
  }
  ctx.restore();

  // plankton — twinkle, flare and swirl near the pointer
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const pl of st.plankton) {
    let x = pl.x0 * w + Math.sin(t * 0.22 * sp * pl.sp + pl.ph) * m * 0.05;
    const y = pl.y0 * h + Math.cos(t * 0.18 * sp * pl.sp + pl.ph * 1.6) * m * 0.03;
    const glow = 0.16 + 0.2 * Math.abs(Math.sin(t * (0.6 + pl.sp) * sp + pl.ph * 3.1));
    if (ptr) {
      const d = Math.hypot(x - ptr.x, y - ptr.y);
      const R = m * 0.3;
      if (d < R) {
        const f = 1 - d / R;
        const push = clamp(ptr.vx * 0.015, -m * 0.05, m * 0.05);
        x += Math.cos((d / R) * Math.PI) * push * f;
        glowDot(
          ctx,
          x,
          y,
          pl.r * (0.6 + p.glow * 0.5) * (1 + f * 0.8),
          p.colors[pl.c],
          6 * p.glow + f * 14,
          clamp(glow + f * (ptr.down ? 0.9 : 0.5), 0, 1),
        );
        continue;
      }
    }
    glowDot(ctx, x, y, pl.r * (0.6 + p.glow * 0.5), p.colors[pl.c], 6 * p.glow, clamp(glow, 0, 1));
  }
  ctx.restore();

  // gentle vignette
  const vg = ctx.createLinearGradient(0, 0, 0, h);
  vg.addColorStop(0, rgba("#000000", 0.25));
  vg.addColorStop(0.5, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.35));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 28 · Glass Marbles — hold to gather, tap to scatter                 */
/* ------------------------------------------------------------------ */

type Marble = {
  x0: number;
  y0: number;
  r: number;
  ph: number;
  sp: number;
  amp: number;
  c: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
};
type MarbleState = { marbles: Marble[]; shock: { x: number; y: number; t0: number }[] };

const glassMarbles: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  // soft studio backdrop glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.5, h * 0.28, m * 0.7, a2, 0.05 + p.glow * 0.04);
  ctx.restore();

  // display-case shelf lines
  ctx.strokeStyle = rgba("#ffffff", 0.04);
  ctx.lineWidth = 1;
  const gridStep = m * 0.16;
  for (let y = gridStep; y < h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const st = canvasState<MarbleState>(ctx, `marble${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed);
    const n = Math.round(clamp(10 * p.density * areaScale(w, h), 6, 18));
    const marbles: Marble[] = [];
    for (let i = 0; i < n; i++) {
      marbles.push({
        x0: 0.1 + r() * 0.8,
        y0: 0.12 + r() * 0.76,
        r: m * (0.045 + r() * 0.075),
        ph: r() * TAU,
        sp: 0.3 + r() * 0.7,
        amp: m * (0.03 + r() * 0.07),
        c: 2 + Math.floor(r() * 3),
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
      });
    }
    return { marbles, shock: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      const tx = tap.x * w;
      const ty = tap.y * h;
      st.shock.push({ x: tx, y: ty, t0: t });
      for (const mb of st.marbles) {
        const mx = mb.x0 * w + mb.ox;
        const my = mb.y0 * h + mb.oy;
        const d = Math.hypot(mx - tx, my - ty);
        const R = m * 0.45;
        if (d < R && d > 0.001) {
          const f = (1 - d / R) * m * 2.2;
          mb.vx += ((mx - tx) / d) * f;
          mb.vy += ((my - ty) / d) * f;
        }
      }
    }
  }

  for (const mb of st.marbles) {
    // deterministic idle drift (this is what static exports show)
    const bx = mb.x0 * w + Math.sin(t * 0.35 * sp * mb.sp + mb.ph) * mb.amp;
    const by = mb.y0 * h + Math.cos(t * 0.28 * sp * mb.sp + mb.ph * 1.4) * mb.amp * 0.7;

    // magnet — marbles roll towards the held pointer
    if (ptr) {
      const mx = bx + mb.ox;
      const my = by + mb.oy;
      const d = Math.hypot(ptr.x - mx, ptr.y - my);
      const R = m * 0.5;
      if (d < R && d > 0.001) {
        const f = (1 - d / R) * (ptr.down ? 3.2 : 1.4) * m * 0.9;
        mb.vx += ((ptr.x - mx) / d) * f * dt;
        mb.vy += ((ptr.y - my) / d) * f * dt;
      }
    }

    // integrate with friction + soft wall bounce
    mb.ox += mb.vx * dt;
    mb.oy += mb.vy * dt;
    const fr = Math.exp(-dt * 2.1);
    mb.vx *= fr;
    mb.vy *= fr;
    let px = bx + mb.ox;
    let py = by + mb.oy;
    if (px < mb.r) {
      px = mb.r;
      mb.ox = mb.r - bx;
      mb.vx = Math.abs(mb.vx) * 0.72;
    }
    if (px > w - mb.r) {
      px = w - mb.r;
      mb.ox = w - mb.r - bx;
      mb.vx = -Math.abs(mb.vx) * 0.72;
    }
    if (py < mb.r) {
      py = mb.r;
      mb.oy = mb.r - by;
      mb.vy = Math.abs(mb.vy) * 0.72;
    }
    if (py > h - mb.r) {
      py = h - mb.r;
      mb.oy = h - mb.r - by;
      mb.vy = -Math.abs(mb.vy) * 0.72;
    }

    // glass ball
    const x = px;
    const y = py;
    const r = mb.r;
    const color = p.colors[mb.c];

    // cast shadow
    ctx.fillStyle = rgba("#000000", 0.3);
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y + r * 0.28, r * 0.9, r * 0.55, 0, 0, TAU);
    ctx.fill();

    // body
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, rgba(shade(color, 0.55), 0.95));
    g.addColorStop(0.4, rgba(color, 0.75));
    g.addColorStop(0.85, rgba(shade(color, -0.35), 0.85));
    g.addColorStop(1, rgba(shade(color, -0.55), 0.95));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    // inner swirl ribbon
    ctx.strokeStyle = rgba(shade(color, 0.4), 0.5);
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, t * 0.8 * sp + mb.ph, t * 0.8 * sp + mb.ph + Math.PI * 1.2);
    ctx.stroke();

    // rim light
    ctx.strokeStyle = rgba("#ffffff", 0.25);
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.96, 0, TAU);
    ctx.stroke();

    // specular highlights
    ctx.fillStyle = rgba("#ffffff", 0.85);
    ctx.beginPath();
    ctx.ellipse(x - r * 0.34, y - r * 0.42, r * 0.18, r * 0.11, -0.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba("#ffffff", 0.3);
    ctx.beginPath();
    ctx.arc(x + r * 0.25, y + r * 0.3, r * 0.09, 0, TAU);
    ctx.fill();
  }

  // shockwave rings
  st.shock = st.shock.filter((s) => t - s.t0 < 0.8);
  for (const s of st.shock) {
    const age = (t - s.t0) / 0.8;
    ctx.strokeStyle = rgba("#ffffff", (1 - age) * 0.4);
    ctx.lineWidth = Math.max(1, m * 0.006 * (1 - age));
    ctx.beginPath();
    ctx.arc(s.x, s.y, age * m * 0.4, 0, TAU);
    ctx.stroke();
  }

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.5));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 29 · Silk Flow — the fabric drapes towards your cursor              */
/* ------------------------------------------------------------------ */

type SilkState = { ripples: { x: number; y: number; t0: number }[] };

const silkFlow: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<SilkState>(ctx, `silk${p.seed}`, () => ({ ripples: [] }));
  if (env) {
    for (const tap of env.pointer.taps) {
      st.ripples.push({ x: tap.x * w, y: tap.y * h, t0: t });
    }
  }
  st.ripples = st.ripples.filter((r) => t - r.t0 < 2.2);

  const ptr = pointerPx(env, w, h);
  const ribbons = Math.round(clamp(6 * p.density, 4, 9));
  const segs = 42;
  const accents = [a1, a2, a3];

  // deep sheen behind the fabric
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * (0.5 + Math.sin(t * 0.1 * sp) * 0.2), h * 0.3, m * 0.6, a1, 0.06 + p.glow * 0.04);
  softOrb(ctx, w * (0.5 + Math.cos(t * 0.13 * sp) * 0.25), h * 0.75, m * 0.5, a2, 0.05 + p.glow * 0.03);
  ctx.restore();

  for (let ri = 0; ri < ribbons; ri++) {
    const fr = ri / Math.max(1, ribbons - 1);
    const baseY = h * (0.12 + 0.76 * fr);
    const amp = h * (0.05 + 0.06 * Math.sin(fr * Math.PI));
    const colA = accents[ri % 3];
    const colB = accents[(ri + 1) % 3];
    const ribbonH = h * (0.075 + 0.045 * Math.sin(fr * 2.4 + 1.3));
    const speedK = 0.25 + fr * 0.35;

    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * w;
      let y =
        baseY +
        Math.sin(x * 0.006 + t * speedK * sp + ri * 1.7) * amp +
        Math.sin(x * 0.017 - t * speedK * 0.7 * sp + ri * 0.9) * amp * 0.45;

      // the silk drapes towards the moving cursor
      if (ptr) {
        const g = Math.exp(-((x - ptr.x) * (x - ptr.x)) / (2 * (w * 0.1) * (w * 0.1)));
        y += g * (ptr.y - baseY) * 0.35 * clamp(ptr.speed, 0.15, 1.2);
      }

      // tap ripples — a comb wave travels through the cloth
      for (const rp of st.ripples) {
        const age = t - rp.t0;
        const ringR = age * w * 0.35;
        const d = Math.abs(Math.hypot(x - rp.x, baseY - rp.y) - ringR);
        const sigma = w * 0.05;
        const wgt = Math.exp(-(d * d) / (2 * sigma * sigma)) * Math.max(0, 1 - age / 2.2);
        y += Math.sin(d * 0.08) * wgt * h * 0.045;
      }
      pts.push({ x, y });
    }

    // filled band along the spine
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - ribbonH / 2);
    for (let i = 1; i <= segs; i++) ctx.lineTo(pts[i].x, pts[i].y - ribbonH / 2);
    for (let i = segs; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + ribbonH / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, baseY - amp - ribbonH, w, baseY + amp + ribbonH);
    grad.addColorStop(0, rgba(colA, 0));
    grad.addColorStop(0.25, rgba(colA, 0.5 + p.glow * 0.12));
    grad.addColorStop(0.55, rgba(colB, 0.42 + p.glow * 0.12));
    grad.addColorStop(1, rgba(colB, 0.05));
    ctx.fillStyle = grad;
    ctx.fill();

    // sheen line along the top edge
    ctx.strokeStyle = rgba("#ffffff", 0.16 + p.glow * 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - ribbonH / 2);
    for (let i = 1; i <= segs; i++) ctx.lineTo(pts[i].x, pts[i].y - ribbonH / 2);
    ctx.stroke();
  }

  // loose folds vignette
  const vg = ctx.createLinearGradient(0, 0, 0, h);
  vg.addColorStop(0, rgba("#000000", 0.3));
  vg.addColorStop(0.5, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.4));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 30 · Ember Forge — tap strikes the anvil, sparks fly                */
/* ------------------------------------------------------------------ */

type Ember = {
  x0: number;
  y0: number;
  ph: number;
  sp: number;
  wob: number;
  r: number;
  c: number;
  ox: number;
  oy: number;
};
type EmberState = { embers: Ember[]; strikes: { x: number; y: number; t0: number }[] };

const emberForge: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, shade(bg0, -0.1), bg1);

  const st = canvasState<EmberState>(ctx, `ember${p.seed}|${p.density}`, () => {
    const r = mulberry32(p.seed);
    const n = Math.round(clamp(46 * p.density * areaScale(w, h), 26, 100));
    const embers: Ember[] = [];
    for (let i = 0; i < n; i++) {
      embers.push({
        x0: 0.06 + r() * 0.88,
        y0: r(),
        ph: r() * TAU,
        sp: 0.5 + r() * 1.2,
        wob: 0.4 + r() * 1.2,
        r: 1 + r() * 2.6,
        c: 2 + Math.floor(r() * 3),
        ox: 0,
        oy: 0,
      });
    }
    return { embers, strikes: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      const tx = tap.x * w;
      const ty = tap.y * h;
      st.strikes.push({ x: tx, y: ty, t0: t });
      for (const em of st.embers) {
        const travel = h + m * 0.1;
        const ex = em.x0 * w + em.ox;
        const ey = travel - ((em.y0 * travel + t * em.sp * m * 0.07 * sp) % travel) - m * 0.05 + em.oy;
        const d = Math.hypot(ex - tx, ey - ty);
        const R = m * 0.42;
        if (d < R && d > 0.001) {
          const f = (1 - d / R) * m * 0.42;
          em.ox += ((ex - tx) / d) * f;
          em.oy += ((ey - ty) / d) * f;
        }
      }
    }
  }

  // forge floor glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.5, h * 1.02, m * 0.75, a2, 0.22 + p.glow * 0.12);
  softOrb(ctx, w * 0.24, h * 0.99, m * 0.34, a1, 0.14 + p.glow * 0.08);
  ctx.restore();

  // coal bed
  const bedY = h * 0.92;
  const bedGrad = ctx.createLinearGradient(0, bedY - m * 0.06, 0, h);
  bedGrad.addColorStop(0, rgba("#000000", 0));
  bedGrad.addColorStop(1, rgba(shade(a1, -0.4), 0.55));
  ctx.fillStyle = bedGrad;
  ctx.fillRect(0, bedY - m * 0.06, w, h);

  const rndC = mulberry32(p.seed + 5);
  const coalN = Math.round(clamp(14 * p.density, 8, 26));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < coalN; i++) {
    const cx = rndC() * w;
    const cy = h - rndC() * m * 0.07;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 * sp + i * 2.3);
    softOrb(ctx, cx, cy, m * 0.02 + pulse * m * 0.012, i % 2 ? a1 : a2, 0.25 + p.glow * 0.2 * pulse);
  }
  ctx.restore();

  // strikes — flash + shock ring
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  st.strikes = st.strikes.filter((s) => t - s.t0 < 0.75);
  for (const s of st.strikes) {
    const age = (t - s.t0) / 0.75;
    softOrb(ctx, s.x, s.y, m * (0.1 + age * 0.28), a3, (1 - age) * 0.7 * (0.5 + p.glow * 0.5));
    ctx.strokeStyle = rgba("#ffffff", (1 - age) * 0.45);
    ctx.lineWidth = Math.max(1, m * 0.006 * (1 - age));
    ctx.beginPath();
    ctx.arc(s.x, s.y, age * m * 0.38, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // embers — rise, flicker, lean towards warm pointers
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const dec = Math.exp(-dt * 2.0);
  for (const em of st.embers) {
    em.ox *= dec;
    em.oy *= dec;

    const travel = h + m * 0.1;
    const baseY = travel - ((em.y0 * travel + t * em.sp * m * 0.07 * sp) % travel) - m * 0.05;
    const bx = em.x0 * w + Math.sin(t * em.wob * sp + em.ph) * m * 0.025;

    if (ptr) {
      const dx = ptr.x - (bx + em.ox);
      const dy = ptr.y - (baseY + em.oy);
      const d = Math.hypot(dx, dy);
      const R = m * 0.4;
      if (d < R && d > 0.001) {
        const f = (1 - d / R) * (ptr.down ? 1.4 : 0.6);
        em.ox += (dx / d) * f * m * 0.05 * dt;
        em.oy += (dy / d) * f * m * 0.05 * dt;
      }
    }

    const flick = 0.6 + 0.4 * Math.sin(t * (3 + em.sp * 2) + em.ph * 5);
    const x = bx + em.ox;
    const y = baseY + em.oy;
    const color = p.colors[em.c];

    // short trail for larger sparks
    if (em.r > 2.4) {
      ctx.strokeStyle = rgba(color, 0.28 * flick);
      ctx.lineWidth = Math.max(0.8, em.r * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.sin(t * em.wob * sp + em.ph) * m * 0.012, y + m * 0.03);
      ctx.stroke();
    }

    glowDot(ctx, x, y, em.r * (0.55 + p.glow * 0.5) * (0.7 + flick * 0.5), color, 8 * p.glow * flick, 0.55 + flick * 0.4);
  }
  ctx.restore();

  // chimney dark vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.9, m * 0.25, w / 2, h * 0.75, Math.max(w, h) * 0.8);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.55));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 31 · Balloon Fiesta — sweep for wind, tap releases a balloon        */
/* ------------------------------------------------------------------ */

type BalloonState = {
  wind: number;
  windY: number;
  released: { x: number; t0: number; ph: number; size: number; c: number }[];
};

const balloonFiesta: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, shade(bg0, -0.05), bg1);

  const st = canvasState<BalloonState>(ctx, `balloon${p.seed}|${p.density}`, () => ({
    wind: 0,
    windY: 0,
    released: [],
  }));

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;

  if (env) {
    // smoothed wind from horizontal pointer velocity
    const target = clamp(env.pointer.vx, -1.6, 1.6);
    st.wind = lerp(st.wind, target, 1 - Math.exp(-dt * 2.2));
    st.windY = lerp(st.windY, clamp(env.pointer.vy, -1.2, 1.2), 1 - Math.exp(-dt * 2.2));
    for (const tap of env.pointer.taps) {
      st.released.push({
        x: tap.x * w,
        t0: t,
        ph: rnd() * TAU,
        size: 0.7 + rnd() * 0.55,
        c: 2 + Math.floor(rnd() * 3),
      });
    }
    if (st.released.length > 14) st.released.splice(0, st.released.length - 14);
  }
  st.released = st.released.filter((b) => t - b.t0 < 9);

  // low sun glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.72, h * 0.26, m * 0.42, a3, 0.16 + p.glow * 0.1);
  softOrb(ctx, w * 0.2, h * 0.18, m * 0.3, a1, 0.08 + p.glow * 0.06);
  ctx.restore();

  // drifting clouds — soft ellipses, wind-reactive
  const cloudN = Math.round(clamp(5 * p.density, 3, 8));
  for (let i = 0; i < cloudN; i++) {
    const depth = 0.35 + rnd() * 0.65;
    const drift = ((t * 8 * sp * depth + st.wind * 40 * depth) % (w + m * 0.6)) - m * 0.3;
    const cx = i % 2 === 0 ? drift : w - drift;
    const cy = h * (0.08 + rnd() * 0.3);
    ctx.save();
    ctx.globalAlpha = 0.16 + depth * 0.12;
    ctx.fillStyle = rgba("#ffffff", 0.8);
    for (const [ox, oy, r] of [[0, 0, 1], [0.8, 0.18, 0.7], [-0.75, 0.2, 0.62]] as const) {
      ctx.beginPath();
      ctx.ellipse(cx + ox * m * 0.09 * depth, cy + oy * m * 0.05, r * m * 0.075 * depth, r * m * 0.032 * depth, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** draws one balloon, origin = envelope center */
  const drawBalloon = (bx: number, by: number, size: number, cIdx: number, tilt: number, fade: number) => {
    const bw = m * 0.052 * size;
    const bh = m * 0.068 * size;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    ctx.globalAlpha = fade;

    // envelope — teardrop with vertical stripes
    const env1 = new Path2D();
    env1.moveTo(0, -bh);
    env1.bezierCurveTo(bw * 1.25, -bh * 0.72, bw, bh * 0.5, bw * 0.24, bh * 0.82);
    env1.lineTo(-bw * 0.24, bh * 0.82);
    env1.bezierCurveTo(-bw, bh * 0.5, -bw * 1.25, -bh * 0.72, 0, -bh);
    env1.closePath();
    const base = p.colors[cIdx];
    const grad = ctx.createLinearGradient(-bw, 0, bw, 0);
    grad.addColorStop(0, rgba(shade(base, -0.28), 0.96));
    grad.addColorStop(0.45, rgba(base, 0.98));
    grad.addColorStop(1, rgba(shade(base, 0.18), 0.96));
    ctx.fillStyle = grad;
    ctx.fill(env1);

    // stripes
    ctx.save();
    ctx.clip(env1);
    ctx.fillStyle = rgba(shade(base, -0.45), 0.55);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.55, -bh * 0.1, bw * 0.2, bh * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bw * 0.55, -bh * 0.1, bw * 0.2, bh * 0.85, 0, 0, TAU);
    ctx.fill();
    // sheen
    ctx.fillStyle = rgba("#ffffff", 0.22);
    ctx.beginPath();
    ctx.ellipse(-bw * 0.3, -bh * 0.35, bw * 0.16, bh * 0.3, -0.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ropes + basket
    ctx.strokeStyle = rgba(shade(a3, -0.4), 0.7);
    ctx.lineWidth = Math.max(0.7, m * 0.0022);
    ctx.beginPath();
    ctx.moveTo(-bw * 0.2, bh * 0.8);
    ctx.lineTo(-bw * 0.13, bh * 1.08);
    ctx.moveTo(bw * 0.2, bh * 0.8);
    ctx.lineTo(bw * 0.13, bh * 1.08);
    ctx.stroke();
    ctx.fillStyle = rgba(shade(a3, -0.25), 0.9);
    const kW = bw * 0.3;
    const kH = bh * 0.24;
    ctx.beginPath();
    ctx.roundRect(-kW / 2, bh * 1.06, kW, kH, kH * 0.25);
    ctx.fill();
    ctx.restore();
  };

  // ambient balloon fleet
  const count = Math.round(clamp(7 * p.density * areaScale(w, h), 4, 13));
  for (let i = 0; i < count; i++) {
    const depth = 0.45 + rnd() * 0.55;
    const travel = h + m * 0.5;
    const cycle = 26 / sp;
    const y = h + m * 0.25 - (((t * depth + (rnd() * 26) / sp) % cycle) / cycle) * travel;
    const sway = Math.sin(t * 0.5 * sp * depth + rnd() * TAU) * m * 0.03 * depth;
    const bx = (0.06 + rnd() * 0.88) * w + sway + st.wind * 46 * depth;
    const cIdx = 2 + (i % 3);
    drawBalloon(bx, y, 0.55 + depth * 0.75, cIdx, st.wind * 0.12 * depth, 0.55 + depth * 0.45);
  }

  // tap-released balloons rising from below
  for (const b of st.released) {
    const age = t - b.t0;
    const y = h + m * 0.1 - age * m * 0.09 * sp;
    if (y < -m * 0.2) continue;
    const sway = Math.sin(t * 1.1 + b.ph) * m * 0.022 + st.wind * 26;
    drawBalloon(b.x + sway, y, b.size, b.c, st.wind * 0.16 + Math.sin(t * 0.9 + b.ph) * 0.05, 0.95);
  }

  // rolling hills
  for (const [yBase, amp, col, alpha] of [
    [0.86, 0.045, a3, 0.32],
    [0.93, 0.03, shade(bg0, -0.35), 0.85],
  ] as const) {
    ctx.fillStyle = rgba(col, alpha);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += Math.max(6, w / 40)) {
      ctx.lineTo(x, h * yBase - Math.sin(x * 0.006 + p.seed * 0.01) * h * amp - Math.sin(x * 0.017 + 2) * h * amp * 0.4);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
};

/* ------------------------------------------------------------------ */
/* 32 · Meteor Shower — tap calls a bolide out of the night            */
/* ------------------------------------------------------------------ */

type MeteorState = {
  bolides: { x: number; y: number; t0: number; ang: number; sp: number; big: boolean }[];
  flash: number;
};

const meteorShower: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, shade(bg0, -0.2), bg1);

  const st = canvasState<MeteorState>(ctx, `meteor${p.seed}|${p.density}`, () => ({
    bolides: [],
    flash: 0,
  }));
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  st.flash *= Math.exp(-dt * 3.4);

  // starfield
  const rnd = mulberry32(p.seed);
  const starN = Math.round(clamp(90 * p.density * areaScale(w, h), 50, 220));
  ctx.save();
  for (let i = 0; i < starN; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rnd() * 1.6) * sp + rnd() * TAU));
    ctx.fillStyle = rgba(i % 9 === 0 ? a3 : "#ffffff", 0.16 + tw * 0.5);
    const r = rnd() < 0.08 ? m * 0.0022 : m * 0.0011;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // milky-way band
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const band = ctx.createLinearGradient(0, h * 0.15, w, h * 0.55);
  band.addColorStop(0, rgba(a1, 0));
  band.addColorStop(0.5, rgba(a1, 0.05 + p.glow * 0.04));
  band.addColorStop(1, rgba(a1, 0));
  ctx.fillStyle = band;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.35);
  ctx.rotate(-0.32);
  ctx.translate(-w * 0.5, -h * 0.35);
  ctx.fillRect(-w * 0.1, 0, w * 1.2, h * 0.7);
  ctx.restore();

  if (env) {
    for (const tap of env.pointer.taps) {
      st.bolides.push({
        x: tap.x * w,
        y: tap.y * h,
        t0: t,
        ang: 0.55 + rnd() * 0.35,
        sp: 1.5 + rnd() * 0.6,
        big: true,
      });
      st.flash = Math.min(1, st.flash + 0.5);
      if (st.bolides.length > 8) st.bolides.shift();
    }
  }

  const ptr = pointerPx(env, w, h);

  /** one streaked meteor; head at (x,y), flying along ang */
  const drawMeteor = (x: number, y: number, ang: number, len: number, wd: number, col: string, alpha: number) => {
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const tail = ctx.createLinearGradient(x, y, x - dx * len, y - dy * len);
    tail.addColorStop(0, rgba(col, alpha));
    tail.addColorStop(0.35, rgba(col, alpha * 0.45));
    tail.addColorStop(1, rgba(col, 0));
    ctx.strokeStyle = tail;
    ctx.lineCap = "round";
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dx * len, y - dy * len);
    ctx.stroke();
    // hot head
    ctx.fillStyle = rgba("#ffffff", alpha);
    ctx.beginPath();
    ctx.arc(x, y, wd * 0.8, 0, TAU);
    ctx.fill();
    softOrb(ctx, x, y, wd * 5, col, alpha * 0.5);
  };

  // ambient meteors — diagonal rain with pointer gravity bend
  const count = Math.round(clamp(6 * p.density, 3, 12));
  const loop = 30 / sp;
  for (let i = 0; i < count; i++) {
    const phase = (t / loop + rnd()) % 1;
    const depth = 0.5 + rnd() * 0.5;
    const ang = (0.42 + rnd() * 0.4) * (i % 5 === 0 ? -1 : 1);
    const startX = rnd() * w * 1.2 - w * 0.1;
    const startY = -m * 0.1 + rnd() * h * 0.25;
    let x = startX + Math.cos(ang) * phase * w * 1.35 * depth;
    let y = startY + Math.sin(ang) * phase * h * 1.35 * depth;
    // pointer bends trajectories slightly toward the cursor
    if (ptr) {
      const d = Math.hypot(ptr.x - x, ptr.y - y);
      const R = m * 0.5;
      if (d < R && d > 1) {
        const f = (1 - d / R) * m * 0.06;
        x += ((ptr.x - x) / d) * f;
        y += ((ptr.y - y) / d) * f;
      }
    }
    const len = m * (0.1 + depth * 0.14);
    drawMeteor(x, y, ang, len, Math.max(1, m * 0.0035 * depth), i % 3 === 0 ? a3 : i % 3 === 1 ? a2 : "#ffffff", 0.5 + depth * 0.4);
  }

  // tap bolides — big, fast, with sparks + flash
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  st.bolides = st.bolides.filter((b) => t - b.t0 < 2.2);
  for (const b of st.bolides) {
    const age = t - b.t0;
    const dist = age * b.sp * m * 0.75;
    const x = b.x + Math.cos(b.ang) * dist;
    const y = b.y + Math.sin(b.ang) * dist;
    const fade = Math.max(0, 1 - age / 2.2);
    drawMeteor(x, y, b.ang, m * 0.34, m * 0.011, a3, fade);
    // sparks flying off the head
    for (let s = 0; s < 5; s++) {
      const sa = b.ang + Math.PI + (s - 2) * 0.35;
      const sd = m * 0.05 * Math.abs(Math.sin(age * 9 + s * 1.7));
      glowDot(ctx, x + Math.cos(sa) * sd, y + Math.sin(sa) * sd, m * 0.0035, a2, 6 * p.glow, fade);
    }
  }

  // summon flash
  if (st.flash > 0.01) {
    ctx.fillStyle = rgba("#ffffff", st.flash * 0.22);
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();

  // horizon ridge for depth
  ctx.fillStyle = rgba(shade(bg0, -0.4), 0.9);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += Math.max(6, w / 30)) {
    ctx.lineTo(x, h * 0.94 - Math.abs(Math.sin(x * 0.004 + p.seed)) * h * 0.05);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
};

/* ------------------------------------------------------------------ */
/* 33 · Koi Pond — top-down koi that dart away from your finger        */
/* ------------------------------------------------------------------ */

type Koi = {
  hx: number; hy: number; // home (normalized)
  x: number; y: number; // current px
  ang: number;
  vx: number; vy: number;
  panic: number;
  ph: number;
  size: number;
  c: number;
};

type KoiState = { koi: Koi[]; ripples: { x: number; y: number; t0: number }[]; init: boolean };

const koiPond: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);
  fillBg(ctx, w, h, shade(bg0, -0.1), bg1);

  const st = canvasState<KoiState>(ctx, `koi${p.seed}|${p.density}|${Math.round(w)}x${Math.round(h)}`, () => {
    const koi: Koi[] = [];
    const n = Math.round(clamp(7 * p.density * areaScale(w, h), 4, 14));
    for (let i = 0; i < n; i++) {
      const hx = 0.12 + rnd() * 0.76;
      const hy = 0.12 + rnd() * 0.76;
      koi.push({
        hx, hy,
        x: hx * w, y: hy * h,
        ang: rnd() * TAU,
        vx: 0, vy: 0,
        panic: 0,
        ph: rnd() * TAU,
        size: 0.6 + rnd() * 0.7,
        c: 2 + Math.floor(rnd() * 3),
      });
    }
    return { koi, ripples: [], init: true };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      st.ripples.push({ x: tap.x * w, y: tap.y * h, t0: t });
      if (st.ripples.length > 10) st.ripples.shift();
      // startle nearby koi
      for (const k of st.koi) {
        const d = Math.hypot(k.x - tap.x * w, k.y - tap.y * h);
        const R = m * 0.34;
        if (d < R && d > 0.001) {
          const f = (1 - d / R) * m * 1.6;
          k.vx += ((k.x - tap.x * w) / d) * f;
          k.vy += ((k.y - tap.y * h) / d) * f;
          k.panic = 1;
        }
      }
    }
  }

  // water caustics — slow shifting light bands
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const cy = h * (0.25 + 0.25 * i) + Math.sin(t * 0.22 * sp + i * 2.1) * h * 0.06;
    const g = ctx.createLinearGradient(0, cy - m * 0.09, 0, cy + m * 0.09);
    g.addColorStop(0, rgba(a1, 0));
    g.addColorStop(0.5, rgba(a1, 0.05 + p.glow * 0.035));
    g.addColorStop(1, rgba(a1, 0));
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(w * 0.5, cy);
    ctx.rotate(i * 1.1 + 0.4);
    ctx.translate(-w * 0.5, -cy);
    ctx.fillRect(-w * 0.05, cy - m * 0.09, w * 1.1, m * 0.18);
    ctx.restore();
  }
  ctx.restore();

  // lily pads — circles with a notch, gentle bob
  const padN = Math.round(clamp(4 * p.density, 2, 7));
  const padRnd = mulberry32(p.seed + 11);
  for (let i = 0; i < padN; i++) {
    const px = padRnd() * w;
    const py = padRnd() * h;
    const pr = m * (0.045 + padRnd() * 0.05);
    const bob = Math.sin(t * 0.5 * sp + i * 1.9) * m * 0.004;
    const rot = padRnd() * TAU + Math.sin(t * 0.2 + i) * 0.05;
    ctx.save();
    ctx.translate(px, py + bob);
    ctx.rotate(rot);
    ctx.fillStyle = rgba(shade(a3, -0.5), 0.85);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, pr, 0.32, TAU - 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(shade(a3, -0.62), 0.9);
    ctx.lineWidth = Math.max(0.8, pr * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(0.32) * pr, Math.sin(0.32) * pr);
    ctx.stroke();
    // vein hint
    ctx.strokeStyle = rgba(shade(a3, -0.35), 0.4);
    ctx.lineWidth = Math.max(0.6, pr * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(2.4) * pr * 0.85, Math.sin(2.4) * pr * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // tap ripples — expanding rings
  ctx.save();
  st.ripples = st.ripples.filter((r) => t - r.t0 < 1.6);
  for (const r of st.ripples) {
    const age = (t - r.t0) / 1.6;
    for (let ring = 0; ring < 2; ring++) {
      const rr = (age + ring * 0.18) * m * 0.3;
      if (rr <= 0) continue;
      ctx.strokeStyle = rgba("#ffffff", Math.max(0, (1 - age) * 0.4 - ring * 0.12));
      ctx.lineWidth = Math.max(1, m * 0.004 * (1 - age));
      ctx.beginPath();
      ctx.arc(r.x, r.y, rr, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();

  // koi — wander, flee the pointer, undulate
  for (const k of st.koi) {
    // wander force from layered sines
    const wx = Math.sin(t * 0.35 * sp + k.ph * 2.3) * m * 0.5;
    const wy = Math.cos(t * 0.28 * sp + k.ph * 1.7) * m * 0.5;
    const homeX = k.hx * w;
    const homeY = k.hy * h;
    k.vx += ((homeX + wx) - k.x) * dt * 0.5;
    k.vy += ((homeY + wy) - k.y) * dt * 0.5;

    // flee the pointer
    if (ptr) {
      const dx = k.x - ptr.x;
      const dy = k.y - ptr.y;
      const d = Math.hypot(dx, dy);
      const R = m * 0.3;
      if (d < R && d > 0.001) {
        const f = (1 - d / R) * (ptr.down ? 2.6 : 1.3);
        k.vx += (dx / d) * f * m * dt * 3.2;
        k.vy += (dy / d) * f * m * dt * 3.2;
        k.panic = Math.min(1, k.panic + dt * 3);
      }
    }

    // soft wall repulsion
    const wall = m * 0.08;
    if (k.x < wall) k.vx += (wall - k.x) * dt * 4;
    if (k.x > w - wall) k.vx -= (k.x - (w - wall)) * dt * 4;
    if (k.y < wall) k.vy += (wall - k.y) * dt * 4;
    if (k.y > h - wall) k.vy -= (k.y - (h - wall)) * dt * 4;

    const fr = Math.exp(-dt * (k.panic > 0.1 ? 1.1 : 1.9));
    k.vx *= fr;
    k.vy *= fr;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    k.panic *= Math.exp(-dt * 1.2);

    // heading follows velocity
    const speed = Math.hypot(k.vx, k.vy);
    if (speed > m * 0.008) {
      const targetAng = Math.atan2(k.vy, k.vx);
      let da = targetAng - k.ang;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      k.ang += da * Math.min(1, dt * 6);
    }

    // draw — tapered undulating body
    const size = m * 0.052 * k.size;
    const und = Math.sin(t * (4 + speed / m * 6) * sp + k.ph) * size * (0.24 + k.panic * 0.3);
    const cols = [size * 1.05, size * 0.78, size * 0.52, size * 0.3, size * 0.14];
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.ang);
    const bodyCol = p.colors[k.c];
    // tail first (behind body)
    ctx.strokeStyle = rgba(shade(bodyCol, -0.2), 0.75);
    ctx.lineCap = "round";
    ctx.lineWidth = size * 0.14;
    ctx.beginPath();
    ctx.moveTo(-size * 1.1, und * 0.4);
    ctx.quadraticCurveTo(-size * 1.55, und * 1.2, -size * 1.9, und * 2.1);
    ctx.stroke();
    // body segments
    for (let s = 0; s < cols.length; s++) {
      const bx = -s * size * 0.42;
      const by = und * Math.sin((s / cols.length) * Math.PI) * 1.6 * (s === 0 ? 0.2 : 1);
      ctx.fillStyle = rgba(s === 0 ? shade(bodyCol, 0.1) : bodyCol, 0.95 - s * 0.06);
      ctx.beginPath();
      ctx.ellipse(bx, by, cols[s] * 0.62, cols[s], 0, 0, TAU);
      ctx.fill();
    }
    // pattern patch
    ctx.fillStyle = rgba(shade(bodyCol, -0.55), 0.6);
    ctx.beginPath();
    ctx.ellipse(-size * 0.55, und * 0.7, size * 0.3, size * 0.42, 0.4, 0, TAU);
    ctx.fill();
    // pectoral fins
    ctx.fillStyle = rgba(shade(bodyCol, 0.22), 0.55);
    const fin = size * 0.5;
    ctx.beginPath();
    ctx.ellipse(size * 0.16, size * 0.72, fin * 0.55, fin * 0.26, 0.7 + und * 0.02, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.16, -size * 0.72, fin * 0.55, fin * 0.26, -0.7 - und * 0.02, 0, TAU);
    ctx.fill();
    // eyes + highlight
    ctx.fillStyle = rgba("#111111", 0.85);
    ctx.beginPath();
    ctx.arc(size * 0.4, size * 0.3, size * 0.07, 0, TAU);
    ctx.arc(size * 0.4, -size * 0.3, size * 0.07, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba("#ffffff", 0.3);
    ctx.beginPath();
    ctx.ellipse(size * 0.3, -size * 0.14, size * 0.3, size * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // surface vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.42));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 34 · Vinyl Lounge — sweep scratches the record, tap drops the needle */
/* ------------------------------------------------------------------ */

type VinylState = { scratch: number; drops: { t0: number }[]; wobble: number };

const vinylLounge: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  fillBg(ctx, w, h, shade(bg0, -0.12), bg1);

  const st = canvasState<VinylState>(ctx, `vinyl${p.seed}|${p.density}`, () => ({
    scratch: 0,
    drops: [],
    wobble: 0,
  }));
  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  const cx = w * 0.5;
  const cy = h * 0.46;
  const R = m * 0.36;

  if (env) {
    // scratching — horizontal sweeps over the record
    if (ptr && ptr.inside && Math.hypot(ptr.x - cx, ptr.y - cy) < R * 1.15) {
      st.scratch = clamp(st.scratch + env.pointer.vx * 2.6, -14, 14);
      st.wobble = clamp(st.wobble + Math.abs(env.pointer.vx) * 0.5, 0, 1);
    }
    for (let ti = 0; ti < env.pointer.taps.length; ti++) {
      st.drops.push({ t0: t });
      if (st.drops.length > 5) st.drops.shift();
      st.wobble = Math.min(1, st.wobble + 0.6);
    }
  }
  st.scratch *= Math.exp(-dt * 1.6);
  st.wobble *= Math.exp(-dt * 2.4);
  st.drops = st.drops.filter((d) => t - d.t0 < 2.4);

  const spin = t * 0.9 * sp + st.scratch;
  const wob = Math.sin(t * 34) * st.wobble * 0.006;

  // warm lamp glow + shelf vibe
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.2, h * 0.08, m * 0.4, a2, 0.1 + p.glow * 0.08);
  softOrb(ctx, w * 0.85, h * 0.1, m * 0.3, a3, 0.07 + p.glow * 0.05);
  ctx.restore();

  // dust motes drifting in the lamplight
  const moteN = Math.round(clamp(26 * p.density * areaScale(w, h), 14, 60));
  const mr = mulberry32(p.seed + 3);
  ctx.save();
  for (let i = 0; i < moteN; i++) {
    const mx = mr() * w + Math.sin(t * 0.3 * sp + mr() * TAU) * m * 0.02;
    const my = ((mr() * h + t * (4 + mr() * 8) * sp) % (h + m * 0.1)) - m * 0.05;
    const a = 0.06 + 0.12 * Math.abs(Math.sin(t * (0.8 + mr()) + i));
    ctx.fillStyle = rgba(a3, a);
    ctx.beginPath();
    ctx.arc(mx, h - my, m * 0.0016, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // record — vinyl disc with grooves
  ctx.save();
  ctx.translate(cx + wob * m, cy);
  ctx.rotate(spin * 0.15);

  // disc base
  const discG = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  discG.addColorStop(0, "#181614");
  discG.addColorStop(0.82, "#111010");
  discG.addColorStop(0.88, "#1c1a18");
  discG.addColorStop(1, "#0c0b0b");
  ctx.fillStyle = discG;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();

  // grooves
  const grooveN = 26;
  for (let g = 0; g < grooveN; g++) {
    const gr = R * (0.34 + (g / grooveN) * 0.62);
    ctx.strokeStyle = rgba("#ffffff", g % 4 === 0 ? 0.05 : 0.028);
    ctx.lineWidth = Math.max(0.6, R * 0.004);
    ctx.beginPath();
    ctx.arc(0, 0, gr, 0, TAU);
    ctx.stroke();
  }

  // rotating sheen wedge — the vinyl shine
  const sheenA0 = 0.5 + Math.sin(t * 0.4 * sp) * 0.3;
  const sheen = ctx.createConicGradient?.(sheenA0, 0, 0);
  if (sheen) {
    sheen.addColorStop(0, rgba("#ffffff", 0));
    sheen.addColorStop(0.08, rgba("#ffffff", 0.09 + p.glow * 0.05));
    sheen.addColorStop(0.16, rgba("#ffffff", 0));
    sheen.addColorStop(0.55, rgba("#ffffff", 0));
    sheen.addColorStop(0.63, rgba("#ffffff", 0.06 + p.glow * 0.04));
    sheen.addColorStop(0.71, rgba("#ffffff", 0));
    sheen.addColorStop(1, rgba("#ffffff", 0));
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
  }

  // label
  const labelR = R * 0.3;
  const labelG = ctx.createRadialGradient(0, 0, 0, 0, 0, labelR);
  labelG.addColorStop(0, rgba(a1, 1));
  labelG.addColorStop(1, rgba(shade(a1, -0.3), 1));
  ctx.fillStyle = labelG;
  ctx.beginPath();
  ctx.arc(0, 0, labelR, 0, TAU);
  ctx.fill();
  // label ring text dots
  ctx.strokeStyle = rgba("#ffffff", 0.28);
  ctx.lineWidth = Math.max(1, R * 0.006);
  ctx.beginPath();
  ctx.arc(0, 0, labelR * 0.78, 0, TAU);
  ctx.stroke();
  // spindle
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.028, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(a3, 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.014, 0, TAU);
  ctx.fill();

  // needle-drop pulses — sound rings from the label
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of st.drops) {
    const age = (t - d.t0) / 2.4;
    for (let ring = 0; ring < 3; ring++) {
      const rr = ((age + ring * 0.14) % 1) * R * 1.5;
      const a = Math.max(0, (1 - age) * 0.5 - ring * 0.1);
      if (a <= 0.004 || rr < labelR) continue;
      ctx.strokeStyle = rgba(a2, a);
      ctx.lineWidth = Math.max(1, R * 0.012 * (1 - age));
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();

  // tonearm — pivots from the top-right, reaches onto the record
  ctx.save();
  const pivotX = cx + R * 1.18;
  const pivotY = cy - R * 1.05;
  const armLen = R * 1.34;
  const armAng = Math.PI * 0.72 + Math.sin(t * 0.11 * sp) * 0.045 + st.wobble * 0.06;
  ctx.strokeStyle = rgba("#d6d3d1", 0.85);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2, m * 0.007);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(pivotX + Math.cos(armAng) * armLen, pivotY + Math.sin(armAng) * armLen);
  ctx.stroke();
  // headshell
  const hx2 = pivotX + Math.cos(armAng) * armLen;
  const hy2 = pivotY + Math.sin(armAng) * armLen;
  ctx.fillStyle = rgba(a2, 0.95);
  ctx.beginPath();
  ctx.roundRect(hx2 - m * 0.016, hy2 - m * 0.01, m * 0.032, m * 0.02, m * 0.005);
  ctx.fill();
  // pivot base
  ctx.fillStyle = rgba("#d6d3d1", 0.9);
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, m * 0.016, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba("#57534e", 0.9);
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, m * 0.008, 0, TAU);
  ctx.fill();
  ctx.restore();

  // music notes float up on needle drops
  ctx.save();
  ctx.font = `${Math.round(m * 0.05)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  for (const d of st.drops) {
    const age = t - d.t0;
    if (age > 2) continue;
    const notePh = age * 2.2;
    for (let nn = 0; nn < 3; nn++) {
      const nx = cx + Math.sin(age * 2 + nn * 2.4) * R * 0.5;
      const ny = cy - R * 0.4 - notePh * m * 0.16 - nn * m * 0.05;
      const a = Math.max(0, (1 - age / 2) * 0.7);
      ctx.fillStyle = rgba(a3, a);
      ctx.fillText(nn % 2 ? "♪" : "♫", nx, ny);
    }
  }
  ctx.restore();

  // bottom shelf shadow
  const shelf = ctx.createLinearGradient(0, h * 0.88, 0, h);
  shelf.addColorStop(0, rgba("#000000", 0));
  shelf.addColorStop(1, rgba("#000000", 0.55));
  ctx.fillStyle = shelf;
  ctx.fillRect(0, h * 0.88, w, h * 0.12);
};

/* ------------------------------------------------------------------ */
/* 35 · Snow Globe — stir the snow, tap the glass for shimmer          */
/* ------------------------------------------------------------------ */

type SnowState = {
  flakes: { x: number; y: number; r: number; ph: number; sp: number; c: number; ox: number; oy: number }[];
  ripples: { x: number; y: number; t0: number }[];
  swirl: number;
};

const snowGlobe: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  // backdrop shelf — dark room behind the glass
  fillBg(ctx, w, h, shade(bg0, -0.55), shade(bg0, -0.7));

  const st = canvasState<SnowState>(ctx, `globe${p.seed}|${p.density}`, () => {
    const flakes: SnowState["flakes"] = [];
    const n = Math.round(clamp(90 * p.density * areaScale(w, h), 40, 190));
    for (let i = 0; i < n; i++) {
      flakes.push({
        x: rnd(), y: rnd(),
        r: 0.35 + rnd() * 1.15,
        ph: rnd() * TAU,
        sp: 0.5 + rnd() * 1.1,
        c: 2 + Math.floor(rnd() * 3),
        ox: 0, oy: 0,
      });
    }
    return { flakes, ripples: [], swirl: 0 };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  // sphere geometry — centered slightly above mid
  const cx = w / 2;
  const cy = h * 0.42;
  const R = Math.min(w * 0.42, h * 0.34);

  if (env) {
    for (const tap of env.pointer.taps) {
      st.ripples.push({ x: tap.x * w, y: tap.y * h, t0: t });
      if (st.ripples.length > 8) st.ripples.shift();
    }
  }
  st.ripples = st.ripples.filter((r) => t - r.t0 < 1.2);

  // inside the glass -----------------------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();

  // winter sky
  const sky = ctx.createLinearGradient(0, cy - R, 0, cy + R);
  sky.addColorStop(0, shade(bg0, -0.15));
  sky.addColorStop(1, bg1);
  ctx.fillStyle = sky;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // moon glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, cx + R * 0.42, cy - R * 0.5, R * 0.3, a3, 0.16 + p.glow * 0.12);
  ctx.restore();

  // distant pines
  const pines = Math.round(clamp(7 * p.density, 4, 11));
  for (let i = 0; i < pines; i++) {
    const px = cx - R + ((i + 0.5) / pines) * R * 2 + Math.sin(i * 3.7) * R * 0.03;
    const ph2 = R * (0.16 + ((i * 13) % 7) / 40);
    const py = cy + R * 0.62 - ph2 * 0.1;
    ctx.fillStyle = rgba(shade(bg0, -0.45), 0.85);
    for (let s = 0; s < 3; s++) {
      const sw = ph2 * (0.42 - s * 0.1);
      const sy = py - (ph2 * s) / 3;
      ctx.beginPath();
      ctx.moveTo(px - sw, sy);
      ctx.lineTo(px, sy - ph2 * 0.5);
      ctx.lineTo(px + sw, sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  // cozy cottage with a warm window
  const hx = cx - R * 0.28;
  const hy = cy + R * 0.55;
  const hs = R * 0.16;
  ctx.fillStyle = rgba(shade(bg0, -0.5), 0.95);
  ctx.fillRect(hx - hs, hy - hs * 0.8, hs * 2, hs * 0.8);
  ctx.beginPath();
  ctx.moveTo(hx - hs * 1.2, hy - hs * 0.8);
  ctx.lineTo(hx, hy - hs * 1.5);
  ctx.lineTo(hx + hs * 1.2, hy - hs * 0.8);
  ctx.closePath();
  ctx.fill();
  // window glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const win = 0.5 + 0.5 * Math.sin(t * 0.8 * sp + 1.2);
  softOrb(ctx, hx, hy - hs * 0.35, hs * 0.55 * (1 + win * 0.1), a3, (0.35 + win * 0.2) * (0.5 + p.glow * 0.5), 0.8);
  ctx.restore();

  // snow — falls, drifts, and swirls around the pointer
  const dec = Math.exp(-dt * 1.6);
  st.swirl *= Math.exp(-dt * 0.9);
  for (const f of st.flakes) {
    f.ox *= dec;
    f.oy *= dec;

    const travel = R * 2.25;
    const fallY = cy - R - f.y * travel + ((t * f.sp * m * 0.055 * sp + f.ph * m * 0.12) % travel);
    const baseX = cx - R + f.x * R * 2 + Math.sin(t * 0.7 * sp + f.ph) * R * 0.05;

    if (ptr && ptr.inside !== false) {
      const dx = baseX + f.ox - ptr.x;
      const dy = fallY + f.oy - ptr.y;
      const d = Math.hypot(dx, dy);
      const Rr = m * 0.3;
      if (d < Rr && d > 0.001) {
        const k = 1 - d / Rr;
        // tangential swirl + slight outward push
        const tx = -dy / d;
        const ty = dx / d;
        const push = k * (ptr.down ? 1.5 : 0.7);
        f.ox += (tx * 0.9 + (dx / d) * 0.5) * push * m * 0.05 * dt;
        f.oy += (ty * 0.9 + (dy / d) * 0.5) * push * m * 0.05 * dt;
        st.swirl = Math.min(1, st.swirl + k * dt * 2);
      }
    }

    const fx = baseX + f.ox;
    const fy = fallY + f.oy;
    const fl = 0.55 + 0.45 * Math.sin(t * f.sp * 2.2 + f.ph * 3);
    glowDot(ctx, fx, fy, f.r * (0.7 + p.glow * 0.35), p.colors[f.c], 4 * p.glow * fl, 0.5 + fl * 0.45);
  }
  ctx.restore();

  // glass shell — edge highlight + specular arcs
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba("#ffffff", 0.1 + p.glow * 0.08);
  ctx.lineWidth = Math.max(1, m * 0.008);
  ctx.beginPath();
  ctx.arc(cx, cy, R - m * 0.006, 0, TAU);
  ctx.stroke();
  // top-left specular arc
  ctx.strokeStyle = rgba("#ffffff", 0.3 + p.glow * 0.2);
  ctx.lineWidth = Math.max(1.5, m * 0.014);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.86, Math.PI * 1.12, Math.PI * 1.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.93, Math.PI * 1.2, Math.PI * 1.3);
  ctx.stroke();
  // inner bloom at rim
  softOrb(ctx, cx - R * 0.45, cy - R * 0.5, R * 0.5, a1, 0.05 + p.glow * 0.04);
  ctx.restore();

  // glass shimmer ripples from taps
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const r of st.ripples) {
    const age = (t - r.t0) / 1.2;
    ctx.strokeStyle = rgba(a3, (1 - age) * 0.5);
    ctx.lineWidth = Math.max(1, m * 0.007 * (1 - age));
    ctx.beginPath();
    ctx.arc(r.x, r.y, age * m * 0.3, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", (1 - age) * 0.3);
    ctx.beginPath();
    ctx.arc(r.x, r.y, age * m * 0.2, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  // base — turned wood pedestal
  const baseY = cy + R * 0.98;
  const bw = R * 1.05;
  const base = ctx.createLinearGradient(0, baseY, 0, baseY + m * 0.09);
  base.addColorStop(0, shade(a2, -0.15));
  base.addColorStop(1, shade(bg0, -0.35));
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, baseY, bw, m * 0.05, m * 0.012);
  ctx.fill();
  ctx.fillStyle = shade(bg0, -0.42);
  ctx.beginPath();
  ctx.roundRect(cx - bw * 0.36, baseY + m * 0.05, bw * 0.72, m * 0.04, m * 0.01);
  ctx.fill();
  // base highlight
  ctx.fillStyle = rgba(a3, 0.14);
  ctx.fillRect(cx - bw * 0.4, baseY + m * 0.006, bw * 0.8, Math.max(1, m * 0.004));

  // floor shadow
  const sh = ctx.createRadialGradient(cx, baseY + m * 0.1, 0, cx, baseY + m * 0.1, bw * 0.8);
  sh.addColorStop(0, rgba("#000000", 0.5));
  sh.addColorStop(1, rgba("#000000", 0));
  ctx.fillStyle = sh;
  ctx.fillRect(cx - bw, baseY, bw * 2, m * 0.22);
};

/* ------------------------------------------------------------------ */
/* 36 · Neon Rain — the rain bends away from your cursor               */
/* ------------------------------------------------------------------ */

type RainCityState = {
  drops: { x: number; y: number; len: number; sp: number; ph: number; c: number; ox: number }[];
  splashes: { x: number; y: number; t0: number }[];
  flick: number;
  wind: number;
};

const neonRain: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<RainCityState>(ctx, `ncity${p.seed}|${p.density}`, () => {
    const drops: RainCityState["drops"] = [];
    const n = Math.round(clamp(110 * p.density * areaScale(w, h), 50, 210));
    for (let i = 0; i < n; i++) {
      drops.push({
        x: rnd(), y: rnd(),
        len: 0.5 + rnd() * 1.3,
        sp: 0.8 + rnd() * 1.5,
        ph: rnd() * TAU,
        c: 2 + Math.floor(rnd() * 3),
        ox: 0,
      });
    }
    return { drops, splashes: [], flick: 0, wind: 0 };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      st.splashes.push({ x: tap.x * w, y: tap.y * h, t0: t });
      if (st.splashes.length > 10) st.splashes.shift();
      st.flick = 1;
    }
  }
  st.splashes = st.splashes.filter((s) => t - s.t0 < 0.9);
  st.flick *= Math.exp(-dt * 3);

  // skyline — two layers of silhouette towers with neon windows
  const drawSkyline = (baseY: number, hMin: number, hMax: number, seed2: number, alpha: number, winColor: string) => {
    const r2 = mulberry32(seed2);
    let x = -w * 0.02;
    while (x < w * 1.02) {
      const bw = w * (0.05 + r2() * 0.09);
      const bh = h * (hMin + r2() * (hMax - hMin));
      ctx.fillStyle = rgba(shade(bg0, -0.5), alpha);
      ctx.fillRect(x, baseY - bh, bw, bh);
      // windows grid
      const cols = Math.max(1, Math.floor(bw / (m * 0.035)));
      const rows = Math.max(1, Math.floor(bh / (m * 0.045)));
      for (let c2 = 0; c2 < cols; c2++) {
        for (let r3 = 0; r3 < rows; r3++) {
          if (r2() > 0.72) {
            const wx = x + (c2 + 0.5) * (bw / cols);
            const wy = baseY - bh + (r3 + 0.5) * (bh / rows);
            ctx.fillStyle = rgba(winColor, 0.5 + r2() * 0.4);
            ctx.fillRect(wx - m * 0.004, wy - m * 0.005, m * 0.008, m * 0.01);
          }
        }
      }
      x += bw + w * 0.012;
    }
  };

  // flicker boost after taps
  const flickBoost = 1 + st.flick * 1.6;

  // neon sign orbs on buildings
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const nx = w * (0.1 + i * 0.19) + Math.sin(i * 2.7) * w * 0.02;
    const ny = h * (0.2 + 0.13 * ((i * 3) % 4));
    const pulse = 0.6 + 0.4 * Math.sin(t * (1.2 + i * 0.4) * sp + i * 2.1);
    softOrb(ctx, nx, ny, m * (0.05 + 0.02 * (i % 2)) * flickBoost, [a1, a2, a3][i % 3], (0.14 + pulse * 0.12 + p.glow * 0.1) * flickBoost);
  }
  ctx.restore();

  drawSkyline(h * 0.82, 0.18, 0.4, p.seed + 11, 0.9, a3);
  drawSkyline(h * 0.95, 0.1, 0.28, p.seed + 77, 0.75, a1);

  // wet street reflections
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const ry = h * (0.86 + i * 0.035);
    const g = ctx.createLinearGradient(0, ry, w, ry + m * 0.02);
    g.addColorStop(0, rgba([a1, a2, a3][i % 3], 0));
    g.addColorStop(0.5, rgba([a1, a2, a3][i % 3], 0.08 + p.glow * 0.05));
    g.addColorStop(1, rgba([a1, a2, a3][i % 3], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, ry, w, m * 0.012);
  }
  ctx.restore();

  // rain — bends away from the cursor like a windshield gust
  const dec = Math.exp(-dt * 2.2);
  if (ptr) st.wind += ((ptr.vx / (m * 2)) * 0.4 - st.wind) * Math.min(1, dt * 3);
  for (const d of st.drops) {
    d.ox *= dec;

    const travel = h * 1.25;
    const fallY = (d.y * travel + t * d.sp * m * 0.32 * sp) % travel - h * 0.12;
    const baseX = d.x * w + Math.sin(t * 0.9 * sp + d.ph) * m * 0.01;

    if (ptr) {
      const dx = baseX + d.ox - ptr.x;
      const dy = fallY - ptr.y;
      const dist = Math.hypot(dx, dy);
      const Rr = m * 0.36;
      if (dist < Rr && dist > 0.001 && fallY > ptr.y - m * 0.05) {
        const k = (1 - dist / Rr) * (ptr.down ? 1.8 : 1);
        d.ox += (dx / dist) * k * m * 0.09 * dt;
      }
    }
    // global wind from pointer sweeps
    d.ox += st.wind * m * 0.02 * dt * d.sp;

    const rx = baseX + d.ox;
    const ry = fallY;
    const ln = m * 0.028 * d.len;
    ctx.strokeStyle = rgba(p.colors[d.c], 0.34 + p.glow * 0.14);
    ctx.lineWidth = Math.max(0.8, m * 0.0022);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - (d.ox * 0.02 + st.wind * m * 0.004), ry + ln);
    ctx.stroke();
  }

  // splashes
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const s of st.splashes) {
    const age = (t - s.t0) / 0.9;
    ctx.strokeStyle = rgba(a3, (1 - age) * 0.6);
    ctx.lineWidth = Math.max(1, m * 0.005 * (1 - age));
    ctx.beginPath();
    ctx.arc(s.x, s.y, age * m * 0.22, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", (1 - age) * 0.4);
    ctx.beginPath();
    ctx.arc(s.x, s.y, age * m * 0.13, 0, TAU);
    ctx.stroke();
    softOrb(ctx, s.x, s.y, m * (0.04 + age * 0.1), a1, (1 - age) * 0.5 * (0.5 + p.glow * 0.5));
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, m * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.55));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 37 · Whale Song — the giant drifts toward you, tap sings sonar      */
/* ------------------------------------------------------------------ */

type WhaleState = {
  whale: { x: number; y: number; ang: number; v: number; dive: number };
  sonar: { x: number; y: number; t0: number }[];
  fish: { hx: number; hy: number; ph: number; r: number }[];
};

const whaleSong: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, shade(bg0, -0.15), bg1);

  const st = canvasState<WhaleState>(ctx, `whale${p.seed}|${p.density}`, () => ({
    whale: { x: w * 0.3, y: h * 0.45, ang: 0.4, v: m * 0.02, dive: 0 },
    sonar: [],
    fish: Array.from({ length: Math.round(clamp(26 * p.density, 12, 46)) }, () => ({
      hx: rnd(), hy: rnd(), ph: rnd() * TAU, r: 0.5 + rnd() * 1,
    })),
  }));

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      st.sonar.push({ x: tap.x * w, y: tap.y * h, t0: t });
      if (st.sonar.length > 6) st.sonar.shift();
      st.whale.dive = 1; // excited breach impulse
    }
  }
  st.sonar = st.sonar.filter((s) => t - s.t0 < 2.4);

  // light shafts from the surface
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const lx = w * (0.15 + i * 0.24) + Math.sin(t * 0.12 * sp + i * 1.9) * w * 0.04;
    const g = ctx.createLinearGradient(lx, 0, lx + m * 0.1, h * 0.9);
    g.addColorStop(0, rgba(a1, 0.09 + p.glow * 0.05));
    g.addColorStop(1, rgba(a1, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx - m * 0.015, 0);
    ctx.lineTo(lx + m * 0.045, 0);
    ctx.lineTo(lx + m * 0.14, h);
    ctx.lineTo(lx - m * 0.08, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // plankton motes
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < Math.round(clamp(30 * p.density, 16, 52)); i++) {
    const px2 = ((i * 137.5) % 100) / 100;
    const py2 = ((i * 61.8) % 100) / 100;
    const tw = 0.4 + 0.6 * Math.sin(t * (0.8 + (i % 5) * 0.3) + i * 2.7);
    softOrb(ctx, px2 * w, py2 * h, m * 0.004 + tw * m * 0.002, a1, 3 * p.glow, 0.2 + tw * 0.3);
  }
  ctx.restore();

  // whale physics — gentle attract toward the pointer
  const wh = st.whale;
  const size = m * 0.19;
  let targetAng = wh.ang;
  if (ptr) {
    const dx = ptr.x - wh.x;
    const dy = ptr.y - wh.y;
    const d = Math.hypot(dx, dy);
    if (d > m * 0.15) {
      targetAng = Math.atan2(dy, dx);
    }
  }
  // steer smoothly + gentle wandering
  let dAng = targetAng - wh.ang;
  while (dAng > Math.PI) dAng -= TAU;
  while (dAng < -Math.PI) dAng += TAU;
  wh.ang += dAng * Math.min(1, dt * 0.9) + Math.sin(t * 0.3 * sp) * dt * 0.12;
  wh.v += (m * 0.045 * sp * (ptr ? 1.25 : 1) - wh.v) * Math.min(1, dt * 0.8);
  wh.x += Math.cos(wh.ang) * wh.v * dt * 6;
  wh.y += Math.sin(wh.ang) * wh.v * dt * 6 + Math.sin(t * 0.8 * sp) * m * 0.02 * dt * 6 * (0.4 + wh.dive);
  wh.dive *= Math.exp(-dt * 1.4);

  // keep in bounds — steer back when near edges
  const pad = m * 0.16;
  if (wh.x < pad || wh.x > w - pad || wh.y < pad || wh.y > h - pad) {
    const toC = Math.atan2(h / 2 - wh.y, w / 2 - wh.x);
    let dc = toC - wh.ang;
    while (dc > Math.PI) dc -= TAU;
    while (dc < -Math.PI) dc += TAU;
    wh.ang += dc * Math.min(1, dt * 2.4);
  }

  // draw the whale — body, fluke, fin, eye + belly glow
  ctx.save();
  ctx.translate(wh.x, wh.y);
  ctx.rotate(wh.ang);
  const wag = Math.sin(t * 1.6 * sp + 1) * 0.28;

  // fluke (tail)
  ctx.fillStyle = rgba(shade(a2, -0.25), 0.92);
  ctx.save();
  ctx.translate(-size * 0.95, 0);
  ctx.rotate(wag * 0.6);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.5, -size * 0.42, -size * 0.72, -size * 0.5);
  ctx.quadraticCurveTo(-size * 0.34, -size * 0.06, -size * 0.3, 0);
  ctx.quadraticCurveTo(-size * 0.34, size * 0.06, -size * 0.72, size * 0.5);
  ctx.quadraticCurveTo(-size * 0.5, size * 0.42, 0, 0);
  ctx.fill();
  ctx.restore();

  // body
  const bodyG = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  bodyG.addColorStop(0, shade(a2, -0.05));
  bodyG.addColorStop(1, shade(a2, -0.5));
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.quadraticCurveTo(size * 0.55, -size * 0.52, -size * 0.5, -size * 0.3);
  ctx.quadraticCurveTo(-size * 0.98, -size * 0.08, -size, 0);
  ctx.quadraticCurveTo(-size * 0.98, size * 0.1, -size * 0.5, size * 0.32);
  ctx.quadraticCurveTo(size * 0.55, size * 0.5, size, 0);
  ctx.fill();

  // belly stripe glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const belly = ctx.createLinearGradient(0, 0, 0, size * 0.4);
  belly.addColorStop(0, rgba(a1, 0));
  belly.addColorStop(1, rgba(a1, 0.16 + p.glow * 0.1));
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-size * 0.05, size * 0.22, size * 0.75, size * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // pectoral fin
  ctx.fillStyle = rgba(shade(a2, -0.35), 0.9);
  ctx.beginPath();
  ctx.moveTo(size * 0.1, size * 0.22);
  ctx.quadraticCurveTo(-size * 0.1, size * 0.55 + wag * size * 0.12, -size * 0.34, size * 0.42);
  ctx.quadraticCurveTo(-size * 0.16, size * 0.24, size * 0.1, size * 0.22);
  ctx.fill();

  // eye + cheek glow
  ctx.fillStyle = rgba("#0b0b12", 0.85);
  ctx.beginPath();
  ctx.arc(size * 0.62, -size * 0.1, Math.max(1, size * 0.045), 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, size * 0.78, -size * 0.04, size * 0.3, a3, (0.3 + wh.dive * 0.4) * (0.5 + p.glow * 0.5));
  ctx.restore();

  ctx.restore();

  // sonar rings — expanding song
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const s of st.sonar) {
    const age = (t - s.t0) / 2.4;
    for (let ring = 0; ring < 3; ring++) {
      const rAge = clamp(age - ring * 0.14, 0, 1);
      if (rAge <= 0 || rAge >= 1) continue;
      ctx.strokeStyle = rgba(ring === 2 ? a3 : a1, (1 - rAge) * 0.4);
      ctx.lineWidth = Math.max(1, m * 0.006 * (1 - rAge));
      ctx.beginPath();
      ctx.arc(s.x, s.y, rAge * m * 0.55, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();

  // fish school — tiny deterministic wanderers that avoid the whale
  ctx.save();
  for (const f of st.fish) {
    const fx = (f.hx * w + Math.sin(t * 0.4 * sp + f.ph) * m * 0.06 + Math.cos(t * 0.13 + f.ph * 2) * m * 0.03);
    const fy = (f.hy * h + Math.cos(t * 0.33 * sp + f.ph * 1.3) * m * 0.05);
    const dxw = fx - wh.x;
    const dyw = fy - wh.y;
    const dw = Math.hypot(dxw, dyw);
    if (dw < size * 1.4 && dw > 0.001) {
      const push = (1 - dw / (size * 1.4)) * size * 0.5;
      ctx.fillStyle = rgba(a3, 0.55);
      ctx.beginPath();
      ctx.arc(fx + (dxw / dw) * push, fy + (dyw / dw) * push, f.r * (m * 0.0022), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = rgba(a1, 0.4);
      ctx.beginPath();
      ctx.arc(fx, fy, f.r * (m * 0.0022), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // depth vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.4, m * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.82);
  vg.addColorStop(0, rgba("#000000", 0));
  vg.addColorStop(1, rgba("#000000", 0.5));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 38 · Paper Cranes — an origami flock that banks away from you       */
/* ------------------------------------------------------------------ */

type CraneState = {
  cranes: { x: number; y: number; hx: number; hy: number; ph: number; size: number; c: number; ox: number; oy: number; vx: number; vy: number; spin: number }[];
  feathers: { x: number; y: number; vx: number; vy: number; t0: number; rot: number }[];
};

const paperCranes: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<CraneState>(ctx, `crane${p.seed}|${p.density}`, () => {
    const cranes: CraneState["cranes"] = [];
    const n = Math.round(clamp(12 * p.density * areaScale(w, h), 6, 20));
    for (let i = 0; i < n; i++) {
      cranes.push({
        x: 0, y: 0,
        hx: 0.1 + rnd() * 0.8, hy: 0.12 + rnd() * 0.7,
        ph: rnd() * TAU,
        size: 0.55 + rnd() * 0.75,
        c: 2 + Math.floor(rnd() * 3),
        ox: 0, oy: 0, vx: 0, vy: 0, spin: 0,
      });
    }
    return { cranes, feathers: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      // flutter burst — nearby cranes spin, paper feathers scatter
      for (const c of st.cranes) {
        const cx2 = c.hx * w + c.ox;
        const cy2 = c.hy * h + c.oy;
        const d = Math.hypot(cx2 - tap.x * w, cy2 - tap.y * h);
        const R = m * 0.34;
        if (d < R && d > 0.001) {
          const f = (1 - d / R);
          c.vx += ((cx2 - tap.x * w) / d) * f * m * 1.1;
          c.vy += ((cy2 - tap.y * h) / d) * f * m * 1.1;
          c.spin += f * 2.4;
        }
      }
      for (let i = 0; i < 7; i++) {
        st.feathers.push({
          x: tap.x * w + (rnd() - 0.5) * m * 0.05,
          y: tap.y * h + (rnd() - 0.5) * m * 0.05,
          vx: (rnd() - 0.5) * m * 0.22,
          vy: (rnd() - 0.7) * m * 0.2,
          t0: t,
          rot: rnd() * TAU,
        });
      }
      if (st.feathers.length > 60) st.feathers.splice(0, st.feathers.length - 60);
    }
  }
  st.feathers = st.feathers.filter((f) => t - f.t0 < 1.6);

  // sun disc + haze
  const sunX = w * 0.72;
  const sunY = h * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, sunX, sunY, m * 0.2, a3, 0.2 + p.glow * 0.15);
  softOrb(ctx, sunX, sunY, m * 0.09, "#ffffff", 0.1, 0.7);
  ctx.restore();

  // washi paper cloud bands
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const cy3 = h * (0.16 + i * 0.2) + Math.sin(t * 0.1 * sp + i * 2.4) * h * 0.02;
    const cw = w * (0.3 + ((i * 37) % 40) / 100);
    const cx3 = ((i * 53) % 100) / 100 * w;
    ctx.fillStyle = rgba("#ffffff", 0.045);
    ctx.beginPath();
    ctx.ellipse(cx3, cy3, cw * 0.5, m * 0.02 + (i % 2) * m * 0.008, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // crane flight update + draw
  const dec = Math.exp(-dt * 1.9);
  for (const c of st.cranes) {
    c.ox *= dec;
    c.oy *= dec;
    c.vx *= dec;
    c.vy *= dec;
    c.spin *= Math.exp(-dt * 2.2);

    const glide = Math.sin(t * 0.5 * sp + c.ph) * m * 0.045;
    const baseX = c.hx * w + glide;
    const baseY = c.hy * h + Math.sin(t * 0.34 * sp + c.ph * 1.7) * m * 0.03;

    // bank away from the pointer (elegant flee)
    if (ptr) {
      const dx = baseX + c.ox - ptr.x;
      const dy = baseY + c.oy - ptr.y;
      const d = Math.hypot(dx, dy);
      const R = m * 0.3;
      if (d < R && d > 0.001) {
        const k = (1 - d / R) * (ptr.down ? 1.7 : 1);
        c.ox += (dx / d) * k * m * 0.075 * dt;
        c.oy += (dy / d) * k * m * 0.075 * dt;
        c.spin += k * dt * 0.9;
      }
    }
    c.ox += c.vx * dt * 0.6;
    c.oy += c.vy * dt * 0.6;

    const x = baseX + c.ox;
    const y = baseY + c.oy;
    const s = m * 0.028 * c.size;
    const flap = Math.sin(t * (2.2 + c.size) * sp + c.ph) * 0.5;
    const color = p.colors[c.c];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(glide * 0.004 + c.spin);
    ctx.globalAlpha = 0.92;

    // soft shadow under the crane
    ctx.fillStyle = rgba("#000000", 0.12);
    ctx.beginPath();
    ctx.ellipse(s * 0.15, s * 0.85, s * 0.9, s * 0.18, 0, 0, TAU);
    ctx.fill();

    // body diamond
    ctx.fillStyle = rgba(color, 0.95);
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0);
    ctx.lineTo(0, -s * 0.28);
    ctx.lineTo(s * 0.9, 0);
    ctx.lineTo(0, s * 0.34);
    ctx.closePath();
    ctx.fill();

    // neck + head
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.06);
    ctx.lineTo(s * 1.35, -s * 0.34);
    ctx.lineTo(s * 1.5, -s * 0.22);
    ctx.lineTo(s * 0.6, s * 0.06);
    ctx.closePath();
    ctx.fill();

    // tail tip
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.04);
    ctx.lineTo(-s * 1.3, -s * 0.3);
    ctx.lineTo(-s * 1.18, s * 0.02);
    ctx.closePath();
    ctx.fill();

    // wings — two flapping triangles
    ctx.fillStyle = rgba(shade(color, 0.18), 0.88);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.2, -s * (0.9 + flap * 0.5), s * 0.5, -s * (0.7 + flap * 0.55));
    ctx.quadraticCurveTo(s * 0.28, -s * 0.3, 0, -s * 0.1);
    ctx.fill();
    ctx.fillStyle = rgba(shade(color, -0.1), 0.85);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.1, s * (0.55 - flap * 0.4), s * 0.42, s * (0.42 - flap * 0.4));
    ctx.quadraticCurveTo(s * 0.2, s * 0.15, 0, -s * 0.05);
    ctx.fill();

    // fold line highlights
    ctx.strokeStyle = rgba("#ffffff", 0.35);
    ctx.lineWidth = Math.max(0.6, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(s * 0.7, 0);
    ctx.stroke();

    ctx.restore();
  }

  // scattered paper feathers
  for (const f of st.feathers) {
    const age = (t - f.t0) / 1.6;
    const fx = f.x + f.vx * age;
    const fy = f.y + f.vy * age * (1 - age * 0.4) + age * age * m * 0.06;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(f.rot + age * 5);
    ctx.fillStyle = rgba(a3, (1 - age) * 0.75);
    ctx.beginPath();
    ctx.ellipse(0, 0, m * 0.008, m * 0.003, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // grain + vignette for the paper feel
  const vg = ctx.createRadialGradient(w / 2, h * 0.45, m * 0.4, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  vg.addColorStop(0, rgba(bg0, 0));
  vg.addColorStop(1, rgba(shade(bg0, -0.3), 0.4));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 39 · Murmuration — a starling flock that scatters from your touch   */
/* ------------------------------------------------------------------ */

type MurmBird = {
  hx: number;
  hy: number;
  ringR: number;
  ringSp: number;
  ph: number;
  size: number;
  c: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
};

type MurmState = {
  birds: MurmBird[];
  specks: { x: number; y: number; vx: number; vy: number; t0: number; ph: number }[];
  rings: { x: number; y: number; t0: number }[];
};

const murmuration: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<MurmState>(ctx, `murm${p.seed}|${p.density}`, () => {
    const birds: MurmBird[] = [];
    const n = Math.round(clamp(30 * p.density * areaScale(w, h), 12, 48));
    for (let i = 0; i < n; i++) {
      birds.push({
        hx: 0.12 + rnd() * 0.76,
        hy: 0.1 + rnd() * 0.66,
        ringR: 0.015 + rnd() * 0.085,
        ringSp: (0.16 + rnd() * 0.3) * (rnd() > 0.5 ? 1 : -1),
        ph: rnd() * TAU,
        size: 0.55 + rnd() * 0.8,
        c: 2 + Math.floor(rnd() * 3),
        ox: 0, oy: 0, vx: 0, vy: 0,
      });
    }
    return { birds, specks: [], rings: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  // shared attractor the whole flock orbits — one mind, many wings
  const ax = w * (0.5 + 0.3 * Math.sin(t * 0.15 * sp + 1.3));
  const ay = h * (0.44 + 0.27 * Math.sin(t * 0.115 * sp * 1.31));

  if (env) {
    for (const tap of env.pointer.taps) {
      // hawk-scare — radial impulse + loose feathers
      for (const b of st.birds) {
        const bx = b.hx * w + b.ox;
        const by = b.hy * h + b.oy;
        const d = Math.hypot(bx - tap.x * w, by - tap.y * h);
        const R = m * 0.42;
        if (d < R && d > 0.001) {
          const f = 1 - d / R;
          b.vx += ((bx - tap.x * w) / d) * f * m * 1.5;
          b.vy += ((by - tap.y * h) / d) * f * m * 1.5;
        }
      }
      for (let i = 0; i < 8; i++) {
        st.specks.push({
          x: tap.x * w + (rnd() - 0.5) * m * 0.06,
          y: tap.y * h + (rnd() - 0.5) * m * 0.06,
          vx: (rnd() - 0.5) * m * 0.24,
          vy: (rnd() - 0.62) * m * 0.22,
          t0: t,
          ph: rnd() * TAU,
        });
      }
      st.rings.push({ x: tap.x * w, y: tap.y * h, t0: t });
      if (st.specks.length > 64) st.specks.splice(0, st.specks.length - 64);
      if (st.rings.length > 8) st.rings.splice(0, st.rings.length - 8);
    }
  }
  st.specks = st.specks.filter((f) => t - f.t0 < 1.7);
  st.rings = st.rings.filter((r) => t - r.t0 < 1.2);

  // moon + haze
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.76, h * 0.16, m * 0.17, a3, 0.16 + p.glow * 0.12);
  softOrb(ctx, w * 0.76, h * 0.16, m * 0.07, "#ffffff", 0.08, 0.75);
  ctx.restore();

  // distant stars
  ctx.fillStyle = rgba("#ffffff", 0.5);
  for (let i = 0; i < 34; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h * 0.7;
    const tw = 0.35 + 0.3 * Math.sin(t * (0.6 + (i % 5) * 0.22) * sp + i * 2.7);
    ctx.globalAlpha = tw * 0.55;
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;

  // treeline silhouette
  ctx.fillStyle = rgba(shade(bg0, -0.5), 0.9);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += Math.max(6, w / 42)) {
    const th = h * (0.9 + 0.05 * Math.sin(x * 0.03 + p.seed) + 0.03 * Math.sin(x * 0.011 + p.seed * 2));
    ctx.lineTo(x, th);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // birds — chase the attractor, flee the finger
  const dec = Math.exp(-dt * 1.6);
  for (const b of st.birds) {
    const ringA = b.ph + t * b.ringSp * sp;
    const desiredX = ax + Math.cos(ringA) * b.ringR * w + Math.sin(t * 0.7 * sp + b.ph) * m * 0.012;
    const desiredY = ay + Math.sin(ringA) * b.ringR * h * 0.8 + Math.cos(t * 0.6 * sp + b.ph * 1.6) * m * 0.012;

    if (env) {
      b.ox += (desiredX - b.hx * w - b.ox) * Math.min(1, dt * 2.6);
      b.oy += (desiredY - b.hy * h - b.oy) * Math.min(1, dt * 2.6);
      if (ptr) {
        const bx = b.hx * w + b.ox;
        const by = b.hy * h + b.oy;
        const dx = bx - ptr.x;
        const dy = by - ptr.y;
        const d = Math.hypot(dx, dy);
        const R = m * 0.26;
        if (d < R && d > 0.001) {
          const k = (1 - d / R) * (ptr.down ? 2.1 : 1);
          b.ox += (dx / d) * k * m * 0.086 * dt;
          b.oy += (dy / d) * k * m * 0.086 * dt;
        }
      }
      b.ox += b.vx * dt * 0.55;
      b.oy += b.vy * dt * 0.55;
      b.vx *= dec;
      b.vy *= dec;
    }

    const x = env ? b.hx * w + b.ox : desiredX;
    const y = env ? b.hy * h + b.oy : desiredY;
    const s = m * 0.011 * b.size;
    const flap = Math.sin(t * (7 + b.size * 3) * sp + b.ph);
    const color = p.colors[b.c];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(ay - y, ax - x) * 0.14);
    ctx.fillStyle = rgba(color, 0.9);
    // left wing
    ctx.beginPath();
    ctx.moveTo(-s * 1.6, 0);
    ctx.quadraticCurveTo(-s * 0.5, -s * (0.9 + flap * 0.75), s * 0.2, -s * 0.12);
    ctx.quadraticCurveTo(-s * 0.7, s * (0.12 + flap * 0.2), -s * 1.6, 0);
    ctx.fill();
    // right wing
    ctx.beginPath();
    ctx.moveTo(s * 1.6, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * (0.9 + flap * 0.75), -s * 0.2, -s * 0.12);
    ctx.quadraticCurveTo(s * 0.7, s * (0.12 + flap * 0.2), s * 1.6, 0);
    ctx.fill();
    // body
    ctx.fillStyle = rgba(shade(color, 0.3), 0.85);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.05, s * 0.42, s * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // scattered feathers
  for (const f of st.specks) {
    const age = (t - f.t0) / 1.7;
    const fx = f.x + f.vx * age + Math.sin(age * 7 + f.ph) * m * 0.008;
    const fy = f.y + f.vy * age * (1 - age * 0.35) + age * age * m * 0.05;
    ctx.fillStyle = rgba(a3, (1 - age) * 0.6);
    ctx.beginPath();
    ctx.ellipse(fx, fy, m * 0.004, m * 0.0016, f.ph + age * 4, 0, TAU);
    ctx.fill();
  }

  // scare rings
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const r of st.rings) {
    const a = (t - r.t0) / 1.2;
    ctx.strokeStyle = rgba(a2, (1 - a) * 0.35);
    ctx.lineWidth = Math.max(1, m * 0.004 * (1 - a));
    ctx.beginPath();
    ctx.arc(r.x, r.y, a * m * 0.3, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  const vg = ctx.createRadialGradient(w / 2, h * 0.45, m * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.85);
  vg.addColorStop(0, rgba(bg0, 0));
  vg.addColorStop(1, rgba(shade(bg0, -0.35), 0.45));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 40 · Gravity Wells — your cursor bends the orbits, tap rains rocks  */
/* ------------------------------------------------------------------ */

type WellPlanet = {
  R: number;
  sp: number;
  ph: number;
  size: number;
  c: number;
  ring: boolean;
  ox: number;
  oy: number;
};

type WellState = {
  planets: WellPlanet[];
  rocks: { R: number; sp: number; ph: number; s: number; ox: number; oy: number }[];
  shower: { x: number; y: number; vx: number; vy: number; t0: number; c: number }[];
  rings: { x: number; y: number; t0: number }[];
};

const gravityWells: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<WellState>(ctx, `well${p.seed}|${p.density}`, () => {
    const planets: WellPlanet[] = [];
    const nP = Math.round(clamp(5 * p.density * areaScale(w, h), 3, 8));
    for (let i = 0; i < nP; i++) {
      planets.push({
        R: 0.13 + (i / nP) * 0.3 + rnd() * 0.03,
        sp: (0.1 + rnd() * 0.16) * (i % 2 ? 1 : 0.7),
        ph: rnd() * TAU,
        size: 0.5 + rnd() * 0.9,
        c: 2 + Math.floor(rnd() * 3),
        ring: rnd() > 0.66,
        ox: 0, oy: 0,
      });
    }
    const rocks = [];
    const nR = Math.round(clamp(56 * p.density * areaScale(w, h), 24, 90));
    for (let i = 0; i < nR; i++) {
      rocks.push({
        R: 0.16 + rnd() * 0.3,
        sp: 0.14 + rnd() * 0.4,
        ph: rnd() * TAU,
        s: 0.5 + rnd() * 1.4,
        ox: 0, oy: 0,
      });
    }
    return { planets, rocks, shower: [], rings: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);
  const cx = w / 2;
  const cy = h * 0.48;

  if (env) {
    for (const tap of env.pointer.taps) {
      // asteroid shower bursting out of the tap point
      const n = Math.round(12 * clamp(p.density, 0.5, 1.5));
      for (let i = 0; i < n; i++) {
        const ang = rnd() * TAU;
        const v = m * (0.16 + rnd() * 0.3);
        st.shower.push({
          x: tap.x * w,
          y: tap.y * h,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          t0: t + rnd() * 0.06,
          c: 2 + Math.floor(rnd() * 3),
        });
      }
      st.rings.push({ x: tap.x * w, y: tap.y * h, t0: t });
      if (st.shower.length > 90) st.shower.splice(0, st.shower.length - 90);
      if (st.rings.length > 8) st.rings.splice(0, st.rings.length - 8);
    }
  }
  st.shower = st.shower.filter((s) => t - s.t0 < 2.1);
  st.rings = st.rings.filter((r) => t - r.t0 < 1.3);

  // nebula wash
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, w * 0.24, h * 0.26, m * 0.42, a1, 0.05 + p.glow * 0.03);
  softOrb(ctx, w * 0.78, h * 0.7, m * 0.38, a2, 0.045 + p.glow * 0.03);
  ctx.restore();

  // starfield
  for (let i = 0; i < 60; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h;
    const tw = 0.3 + 0.35 * Math.sin(t * (0.5 + (i % 7) * 0.2) * sp + i * 1.9);
    ctx.fillStyle = rgba("#ffffff", tw * 0.6);
    const s = (i % 11 === 0) ? 1.8 : 1.1;
    ctx.fillRect(sx, sy, s, s);
  }

  // orbit guides
  ctx.strokeStyle = rgba("#ffffff", 0.045);
  ctx.lineWidth = 1;
  for (const pl of st.planets) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, pl.R * m * 1.18, pl.R * m, 0, 0, TAU);
    ctx.stroke();
  }

  // pointer gravity — everything leans in and swirls around the well
  const pull = (px2: number, py2: number, o: { ox: number; oy: number }, strength: number) => {
    if (!ptr) {
      o.ox *= Math.exp(-dt * 2.2);
      o.oy *= Math.exp(-dt * 2.2);
      return;
    }
    const x = px2 + o.ox;
    const y = py2 + o.oy;
    const dx = ptr.x - x;
    const dy = ptr.y - y;
    const d = Math.hypot(dx, dy);
    const R = m * 0.4;
    if (d < R && d > 0.001) {
      const f = (1 - d / R) * strength * (ptr.down ? 1.9 : 1);
      // radial pull + tangential swirl (orbit the finger)
      o.ox += (dx / d) * f * m * 0.05 * dt + (-dy / d) * f * m * 0.028 * dt;
      o.oy += (dy / d) * f * m * 0.05 * dt + (dx / d) * f * m * 0.028 * dt;
      const cap = m * 0.2;
      const od = Math.hypot(o.ox, o.oy);
      if (od > cap) {
        o.ox = (o.ox / od) * cap;
        o.oy = (o.oy / od) * cap;
      }
    } else {
      o.ox *= Math.exp(-dt * 2.2);
      o.oy *= Math.exp(-dt * 2.2);
    }
  };

  // asteroid belt
  for (const r of st.rocks) {
    const ang = r.ph + t * r.sp * sp;
    const bx = cx + Math.cos(ang) * r.R * m * 1.18;
    const by = cy + Math.sin(ang) * r.R * m * 0.82;
    pull(bx, by, r, 0.9);
    const x = bx + r.ox;
    const y = by + r.oy;
    ctx.fillStyle = rgba(a1, 0.5 + r.s * 0.2);
    ctx.fillRect(x, y, Math.max(1, r.s * m * 0.004), Math.max(1, r.s * m * 0.004));
  }

  // planets
  for (const pl of st.planets) {
    const ang = pl.ph + t * pl.sp * sp;
    const bx = cx + Math.cos(ang) * pl.R * m * 1.18;
    const by = cy + Math.sin(ang) * pl.R * m;
    pull(bx, by, pl, 0.65);
    const x = bx + pl.ox;
    const y = by + pl.oy;
    const pr = m * 0.026 * pl.size;
    const color = p.colors[pl.c];

    // shaded sphere
    ctx.save();
    const pg = ctx.createRadialGradient(x - pr * 0.4, y - pr * 0.4, pr * 0.1, x, y, pr);
    pg.addColorStop(0, shade(color, 0.35));
    pg.addColorStop(0.62, color);
    pg.addColorStop(1, shade(color, -0.55));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, TAU);
    ctx.fill();

    // ring
    if (pl.ring) {
      ctx.strokeStyle = rgba(shade(color, 0.4), 0.65);
      ctx.lineWidth = Math.max(1, pr * 0.16);
      ctx.beginPath();
      ctx.ellipse(x, y, pr * 1.75, pr * 0.5, ang * 0.3, 0, TAU);
      ctx.stroke();
    }

    // atmosphere glow
    ctx.globalCompositeOperation = "lighter";
    softOrb(ctx, x, y, pr * 2.1, color, 0.12 + p.glow * 0.1);
    ctx.restore();
  }

  // sun core
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, cx, cy, m * 0.1, a3, 0.4 + p.glow * 0.2);
  softOrb(ctx, cx, cy, m * 0.032, "#ffffff", 0.2, 0.85);
  ctx.restore();

  // asteroid shower
  for (const s of st.shower) {
    const age = t - s.t0;
    if (age < 0) continue;
    const drag = Math.exp(-age * 1.1);
    const x = s.x + s.vx * age * drag;
    const y = s.y + s.vy * age * drag + age * age * m * 0.05;
    const tx = s.x + s.vx * Math.max(0, age - 0.07) * drag;
    const ty = s.y + s.vy * Math.max(0, age - 0.07) * drag + Math.max(0, age - 0.07) ** 2 * m * 0.05;
    const a = Math.max(0, 1 - age / 2.1);
    ctx.strokeStyle = rgba(p.colors[s.c], a * 0.75);
    ctx.lineWidth = Math.max(1, m * 0.003);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // gravity rings
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const r of st.rings) {
    const a = (t - r.t0) / 1.3;
    ctx.strokeStyle = rgba(a3, (1 - a) * 0.4);
    ctx.lineWidth = Math.max(1, m * 0.005 * (1 - a));
    ctx.beginPath();
    ctx.arc(r.x, r.y, a * m * 0.26, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  const vg = ctx.createRadialGradient(cx, cy, m * 0.3, cx, cy, Math.max(w, h) * 0.85);
  vg.addColorStop(0, rgba(bg0, 0));
  vg.addColorStop(1, rgba(shade(bg0, -0.4), 0.5));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 41 · Spirit Orchids — hold still and flowers bloom for you          */
/* ------------------------------------------------------------------ */

type Orchid = {
  hx: number;
  hy: number;
  ph: number;
  size: number;
  c1: number;
  c2: number;
  petalN: number;
  bl: number;
  sway: number;
};

type OrchidState = {
  flowers: Orchid[];
  pollen: { x: number; y: number; sp: number; ph: number; s: number }[];
  loose: { x: number; y: number; vx: number; vy: number; t0: number; ph: number; c: number }[];
};

const spiritOrchids: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);

  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<OrchidState>(ctx, `orchid${p.seed}|${p.density}`, () => {
    const flowers: Orchid[] = [];
    const n = Math.round(clamp(7 * p.density * areaScale(w, h), 4, 11));
    for (let i = 0; i < n; i++) {
      flowers.push({
        hx: 0.12 + rnd() * 0.76,
        hy: 0.16 + rnd() * 0.62,
        ph: rnd() * TAU,
        size: 0.65 + rnd() * 0.8,
        c1: 2 + Math.floor(rnd() * 2),
        c2: 3 + Math.floor(rnd() * 2),
        petalN: 5 + Math.floor(rnd() * 3),
        bl: 0,
        sway: 0.6 + rnd() * 0.8,
      });
    }
    const pollen = [];
    const nP = Math.round(clamp(30 * p.density * areaScale(w, h), 14, 52));
    for (let i = 0; i < nP; i++) {
      pollen.push({ x: rnd(), y: rnd(), sp: 0.2 + rnd() * 0.5, ph: rnd() * TAU, s: 0.5 + rnd() });
    }
    return { flowers, pollen, loose: [] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (const tap of env.pointer.taps) {
      // petal storm from the nearest blooms + a soft ring
      for (const f of st.flowers) {
        const fx = f.hx * w;
        const fy = f.hy * h + Math.sin(t * f.sway * sp + f.ph) * m * 0.015;
        if (f.bl > 0.4) {
          const d = Math.hypot(fx - tap.x * w, fy - tap.y * h);
          if (d < m * 0.5) {
            const n = Math.round(3 + f.bl * 5);
            for (let i = 0; i < n; i++) {
              st.loose.push({
                x: fx + (rnd() - 0.5) * m * 0.03,
                y: fy + (rnd() - 0.5) * m * 0.03,
                vx: (rnd() - 0.5) * m * 0.14,
                vy: (rnd() - 0.4) * m * 0.1,
                t0: t,
                ph: rnd() * TAU,
                c: rnd() > 0.5 ? f.c1 : f.c2,
              });
            }
          }
        }
      }
      if (st.loose.length > 80) st.loose.splice(0, st.loose.length - 80);
    }
    // grow / close blooms
    for (const f of st.flowers) {
      const fx = f.hx * w;
      const fy = f.hy * h + Math.sin(t * f.sway * sp + f.ph) * m * 0.015;
      if (ptr) {
        const d = Math.hypot(fx - ptr.x, fy - ptr.y);
        const R = m * 0.24;
        if (d < R) {
          f.bl = clamp(f.bl + dt * (ptr.down ? 2.3 : 1.25) * (1 - (d / R) * 0.6), 0, 1);
          continue;
        }
      }
      f.bl = clamp(f.bl - dt * 0.3, 0, 1);
    }
  }
  st.loose = st.loose.filter((l) => t - l.t0 < 2.4);

  // drifting pollen
  for (const g of st.pollen) {
    const px = ((g.x + Math.sin(t * 0.09 * g.sp * sp + g.ph) * 0.03) % 1) * w;
    const py = ((g.y + t * 0.006 * g.sp * sp) % 1) * h;
    const tw = 0.4 + 0.3 * Math.sin(t * g.sp * 2 * sp + g.ph);
    if (ptr) {
      const d = Math.hypot(px - ptr.x, py - ptr.y);
      if (d < m * 0.18) {
        // pollen leans gently toward the pointer
        const k = (1 - d / (m * 0.18)) * 0.35;
        ctx.fillStyle = rgba(a3, tw * (0.45 + k * 0.5));
        ctx.beginPath();
        ctx.arc(px + (ptr.x - px) * k, py + (ptr.y - py) * k, g.s * m * 0.0032, 0, TAU);
        ctx.fill();
        continue;
      }
    }
    ctx.fillStyle = rgba(a3, tw * 0.45);
    ctx.beginPath();
    ctx.arc(px, py, g.s * m * 0.0032, 0, TAU);
    ctx.fill();
  }

  // fog bands
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const fy = h * (0.3 + i * 0.26) + Math.sin(t * 0.07 * sp + i * 2.1) * h * 0.02;
    ctx.fillStyle = rgba("#ffffff", 0.028);
    ctx.beginPath();
    ctx.ellipse(w * (0.3 + 0.2 * i), fy, w * 0.42, m * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // flowers
  for (const f of st.flowers) {
    const fx = f.hx * w;
    const fy = f.hy * h + Math.sin(t * f.sway * sp + f.ph) * m * 0.015;
    const rot = Math.sin(t * 0.4 * sp + f.ph) * 0.08;
    const bl = env ? f.bl : 0.78 + 0.2 * Math.sin(t * 0.3 + f.ph); // static export: half-open bloom
    const c1 = p.colors[f.c1];
    const c2 = p.colors[f.c2];
    const s = m * 0.032 * f.size;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);

    // stem + leaf
    ctx.strokeStyle = rgba(shade(a1, -0.25), 0.55);
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.quadraticCurveTo(s * 0.18, s * 1.15, s * 0.05, s * 1.9);
    ctx.stroke();
    ctx.fillStyle = rgba(shade(a1, -0.15), 0.5);
    ctx.beginPath();
    ctx.ellipse(s * 0.28, s * 1.1, s * 0.3, s * 0.12, 0.7, 0, TAU);
    ctx.fill();

    if (bl > 0.06) {
      // petals
      for (let k = 0; k < f.petalN; k++) {
        const pa = (k / f.petalN) * TAU + f.ph;
        const len = s * (0.55 + bl * 1.15);
        const wid = s * (0.16 + bl * 0.3);
        ctx.save();
        ctx.rotate(pa);
        ctx.globalCompositeOperation = "source-over";
        const pg = ctx.createLinearGradient(0, 0, len, 0);
        pg.addColorStop(0, rgba(c1, 0.28 + bl * 0.5));
        pg.addColorStop(0.72, rgba(c2, 0.2 + bl * 0.42));
        pg.addColorStop(1, rgba(shade(c2, 0.35), 0.06 + bl * 0.2));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(len * 0.55, 0, len * 0.55, wid, 0, 0, TAU);
        ctx.fill();
        // fold line
        ctx.strokeStyle = rgba("#ffffff", 0.14 + bl * 0.2);
        ctx.lineWidth = Math.max(0.5, s * 0.022);
        ctx.beginPath();
        ctx.moveTo(s * 0.08, 0);
        ctx.lineTo(len * 0.95, 0);
        ctx.stroke();
        ctx.restore();
      }
      // glowing heart
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      softOrb(ctx, 0, 0, s * (0.24 + bl * 0.3), a3, 0.16 + bl * 0.3 * (0.4 + p.glow * 0.6));
      ctx.restore();
      ctx.fillStyle = rgba(shade(a3, 0.3), 0.5 + bl * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, s * (0.06 + bl * 0.07), 0, TAU);
      ctx.fill();
    } else {
      // closed bud
      ctx.fillStyle = rgba(c1, 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.16, s * 0.22, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(c2, 0.4);
      ctx.lineWidth = Math.max(0.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.lineTo(0, s * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // loose petals fluttering down
  for (const l of st.loose) {
    const age = (t - l.t0) / 2.4;
    const fx = l.x + l.vx * age * 2 + Math.sin(age * 6 + l.ph) * m * 0.02;
    const fy = l.y + l.vy * age * 2 + age * age * m * 0.16;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(l.ph + age * 6);
    ctx.fillStyle = rgba(p.colors[l.c], (1 - age) * 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0, m * 0.011, m * 0.0045, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const vg = ctx.createRadialGradient(w / 2, h * 0.45, m * 0.4, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  vg.addColorStop(0, rgba(bg0, 0));
  vg.addColorStop(1, rgba(shade(bg0, -0.35), 0.42));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* 42 · Galaxy Spinner — steer the spin, tap for a hypernova           */
/* ------------------------------------------------------------------ */

type GalaxyState = {
  stars: { x: number; y: number; s: number; ph: number }[];
  novas: { t0: number }[];
};

const galaxySpinner: DrawFn = (ctx, w, h, t, p, env) => {
  const [bg0, bg1, a1, a2, a3] = p.colors;
  const m = Math.min(w, h);
  const sp = p.speed;
  const rnd = mulberry32(p.seed);
  const cx = w / 2;
  const cy = h * 0.5;

  fillBg(ctx, w, h, bg0, bg1);

  const st = canvasState<GalaxyState>(ctx, `galaxy${p.seed}|${p.density}`, () => {
    const stars = [];
    const n = Math.round(clamp(70 * p.density * areaScale(w, h), 30, 110));
    for (let i = 0; i < n; i++) {
      stars.push({ x: rnd(), y: rnd(), s: 0.4 + rnd() * 1.4, ph: rnd() * TAU });
    }
    return { stars, novas: [] as { t0: number }[] };
  });

  const dt = env ? clamp(env.dt, 0.001, 0.05) : 0.016;
  const ptr = pointerPx(env, w, h);

  if (env) {
    for (let i = 0; i < env.pointer.taps.length; i++) {
      st.novas.push({ t0: t });
      if (st.novas.length > 4) st.novas.splice(0, st.novas.length - 4);
    }
  }
  st.novas = st.novas.filter((n) => t - n.t0 < 1.6);

  // backdrop stars
  for (const s of st.stars) {
    const tw = 0.3 + 0.35 * Math.sin(t * 0.9 * sp + s.ph);
    ctx.fillStyle = rgba("#ffffff", tw * 0.55);
    ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
  }

  // core glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  softOrb(ctx, cx, cy, m * 0.3, a3, 0.14 + p.glow * 0.1);
  softOrb(ctx, cx, cy, m * 0.09, "#ffffff", 0.1, 0.8);
  ctx.restore();

  // pointer steering — sweep to spin the arms, hold to tighten
  let spin = 0.3;
  let warp = 0;
  if (ptr) {
    const rp = Math.hypot(ptr.x - cx, ptr.y - cy) / m;
    spin = 0.12 + clamp((ptr.x / w - 0.5) * 1.5, -0.75, 0.95);
    warp = clamp(1 - rp, 0, 1) * (ptr.down ? 1.5 : 0.7);
  }
  const spinAcc = canvasState<{ v: number }>(ctx, `galaxyv${p.seed}`, () => ({ v: spin }));
  spinAcc.v += (spin - spinAcc.v) * Math.min(1, dt * 3.2);

  // spiral arms (phyllotaxis + differential rotation)
  const N = Math.round(clamp(340 * p.density * areaScale(w, h), 150, 460));
  const GOLDEN = 2.399963;
  const maxR = m * 0.46;
  for (let i = 0; i < N; i++) {
    const fr = i / N;
    const r = maxR * Math.sqrt(fr);
    const twist = (1 - fr * 0.72) * spinAcc.v * sp;
    const ang = i * GOLDEN + t * twist;
    const x = cx + Math.cos(ang) * r * 1.18;
    const y = cy + Math.sin(ang) * r * 0.92;

    // pointer warp — dots near the finger puff outward and brighten
    let px2 = x;
    let py2 = y;
    let boost = 0;
    if (ptr && warp > 0) {
      const dx2 = x - ptr.x;
      const dy2 = y - ptr.y;
      const d = Math.hypot(dx2, dy2);
      const R = m * 0.2;
      if (d < R && d > 0.001) {
        const k = (1 - d / R) * warp;
        px2 = x + (dx2 / d) * k * m * 0.035;
        py2 = y + (dy2 / d) * k * m * 0.035;
        boost = k;
      }
    }

    const col = fr < 0.24 ? "#ffffff" : fr < 0.6 ? a3 : fr < 0.85 ? a1 : a2;
    const tw = 0.45 + 0.3 * Math.sin(t * (1.1 + fr * 2) * sp + i * 0.71);
    const alpha = clamp((0.16 + (1 - fr) * 0.5) * tw + boost * 0.5, 0, 0.95);
    const dot = Math.max(0.7, m * 0.0022 * (1 + (1 - fr) * 1.3) + boost * m * 0.003);
    if (boost > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(col, alpha);
      ctx.beginPath();
      ctx.arc(px2, py2, dot * 1.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = rgba(col, alpha);
      ctx.beginPath();
      ctx.arc(px2, py2, dot, 0, TAU);
      ctx.fill();
    }
  }

  // hypernova rings + streaks
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const nv of st.novas) {
    const a = (t - nv.t0) / 1.6;
    const fade = Math.exp(-a * 3.2);
    for (let k = 0; k < 2; k++) {
      const ra = clamp(a * 1.25 - k * 0.14, 0, 1.4);
      if (ra <= 0 || ra >= 1.4) continue;
      ctx.strokeStyle = rgba(k ? a1 : a3, fade * 0.55);
      ctx.lineWidth = Math.max(1, m * 0.006 * fade);
      ctx.beginPath();
      ctx.arc(cx, cy, ra * m * 0.55, 0, TAU);
      ctx.stroke();
    }
    // radial streaks
    const nS = 16;
    for (let k = 0; k < nS; k++) {
      const sa = (k / nS) * TAU + nv.t0;
      const r0 = m * (0.05 + a * 0.3);
      const r1 = r0 + m * 0.06 * fade;
      ctx.strokeStyle = rgba(a3, fade * 0.4);
      ctx.lineWidth = Math.max(0.8, m * 0.002 * fade + 0.4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(sa) * r0, cy + Math.sin(sa) * r0);
      ctx.lineTo(cx + Math.cos(sa) * r1, cy + Math.sin(sa) * r1);
      ctx.stroke();
    }
    // core flash
    if (a < 0.5) {
      softOrb(ctx, cx, cy, m * 0.16 * fade, "#ffffff", fade * 0.3);
    }
  }
  ctx.restore();

  const vg = ctx.createRadialGradient(cx, cy, m * 0.4, cx, cy, Math.max(w, h) * 0.85);
  vg.addColorStop(0, rgba(bg0, 0));
  vg.addColorStop(1, rgba(shade(bg0, -0.45), 0.5));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
};

/* ------------------------------------------------------------------ */
/* registry                                                            */
/* ------------------------------------------------------------------ */

export const INTERACTIVE_ENGINES = {
  aquarium,
  jellyRealm,
  fireworks,
  inkBloom,
  nebulaStorm,
  plasmaOrbs,
  codeRain,
  meadowWhimsy,
  duskDunes,
  crystalCave,
  stormCells,
  bubbleRise,
  lavaLamp,
  lanternDrift,
  warpSpeed,
  kaleidoscope,
  bioTide,
  glassMarbles,
  silkFlow,
  emberForge,
  balloonFiesta,
  meteorShower,
  koiPond,
  vinylLounge,
  snowGlobe,
  neonRain,
  whaleSong,
  paperCranes,
  murmuration,
  gravityWells,
  spiritOrchids,
  galaxySpinner,
} as const;
