import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWallpaper } from "@/lib/wallpapers/catalog";
import { configFromPreset } from "@/lib/wallpapers/render";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function makeCode(len = 8): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** POST /api/presets — save a custom configuration, returns share code */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = configFromPreset(body);
  if (!parsed) {
    return NextResponse.json({ error: "Unknown wallpaper id" }, { status: 400 });
  }

  // Try a few times to avoid the (extremely unlikely) code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      const row = await db.preset.create({
        data: { code, data: JSON.stringify(body) },
      });
      return NextResponse.json({ code: row.code });
    } catch {
      /* unique collision — retry */
    }
  }
  return NextResponse.json({ error: "Could not save preset" }, { status: 500 });
}

/** GET /api/presets?code=xyz — load a shared preset */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  const row = await db.preset.findUnique({ where: { code } });
  if (!row) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  return NextResponse.json({ preset: JSON.parse(row.data) });
}
