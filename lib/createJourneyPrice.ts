import { roundUpToNearestFifty } from "@/lib/journeyPricing";
import type {
  BookedHostVehicleType,
  HostTransportMode,
  JourneyPriceMode,
  PreferredVehicleType,
} from "@/types/journey";

const ROUTE_TYPICAL_VAN_PHP: Record<string, number> = {
  "puerto-princesa-el-nido": 7000,
  "el-nido-puerto-princesa": 7000,
};

const ROUTE_TYPICAL_CAR_PHP: Record<string, number> = {
  "puerto-princesa-el-nido": 3500,
  "el-nido-puerto-princesa": 5000,
};

const DEFAULT_VAN_PHP = 7000;
const DEFAULT_CAR_PHP = 3500;

export function typicalVanPriceForRoute(routeId: string | null): number {
  if (!routeId) return DEFAULT_VAN_PHP;
  return ROUTE_TYPICAL_VAN_PHP[routeId] ?? DEFAULT_VAN_PHP;
}

export function typicalCarPriceForRoute(routeId: string | null): number {
  if (!routeId) return DEFAULT_CAR_PHP;
  return ROUTE_TYPICAL_CAR_PHP[routeId] ?? DEFAULT_CAR_PHP;
}

export function vehicleKindForPriceEstimate(opts: {
  hostTransportMode: HostTransportMode;
  preferredVehicleType: PreferredVehicleType;
  hostVehicleType: BookedHostVehicleType | "";
}): "van" | "car" {
  if (opts.hostTransportMode === "needs_vehicle") {
    return opts.preferredVehicleType === "car" ? "car" : "van";
  }
  return opts.hostVehicleType === "car" ? "car" : "van";
}

export function estimatedTotalPricePhp(opts: {
  routeId: string | null;
  hostTransportMode: HostTransportMode;
  preferredVehicleType: PreferredVehicleType;
  hostVehicleType: BookedHostVehicleType | "";
}): number {
  const van = typicalVanPriceForRoute(opts.routeId);
  const car = typicalCarPriceForRoute(opts.routeId);
  return vehicleKindForPriceEstimate(opts) === "car" ? car : van;
}

export function seatPriceFromTotal(totalPhp: number, maxPassengers: number): number {
  const seats = Math.max(1, maxPassengers);
  return roundUpToNearestFifty(totalPhp / seats);
}

export function priceModeLabel(mode: JourneyPriceMode): string {
  return mode === "per_seat" ? "Fixed price per seat" : "Split total price";
}
