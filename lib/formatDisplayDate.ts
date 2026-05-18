import { parseYmd } from "@/lib/journeyRouteEndpoints";

/** e.g. "Wed 19 May" — no comma */
export function formatDayShort(ymd: string): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  const weekday = d.toLocaleDateString("en-PH", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-PH", { month: "short" });
  return `${weekday} ${day} ${month}`;
}
