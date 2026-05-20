import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/flightService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";
    const result = await searchFlights(q, date);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ flights: [], available: false, error: msg }, { status: 500 });
  }
}
