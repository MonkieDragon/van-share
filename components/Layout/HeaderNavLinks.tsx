"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HeaderNavLinks() {
  const [showPostJourney, setShowPostJourney] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { isOperator?: boolean } | null) => {
        if (data && data.isOperator) {
          setShowPostJourney(false);
        } else {
          setShowPostJourney(true);
        }
      })
      .catch(() => setShowPostJourney(true));
  }, []);

  if (!showPostJourney) return null;

  return (
    <Link href="/create-journey" className="hover:underline">
      Post journey
    </Link>
  );
}
