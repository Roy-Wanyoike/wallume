import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_IMAGE_CHARS = 2_400_000; // ~1.8 MB jpeg data-url
const KEEP_LATEST = 60;

/** GET /api/community — latest community submissions */
export async function GET() {
  try {
    const rows = await db.communitySubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, title: true, author: true, image: true, createdAt: true },
    });
    return NextResponse.json({ items: rows });
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

  const { title, author, image } = (body ?? {}) as {
    title?: unknown;
    author?: unknown;
    image?: unknown;
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

  try {
    const row = await db.communitySubmission.create({
      data: {
        title: title.trim(),
        author: author.trim() || "Anonymous",
        image,
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
