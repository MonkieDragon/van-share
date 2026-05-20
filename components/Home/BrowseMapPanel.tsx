"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import PreferredAddressesPanel from "@/components/Home/PreferredAddressesPanel";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { ensureLeafletDefaultIcons } from "@/lib/leafletDefaultIcons";
import {
  distanceBetween,
  formatDistanceMeters,
  sameMapPoint,
} from "@/lib/mapPointUtils";
import { vanPickupCoordinates } from "@/lib/ppsAirport";
import type { EndpointId } from "@/lib/journeyRouteEndpoints";
import { cityCenterForEndpoint } from "@/lib/routeCityCenters";
import type { JourneyListItem, StopMode } from "@/types/journey";

ensureLeafletDefaultIcons();

export type BrowseMapMode = "route" | "pickup" | "dropoff";

const LINE_FLEXIBLE = "#2563eb";
const LINE_FIXED = "#dc2626";
const LINE_JOURNEY = "#4f46e5";
const ZOOM_CITY = 12;
const ZOOM_PRECISE = 15;

function stopModeForLeg(
  journey: JourneyListItem,
  leg: "pickup" | "dropoff",
): StopMode {
  const legacy = journey.stop_mode ?? "fixed";
  if (leg === "pickup") return journey.pickup_stop_mode ?? legacy;
  return journey.dropoff_stop_mode ?? legacy;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.55 });
  }, [map, center[0], center[1], zoom]);
  return null;
}

function FitPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], ZOOM_PRECISE, { duration: 0.55 });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

type MapLine = {
  id: string;
  positions: [[number, number], [number, number]];
  color: string;
  weight: number;
};

type MapMarker = {
  id: string;
  position: [number, number];
  tooltip?: string;
};

function MapModeToggle({
  mode,
  onChange,
}: {
  mode: BrowseMapMode;
  onChange: (mode: BrowseMapMode) => void;
}) {
  const options: { id: BrowseMapMode; label: string }[] = [
    { id: "pickup", label: "Pickup" },
    { id: "dropoff", label: "Dropoff" },
    { id: "route", label: "Route" },
  ];
  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
      {options.map((opt) => {
        const selected = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition-colors sm:text-sm ${
              selected
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function BrowseMap({
  mode,
  originEndpointId,
  destEndpointId,
  selectedJourney,
  userPickup,
  userDropoff,
}: {
  mode: BrowseMapMode;
  originEndpointId: EndpointId;
  destEndpointId: EndpointId;
  selectedJourney: JourneyListItem | null;
  userPickup: [number, number] | null;
  userDropoff: [number, number] | null;
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

  const { markers, lines, fitPoints, center, zoom, warnings } = useMemo(() => {
    const warningsOut: string[] = [];

    if (mode === "pickup") {
      const userPoint = userPickup;
      const journeyPoint = journeyPickup;
      const city = cityOrigin;
      const hostFixed = pickupFixed;
      if (hostFixed) warningsOut.push("Single pickup location");

      const points: [number, number][] = [];
      if (userPoint) points.push(userPoint);
      if (journeyPoint && !points.some((p) => sameMapPoint(p, journeyPoint))) {
        points.push(journeyPoint);
      }

      const markerList: MapMarker[] = points.map((p, i) => ({
        id: `m-${i}`,
        position: p,
        tooltip:
          userPoint &&
          journeyPoint &&
          points.length === 2 &&
          !sameMapPoint(userPoint, journeyPoint) &&
          sameMapPoint(p, journeyPoint)
            ? formatDistanceMeters(distanceBetween(userPoint, journeyPoint))
            : undefined,
      }));

      const lineList: MapLine[] = [];
      if (
        userPoint &&
        journeyPoint &&
        !sameMapPoint(userPoint, journeyPoint)
      ) {
        lineList.push({
          id: "pickup-leg",
          positions: [userPoint, journeyPoint],
          color: hostFixed ? LINE_FIXED : LINE_FLEXIBLE,
          weight: hostFixed ? 4 : 3,
        });
      }

      const single = points.length === 1 ? points[0] : null;
      return {
        markers: markerList,
        lines: lineList,
        fitPoints: points,
        center: single ?? city,
        zoom: single ? ZOOM_PRECISE : ZOOM_CITY,
        warnings: warningsOut,
      };
    }

    if (mode === "dropoff") {
      const userPoint = userDropoff;
      const journeyPoint = journeyDrop;
      const city = cityDest;
      const hostFixed = dropoffFixed;
      if (hostFixed) warningsOut.push("Single dropoff location");

      const points: [number, number][] = [];
      if (userPoint) points.push(userPoint);
      if (journeyPoint && !points.some((p) => sameMapPoint(p, journeyPoint))) {
        points.push(journeyPoint);
      }

      const markerList: MapMarker[] = points.map((p, i) => ({
        id: `m-${i}`,
        position: p,
        tooltip:
          userPoint &&
          journeyPoint &&
          points.length === 2 &&
          !sameMapPoint(userPoint, journeyPoint) &&
          sameMapPoint(p, journeyPoint)
            ? formatDistanceMeters(distanceBetween(userPoint, journeyPoint))
            : undefined,
      }));

      const lineList: MapLine[] = [];
      if (
        userPoint &&
        journeyPoint &&
        !sameMapPoint(userPoint, journeyPoint)
      ) {
        lineList.push({
          id: "dropoff-leg",
          positions: [userPoint, journeyPoint],
          color: hostFixed ? LINE_FIXED : LINE_FLEXIBLE,
          weight: hostFixed ? 4 : 3,
        });
      }

      const single = points.length === 1 ? points[0] : null;
      return {
        markers: markerList,
        lines: lineList,
        fitPoints: points,
        center: single ?? city,
        zoom: single ? ZOOM_PRECISE : ZOOM_CITY,
        warnings: warningsOut,
      };
    }

    // Route mode — show pickup & dropoff together
    const markerList: MapMarker[] = [];
    const addMarker = (pos: [number, number], id: string, tooltip?: string) => {
      const existing = markerList.find((m) => sameMapPoint(m.position, pos));
      if (existing) {
        if (tooltip && !existing.tooltip) existing.tooltip = tooltip;
        return;
      }
      markerList.push({ id, position: pos, tooltip });
    };

    if (userPickup) addMarker(userPickup, "user-pickup");
    if (journeyPickup) {
      const pickupTooltip =
        userPickup && !sameMapPoint(userPickup, journeyPickup)
          ? formatDistanceMeters(distanceBetween(userPickup, journeyPickup))
          : undefined;
      addMarker(journeyPickup, "journey-pickup", pickupTooltip);
    }
    if (userDropoff) addMarker(userDropoff, "user-dropoff");
    if (journeyDrop) {
      const dropTooltip =
        userDropoff && !sameMapPoint(userDropoff, journeyDrop)
          ? formatDistanceMeters(distanceBetween(userDropoff, journeyDrop))
          : undefined;
      addMarker(journeyDrop, "journey-dropoff", dropTooltip);
    }

    const lineList: MapLine[] = [];

    if (
      userPickup &&
      journeyPickup &&
      !sameMapPoint(userPickup, journeyPickup)
    ) {
      lineList.push({
        id: "pickup-leg",
        positions: [userPickup, journeyPickup],
        color: pickupFixed ? LINE_FIXED : LINE_FLEXIBLE,
        weight: pickupFixed ? 4 : 3,
      });
      if (pickupFixed) warningsOut.push("Single pickup location");
    }

    if (
      userDropoff &&
      journeyDrop &&
      !sameMapPoint(userDropoff, journeyDrop)
    ) {
      lineList.push({
        id: "dropoff-leg",
        positions: [userDropoff, journeyDrop],
        color: dropoffFixed ? LINE_FIXED : LINE_FLEXIBLE,
        weight: dropoffFixed ? 4 : 3,
      });
      if (dropoffFixed) warningsOut.push("Single dropoff location");
    }

    if (
      journeyPickup &&
      journeyDrop &&
      !sameMapPoint(journeyPickup, journeyDrop)
    ) {
      lineList.push({
        id: "journey-route",
        positions: [journeyPickup, journeyDrop],
        color: LINE_JOURNEY,
        weight: 3,
      });
    }

    const fitPoints: [number, number][] = markerList.map((m) => m.position);
    if (fitPoints.length === 0) {
      fitPoints.push(cityOrigin, cityDest);
    }

    const single = fitPoints.length === 1 ? fitPoints[0] : null;
    return {
      markers: markerList,
      lines: lineList,
      fitPoints,
      center: single ?? cityOrigin,
      zoom: single ? ZOOM_PRECISE : ZOOM_CITY,
      warnings: warningsOut,
    };
  }, [
    mode,
    userPickup,
    userDropoff,
    journeyPickup,
    journeyDrop,
    cityOrigin,
    cityDest,
    pickupFixed,
    dropoffFixed,
  ]);

  const hasFixedWarning = warnings.length > 0;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-gray-50 shadow-inner ${
        hasFixedWarning ? "border-red-300" : "border-gray-200"
      }`}
    >
      <div className="relative aspect-[4/3] w-full sm:aspect-square">
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
          {fitPoints.length > 1 ? (
            <FitPoints points={fitPoints} />
          ) : (
            <FlyTo center={center} zoom={zoom} />
          )}
          {lines.map((line) => (
            <Polyline
              key={line.id}
              positions={line.positions}
              pathOptions={{ color: line.color, weight: line.weight }}
            />
          ))}
          {markers.map((m) => (
            <Marker key={m.id} position={m.position}>
              {m.tooltip ? (
                <Tooltip permanent direction="top" offset={[0, -12]} className="distance-callout">
                  {m.tooltip}
                </Tooltip>
              ) : null}
            </Marker>
          ))}
        </MapContainer>
      </div>
      {hasFixedWarning ? (
        <div className="border-t border-red-200 bg-red-50 px-2 py-1.5 text-center text-xs font-semibold text-red-900">
          {warnings.join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  routeId: string;
  originEndpointId: EndpointId;
  destEndpointId: EndpointId;
  selectedJourney: JourneyListItem | null;
  userPickup: GeocodePick | null;
  userDropoff: GeocodePick | null;
  onPickupPick: (pick: GeocodePick | null) => void;
  onDropoffPick: (pick: GeocodePick | null) => void;
  hideAddressPanel?: boolean;
};

export default function BrowseMapPanel({
  routeId,
  originEndpointId,
  destEndpointId,
  selectedJourney,
  userPickup,
  userDropoff,
  onPickupPick,
  onDropoffPick,
  hideAddressPanel = false,
}: Props) {
  const [mapMode, setMapMode] = useState<BrowseMapMode>("route");

  const userPickupLatLng = userPickup ? ([userPickup.lat, userPickup.lng] as [number, number]) : null;
  const userDropoffLatLng = userDropoff
    ? ([userDropoff.lat, userDropoff.lng] as [number, number])
    : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 lg:max-w-sm">
      <MapModeToggle mode={mapMode} onChange={setMapMode} />
      <BrowseMap
        mode={mapMode}
        originEndpointId={originEndpointId}
        destEndpointId={destEndpointId}
        selectedJourney={selectedJourney}
        userPickup={userPickupLatLng}
        userDropoff={userDropoffLatLng}
      />
      {!hideAddressPanel && (
        <PreferredAddressesPanel
          routeId={routeId}
          showPresetButtons={false}
          onPickupPick={onPickupPick}
          onDropoffPick={onDropoffPick}
        />
      )}
    </div>
  );
}
