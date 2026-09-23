import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWallpaper } from "@/lib/wallpapers/catalog";

/** POST /api/wallpapers/[id]/download — records a download */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (getWallpaper(id).id !== id) {
    return NextResponse.json({ error: "Unknown wallpaper" }, { status: 404 });
  }

  const row = await db.wallpaperStat.upsert({
    where: { id },
    create: { id, downloads: 1 },
    update: { downloads: { increment: 1 } },
  });

  return NextResponse.json({ likes: row.likes, downloads: row.downloads });
}
