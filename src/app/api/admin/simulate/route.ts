import { NextResponse } from "next/server";
import { recordLiveConversion, incrementMockLinkClick, getLiveStats, getLiveBalances } from "@/lib/mockData";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "conversion";

    if (action === "conversion") {
      const storeSlug = body.storeSlug || "flipkart";
      const orderAmountPaise = Number(body.orderAmountPaise) || 199900; // ₹1,999.00
      const userAmountPaise = Number(body.userAmountPaise) || 14992; // ₹149.92 profit
      const row = recordLiveConversion(storeSlug, orderAmountPaise, userAmountPaise);
      return NextResponse.json({
        success: true,
        order: row,
        stats: getLiveStats(),
        balances: getLiveBalances(),
      });
    }

    if (action === "click") {
      const code = body.code || "demo_click";
      incrementMockLinkClick(code);
      return NextResponse.json({
        success: true,
        stats: getLiveStats(),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Simulation failed" }, { status: 500 });
  }
}
