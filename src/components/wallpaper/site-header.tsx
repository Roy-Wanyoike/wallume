"use client";

import { Leaf, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEcoMode } from "@/lib/eco-store";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const { eco, toggleEco } = useEcoMode();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-2.5 focus-visible:outline-none">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-lg shadow-fuchsia-500/25">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="6" y="2" width="12" height="20" rx="3" />
              <path d="M6 10c2-1.5 4 1.5 6 0s4 1.5 6 0" opacity="0.9" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight">
            Wall<span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">ume</span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {[
            { href: "#studio", label: "Studio" },
            { href: "#gallery", label: "Collection" },
            { href: "#how-to", label: "How to use" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-pressed={eco}
            aria-label={eco ? "Turn off eco mode" : "Turn on eco mode for smoother battery life"}
            title={eco ? "Eco mode on — lower fps & resolution for battery" : "Eco mode off — full quality"}
            className={cn(
              "border-white/10 transition-colors",
              eco && "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
            )}
            onClick={toggleEco}
          >
            <Leaf className={cn("h-4 w-4", eco && "drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]")} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle dark mode"
            className="border-white/10"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </Button>
          <a href="#studio" className="hidden sm:block">
            <Button className="cta-sheen h-9 gap-2 bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-md shadow-rose-500/20 hover:opacity-90">
              Start creating
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
