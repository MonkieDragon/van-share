"use client";

import GeocodeAddressInput from "@/components/Geocode/GeocodeAddressInput";
import { defaultPickForLeg, pickupPresetsForRoute } from "@/lib/addressPresets";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { addressLabelForLeg } from "@/lib/routeAddressLabels";

type Props = {
  routeId: string;
  showPresetButtons?: boolean;
  onPickupPick: (pick: GeocodePick | null) => void;
  onDropoffPick: (pick: GeocodePick | null) => void;
};

export default function PreferredAddressesPanel({
  routeId,
  showPresetButtons = false,
  onPickupPick,
  onDropoffPick,
}: Props) {
  return (
    <div className="w-full space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <GeocodeAddressInput
        label={addressLabelForLeg(routeId, "pickup")}
        placeholder="Hotel or area near origin"
        routeId={routeId}
        leg="pickup"
        presets={pickupPresetsForRoute(routeId)}
        defaultPick={defaultPickForLeg(routeId, "pickup")}
        showPresetButtons={showPresetButtons}
        onPick={onPickupPick}
        onClear={() => onPickupPick(null)}
      />
      <GeocodeAddressInput
        label={addressLabelForLeg(routeId, "dropoff")}
        placeholder="Hotel or area near destination"
        routeId={routeId}
        leg="dropoff"
        defaultPick={defaultPickForLeg(routeId, "dropoff")}
        onPick={onDropoffPick}
        onClear={() => onDropoffPick(null)}
      />
    </div>
  );
}
