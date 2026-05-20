import { Suspense } from "react";
import OnboardingPassengerForm from "./OnboardingPassengerForm";

export const metadata = {
  title: "Traveler profile | Van Share",
};

export default function OnboardingPassengerPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-gray-600">Loading…</p>}>
      <OnboardingPassengerForm />
    </Suspense>
  );
}
