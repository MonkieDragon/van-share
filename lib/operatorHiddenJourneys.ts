import { createServiceClient } from "@/lib/supabaseServer";

export async function listHiddenJourneyIds(operatorId: string): Promise<string[]> {
  const { data, error } = await createServiceClient()
    .from("operator_hidden_journeys")
    .select("journey_id")
    .eq("operator_id", operatorId);
  if (error) throw error;
  return (data ?? []).map((r) => r.journey_id as string);
}

export async function isJourneyHiddenForOperator(
  operatorId: string,
  journeyId: string,
): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("operator_hidden_journeys")
    .select("id")
    .eq("operator_id", operatorId)
    .eq("journey_id", journeyId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function hideJourneyForOperator(
  operatorId: string,
  journeyId: string,
): Promise<void> {
  const { error } = await createServiceClient().from("operator_hidden_journeys").insert({
    operator_id: operatorId,
    journey_id: journeyId,
  });
  if (error && error.code !== "23505") throw error;
}

export function filterOutHidden<T extends { id: string }>(
  items: T[],
  hiddenIds: Set<string>,
): T[] {
  if (hiddenIds.size === 0) return items;
  return items.filter((item) => !hiddenIds.has(item.id));
}
