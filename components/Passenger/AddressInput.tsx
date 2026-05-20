"use client";

import GeocodeAddressInput from "@/components/Geocode/GeocodeAddressInput";
import { defaultPickForLeg, pickupPresetsForRoute } from "@/lib/addressPresets";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { addressLabelForLeg, type AddressLeg } from "@/lib/routeAddressLabels";

interface AddressInputProps {
  setAddress: (address: string) => void;
  setLatLng: (coords: [number, number]) => void;
  routeId?: string | null;
  leg?: AddressLeg;
  label?: string;
  placeholder?: string;
  showPresetButtons?: boolean;
  onValidatedChange?: (valid: boolean, pick: GeocodePick | null) => void;
}

export default function AddressInput({
  setAddress,
  setLatLng,
  routeId,
  leg = "pickup",
  label,
  placeholder,
  showPresetButtons = false,
  onValidatedChange,
}: AddressInputProps) {
  const defaultLabel = label ?? addressLabelForLeg(routeId ?? null, leg);
  const presets = leg === "pickup" ? pickupPresetsForRoute(routeId ?? null) : [];
  const defaultPick = defaultPickForLeg(routeId ?? null, leg);

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
      defaultPick={defaultPick}
      showPresetButtons={showPresetButtons}
      onPick={onPick}
      onClear={() => {
        setAddress("");
      }}
      onValidatedChange={onValidatedChange}
    />
  );
}
