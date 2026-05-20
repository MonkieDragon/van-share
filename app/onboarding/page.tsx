import { Suspense } from "react";
import OnboardingRolePage from "./OnboardingRolePage";

export const metadata = {
  title: "Welcome | Van Share",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-gray-600">Loading…</p>}>
      <OnboardingRolePage />
    </Suspense>
  );
}
