"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/";
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { onboardingComplete?: boolean; isOperator?: boolean } | null) => {
        if (data?.isOperator) {
          router.replace("/operator/dashboard");
          return;
        }
        if (data?.onboardingComplete) {
          router.replace(next.startsWith("/") ? next : "/");
        }
      })
      .finally(() => setChecking(false));
  }, [router, next]);

  if (checking) {
    return <p className="py-12 text-center text-sm text-gray-600">Loading…</p>;
  }

  const nextQs = encodeURIComponent(next);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">How will you use Van Share?</h1>
        <p className="mt-2 text-sm text-gray-800">
          Choose one to finish setting up your account. You can browse journeys either way.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-1">
        <Link
          href={`/onboarding/passenger?next=${nextQs}`}
          className="block rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30"
        >
          <h2 className="text-lg font-bold text-gray-950">I&apos;m a traveler</h2>
          <p className="mt-1 text-sm text-gray-700">
            Post or join shared private van journeys between destinations.
          </p>
        </Link>
        <Link
          href={`/operator/register?next=${nextQs}`}
          className="block rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
        >
          <h2 className="text-lg font-bold text-gray-950">I offer van rental</h2>
          <p className="mt-1 text-sm text-gray-700">
            Register your business and fleet to express interest on open journeys.
          </p>
        </Link>
      </div>
    </div>
  );
}
