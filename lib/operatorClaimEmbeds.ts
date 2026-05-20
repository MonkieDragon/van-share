/** Journey linked by operator_claims.journey_id (not selected_operator_claim_id). */
export const claimJourneyEmbed = "journeys!operator_claims_journey_id_fkey";

/** All claims for a journey (disambiguates selected_operator_claim_id on journeys). */
export const journeyOperatorClaimsEmbed = "operator_claims!operator_claims_journey_id_fkey";

export const claimJourneyWithRouteEmbed = `${claimJourneyEmbed}(*, routes(*))`;
