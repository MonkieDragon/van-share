import { NextRequest, NextResponse } from "next/server";
import { getFlightStatus } from "@/lib/flightService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const flight = searchParams.get("flight")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? undefined;
    const refresh = searchParams.get("refresh") === "1";
    if (!flight) {
      return NextResponse.json({ error: "flight is required" }, { status: 400 });
    }
    const result = await getFlightStatus(flight, date, refresh);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ status: null, available: false, error: msg }, { status: 500 });
  }
}
