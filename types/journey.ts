import type { DbOperatorVehicle } from "@/types/operator";



export type { DbOperatorVehicle };



export type JourneyStatus = "open" | "full" | "cancelled" | "expired";



export type VanBookingStatus = "not_booked" | "awaiting_driver" | "booked";



export type ListingStatus = "draft" | "submitted";



export type StopMode = "fixed" | "flexible";



export type HostTransportMode = "needs_vehicle" | "own_vehicle" | "vehicle_booked";



/** Vehicle type when host has own or pre-booked transport (UI subset). */

export type BookedHostVehicleType = "van" | "car";

/** Preference when host still needs to book transport. */

export type PreferredVehicleType = "van" | "car" | "dont_mind";



export type HostVehicleType = "van" | "car" | "suv" | "minibus" | "other";



export type ParticipantStatus = "pending" | "confirmed" | "declined" | "cancelled";



export type OperatorClaimStatus =

  | "interested"

  | "selected"

  | "not_selected"

  | "declined_by_host"

  | "driver_confirmed"

  | "withdrawn";



export type DbRoute = {

  id: string;

  name: string;

  typical_van_price_php: number;

  typical_car_price_php: number;

};



export type JourneyPriceMode = "per_seat" | "split_total";



export type DbJourney = {

  id: string;

  route_id: string;

  departure_date: string;

  time_window_start: string;

  time_window_end: string | null;

  host_name: string;

  host_email: string;

  pickup_location: string;

  pickup_lat: number | null;

  pickup_lng: number | null;

  dropoff_location: string;

  dropoff_lat: number | null;

  dropoff_lng: number | null;

  host_passenger_count: number;

  luggage_count: number;

  max_passengers: number;

  total_passenger_count: number;

  status: JourneyStatus;

  van_booking_status: VanBookingStatus;

  selected_operator_claim_id: string | null;

  notes: string | null;

  created_at: string;

  listing_status: ListingStatus;

  stop_mode: StopMode;

  pickup_stop_mode: StopMode;

  dropoff_stop_mode: StopMode;

  host_user_id: string | null;

  host_transport_mode: HostTransportMode;

  min_vehicle_seats: number | null;

  preferred_vehicle_type: PreferredVehicleType | null;

  have_pets: boolean;

  allow_pets: boolean;

  cabin_bags_count: number;

  checked_bags_count: number;

  oversized_luggage: boolean;

  host_has_own_vehicle: boolean;

  host_vehicle_type: HostVehicleType | null;

  host_vehicle_seats_offered: number | null;

  host_vehicle_make: string | null;

  host_vehicle_model: string | null;

  price_mode: JourneyPriceMode;

  price_per_seat_php: number | null;

  total_price_php: number | null;

  flight_number: string | null;

  flight_airline: string | null;

  flight_origin_iata: string | null;

  flight_scheduled_arrival: string | null;

};



export type JourneyListItem = DbJourney & {

  route: DbRoute | null;

  estimated_price_per_person_php: number;

};



export type CreateJourneyBody = {

  route_id: string;

  departure_date: string;

  time_window_start: string;

  pickup_location: string;

  pickup_lat?: number | null;

  pickup_lng?: number | null;

  dropoff_location: string;

  dropoff_lat?: number | null;

  dropoff_lng?: number | null;

  host_passenger_count: number;

  cabin_bags_count: number;

  checked_bags_count: number;

  oversized_luggage?: boolean;

  have_pets?: boolean;

  allow_pets?: boolean;

  notes?: string | null;

  stop_mode?: StopMode;

  pickup_stop_mode?: StopMode;

  dropoff_stop_mode?: StopMode;

  host_transport_mode: HostTransportMode;

  min_vehicle_seats?: number | null;

  preferred_vehicle_type?: PreferredVehicleType | null;

  host_vehicle_type?: BookedHostVehicleType | null;

  host_vehicle_seats_offered?: number | null;

  host_vehicle_make?: string | null;

  host_vehicle_model?: string | null;

  price_mode?: JourneyPriceMode;

  price_per_seat_php?: number | null;

  total_price_php?: number | null;

  flight_number?: string | null;

  flight_airline?: string | null;

  flight_origin_iata?: string | null;

  flight_scheduled_arrival?: string | null;

};



export type JoinJourneyBody = {

  pickup_location: string;

  dropoff_location: string;

  passenger_count: number;

  luggage_count: number;

};



export type ApplicationActionBody = {

  action: "accept" | "contact" | "deny";

};



export type ExpressInterestBody = {

  journey_id: string;

  operator_vehicle_id: string;

  proposed_price_php?: number | null;

};



export type VanBookingActionBody = {

  action: "book" | "decline";

};



export type JourneyHostActionBody = {

  action: "cancel" | "mark_full";

};



export type ModerationStatus = "active" | "warned" | "suspended";



export type DbOperator = {

  id: string;

  company_name: string;

  contact_name: string;

  email: string;

  verified: boolean;

  created_at: string;

  user_id?: string | null;

  moderation_status?: ModerationStatus;

  moderation_reason?: string | null;

  moderation_updated_at?: string | null;

};



export type DbOperatorClaim = {

  id: string;

  operator_id: string;

  journey_id: string;

  operator_vehicle_id: string | null;

  proposed_price_php: number | null;

  status: OperatorClaimStatus;

  vehicle_make: string | null;

  vehicle_model: string | null;

  vehicle_seat_count: number | null;

  vehicle_image_urls: string[] | null;

  contact_unlocked_at: string | null;

  created_at: string;

};



export type OperatorClaimWithOperator = DbOperatorClaim & {

  operators: DbOperator | null;

  operator_vehicles?: DbOperatorVehicle | null;

};



export type DbJourneyParticipant = {

  id: string;

  journey_id: string;

  name: string;

  email: string;

  pickup_location: string;

  dropoff_location: string;

  passenger_count: number;

  luggage_count: number;

  status: ParticipantStatus;

  user_id: string | null;

  contact_unlocked_at: string | null;

  agreed_price_per_seat_php: number | null;

  created_at: string;

};



export type OperatorReviewPublic = {

  id: string;

  rating: number;

  review_text: string | null;

  created_at: string;

};



export type JourneyDetailExtras = {

  booked_claim: OperatorClaimWithOperator | null;

  operator_interests: OperatorClaimWithOperator[];

  my_operator_claim: OperatorClaimWithOperator | null;

  confirmed_participants: DbJourneyParticipant[];

  operator_rating_avg: number | null;

  operator_rating_count: number;

  journey_reviews: OperatorReviewPublic[];

};



export type JourneyDetailItem = JourneyListItem & JourneyDetailExtras;



/** @deprecated use ExpressInterestBody */

export type ClaimJourneyBody = ExpressInterestBody;



export type SubmitReviewBody = {

  token: string;

  rating: number;

  review_text?: string | null;

};


