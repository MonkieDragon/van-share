"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { formatDayShort } from "@/lib/formatDisplayDate";
import { ymdFromDate } from "@/lib/journeyRouteEndpoints";

export const journeyFieldClass =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm";

/** Taller control used on create-journey (matches time inputs). */
export const createJourneyFieldClass =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm";

const VIEWPORT_PAD = 8;

type Props = {
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
  label?: string;
  labelClassName?: string;
  className?: string;
  fieldClassName?: string;
  /** When set, loads availability dots for that route/month. */
  routeId?: string | null;
  showTripDots?: boolean;
  disabled?: boolean;
};

function clampPopoverPosition(
  trigger: DOMRect,
  popover: DOMRect,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = trigger.left;
  let top = trigger.bottom + 4;

  if (left + popover.width > vw - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, vw - VIEWPORT_PAD - popover.width);
  }
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

  if (top + popover.height > vh - VIEWPORT_PAD) {
    const above = trigger.top - popover.height - 4;
    top = above >= VIEWPORT_PAD ? above : Math.max(VIEWPORT_PAD, vh - VIEWPORT_PAD - popover.height);
  }

  return { top, left };
}

export default function JourneyDatePicker({
  valueYmd,
  onChangeYmd,
  label = "Date",
  labelClassName = "text-xs font-semibold text-gray-700",
  className = "relative flex w-full min-w-0 flex-col",
  fieldClassName = journeyFieldClass,
  routeId = null,
  showTripDots = false,
  disabled = false,
}: Props) {
  const [showCal, setShowCal] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({
    visibility: "hidden",
  });
  const [month, setMonth] = useState(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valueYmd)) {
      const [y, m] = valueYmd.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [datesWithTrips, setDatesWithTrips] = useState<Set<string>>(new Set());
  const [loadingDots, setLoadingDots] = useState(false);

  const selectedDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valueYmd)) return undefined;
    const [y, m, d] = valueYmd.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [valueYmd]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valueYmd)) return;
    const [y, m] = valueYmd.split("-").map(Number);
    setMonth(new Date(y, m - 1, 1));
  }, [valueYmd]);

  const loadDots = useCallback(async () => {
    if (!showTripDots || !routeId) return;
    setLoadingDots(true);
    try {
      const y = month.getFullYear();
      const m = month.getMonth() + 1;
      const res = await fetch(`/api/journeys/availability?route_id=${routeId}&year=${y}&month=${m}`);
      const data = (await res.json()) as { dates?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Availability failed");
      setDatesWithTrips(new Set(data.dates ?? []));
    } catch {
      setDatesWithTrips(new Set());
    } finally {
      setLoadingDots(false);
    }
  }, [routeId, month, showTripDots]);

  useEffect(() => {
    void loadDots();
  }, [loadDots]);

  const updatePopoverPosition = useCallback(() => {
    const root = datePickerRef.current;
    const popover = popoverRef.current;
    if (!showCal || !root || !popover) return;

    const trigger = root.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const { top, left } = clampPopoverPosition(trigger, popoverRect);

    setPopoverStyle({
      position: "fixed",
      top,
      left,
      zIndex: 50,
      visibility: "visible",
      maxWidth: `calc(100vw - ${VIEWPORT_PAD * 2}px)`,
    });
  }, [showCal]);

  useLayoutEffect(() => {
    if (!showCal) {
      setPopoverStyle({ visibility: "hidden" });
      return;
    }
    updatePopoverPosition();
  }, [showCal, month, updatePopoverPosition]);

  useEffect(() => {
    if (!showCal) return;
    const onReflow = () => updatePopoverPosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [showCal, updatePopoverPosition]);

  useEffect(() => {
    if (!showCal) return;
    const close = (e: MouseEvent) => {
      if (datePickerRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      setShowCal(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showCal]);

  const modifiers = useMemo(() => {
    if (!showTripDots) return undefined;
    const withTrips = [...datesWithTrips].map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
    return { hasTrips: withTrips };
  }, [datesWithTrips, showTripDots]);

  return (
    <div ref={datePickerRef} className={className}>
      <span className={labelClassName}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        className={`mt-1 ${fieldClassName} flex w-full items-center justify-between gap-1 disabled:opacity-60`}
        onClick={() => setShowCal((v) => !v)}
      >
        <span className="truncate">
          {valueYmd ? formatDayShort(valueYmd) : "Select date"}
        </span>
        {showTripDots && (
          <span className="shrink-0 text-xs text-gray-500">{loadingDots ? "…" : ""}</span>
        )}
      </button>
      {showCal && (
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="journey-date-picker-popover rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-lg"
        >
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
            onSelect={(d) => {
              if (d) {
                onChangeYmd(ymdFromDate(d));
                setShowCal(false);
              }
            }}
            modifiers={modifiers}
            modifiersClassNames={
              showTripDots ? { hasTrips: "day-with-journeys" } : undefined
            }
          />
          {showTripDots && (
            <p className="mt-2 text-xs text-gray-600">
              Blue dot: at least one open journey that day.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
