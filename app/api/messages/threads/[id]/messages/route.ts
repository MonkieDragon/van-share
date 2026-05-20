import { NextRequest, NextResponse } from "next/server";
import { postMessage } from "@/lib/messaging";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Ctx) {
  try {
    const { id: threadId } = await context.params;
    const body = (await req.json()) as { body?: string };
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = await postMessage(threadId, user.id, body.body);
    return NextResponse.json({ message });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Forbidden" ? 403 : msg === "Thread not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
