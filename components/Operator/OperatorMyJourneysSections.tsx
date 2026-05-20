import type { ReactNode } from "react";
import Link from "next/link";
import OperatorSelectedActions from "@/components/Operator/OperatorSelectedActions";
import SendReviewInvitesButton from "@/components/Operator/SendReviewInvitesButton";
import JourneyCard from "@/components/Journey/JourneyCard";
import { findOperatorThreadId } from "@/lib/messaging";
import { listOperatorClaimedJourneys } from "@/lib/listOperatorClaimedJourneys";
import { listOperatorInterests, type OperatorInterestRow } from "@/lib/listOperatorInterests";
import { listOperatorAvailableJourneys } from "@/lib/listOperatorJourneys";
import type { JourneyListItem } from "@/types/journey";

function OperatorJourneyListItem({
  journey,
  children,
  label,
}: {
  journey: JourneyListItem;
  children?: ReactNode;
  label?: string;
}) {
  const detailQuery = `return=${encodeURIComponent("/my-journeys")}`;
  return (
    <li className="space-y-3">
      {label && <p className="text-sm font-semibold text-amber-950">{label}</p>}
      <JourneyCard journey={journey} detailQuery={detailQuery} />
      {children}
    </li>
  );
}

type Props = {
  operatorId: string;
  companyName: string;
};

export default async function OperatorMyJourneysSections({ operatorId, companyName }: Props) {
  let available: JourneyListItem[] = [];
  let interests: OperatorInterestRow[] = [];
  let booked: Awaited<ReturnType<typeof listOperatorClaimedJourneys>> = [];
  let error: string | null = null;

  try {
    available = await listOperatorAvailableJourneys(operatorId);
    interests = await listOperatorInterests(operatorId);
    booked = await listOperatorClaimedJourneys(operatorId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load operator journeys";
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">Could not load van jobs</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const interestByJourneyId = new Map(
    interests
      .filter((i) => i.status === "interested")
      .map((i) => [i.journey.id, i] as const),
  );
  const expressedElsewhere = interests.filter(
    (i) => i.status === "interested" && !available.some((j) => j.id === i.journey.id),
  );
  const selectedInterests = interests.filter((i) => i.status === "selected");

  const selectedWithThreads = await Promise.all(
    selectedInterests.map(async (row) => ({
      row,
      threadId: await findOperatorThreadId(row.id),
    })),
  );

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-bold text-gray-950">Van jobs — {companyName}</h2>
        <p className="mt-1 text-sm text-gray-800">
          Browse more on the{" "}
          <Link href="/" className="font-semibold text-blue-700 underline">
            home page
          </Link>{" "}
          and open a job to express interest.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="font-bold text-gray-950">Open jobs</h3>
        {available.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-800">
            No open jobs right now.
          </p>
        ) : (
          <ul className="space-y-4">
            {available.map((j) => (
              <OperatorJourneyListItem
                key={j.id}
                journey={j}
                label={interestByJourneyId.has(j.id) ? "Awaiting response" : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      {expressedElsewhere.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-bold text-gray-950">Expressed interest</h3>
          <ul className="space-y-4">
            {expressedElsewhere.map((row) => (
              <OperatorJourneyListItem
                key={row.id}
                journey={row.journey}
                label="Awaiting response"
              />
            ))}
          </ul>
        </section>
      )}

      {selectedWithThreads.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-bold text-gray-950">Accepted offer — awaiting your message</h3>
          <ul className="space-y-4">
            {selectedWithThreads.map(({ row, threadId }) => (
              <OperatorJourneyListItem key={row.id} journey={row.journey}>
                <OperatorSelectedActions claimId={row.id} threadId={threadId} />
              </OperatorJourneyListItem>
            ))}
          </ul>
        </section>
      )}

      {booked.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-bold text-gray-950">Booked vans</h3>
          <ul className="space-y-3">
            {booked.map((j) => {
              const routeName = j.route?.name ?? j.route_id;
              return (
                <li
                  key={j.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">{j.departure_date}</p>
                    <p className="font-semibold text-gray-950">{routeName}</p>
                    <p className="text-sm text-gray-800">
                      {j.total_passenger_count} passengers · {j.pickup_location}
                    </p>
                  </div>
                  <SendReviewInvitesButton journeyId={j.id} departureDate={j.departure_date} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
