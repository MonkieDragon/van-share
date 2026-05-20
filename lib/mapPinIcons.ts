import L from "leaflet";

const PIN_W = 25;
const PIN_H = 41;

function pinSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 25 41" aria-hidden="true">
  <path fill="${fill}" stroke="#fff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
  <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
</svg>`;
}

const cache = new Map<string, L.DivIcon>();

/** Pin icons with anchor at tip so tooltips center above the marker. */
export function createPinIcon(color: "blue" | "red"): L.DivIcon {
  const key = color;
  const cached = cache.get(key);
  if (cached) return cached;

  const fill = color === "red" ? "#dc2626" : "#2563eb";
  const icon = L.divIcon({
    className: "map-pin-leaflet-icon",
    html: pinSvg(fill),
    iconSize: [PIN_W, PIN_H],
    iconAnchor: [PIN_W / 2, PIN_H],
    tooltipAnchor: [PIN_W / 2, 0],
  });
  cache.set(key, icon);
  return icon;
}
