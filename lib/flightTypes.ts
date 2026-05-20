export type FlightStatusLabel = "On time" | "Delayed" | "Cancelled" | "Diverted" | "Unknown";

export type FlightOption = {
  flightNumber: string;
  airline: string;
  originIata: string;
  destinationIata: string;
  scheduledArrival: string;
};

export type SelectedFlight = FlightOption;

export type FlightStatus = {
  flightNumber: string;
  airline: string;
  originIata: string;
  scheduledArrival: string | null;
  estimatedArrival: string | null;
  statusLabel: FlightStatusLabel;
};

export type FlightSearchResult = {
  flights: FlightOption[];
  available: boolean;
};

export type FlightStatusResult = {
  status: FlightStatus | null;
  available: boolean;
};
