import { Resend } from "resend";
import type { DbJourney, DbRoute } from "@/types/journey";
import { getPublicSiteUrl } from "@/lib/siteUrl";

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress() {
  return process.env.EMAIL_FROM;
}

function formatTime(t: string | null | undefined) {
  if (!t) return "";
  return t.slice(0, 5);
}

export async function sendJourneyCreatedEmail(
  journey: DbJourney,
  route: DbRoute | null,
) {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) return;

  const routeName = route?.name ?? journey.route_id;
  await resend.emails.send({
    from,
    to: journey.host_email,
    subject: `Van Share: your journey is live (${routeName})`,
    html: `
      <p>Hi ${journey.host_name},</p>
      <p>Your shared van journey is posted.</p>
      <ul>
        <li><b>Route:</b> ${routeName}</li>
        <li><b>Date:</b> ${journey.departure_date}</li>
        <li><b>Departure window:</b> ${formatTime(journey.time_window_start)}${journey.time_window_end ? ` – ${formatTime(journey.time_window_end)}` : ""}</li>
        <li><b>Pickup:</b> ${journey.pickup_location}</li>
        <li><b>Dropoff:</b> ${journey.dropoff_location}</li>
      </ul>
      <p>Travelers can join until the van is full. You will get another email if an operator claims the trip.</p>
    `,
  });
}

export async function sendParticipantJoinedEmail(
  journey: DbJourney,
  route: DbRoute | null,
  participantEmail: string,
  participantName: string,
) {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) return;

  const routeName = route?.name ?? journey.route_id;
  await resend.emails.send({
    from,
    to: participantEmail,
    subject: `Van Share: you joined ${routeName}`,
    html: `
      <p>Hi ${participantName},</p>
      <p>You are on the list for this journey.</p>
      <ul>
        <li><b>Route:</b> ${routeName}</li>
        <li><b>Date:</b> ${journey.departure_date}</li>
        <li><b>Window:</b> ${formatTime(journey.time_window_start)}${journey.time_window_end ? ` – ${formatTime(journey.time_window_end)}` : ""}</li>
      </ul>
      <p>The host may reach out to coordinate pickup details.</p>
    `,
  });

  await resend.emails.send({
    from,
    to: journey.host_email,
    subject: `Van Share: someone joined your journey`,
    html: `
      <p>Hi ${journey.host_name},</p>
      <p><b>${participantName}</b> joined your journey (${routeName} on ${journey.departure_date}).</p>
      <p>Contact: ${participantEmail}</p>
    `,
  });
}

export async function sendJourneyClaimedEmail(
  journey: DbJourney,
  route: DbRoute | null,
  operatorEmail: string,
  operatorName: string,
  proposedPricePhp: number | null,
) {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) return;

  const routeName = route?.name ?? journey.route_id;
  const priceLine =
    proposedPricePhp != null
      ? `<p><b>Proposed van price:</b> ₱${proposedPricePhp.toLocaleString("en-PH")} total (coordinate splits directly).</p>`
      : "";

  await resend.emails.send({
    from,
    to: journey.host_email,
    subject: `Van Share: an operator claimed your journey`,
    html: `
      <p>Hi ${journey.host_name},</p>
      <p><b>${operatorName}</b> marked interest in fulfilling your trip: ${routeName} on ${journey.departure_date}.</p>
      ${priceLine}
      <p><b>Operator contact:</b> ${operatorEmail}</p>
      <p>Reply to them to confirm timing and pickup order.</p>
    `,
  });
}

export async function sendOperatorReviewInviteEmail(
  participantEmail: string,
  participantName: string,
  journey: DbJourney,
  route: DbRoute | null,
  reviewToken: string,
): Promise<boolean> {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) return false;

  const routeName = route?.name ?? journey.route_id;
  const base = getPublicSiteUrl();
  const url = `${base}/rate?token=${encodeURIComponent(reviewToken)}`;

  await resend.emails.send({
    from,
    to: participantEmail,
    subject: `Van Share: how was your trip? (${routeName})`,
    html: `
      <p>Hi ${escHtml(participantName)},</p>
      <p>Thanks for sharing a van on Van Share. Please take a moment to rate your driver for <b>${escHtml(routeName)}</b> on <b>${escHtml(journey.departure_date)}</b>.</p>
      <p><a href="${url}">Rate this trip</a></p>
      <p>If the button does not work, copy this link:<br/>${escHtml(url)}</p>
      <p>This link expires in 30 days.</p>
    `,
  });
  return true;
}

export async function sendJoinApplicationPendingToHost(
  journey: DbJourney,
  route: DbRoute | null,
  applicantName: string,
  applicantEmail: string,
  passengerCount: number,
) {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) return;

  const routeName = route?.name ?? journey.route_id;
  const base = getPublicSiteUrl();
  const manageUrl = `${base}/my-journeys/${journey.id}`;

  await resend.emails.send({
    from,
    to: journey.host_email,
    subject: `Van Share: join request for ${routeName}`,
    html: `
      <p>Hi ${escHtml(journey.host_name)},</p>
      <p><b>${escHtml(applicantName)}</b> (${escHtml(applicantEmail)}) applied to join your journey on <b>${escHtml(journey.departure_date)}</b> (${escHtml(routeName)}).</p>
      <p><b>Passengers:</b> ${passengerCount}</p>
      <p><a href="${manageUrl}">Review and accept or decline</a></p>
    `,
  });
}

export async function sendJoinApplicationResultToApplicant(
  journey: DbJourney,
  route: DbRoute | null,
  applicantEmail: string,
  applicantName: string,
  accepted: boolean,
) {
  const resend = getResend();
  const from = fromAddress();
  if (!resend || !from) return;

  const routeName = route?.name ?? journey.route_id;
  const base = getPublicSiteUrl();
  const journeyUrl = `${base}/journeys/${journey.id}`;

  await resend.emails.send({
    from,
    to: applicantEmail,
    subject: accepted
      ? `Van Share: you are on the van (${routeName})`
      : `Van Share: update on your join request (${routeName})`,
    html: accepted
      ? `
      <p>Hi ${escHtml(applicantName)},</p>
      <p><b>Good news:</b> the host accepted your request for ${escHtml(routeName)} on ${escHtml(journey.departure_date)}.</p>
      <p><a href="${journeyUrl}">View journey</a></p>
    `
      : `
      <p>Hi ${escHtml(applicantName)},</p>
      <p>The host declined your join request for ${escHtml(routeName)} on ${escHtml(journey.departure_date)}.</p>
      <p>You can still <a href="${base}/">search for other journeys on Van Share</a>.</p>
    `,
  });
}
