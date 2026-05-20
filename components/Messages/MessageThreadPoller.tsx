"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  threadId: string;
  intervalMs?: number;
};

export default function MessageThreadPoller({ threadId, intervalMs = 10000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, threadId, intervalMs]);

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="text-sm font-semibold text-blue-700 hover:underline"
    >
      Refresh messages
    </button>
  );
}
