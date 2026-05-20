import { NextRequest, NextResponse } from "next/server";
import { getThreadDetailForUser } from "@/lib/messaging";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thread = await getThreadDetailForUser(id, user.id);
    return NextResponse.json({ thread });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Forbidden" ? 403 : msg === "Thread not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
