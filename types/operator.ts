export type AccountType = "passenger" | "operator";

export type DbProfile = {
  user_id: string;
  account_type: AccountType;
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
  phone: string;
  vehicles: OperatorVehicleInput[];
};
