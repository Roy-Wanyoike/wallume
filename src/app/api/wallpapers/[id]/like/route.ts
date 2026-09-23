import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWallpaper } from "@/lib/wallpapers/catalog";

/** POST /api/wallpapers/[id]/like — body: { action: "like" | "unlike" } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!getWallpaper(id) || getWallpaper(id).id !== id) {
    return NextResponse.json({ error: "Unknown wallpaper" }, { status: 404 });
  }

  let action = "like";
  try {
    const body = await req.json();
    if (body?.action === "unlike") action = "unlike";
  } catch {
    /* default like */
  }

  const row = await db.wallpaperStat.upsert({
    where: { id },
    create: { id, likes: action === "like" ? 1 : 0 },
    update: { likes: { increment: action === "like" ? 1 : -1 } },
  });

  return NextResponse.json({ likes: Math.max(0, row.likes), downloads: row.downloads });
}
