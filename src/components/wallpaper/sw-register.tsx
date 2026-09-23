"use client";

import { useEffect } from "react";

/** Registers the Wallume service worker (PWA offline support).
 *  Production-only: in development the SW would serve stale chunks. */
export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // dev safety: make sure no SW from a previous build lingers
      navigator.serviceWorker.getRegistrations().then((rs) => {
        rs.forEach((r) => r.unregister());
      });
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is best-effort */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
