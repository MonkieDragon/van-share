import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { sendOperatorReviewInviteEmail } from "@/lib/journeyEmails";
import { signReviewToken } from "@/lib/reviewToken";
import type { DbJourney, DbRoute } from "@/types/journey";

const TOKEN_TTL_SEC = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.REVIEW_TOKEN_SECRET?.trim()) {
      return NextResponse.json(
        { error: "REVIEW_TOKEN_SECRET is not configured on the server" },
        { status: 503 },
      );
    }

    const body = (await req.json()) as { journey_id?: string };
    const journeyId = typeof body.journey_id === "string" ? body.journey_id.trim() : "";
    if (!journeyId) {
      return NextResponse.json({ error: "journey_id is required" }, { status: 400 });
    }

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const operator = await getOperatorForUser(user.id);
    if (!operator) {
      return NextResponse.json({ error: "Register as an operator first" }, { status: 403 });
    }

    const operatorId = operator.id;
    const supabase = createServiceClient();

    const { data: claim, error: cErr } = await supabase
      .from("operator_claims")
      .select("id, operator_id")
      .eq("journey_id", journeyId)
      .eq("operator_id", operatorId)
      .in("status", ["driver_confirmed", "selected"])
      .maybeSingle();

    if (cErr) throw cErr;
    if (!claim) {
      return NextResponse.json({ error: "No accepted claim for this journey" }, { status: 403 });
    }

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("*, routes(*)")
      .eq("id", journeyId)
      .single();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    if ((journey as { van_booking_status?: string }).van_booking_status !== "booked") {
      return NextResponse.json({ error: "Van is not booked for this journey" }, { status: 400 });
    }

    const { data: participants, error: pErr } = await supabase
      .from("journey_participants")
      .select("id, email, name")
      .eq("journey_id", journeyId)
      .neq("status", "cancelled");

    if (pErr) throw pErr;

    const list = participants ?? [];
    if (list.length === 0) {
      return NextResponse.json({ error: "No passengers to email" }, { status: 400 });
    }

    const route = (journey as { routes: DbRoute | null }).routes;
    const j = journey as DbJourney;
    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;

    let sent = 0;
    for (const p of list) {
      const token = signReviewToken({
        participantId: p.id as string,
        journeyId,
        operatorId,
        exp,
      });
      const ok = await sendOperatorReviewInviteEmail(
        String(p.email).trim(),
        String(p.name).trim(),
        j,
        route,
        token,
      );
      if (ok) sent += 1;
    }

    if (sent === 0) {
      return NextResponse.json(
        { error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" },
        { status: 503 },
      );
    }

    return NextResponse.json({ sent });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
