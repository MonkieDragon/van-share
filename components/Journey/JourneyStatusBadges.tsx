import {
  effectiveJourneyStatus,
  passengerStatusLabel,
  vanBookingBadgeLabel,
} from "@/lib/journeyLifecycle";
import type { JourneyStatus, VanBookingStatus } from "@/types/journey";

type Props = {
  vanBookingStatus: VanBookingStatus;
  passengerStatus: JourneyStatus;
  departureDate: string;
};

export default function JourneyStatusBadges({
  vanBookingStatus,
  passengerStatus,
  departureDate,
}: Props) {
  const vanLabel = vanBookingBadgeLabel(vanBookingStatus);
  const paxStatus = effectiveJourneyStatus(passengerStatus, departureDate);
  const paxLabel = passengerStatusLabel(paxStatus, departureDate);

  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
          vanLabel === "BOOKED"
            ? "bg-emerald-100 text-emerald-950"
            : "bg-slate-100 text-slate-800"
        }`}
      >
        Van {vanLabel}
      </span>
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">
        {paxLabel}
      </span>
    </div>
  );
}
