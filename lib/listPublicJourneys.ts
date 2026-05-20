import { createPublicServerClient, createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { estimatedPricePerPersonPhp, seatPricePerPersonPhp } from "@/lib/journeyPricing";
import type {
  DbJourneyParticipant,
  DbOperator,
  DbOperatorClaim,
  DbRoute,
  JourneyDetailItem,
  JourneyListItem,
  ListingStatus,
  OperatorClaimWithOperator,
  OperatorReviewPublic,
  StopMode,
} from "@/types/journey";
import { effectiveJourneyStatus } from "@/lib/journeyLifecycle";
import { journeyOperatorClaimsEmbed } from "@/lib/operatorClaimEmbeds";

export function mapJourneyRow(row: Record<string, unknown>): JourneyListItem {
  const route = row.routes as DbRoute | null;
  const rest = { ...row };
  delete rest.routes;
  const listing_status = (rest.listing_status as ListingStatus | undefined) ?? "submitted";
  const stop_mode = (rest.stop_mode as StopMode | undefined) ?? "fixed";
  const pickup_stop_mode =
    (rest.pickup_stop_mode as StopMode | undefined) ?? stop_mode;
  const dropoff_stop_mode =
    (rest.dropoff_stop_mode as StopMode | undefined) ?? stop_mode;
  const host_user_id = (rest.host_user_id as string | null | undefined) ?? null;
  const van_booking_status =
    (rest.van_booking_status as JourneyListItem["van_booking_status"] | undefined) ?? "not_booked";
  const selected_operator_claim_id =
    (rest.selected_operator_claim_id as string | null | undefined) ?? null;
  const host_transport_mode =
    (rest.host_transport_mode as JourneyListItem["host_transport_mode"] | undefined) ??
    "needs_vehicle";
  const min_vehicle_seats = (rest.min_vehicle_seats as number | null | undefined) ?? null;
  const preferred_vehicle_type =
    (rest.preferred_vehicle_type as JourneyListItem["preferred_vehicle_type"] | undefined) ?? null;
  const have_pets = Boolean(rest.have_pets);
  const allow_pets = Boolean(rest.allow_pets);
  const cabin_bags_count = Number(rest.cabin_bags_count ?? 0);
  const checked_bags_count = Number(rest.checked_bags_count ?? 0);
  const oversized_luggage = Boolean(rest.oversized_luggage);
  const host_has_own_vehicle = Boolean(rest.host_has_own_vehicle);
  const host_vehicle_type =
    (rest.host_vehicle_type as JourneyListItem["host_vehicle_type"] | undefined) ?? null;
  const host_vehicle_seats_offered =
    (rest.host_vehicle_seats_offered as number | null | undefined) ?? null;
  const host_vehicle_make = (rest.host_vehicle_make as string | null | undefined) ?? null;
  const host_vehicle_model = (rest.host_vehicle_model as string | null | undefined) ?? null;
  const price_mode =
    (rest.price_mode as JourneyListItem["price_mode"] | undefined) ?? "split_total";
  const price_per_seat_php = (rest.price_per_seat_php as number | null | undefined) ?? null;
  const total_price_php = (rest.total_price_php as number | null | undefined) ?? null;
  const flight_number = (rest.flight_number as string | null | undefined) ?? null;
  const flight_airline = (rest.flight_airline as string | null | undefined) ?? null;
  const flight_origin_iata = (rest.flight_origin_iata as string | null | undefined) ?? null;
  const flight_scheduled_arrival =
    (rest.flight_scheduled_arrival as string | null | undefined) ?? null;
  const j = {
    ...rest,
    listing_status,
    stop_mode,
    pickup_stop_mode,
    dropoff_stop_mode,
    host_user_id,
    van_booking_status,
    selected_operator_claim_id,
    host_transport_mode,
    min_vehicle_seats,
    preferred_vehicle_type,
    have_pets,
    allow_pets,
    cabin_bags_count,
    checked_bags_count,
    oversized_luggage,
    host_has_own_vehicle,
    host_vehicle_type,
    host_vehicle_seats_offered,
    host_vehicle_make,
    host_vehicle_model,
    price_mode,
    price_per_seat_php,
    total_price_php,
    flight_number,
    flight_airline,
    flight_origin_iata,
    flight_scheduled_arrival,
  } as JourneyListItem;
  const typical = route?.typical_van_price_php ?? 7000;
  const perPerson =
    price_mode === "split_total" && price_per_seat_php == null && total_price_php == null
      ? estimatedPricePerPersonPhp(typical, j.total_passenger_count)
      : seatPricePerPersonPhp({ ...j, route });
  return {
    ...j,
    route,
    estimated_price_per_person_php: perPerson,
  };
}

export async function listUpcomingJoinableJourneys(limit = 100): Promise<JourneyListItem[]> {
  const supabase = createPublicServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("journeys")
    .select("*, routes(*)")
    .eq("listing_status", "submitted")
    .in("status", ["open", "full"])
    .gte("departure_date", today)
    .order("departure_date", { ascending: true })
    .order("time_window_start", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
}

export async function getJourneyById(id: string): Promise<JourneyListItem | null> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("journeys")
    .select("*, routes(*)")
    .eq("id", id)
    .eq("listing_status", "submitted")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapJourneyRow(data as Record<string, unknown>);
}

export async function getJourneyDetailById(id: string): Promise<JourneyDetailItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journeys")
    .select(`*, routes(*), ${journeyOperatorClaimsEmbed}(*, operators(*)), operator_reviews(*)`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const claimsRaw = row.operator_claims;
  const reviewsRaw = row.operator_reviews;
  const copy = { ...row };
  delete copy.operator_claims;
  delete copy.operator_reviews;

  const base = mapJourneyRow(copy as Record<string, unknown>);
  base.status = effectiveJourneyStatus(base.status, base.departure_date);

  const claims = (Array.isArray(claimsRaw) ? claimsRaw : []) as OperatorClaimWithOperator[];

  const booked =
    claims.find((c) => c.id === base.selected_operator_claim_id) ??
    claims.find((c) => c.status === "driver_confirmed") ??
    null;

  const journeyReviewsRaw = Array.isArray(reviewsRaw) ? reviewsRaw : [];
  const journey_reviews: OperatorReviewPublic[] = journeyReviewsRaw
    .map((r: Record<string, unknown>) => ({
      id: r.id as string,
      rating: Number(r.rating),
      review_text: (r.review_text as string | null) ?? null,
      created_at: r.created_at as string,
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 15);

  let operator_rating_avg: number | null = null;
  let operator_rating_count = 0;

  if (booked?.operator_id) {
    const { data: ratings, error: rErr } = await supabase
      .from("operator_reviews")
      .select("rating")
      .eq("operator_id", booked.operator_id);

    if (!rErr && ratings?.length) {
      operator_rating_count = ratings.length;
      const sum = ratings.reduce((acc, x) => acc + Number((x as { rating: number }).rating), 0);
      operator_rating_avg = Math.round((sum / operator_rating_count) * 10) / 10;
    }
  }

  const claimOut =
    booked != null
      ? {
          ...booked,
          operators: booked.operators ?? null,
          vehicle_image_urls: booked.vehicle_image_urls ?? [],
        }
      : null;

  const svc = createServiceClient();
  const { data: participants } = await svc
    .from("journey_participants")
    .select("*")
    .eq("journey_id", id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let my_operator_claim: OperatorClaimWithOperator | null = null;
  if (user) {
    const { data: op } = await svc.from("operators").select("id").eq("user_id", user.id).maybeSingle();
    if (op) {
      my_operator_claim =
        claims.find((c) => c.operator_id === (op as { id: string }).id) ?? null;
    }
  }

  const operator_interests = claims.filter((c) => c.status === "interested");

  return {
    ...base,
    booked_claim: claimOut,
    operator_interests,
    my_operator_claim,
    confirmed_participants: (participants ?? []) as DbJourneyParticipant[],
    operator_rating_avg,
    operator_rating_count,
    journey_reviews,
  };
}
