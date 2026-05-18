"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addDaysYmd, parseYmd } from "@/lib/journeyRouteEndpoints";
import { formatDayShort } from "@/lib/formatDisplayDate";

function fiveDates(centerYmd: string): string[] {
  if (!parseYmd(centerYmd)) return [centerYmd, centerYmd, centerYmd, centerYmd, centerYmd];
  return [-2, -1, 0, 1, 2].map((delta) => addDaysYmd(centerYmd, delta));
}

type Props = {
  selectedYmd: string;
  onSelectYmd: (ymd: string) => void;
  hasJourneysByYmd?: Record<string, boolean>;
};

export default function DateStrip({ selectedYmd, onSelectYmd, hasJourneysByYmd }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [centerYmd, setCenterYmd] = useState(selectedYmd);
  const [slidePx, setSlidePx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const pendingYmd = useRef<string | null>(null);
  const transitioningRef = useRef(false);

  useEffect(() => {
    transitioningRef.current = transitioning;
  }, [transitioning]);

  useEffect(() => {
    if (!transitioningRef.current) {
      setCenterYmd(selectedYmd);
    }
  }, [selectedYmd]);

  const dates = fiveDates(centerYmd);

  const finishSlide = useCallback(() => {
    const y = pendingYmd.current;
    pendingYmd.current = null;
    if (y) {
      setCenterYmd(y);
      onSelectYmd(y);
    }
    setSlidePx(0);
    setTransitioning(false);
  }, [onSelectYmd]);

  const handlePick = (index: number, ymd: string) => {
    if (transitioning) return;
    if (index === 2) {
      setCenterYmd(ymd);
      onSelectYmd(ymd);
      return;
    }
    const outer = trackRef.current;
    if (!outer) return;
    const cellW = outer.offsetWidth / 5;
    pendingYmd.current = ymd;
    setTransitioning(true);
    setSlidePx((2 - index) * cellW);
  };

  return (
    <DateStripTrack
      trackRef={trackRef}
      slidePx={slidePx}
      transitioning={transitioning}
      onTransitionEnd={() => {
        if (pendingYmd.current) finishSlide();
      }}
      dates={dates}
      hasJourneysByYmd={hasJourneysByYmd}
      onPick={handlePick}
    />
  );
}

function DateStripTrack({
  trackRef,
  slidePx,
  transitioning,
  onTransitionEnd,
  dates,
  hasJourneysByYmd,
  onPick,
}: {
  trackRef: React.RefObject<HTMLDivElement | null>;
  slidePx: number;
  transitioning: boolean;
  onTransitionEnd: () => void;
  dates: string[];
  hasJourneysByYmd?: Record<string, boolean>;
  onPick: (index: number, ymd: string) => void;
}) {
  return (
    <div
      ref={trackRef}
      className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div
        className={transitioning ? "transition-transform duration-300 ease-out" : ""}
        style={{ transform: `translateX(${slidePx}px)` }}
        onTransitionEnd={onTransitionEnd}
      >
        <div className="flex w-full">
          {dates.map((ymd, i) => {
            const center = i === 2;
            const hasTrips = hasJourneysByYmd?.[ymd];
            return (
              <button
                key={`${i}-${ymd}`}
                type="button"
                disabled={transitioning}
                onClick={() => onPick(i, ymd)}
                className={`flex min-h-[3rem] flex-1 flex-col items-center justify-center border-r border-gray-100 px-1 py-2 text-center last:border-r-0 ${
                  center
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                }`}
              >
                <span className="text-xs font-bold leading-tight sm:text-sm">{formatDayShort(ymd)}</span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    hasTrips
                      ? center
                        ? "bg-white"
                        : "bg-blue-600"
                      : "bg-transparent"
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
