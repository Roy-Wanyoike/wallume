import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_IMAGE_CHARS = 2_400_000; // ~1.8 MB jpeg data-url
const KEEP_LATEST = 60;

const HEX = /^#[0-9a-fA-F]{6}$/;

function parsePalette(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length === 5 && arr.every((c) => typeof c === "string" && HEX.test(c))) {
      return arr as string[];
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** GET /api/community — latest community submissions */
export async function GET() {
  try {
    const rows = await db.communitySubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, title: true, author: true, image: true, palette: true, createdAt: true },
    });
    return NextResponse.json({
      items: rows.map((r) => ({ ...r, palette: parsePalette(r.palette) })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

/** POST /api/community — submit an image to the community wall */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, author, image, palette } = (body ?? {}) as {
    title?: unknown;
    author?: unknown;
    image?: unknown;
    palette?: unknown;
  };

  if (typeof title !== "string" || title.trim().length < 1 || title.length > 48) {
    return NextResponse.json({ error: "Title must be 1-48 characters" }, { status: 400 });
  }
  if (typeof author !== "string" || author.length > 24) {
    return NextResponse.json({ error: "Author name too long" }, { status: 400 });
  }
  if (
    typeof image !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(image) ||
    image.length > MAX_IMAGE_CHARS
  ) {
    return NextResponse.json(
      { error: "Image must be a PNG/JPEG/WebP data-URL under ~1.8 MB" },
      { status: 400 },
    );
  }

  // optional extracted palette — exactly 5 hex colors
  let paletteJson: string | null = null;
  if (palette !== undefined && palette !== null) {
    if (
      Array.isArray(palette) &&
      palette.length === 5 &&
      palette.every((c) => typeof c === "string" && HEX.test(c))
    ) {
      paletteJson = JSON.stringify(palette);
    } else {
      return NextResponse.json({ error: "Palette must be an array of 5 hex colors" }, { status: 400 });
    }
  }

  try {
    const row = await db.communitySubmission.create({
      data: {
        title: title.trim(),
        author: author.trim() || "Anonymous",
        image,
        ...(paletteJson ? { palette: paletteJson } : {}),
      },
    });

    // keep the wall fresh — prune older submissions beyond the cap
    const old = await db.communitySubmission.findMany({
      orderBy: { createdAt: "desc" },
      skip: KEEP_LATEST,
      select: { id: true },
    });
    if (old.length > 0) {
      await db.communitySubmission.deleteMany({
        where: { id: { in: old.map((r) => r.id) } },
      });
    }

    return NextResponse.json({
      item: { id: row.id, title: row.title, author: row.author, createdAt: row.createdAt },
    });
  } catch (e) {
    console.error("[community] save failed:", e);
    return NextResponse.json({ error: "Could not save submission" }, { status: 500 });
  }
}
