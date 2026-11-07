import { NextResponse } from "next/server";
import { getApiUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, getLiveLedger } from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAdminAuth(user: any): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  return (
    user.role === "ADMIN" ||
    user.is_admin === true ||
    email === "support@kamaikaro.in" ||
    email === "admin@kamaikaro.in" ||
    isAdminEmail(email)
  );
}

function cleanCsvCell(val: any): string {
  if (val == null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET() {
  const admin = await getApiUser().catch(() => null);
  if (!checkAdminAuth(admin)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  const headers = [
    "Order ID",
    "Store",
    "Date",
    "User Name",
    "User Email",
    "SubID",
    "Order Amount (INR)",
    "Gross Commission (INR)",
    "User Profit (INR)",
    "Admin Cut (INR)",
    "Status",
  ];

  const rows: string[] = [headers.join(",")];

  if (isDatabaseConfigured()) {
    try {
      const orders = await prisma.earningsLedger.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          store: { select: { name: true } },
          user: { select: { name: true, email: true, subIdPrefix: true } },
        },
      });

      for (const o of orders) {
        const orderAmountInr = (o.orderAmountPaise / 100).toFixed(2);
        const grossCommissionInr = (o.commissionPaise / 100).toFixed(2);
        const userProfitInr = (o.userAmountPaise / 100).toFixed(2);
        const adminCutInr = ((o.commissionPaise * 0.3) / 100).toFixed(2);
        const orderDate = o.createdAt.toISOString().replace("T", " ").slice(0, 19);

        rows.push(
          [
            cleanCsvCell(o.externalOrderId),
            cleanCsvCell(o.store?.name || "Affiliate Store"),
            cleanCsvCell(orderDate),
            cleanCsvCell(o.user?.name || "Partner"),
            cleanCsvCell(o.user?.email || "No email"),
            cleanCsvCell(o.user?.subIdPrefix || "subid"),
            cleanCsvCell(orderAmountInr),
            cleanCsvCell(grossCommissionInr),
            cleanCsvCell(userProfitInr),
            cleanCsvCell(adminCutInr),
            cleanCsvCell(o.status),
          ].join(",")
        );
      }
    } catch (err: any) {
      console.warn("Database error in /admin/api/export-orders, using fallback:", err?.message || err);
    }
  }

  // If no DB rows, export mock ledger
  if (rows.length === 1) {
    const mock = getLiveLedger();
    for (const m of mock) {
      const commPaise = (m as any).commissionPaise ?? Math.round(m.userAmountPaise / 0.70);
      const storeName = m.store?.name || (m as any).storeName || "Flipkart";
      const orderAmountInr = (m.orderAmountPaise / 100).toFixed(2);
      const grossCommissionInr = (commPaise / 100).toFixed(2);
      const userProfitInr = (m.userAmountPaise / 100).toFixed(2);
      const adminCutInr = ((commPaise * 0.3) / 100).toFixed(2);

      rows.push(
        [
          cleanCsvCell(m.externalOrderId),
          cleanCsvCell(storeName),
          cleanCsvCell(new Date(m.createdAt).toISOString().replace("T", " ").slice(0, 19)),
          cleanCsvCell("Kamai Partner"),
          cleanCsvCell("partner@example.com"),
          cleanCsvCell("sub01"),
          cleanCsvCell(orderAmountInr),
          cleanCsvCell(grossCommissionInr),
          cleanCsvCell(userProfitInr),
          cleanCsvCell(adminCutInr),
          cleanCsvCell(m.status),
        ].join(",")
      );
    }
  }

  const csvContent = rows.join("\r\n");
  const filename = `kamai-orders-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
