// /app/components/Passenger/MapPicker.tsx
"use client";

import { MapContainer, Marker, useMap } from "react-leaflet";
import FallbackTileLayer from "@/components/Map/FallbackTileLayer";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { ensureLeafletDefaultIcons } from "@/lib/leafletDefaultIcons";

ensureLeafletDefaultIcons();

interface MapPickerProps {
  latLng: [number, number];
  setLatLng: (coords: [number, number]) => void;
  routeId?: string | null; // optional, to zoom to route bounds
}

const routeBounds: Record<string, [[number, number], [number, number]]> = {
  "el-nido-puerto-princesa": [
    [11.0, 119.2], // NW lat,lng
    [10.1, 119.6], // SE lat,lng
  ],
  "puerto-princesa-el-nido": [
    [9.5, 118.5],
    [10.2, 119.2],
  ],
};

function MapUpdater({
  routeId,
  lat,
  lng,
}: {
  routeId?: string | null;
  lat: number;
  lng: number;
}) {
  const map = useMap();
  useEffect(() => {
    const b = routeId && routeBounds[routeId] ? routeBounds[routeId] : null;
    if (b) {
      const [[nwLat, nwLng], [seLat, seLng]] = b;
      map.fitBounds([
        [nwLat, nwLng],
        [seLat, seLng],
      ]);
    } else {
      map.setView([lat, lng], 13);
    }
  }, [map, routeId, lat, lng]);
  return null;
}

export default function MapPicker({
  latLng,
  setLatLng,
  routeId,
}: MapPickerProps) {
  const lat = latLng[0];
  const lng = latLng[1];

  return (
    <MapContainer center={latLng} zoom={13} className="w-full h-80">
      <FallbackTileLayer />
      <Marker
        position={latLng}
        draggable
        eventHandlers={{
          dragend: (e) =>
            setLatLng([e.target.getLatLng().lat, e.target.getLatLng().lng]),
        }}
      />
      <MapUpdater routeId={routeId} lat={lat} lng={lng} />
    </MapContainer>
  );
}
