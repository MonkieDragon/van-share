"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import type { EndpointId } from "@/lib/journeyRouteEndpoints";
import { ensureLeafletDefaultIcons } from "@/lib/leafletDefaultIcons";
import { vanPickupCoordinates } from "@/lib/ppsAirport";
import { cityCenterForEndpoint } from "@/lib/routeCityCenters";
import type { JourneyListItem, StopMode } from "@/types/journey";

ensureLeafletDefaultIcons();

const LINE_FLEXIBLE = "#2563eb";
const LINE_FIXED = "#dc2626";

function stopModeForLeg(
  journey: JourneyListItem,
  leg: "pickup" | "dropoff",
): StopMode {
  const legacy = journey.stop_mode ?? "fixed";
  if (leg === "pickup") return journey.pickup_stop_mode ?? legacy;
  return journey.dropoff_stop_mode ?? legacy;
}

const ZOOM_CITY = 12;
const ZOOM_PRECISE = 15;

function formatDistanceMeters(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.55 });
  }, [map, center[0], center[1], zoom]);
  return null;
}

function FitTwoPoints({ a, b }: { a: [number, number]; b: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([a, b]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, a[0], a[1], b[0], b[1]]);
  return null;
}

function distanceBetween(a: [number, number], b: [number, number]): number {
  return L.latLng(a).distanceTo(L.latLng(b));
}

function MapSlot({
  label,
  city,
  userPoint,
  journeyPoint,
  zoomCity,
  zoomPrecise,
  hostFixed,
  fixedWarning,
}: {
  label: string;
  city: [number, number];
  userPoint: [number, number] | null;
  journeyPoint: [number, number] | null;
  zoomCity: number;
  zoomPrecise: number;
  hostFixed: boolean;
  fixedWarning: string | null;
}) {
  const mapWidth =
    "w-[min(17.1rem,calc((100dvw_-_2rem)*0.7125))] sm:w-[min(21.375rem,calc((100dvw_-_2.5rem)*0.7125))]";

  const points = useMemo(() => {
    const list: [number, number][] = [];
    if (userPoint) list.push(userPoint);
    if (journeyPoint) list.push(journeyPoint);
    return list;
  }, [userPoint, journeyPoint]);

  const showBoth = userPoint != null && journeyPoint != null;
  const single = points.length === 1 ? points[0] : null;
  const center = single ?? city;
  const zoom = single ? zoomPrecise : zoomCity;
  const distLabel =
    showBoth && journeyPoint && userPoint
      ? formatDistanceMeters(distanceBetween(userPoint, journeyPoint))
      : null;
  const lineColor = hostFixed ? LINE_FIXED : LINE_FLEXIBLE;

  return (
    <div
      className={`flex shrink-0 flex-col overflow-hidden rounded-lg border bg-gray-50 shadow-inner ${mapWidth} ${
        hostFixed && fixedWarning ? "border-red-300" : "border-gray-200"
      }`}
    >
      <span className="w-full border-b border-gray-200 bg-white px-2 py-1 text-center text-xs font-semibold text-gray-700">
        {label}
      </span>
      <div className="relative aspect-square w-full">
        <MapContainer
          center={center}
          zoom={zoom}
          className="absolute inset-0 z-0 h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {showBoth ? (
            <FitTwoPoints a={userPoint!} b={journeyPoint!} />
          ) : (
            <FlyTo center={center} zoom={zoom} />
          )}
          {userPoint ? <Marker position={userPoint} /> : null}
          {journeyPoint ? (
            <Marker position={journeyPoint}>
              {distLabel ? (
                <Tooltip permanent direction="top" offset={[0, -12]} className="distance-callout">
                  {distLabel}
                </Tooltip>
              ) : null}
            </Marker>
          ) : null}
          {showBoth ? (
            <Polyline
              positions={[userPoint!, journeyPoint!]}
              pathOptions={{ color: lineColor, weight: hostFixed ? 4 : 3 }}
            />
          ) : null}
        </MapContainer>
      </div>
      {hostFixed && fixedWarning ? (
        <p className="border-t border-red-200 bg-red-50 px-2 py-1.5 text-center text-xs font-semibold text-red-900">
          {fixedWarning}
        </p>
      ) : null}
    </div>
  );
}

export default function DualJourneyPreviewMaps({
  originEndpointId,
  destEndpointId,
  selectedJourney,
  userPickup,
  userDropoff,
}: {
  originEndpointId: EndpointId;
  destEndpointId: EndpointId;
  selectedJourney: JourneyListItem | null;
  userPickup?: [number, number] | null;
  userDropoff?: [number, number] | null;
}) {
  const cityOrigin = cityCenterForEndpoint(originEndpointId);
  const cityDest = cityCenterForEndpoint(destEndpointId);

  const journeyPickup =
    selectedJourney?.pickup_lat != null && selectedJourney?.pickup_lng != null
      ? vanPickupCoordinates(
          selectedJourney.pickup_location,
          selectedJourney.pickup_lat,
          selectedJourney.pickup_lng,
        )
      : null;
  const journeyDrop =
    selectedJourney?.dropoff_lat != null && selectedJourney?.dropoff_lng != null
      ? vanPickupCoordinates(
          selectedJourney.dropoff_location,
          selectedJourney.dropoff_lat,
          selectedJourney.dropoff_lng,
        )
      : null;

  const pickupFixed = selectedJourney ? stopModeForLeg(selectedJourney, "pickup") === "fixed" : false;
  const dropoffFixed = selectedJourney ? stopModeForLeg(selectedJourney, "dropoff") === "fixed" : false;

  return (
    <div className="flex w-fit max-w-full flex-col gap-3 justify-self-start">
      <MapSlot
        label="Pickup area"
        city={cityOrigin}
        userPoint={userPickup ?? null}
        journeyPoint={journeyPickup}
        zoomCity={ZOOM_CITY}
        zoomPrecise={ZOOM_PRECISE}
        hostFixed={pickupFixed}
        fixedWarning={pickupFixed ? "Single pickup location" : null}
      />
      <MapSlot
        label="Dropoff area"
        city={cityDest}
        userPoint={userDropoff ?? null}
        journeyPoint={journeyDrop}
        zoomCity={ZOOM_CITY}
        zoomPrecise={ZOOM_PRECISE}
        hostFixed={dropoffFixed}
        fixedWarning={dropoffFixed ? "Single dropoff location" : null}
      />
    </div>
  );
}
