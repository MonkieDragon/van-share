import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";

const BUCKET = "claim-vehicle-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function safeJourneyId(raw: string | null): string {
  if (!raw || !/^[0-9a-f-]{36}$/i.test(raw.trim())) return "misc";
  return raw.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const journeyId = safeJourneyId(
      typeof form.get("journey_id") === "string" ? (form.get("journey_id") as string) : null,
    );

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const ext = ALLOWED.get(mime);
    if (!ext) {
      return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const path = `claims/${journeyId}/${randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: "Could not resolve public URL" }, { status: 500 });
    }

    return NextResponse.json({ url: pub.publicUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
