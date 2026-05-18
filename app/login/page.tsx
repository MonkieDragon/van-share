import { Suspense } from "react";
import LoginForm from "@/components/Auth/LoginForm";

export const metadata = {
  title: "Log in | Van Share",
};

export default function LoginPage() {
  return (
    <div className="py-6">
      <Suspense fallback={<p className="text-gray-800">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
