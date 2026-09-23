import Link from "next/link";
import {
  ArrowDown,
  Download,
  Github,
  MousePointerClick,
  Palette,
  Smartphone,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { WALLPAPERS } from "@/lib/wallpapers/catalog";
import type { StatsMap } from "@/lib/wallpapers/types";
import { SiteHeader } from "@/components/wallpaper/site-header";
import { WallumeApp } from "@/components/wallpaper/wallume-app";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/wallpaper/fade-in";

export const dynamic = "force-dynamic";

async function getInitialStats(): Promise<StatsMap> {
  try {
    const rows = await db.wallpaperStat.findMany();
    const stats: StatsMap = {};
    for (const wp of WALLPAPERS) {
      const row = rows.find((r) => r.id === wp.id);
      stats[wp.id] = { likes: row?.likes ?? 0, downloads: row?.downloads ?? 0 };
    }
    return stats;
  } catch {
    // never block the page on stats
    return Object.fromEntries(
      WALLPAPERS.map((wp) => [wp.id, { likes: 0, downloads: 0 }]),
    );
  }
}

function Hero({ totalDownloads }: { totalDownloads: number }) {
  return (
    <section id="top" className="relative overflow-hidden px-4 pb-10 pt-14 sm:pt-20">
      {/* ambient gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute right-[8%] top-40 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute left-[6%] top-64 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <Badge
            variant="secondary"
            className="mb-5 gap-1.5 border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground/80"
          >
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
            {WALLPAPERS.length} living scenes · they react to your touch · painted live in your browser
          </Badge>
        </FadeIn>
        <FadeIn delay={0.08}>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Wallpapers that{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              move with you
            </span>
          </h1>
        </FadeIn>
        <FadeIn delay={0.16}>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            200+ interactive scenes — fish that scatter, fireworks you can launch, lightning
            you can call. Tune palette, motion and glow in real time, then export a crisp
            high-resolution wallpaper — or a looping live video — sized exactly for your
            phone, tablet or desktop.
          </p>
        </FadeIn>
        <FadeIn delay={0.24}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="#studio">
              <Button
                size="lg"
                className="h-12 gap-2 bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 px-7 text-base font-semibold text-white shadow-xl shadow-rose-500/25 transition-transform hover:scale-[1.03] hover:opacity-90"
              >
                <Wand2 className="h-5 w-5" /> Start creating
              </Button>
            </Link>
            <Link href="#gallery">
              <Button
                size="lg"
                variant="outline"
                className="h-12 gap-2 border-white/15 px-7 text-base transition-transform hover:scale-[1.03]"
              >
                Browse the collection
                <ArrowDown className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </FadeIn>
        {totalDownloads > 0 && (
          <FadeIn delay={0.32}>
            <p className="mt-6 text-xs text-muted-foreground">
              <Download className="mr-1 inline h-3 w-3" />
              {totalDownloads.toLocaleString()} wallpapers exported by creators so far
            </p>
          </FadeIn>
        )}
      </div>
    </section>
  );
}

function HowTo() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "1 · Pick a scene",
      body: `Choose from ${WALLPAPERS.length} hand-tuned animated wallpapers — aquariums, fireworks, nebulas, dunes, synthwave grids and more.`,
    },
    {
      icon: SlidersHorizontal,
      title: "2 · Play with it",
      body: "Touch, swipe and tap — fish scatter, bubbles pop, lightning strikes where you ask. Then swap palettes and dial in speed, density and glow.",
    },
    {
      icon: Download,
      title: "3 · Take it anywhere",
      body: "Export a pixel-perfect PNG at your device's exact resolution — phone, tablet or desktop — or record a 5-second live loop.",
    },
  ];

  return (
    <section id="how-to" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-20">
      <h2 className="text-center text-2xl font-bold tracking-tight">From browser to lock screen</h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
        Everything runs locally on your device — no uploads, no accounts, no watermarks.
      </p>

      <FadeInStagger className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <FadeInItem key={s.title}>
            <article
              className="h-full rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-900/70"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-amber-400/20 text-fuchsia-300">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          </FadeInItem>
        ))}
      </FadeInStagger>

      <FadeInStagger className="mt-4 grid gap-4 md:grid-cols-3">
        <FadeInItem>
          <article className="flex h-full gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h3 className="font-semibold">On iPhone &amp; Android</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Render → press &amp; hold the preview → <em>Add to Photos</em> → Settings →
                Wallpaper. PNGs match your screen&rsquo;s exact pixel dimensions.
              </p>
            </div>
          </article>
        </FadeInItem>
        <FadeInItem>
          <article className="flex h-full gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <Palette className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div>
              <h3 className="font-semibold">On laptop &amp; desktop</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Switch the studio to <em>Desktop</em>, pick Full HD / QHD / 4K / ultrawide,
                download and set it via right-click → <em>Set as desktop background</em>.
              </p>
            </div>
          </article>
        </FadeInItem>
        <FadeInItem>
          <article className="flex h-full gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
            <div>
              <h3 className="font-semibold">For live motion</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Record a 5-second loop and use any &ldquo;set video as wallpaper&rdquo; app on
                Android, or Wallpaper Engine / Lively on Windows, macOS &amp; Linux.
              </p>
            </div>
          </article>
        </FadeInItem>
      </FadeInStagger>

      <FadeIn className="mt-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-amber-400/10 p-5 text-center sm:flex-row sm:text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 text-white shadow-lg shadow-fuchsia-500/25">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-semibold">Install Wallume as an app</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Open your browser menu and choose <em>&ldquo;Add to Home Screen&rdquo;</em> or
              <em> Install</em> — it launches full-screen, works offline, and your last scene is
              one tap away.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 border border-white/10 bg-white/5">
            PWA ready
          </Badge>
        </div>
      </FadeIn>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
        <p>
          <span className="font-semibold text-foreground">Wallume</span> — interactive
          wallpapers, painted by code.
        </p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <a href="#studio" className="transition-colors hover:text-foreground">
            Studio
          </a>
          <a href="#gallery" className="transition-colors hover:text-foreground">
            Collection
          </a>
          <a href="#community" className="transition-colors hover:text-foreground">
            Community
          </a>
          <a href="#how-to" className="transition-colors hover:text-foreground">
            How to use
          </a>
          <a
            href="https://github.com/Roy-Wanyoike/wallume"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default async function Home() {
  const stats = await getInitialStats();
  const totalDownloads = Object.values(stats).reduce((acc, s) => acc + s.downloads, 0);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteHeader />
      <main className="flex-1 pb-20">
        <Hero totalDownloads={totalDownloads} />
        <WallumeApp initialStats={stats} />
        <HowTo />
      </main>
      <SiteFooter />
    </div>
  );
}
