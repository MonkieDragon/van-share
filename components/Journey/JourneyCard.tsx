import Link from "next/link";
import JourneyStatusBadges from "@/components/Journey/JourneyStatusBadges";
import { formatDayShort } from "@/lib/formatDisplayDate";
import { effectiveJourneyStatus } from "@/lib/journeyLifecycle";
import type { JourneyListItem } from "@/types/journey";

function formatWindow(start: string, end: string | null) {
  const s = start.slice(0, 5);
  if (!end) return s;
  return `${s}–${end.slice(0, 5)}`;
}

const shellBaseClass =
  "rounded-xl border bg-white p-4 shadow-sm text-gray-900";

export default function JourneyCard({
  journey,
  joinPassengers,
  selected,
  onSelect,
  detailQuery,
  isOwn = false,
}: {
  journey: JourneyListItem;
  joinPassengers?: number;
  selected?: boolean;
  onSelect?: () => void;
  detailQuery?: string;
  isOwn?: boolean;
}) {
  const routeName = journey.route?.name ?? journey.route_id;
  const spotsLeft = journey.max_passengers - journey.total_passenger_count;
  const paxStatus = effectiveJourneyStatus(journey.status, journey.departure_date);
  const joinable = paxStatus === "open" && !isOwn;
  const joinQs =
    joinPassengers != null && joinPassengers >= 1
      ? `?passengers=${encodeURIComponent(String(joinPassengers))}`
      : "";

  const shellClass = isOwn
    ? `${shellBaseClass} border-indigo-300 bg-indigo-50/30`
    : `${shellBaseClass} border-gray-200`;

  const inner = (
    <>
      {isOwn && (
        <span className="mb-2 inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-950">
          Your journey
        </span>
      )}
      <p className="text-sm font-medium text-gray-700">
        {formatDayShort(journey.departure_date)} ·{" "}
        {formatWindow(journey.time_window_start, journey.time_window_end)}
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-950">{routeName}</h2>
      {journey.pickup_stop_mode === "flexible" || journey.dropoff_stop_mode === "flexible" ? (
        <p className="mt-1 text-xs font-semibold text-indigo-700">
          {journey.pickup_stop_mode === "flexible" && journey.dropoff_stop_mode === "flexible"
            ? "Flexible pickup & dropoff"
            : journey.pickup_stop_mode === "flexible"
              ? "Flexible pickup"
              : "Flexible dropoff"}
        </p>
      ) : (
        <p className="mt-1 text-xs font-semibold text-gray-600">Fixed pickup & dropoff</p>
      )}
      <p className="mt-2 text-sm text-gray-800">
        {journey.total_passenger_count} / {journey.max_passengers} passengers ·{" "}
        <span className="font-semibold text-gray-950">
          est. ₱{journey.estimated_price_per_person_php.toLocaleString("en-PH")}/person
        </span>
      </p>
      <p className="mt-1 text-sm text-gray-800 line-clamp-2">Pickup: {journey.pickup_location}</p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        onClick={onSelect ? (e) => e.stopPropagation() : undefined}
      >
        <Link
          href={
            detailQuery
              ? `/journeys/${journey.id}?${detailQuery}`
              : `/journeys/${journey.id}`
          }
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          View
        </Link>
        {isOwn ? (
          <Link
            href={`/my-journeys/${journey.id}`}
            className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-100"
          >
            Manage
          </Link>
        ) : (
          joinable &&
          spotsLeft > 0 && (
            <Link
              href={`/join/${journey.id}${joinQs}`}
              className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Request to join
            </Link>
          )
        )}
        {paxStatus === "full" && (
          <span className="inline-flex items-center rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-950">
            Full — watch for new journeys
          </span>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected ?? false}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`${shellClass} w-full cursor-pointer text-left outline-none transition-shadow ${
          selected ? "ring-2 ring-blue-600 ring-offset-2" : "hover:border-gray-300 hover:shadow-md"
        }`}
      >
        {inner}
      </div>
    );
  }

  return <article className={shellClass}>{inner}</article>;
}
