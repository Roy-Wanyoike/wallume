import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getWallpaper } from "@/lib/wallpapers/catalog";
import { configFromPreset, defaultConfig } from "@/lib/wallpapers/render";
import { getSceneOfTheDay } from "@/lib/wallpapers/sotd";
import type { WallpaperConfig, WallpaperDef } from "@/lib/wallpapers/types";

export const runtime = "nodejs";

/**
 * Dynamic OG share image (1200×630).
 *  /api/og          — today's Scene of the Day
 *  /api/og?id=...   — a specific wallpaper
 *  /api/og?p=CODE   — a shared preset (palette + tuning baked into the art)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("p");
  const id = searchParams.get("id");

  let def: WallpaperDef | null = null;
  let config: WallpaperConfig | null = null;
  let isPreset = false;

  if (code) {
    try {
      const row = await db.preset.findUnique({ where: { code } });
      if (row) {
        const parsed = configFromPreset(JSON.parse(row.data));
        if (parsed) {
          def = parsed.def;
          config = parsed.config;
          isPreset = true;
        }
      }
    } catch {
      // fall through to defaults below
    }
  }

  if (!def || !config) {
    def = id ? getWallpaper(id) : getSceneOfTheDay();
    config = defaultConfig(def) as WallpaperConfig;
  }

  const palette = def.palettes[Math.min(config.paletteIndex, def.palettes.length - 1)] ?? def.palettes[0];
  const colors = config.customColors ?? palette.colors;
  const [bg0, bg1, a1, a2, a3] = colors;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          position: "relative",
          background: `linear-gradient(135deg, ${bg0} 0%, ${bg1} 62%, ${bg0} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* ambient accent orbs */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -80,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${a2}66 0%, transparent 68%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -170,
            left: -60,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${a1}55 0%, transparent 68%)`,
          }}
        />

        {/* top row — wordmark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 15,
                background: `linear-gradient(135deg, ${a2}, ${a3})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 22, height: 30, borderRadius: 11, background: "rgba(0,0,0,0.55)" }} />
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Wallume</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(0,0,0,0.35)",
              fontSize: 20,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {isPreset ? "Shared creation" : "Scene of the Day"}
          </div>
        </div>

        {/* middle — name + tagline, phone art on the right */}
        <div style={{ display: "flex", alignItems: "center", gap: 40, width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 }}>
              {def.name}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.72)", lineHeight: 1.35 }}>
              {def.tagline}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              {[a1, a2, a3, bg1, bg0].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 54,
                    height: 20,
                    borderRadius: 9999,
                    background: c,
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* phone silhouette showing the palette */}
          <div
            style={{
              display: "flex",
              width: 225,
              height: 440,
              borderRadius: 42,
              border: "5px solid rgba(255,255,255,0.18)",
              background: `linear-gradient(160deg, ${bg0}, ${bg1})`,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                left: -40,
                width: 260,
                height: 260,
                borderRadius: 9999,
                background: `radial-gradient(circle, ${a1}77 0%, transparent 70%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -80,
                right: -50,
                width: 280,
                height: 280,
                borderRadius: 9999,
                background: `radial-gradient(circle, ${a3}66 0%, transparent 70%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 22,
                left: "50%",
                transform: "translateX(-50%)",
                width: 70,
                height: 20,
                borderRadius: 9999,
                background: "rgba(0,0,0,0.75)",
              }}
            />
          </div>
        </div>

        {/* bottom row — meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 21, color: "rgba(255,255,255,0.66)" }}>
          <div
            style={{
              display: "flex",
              padding: "7px 18px",
              borderRadius: 9999,
              background: `${a2}33`,
              border: `1px solid ${a2}55`,
              color: "#ffffff",
            }}
          >
            {def.category}
          </div>
          <div>{def.interact ? def.interact.label : "Cursor — parallax drift"}</div>
          <div style={{ marginLeft: "auto" }}>tap any scene — it responds</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
