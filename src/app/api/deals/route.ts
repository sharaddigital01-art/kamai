import { NextResponse } from "next/server";
import { getDeals, parseDealFilters } from "@/lib/deals";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const filters = parseDealFilters(new URL(req.url).searchParams);
  const page = await getDeals(filters);
  return NextResponse.json(page, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
