import L from "leaflet";

let fixed = false;

/** Leaflet default marker URLs break under bundlers; call once before maps mount. */
export function ensureLeafletDefaultIcons() {
  if (fixed) return;
  fixed = true;
  delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
