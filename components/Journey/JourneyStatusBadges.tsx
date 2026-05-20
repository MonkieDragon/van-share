import {
  effectiveJourneyStatus,
  passengerStatusLabel,
  vanBookingBadgeLabel,
} from "@/lib/journeyLifecycle";
import { formatHostVehicleSummary } from "@/lib/hostVehicle";
import type { HostTransportMode, HostVehicleType, JourneyStatus, VanBookingStatus } from "@/types/journey";

type Props = {
  vanBookingStatus: VanBookingStatus;
  passengerStatus: JourneyStatus;
  departureDate: string;
  hostTransportMode?: HostTransportMode;
  hostHasOwnVehicle?: boolean;
  hostVehicleType?: HostVehicleType | null;
  hostVehicleSeatsOffered?: number | null;
  hostVehicleMake?: string | null;
  hostVehicleModel?: string | null;
};

export default function JourneyStatusBadges({
  vanBookingStatus,
  passengerStatus,
  departureDate,
  hostTransportMode = "needs_vehicle",
  hostHasOwnVehicle = false,
  hostVehicleType = null,
  hostVehicleSeatsOffered = null,
  hostVehicleMake = null,
  hostVehicleModel = null,
}: Props) {
  const vanLabel = vanBookingBadgeLabel(vanBookingStatus);
  const paxStatus = effectiveJourneyStatus(passengerStatus, departureDate);
  const paxLabel = passengerStatusLabel(paxStatus, departureDate);
  const showHostVan = hostTransportMode === "own_vehicle" || hostHasOwnVehicle;
  const hostSummary = formatHostVehicleSummary({
    host_transport_mode: hostTransportMode,
    host_has_own_vehicle: hostHasOwnVehicle,
    host_vehicle_type: hostVehicleType,
    host_vehicle_seats_offered: hostVehicleSeatsOffered,
    host_vehicle_make: hostVehicleMake,
    host_vehicle_model: hostVehicleModel,
  });

  return (
    <div className="space-y-1">
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
        {showHostVan && (
          <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-950">
            Host van
          </span>
        )}
      </div>
      {hostSummary && <p className="text-xs text-gray-700">{hostSummary}</p>}
    </div>
  );
}
