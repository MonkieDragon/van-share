export type AccountType = "passenger" | "operator";

export type DbProfile = {
  user_id: string;
  account_type: AccountType;
  display_name: string | null;
  nationality: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOperatorVehicle = {
  id: string;
  operator_id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  image_urls: string[];
  seat_count: number | null;
  created_at: string;
};

export type OperatorVehicleInput = {
  name: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  image_urls: string[];
  seat_count: number;
};

export type OperatorFleetVehicle = Pick<
  DbOperatorVehicle,
  "id" | "name" | "make" | "model" | "seat_count"
>;

export type RegisterOperatorBody = {
  company_name: string;
  contact_name: string;
  vehicles: OperatorVehicleInput[];
};

export type UpdateProfileBody = {
  display_name?: string;
  nationality?: string;
  complete_onboarding?: boolean;
};
