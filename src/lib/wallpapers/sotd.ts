/**
 * Scene of the Day — a deterministic daily pick from the catalog.
 * The selection rotates at local midnight and is stable for everyone
 * on the same calendar day.
 */
import { WALLPAPERS } from "./catalog";
import { fnv1a } from "./helpers";
import type { WallpaperDef } from "./types";

/**
 * UTC calendar day — identical on server and client, so the daily pick
 * is stable across timezones (and hydration-safe).
 */
function todayKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function getSceneOfTheDay(now = new Date()): WallpaperDef {
  const idx = fnv1a(`sotd:${todayKey(now)}`) % WALLPAPERS.length;
  return WALLPAPERS[idx];
}

/** ms until the local-midnight rotation */
export function msUntilNextScene(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
