"use client";

import GeocodeAddressInput from "@/components/Geocode/GeocodeAddressInput";
import { pickupPresetsForRoute } from "@/lib/addressPresets";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { addressLabelForLeg, type AddressLeg } from "@/lib/routeAddressLabels";

interface AddressInputProps {
  setAddress: (address: string) => void;
  setLatLng: (coords: [number, number]) => void;
  routeId?: string | null;
  leg?: AddressLeg;
  label?: string;
  placeholder?: string;
  onValidatedChange?: (valid: boolean, pick: GeocodePick | null) => void;
}

export default function AddressInput({
  setAddress,
  setLatLng,
  routeId,
  leg = "pickup",
  label,
  placeholder,
  onValidatedChange,
}: AddressInputProps) {
  const defaultLabel = label ?? addressLabelForLeg(routeId ?? null, leg);
  const presets = leg === "pickup" ? pickupPresetsForRoute(routeId ?? null) : [];

  const onPick = (pick: GeocodePick) => {
    setAddress(pick.displayName);
    setLatLng([pick.lat, pick.lng]);
  };

  return (
    <GeocodeAddressInput
      label={defaultLabel}
      placeholder={placeholder ?? `Search for an address in ${defaultLabel.split(" - ")[1] ?? "this area"}`}
      routeId={routeId}
      leg={leg}
      presets={presets}
      onPick={onPick}
      onClear={() => {
        setAddress("");
      }}
      onValidatedChange={onValidatedChange}
    />
  );
}
