import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { ModerationStatus } from "@/types/journey";

type PatchBody = {
  operator_id?: string;
  moderation_status?: ModerationStatus;
  moderation_reason?: string | null;
};

const ALLOWED: ModerationStatus[] = ["active", "warned", "suspended"];

export async function PATCH(req: NextRequest) {
  const admin = process.env.ADMIN_SECRET?.trim();
  if (!admin || req.headers.get("x-admin-secret") !== admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as PatchBody;
    const operatorId = typeof body.operator_id === "string" ? body.operator_id.trim() : "";
    if (!operatorId) {
      return NextResponse.json({ error: "operator_id is required" }, { status: 400 });
    }

    const status = body.moderation_status;
    if (!status || !ALLOWED.includes(status)) {
      return NextResponse.json(
        { error: `moderation_status must be one of: ${ALLOWED.join(", ")}` },
        { status: 400 },
      );
    }

    const reason =
      body.moderation_reason === undefined || body.moderation_reason === null
        ? null
        : String(body.moderation_reason).trim().slice(0, 2000) || null;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("operators")
      .update({
        moderation_status: status,
        moderation_reason: reason,
        moderation_updated_at: new Date().toISOString(),
      })
      .eq("id", operatorId)
      .select("id, moderation_status, moderation_reason, moderation_updated_at")
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    return NextResponse.json({ operator: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
