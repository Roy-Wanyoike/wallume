"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Hero CTA — picks a random scene and hands control to WallumeApp via a
 * custom window event (the app owns the studio state).
 */
export function SurpriseButton() {
  return (
    <Button
      size="lg"
      variant="outline"
      className="h-12 gap-2 border-white/15 px-6 text-base transition-transform hover:scale-[1.03]"
      onClick={() => window.dispatchEvent(new CustomEvent("wallume:surprise"))}
      aria-label="Surprise me with a random wallpaper"
    >
      <Dices className="h-4 w-4 text-fuchsia-300" />
      Surprise me
    </Button>
  );
}
