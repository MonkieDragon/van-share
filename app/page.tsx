import { Suspense } from "react";
import HomeRoot from "./HomeRoot";

function HomeShellFallback() {
  return (
    <div className="space-y-6">
      <div className="h-28 max-w-2xl animate-pulse rounded-lg bg-gray-100" aria-hidden />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeShellFallback />}>
      <HomeRoot />
    </Suspense>
  );
}
