import type {
  DbJourney,
  DbJourneyParticipant,
  DbOperatorClaim,
  OperatorClaimStatus,
} from "@/types/journey";

type ViewerRole = "host" | "operator" | "passenger" | "public";

export function canViewHostContact(
  journey: Pick<DbJourney, "host_email" | "host_phone">,
  claim: Pick<DbOperatorClaim, "status" | "operator_id"> | null,
  viewer: { role: ViewerRole; operatorId?: string | null },
): boolean {
  if (viewer.role === "host") return true;
  if (viewer.role !== "operator" || !claim || !viewer.operatorId) return false;
  if (claim.operator_id !== viewer.operatorId) return false;
  return claim.status === "driver_confirmed";
}

export function canConfirmedPassengerViewHost(
  participant: Pick<DbJourneyParticipant, "status" | "user_id">,
  viewerUserId: string | null | undefined,
): boolean {
  return participant.status === "confirmed" && !!viewerUserId && participant.user_id === viewerUserId;
}

export function canViewPassengerContact(
  participant: Pick<DbJourneyParticipant, "status" | "user_id">,
  viewer: { role: ViewerRole; userId?: string | null; operatorClaimStatus?: OperatorClaimStatus | null },
): boolean {
  if (participant.status !== "confirmed") return false;
  if (viewer.role === "host") return true;
  if (viewer.role === "passenger" && viewer.userId && participant.user_id === viewer.userId) {
    return true;
  }
  if (viewer.role === "operator") {
    const s = viewer.operatorClaimStatus;
    return s === "selected" || s === "driver_confirmed";
  }
  return false;
}

export function hostContactFields(journey: Pick<DbJourney, "host_name" | "host_email" | "host_phone">) {
  return {
    name: journey.host_name,
    email: journey.host_email,
    phone: journey.host_phone,
  };
}

export function passengerContactFields(p: Pick<DbJourneyParticipant, "name" | "email" | "phone">) {
  return { name: p.name, email: p.email, phone: p.phone };
}
