export type MapTileProvider = {
  url: string;
  attribution: string;
  subdomains?: string;
};

/** Free raster basemaps (no API keys). First entry is preferred; later entries are fallbacks. */
export const MAP_TILE_PROVIDERS: MapTileProvider[] = [
  {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: "abc",
  },
];
