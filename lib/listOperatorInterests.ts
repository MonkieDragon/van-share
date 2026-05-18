import { createServiceClient } from "@/lib/supabaseServer";
import { mapJourneyRow } from "@/lib/listPublicJourneys";
import type { DbOperatorClaim, JourneyListItem, OperatorClaimWithOperator } from "@/types/journey";

export type OperatorInterestRow = OperatorClaimWithOperator & {
  journey: JourneyListItem;
};

export async function listOperatorInterests(operatorId: string): Promise<OperatorInterestRow[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("operator_claims")
    .select("*, operators(*), journeys(*, routes(*))")
    .eq("operator_id", operatorId)
    .in("status", ["interested", "selected", "driver_confirmed", "declined_by_host"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const journeyRaw = r.journeys as Record<string, unknown>;
    const claim = { ...r } as OperatorClaimWithOperator;
    delete (claim as Record<string, unknown>).journeys;
    return {
      ...claim,
      operators: (r.operators as OperatorClaimWithOperator["operators"]) ?? null,
      journey: mapJourneyRow(journeyRaw),
    };
  });
}

export function operatorInterestStatusLabel(status: DbOperatorClaim["status"]): string {
  switch (status) {
    case "interested":
      return "Interest sent";
    case "selected":
      return "Selected — confirm to view host contact";
    case "driver_confirmed":
      return "You confirmed — awaiting host booking";
    case "declined_by_host":
      return "Declined your offer";
    default:
      return status;
  }
}
