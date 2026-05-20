import Link from "next/link";
import { effectiveJourneyStatus } from "@/lib/journeyLifecycle";
import { journeyCardVehicleLine } from "@/lib/hostVehicle";
import { formatJourneySeatPriceLabel } from "@/lib/journeyPricing";
import type { JourneyListItem } from "@/types/journey";

function formatStartTime(start: string): string {
  return start.slice(0, 5);
}

const shellBaseClass =
  "rounded-xl border bg-white p-4 shadow-sm text-gray-900";

export default function JourneyCard({
  journey,
  selected,
  onSelect,
  detailQuery,
  isOwn = false,
}: {
  journey: JourneyListItem;
  selected?: boolean;
  onSelect?: () => void;
  detailQuery?: string;
  isOwn?: boolean;
}) {
  const routeName = journey.route?.name ?? journey.route_id;
  const spotsLeft = journey.max_passengers - journey.total_passenger_count;
  const paxStatus = effectiveJourneyStatus(journey.status, journey.departure_date);
  const isFull = paxStatus === "full" || spotsLeft <= 0;
  const vehicle = journeyCardVehicleLine(journey);

  const detailHref = detailQuery
    ? `/journeys/${journey.id}?${detailQuery}`
    : `/journeys/${journey.id}`;

  const shellClass = isOwn
    ? `${shellBaseClass} border-indigo-300 bg-indigo-50/30`
    : `${shellBaseClass} border-gray-200`;

  const inner = (
    <>
      <div className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-3 gap-y-3">
        <p className="min-w-0 text-base font-bold text-gray-950">
          {routeName} · {formatStartTime(journey.time_window_start)}
        </p>
        <div className="shrink-0 text-right">
          {isOwn && (
            <span className="mb-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-950">
              Your journey
            </span>
          )}
          <p
            className={`text-base font-bold ${
              isFull ? "text-amber-800" : "text-gray-950"
            }`}
          >
            {isFull ? "FULL" : formatJourneySeatPriceLabel(journey)}
          </p>
        </div>
        <div className="min-w-0 self-end text-sm text-gray-700">
          <span className="font-semibold text-gray-950">{vehicle.heading}</span>
          {vehicle.detail ? (
            <>
              {" "}
              · <span>{vehicle.detail}</span>
            </>
          ) : null}
          {vehicle.selfDrive ? (
            <span className="ml-1.5 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-950">
              Self Drive
            </span>
          ) : null}
        </div>
        <div
          className="self-end justify-self-end"
          onClick={onSelect ? (e) => e.stopPropagation() : undefined}
        >
          {isOwn ? (
            <Link
              href={`/my-journeys/${journey.id}`}
              className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-100"
            >
              Manage
            </Link>
          ) : (
            <Link
              href={detailHref}
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View
            </Link>
          )}
        </div>
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
