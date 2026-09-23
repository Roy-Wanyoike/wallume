"use client";

import { useCallback, useSyncExternalStore } from "react";

const FAVS_KEY = "wallume:favs";
const SERVER_EMPTY: string[] = [];

/* module-level localStorage store with identity-stable snapshots */
type Listener = () => void;
const listeners = new Set<Listener>();
let sigCache: string | null = null;
let valueCache: string[] = SERVER_EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(FAVS_KEY);
  } catch {
    /* ignore */
  }
  const sig = raw ?? "";
  if (sigCache !== sig) {
    sigCache = sig;
    try {
      valueCache = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      valueCache = [];
    }
  }
  return valueCache;
}

function write(next: string[]) {
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVS_KEY) l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Personal, device-local favorite wallpapers (⭐) — separate from global likes. */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, () => SERVER_EMPTY);

  const toggleFavorite = useCallback((id: string) => {
    const cur = read();
    write(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
