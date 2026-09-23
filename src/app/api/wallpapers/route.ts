import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WALLPAPERS } from "@/lib/wallpapers/catalog";

/** GET /api/wallpapers — engagement stats for every wallpaper engine */
export async function GET() {
  const rows = await db.wallpaperStat.findMany();
  const stats: Record<string, { likes: number; downloads: number }> = {};
  for (const wp of WALLPAPERS) {
    const row = rows.find((r) => r.id === wp.id);
    stats[wp.id] = { likes: row?.likes ?? 0, downloads: row?.downloads ?? 0 };
  }
  return NextResponse.json({ stats });
}
