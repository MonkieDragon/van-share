import type { DbProfile } from "@/types/operator";

export function isPassengerOnboardingComplete(profile: DbProfile | null): boolean {
  if (!profile) return false;
  if (profile.account_type === "operator") return true;
  return Boolean(
    profile.onboarding_completed_at &&
      profile.display_name?.trim() &&
      profile.nationality?.trim(),
  );
}

export function needsOnboarding(profile: DbProfile | null, isOperator: boolean): boolean {
  if (isOperator) return false;
  return !isPassengerOnboardingComplete(profile);
}
