"use client";

import Link from "next/link";

export default function JourneyDetailBackLink({ returnHref }: { returnHref?: string | null }) {
  if (returnHref) {
    return (
      <Link href={returnHref} className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back
      </Link>
    );
  }
  return (
    <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
      ← Home
    </Link>
  );
}
