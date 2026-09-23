"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Eco mode — a device-local performance switch. When on, every live
 * canvas halves its fps budget and shrinks its internal pixel cap so
 * low-end phones (and batteries) stay cool. Stored in localStorage and
 * shared across tabs, same pattern as the favorites store.
 */

const ECO_KEY = "wallume:eco";

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: boolean | null = null;

function read(): boolean {
  if (cache !== null) return cache;
  try {
    cache = localStorage.getItem(ECO_KEY) === "1";
  } catch {
    cache = false;
  }
  return cache;
}

function write(next: boolean) {
  cache = next;
  try {
    localStorage.setItem(ECO_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === ECO_KEY) l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Direct store access for non-hook subscribers (e.g. the canvas ticker). */
export const subscribeEco = subscribe;
export const isEcoOn = read;

/** Device-local eco/performance switch (🔋) — halves canvas budgets when on. */
export function useEcoMode() {
  const eco = useSyncExternalStore(subscribe, read, () => false);
  const setEco = useCallback((on: boolean) => write(on), []);
  const toggleEco = useCallback(() => write(!read()), []);
  return { eco, setEco, toggleEco };
}

/** Scaled budgets for a canvas when eco mode is on. */
export function ecoBudgets(fps: number, maxPixels: number, eco: boolean) {
  if (!eco) return { fps, maxPixels };
  return {
    fps: Math.max(12, Math.min(fps, 20)),
    maxPixels: Math.round(maxPixels * 0.5),
  };
}
