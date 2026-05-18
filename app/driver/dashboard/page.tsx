import { redirect } from "next/navigation";

export default function DriverDashboardRedirect() {
  redirect("/operator/dashboard");
}
