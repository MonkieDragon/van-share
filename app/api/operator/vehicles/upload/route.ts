import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";

const BUCKET = "operator-vehicle-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(req: NextRequest) {
  try {
    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
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
    const path = `fleet/${user.id}/${randomUUID()}.${ext}`;

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
