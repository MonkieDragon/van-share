type JourneyHostFields = {
  host_user_id: string | null;
  host_email: string;
};

type AuthUserFields = {
  id: string;
  email?: string | null;
};

export function isJourneyHostedByUser(
  journey: JourneyHostFields,
  user: AuthUserFields | null | undefined,
): boolean {
  if (!user) return false;
  if (journey.host_user_id && journey.host_user_id === user.id) return true;
  const hostEmail = journey.host_email.trim().toLowerCase();
  const userEmail = (user.email ?? "").trim().toLowerCase();
  return hostEmail.length > 0 && userEmail.length > 0 && hostEmail === userEmail;
}
