"use client";

import { useEffect, useState } from "react";

/** Gradient scroll-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div
        className="h-full origin-left transition-transform duration-100 ease-out"
        style={{
          transform: `scaleX(${progress})`,
          opacity: progress > 0.005 ? 1 : 0,
          background: "linear-gradient(90deg, var(--wallume-a1, #e879f9), var(--wallume-a2, #fb7185), var(--wallume-a3, #fcd34d))",
        }}
      />
    </div>
  );
}
