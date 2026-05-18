import { Suspense } from "react";
import JoinForm from "./JoinForm";

export default function JoinJourneyPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-900">Loading…</p>}>
      <JoinForm />
    </Suspense>
  );
}
