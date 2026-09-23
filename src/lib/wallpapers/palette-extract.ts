/**
 * Client-side dominant-color extraction for the community Remix feature.
 * Samples an image on a small canvas, runs a few k-means rounds and
 * assembles a Wallume 5-color palette: [bgTop, bgBottom, a1, a2, a3].
 */

function hex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

type Cluster = { r: number; g: number; b: number; n: number };

/** Extract a 5-color wallpaper palette from any image. */
export async function extractPalette(src: string): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image load failed"));
    el.src = src;
  });

  const S = 56;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0, S, S);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, S, S).data;
  } catch {
    throw new Error("could not read pixels");
  }

  // collect opaque-ish pixels
  const px: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    px.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (px.length === 0) throw new Error("no pixels");

  // k-means with k=7, deterministic init (spread across the pixel list)
  const K = 7;
  const centers: Cluster[] = [];
  for (let k = 0; k < K; k++) {
    const p = px[Math.floor((k + 0.5) * (px.length / K))];
    centers.push({ r: p[0], g: p[1], b: p[2], n: 0 });
  }
  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (const [r, g, b] of px) {
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < K; k++) {
        const c = centers[k];
        const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      sums[best].r += r;
      sums[best].g += g;
      sums[best].b += b;
      sums[best].n++;
    }
    for (let k = 0; k < K; k++) {
      if (sums[k].n > 0) {
        centers[k] = {
          r: Math.round(sums[k].r / sums[k].n),
          g: Math.round(sums[k].g / sums[k].n),
          b: Math.round(sums[k].b / sums[k].n),
          n: sums[k].n,
        };
      }
    }
  }

  // score clusters: coverage × vibrancy — pick 3 distinct accents
  const scored = centers
    .filter((c) => c.n > 0)
    .map((c) => {
      const [, s, l] = rgbToHsl(c.r, c.g, c.b);
      const coverage = c.n / px.length;
      const vibrancy = s * (1 - Math.abs(l - 0.55) * 1.2);
      return { hex: hex(c.r, c.g, c.b), hsl: [rgbToHsl(c.r, c.g, c.b)[0], s, l] as const, score: coverage * (0.25 + vibrancy * 1.6) };
    })
    .sort((a, b) => b.score - a.score);

  const accents: typeof scored = [];
  for (const cand of scored) {
    if (accents.length >= 3) break;
    // keep hues reasonably separated (anything but near-grays gets a check)
    const dup = accents.some((a) => {
      const dh = Math.abs(a.hsl[0] - cand.hsl[0]);
      const hueClose = Math.min(dh, 1 - dh) < 0.09;
      const bothColorful = a.hsl[1] > 0.18 && cand.hsl[1] > 0.18;
      return bothColorful && hueClose && Math.abs(a.hsl[2] - cand.hsl[2]) < 0.3;
    });
    if (!dup) accents.push(cand);
  }
  while (accents.length < 3) accents.push(scored[accents.length % Math.max(1, scored.length)] ?? { hex: "#94a3b8", hsl: [0, 0, 0.6] as const, score: 0 });

  // background: darkest cluster, pushed dark for wallpaper readability
  const darkest = [...centers]
    .filter((c) => c.n > 0)
    .sort((a, b) => a.r + a.g + a.b - (b.r + b.g + b.b))[0] ?? centers[0];
  const dark = hex(
    Math.round(darkest.r * 0.34),
    Math.round(darkest.g * 0.34),
    Math.round(darkest.b * 0.38),
  );
  const dark2 = hex(
    Math.round(darkest.r * 0.52),
    Math.round(darkest.g * 0.52),
    Math.round(darkest.b * 0.56),
  );

  return [dark, dark2, accents[0].hex, accents[1].hex, accents[2].hex];
}
