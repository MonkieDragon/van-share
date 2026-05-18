import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { verifyReviewToken } from "@/lib/reviewToken";
import type { SubmitReviewBody } from "@/types/journey";

const postCooldownMs = 4000;
const lastPostByIp = new Map<string, number>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const prev = lastPostByIp.get(ip) ?? 0;
  if (now - prev < postCooldownMs) return false;
  lastPostByIp.set(ip, now);
  if (lastPostByIp.size > 5000) lastPostByIp.clear();
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip")?.trim() ??
      "unknown";
    if (!rateLimitOk(ip)) {
      return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
    }

    const body = (await req.json()) as SubmitReviewBody;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 10 || Math.round(rating) !== rating) {
      return NextResponse.json({ error: "rating must be an integer from 1 to 10" }, { status: 400 });
    }

    const reviewText =
      typeof body.review_text === "string" ? body.review_text.trim().slice(0, 2000) : "";
    const review_text = reviewText.length > 0 ? reviewText : null;

    const payload = verifyReviewToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired review link" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: participant, error: pErr } = await supabase
      .from("journey_participants")
      .select("id, journey_id, status, user_id")
      .eq("id", payload.participantId)
      .single();

    if (pErr || !participant) {
      return NextResponse.json({ error: "Invalid review link" }, { status: 400 });
    }
    if (participant.journey_id !== payload.journeyId) {
      return NextResponse.json({ error: "Invalid review link" }, { status: 400 });
    }
    if (participant.status === "cancelled") {
      return NextResponse.json({ error: "This participant record is cancelled" }, { status: 400 });
    }

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("id, departure_date, status")
      .eq("id", payload.journeyId)
      .single();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 400 });
    }

    if ((journey as { van_booking_status?: string }).van_booking_status !== "booked") {
      return NextResponse.json({ error: "This journey is not in a reviewable state" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    if ((journey.departure_date as string) > today) {
      return NextResponse.json(
        { error: "Reviews are available on or after the departure date" },
        { status: 400 },
      );
    }

    const { data: claim, error: cErr } = await supabase
      .from("operator_claims")
      .select("operator_id")
      .eq("journey_id", payload.journeyId)
      .in("status", ["driver_confirmed", "selected"])
      .maybeSingle();

    if (cErr) throw cErr;
    if (!claim || claim.operator_id !== payload.operatorId) {
      return NextResponse.json({ error: "Invalid review link" }, { status: 400 });
    }

    const reviewer_user_id =
      (participant as { user_id?: string | null }).user_id ?? null;

    const { error: insErr } = await supabase.from("operator_reviews").insert({
      operator_id: payload.operatorId,
      journey_id: payload.journeyId,
      participant_id: payload.participantId,
      reviewer_user_id,
      rating: Math.round(rating),
      review_text,
      moderation_status: "visible",
    });

    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json({ error: "You have already submitted a review for this trip" }, { status: 409 });
      }
      throw insErr;
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
