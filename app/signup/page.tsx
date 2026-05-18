import { Suspense } from "react";
import SignupForm from "@/components/Auth/SignupForm";

export const metadata = {
  title: "Sign up | Van Share",
};

export default function SignupPage() {
  return (
    <div className="py-6">
      <Suspense fallback={<p className="text-gray-800">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
