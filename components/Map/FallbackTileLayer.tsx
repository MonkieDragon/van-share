"use client";

import { useCallback, useState } from "react";
import { TileLayer } from "react-leaflet";
import { MAP_TILE_PROVIDERS } from "@/lib/mapTileProviders";

export default function FallbackTileLayer() {
  const [index, setIndex] = useState(0);
  const provider = MAP_TILE_PROVIDERS[index]!;

  const onTileError = useCallback(() => {
    setIndex((i) => (i < MAP_TILE_PROVIDERS.length - 1 ? i + 1 : i));
  }, []);

  return (
    <TileLayer
      key={provider.url}
      url={provider.url}
      attribution={provider.attribution}
      subdomains={provider.subdomains}
      eventHandlers={{ tileerror: onTileError }}
    />
  );
}
