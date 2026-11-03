import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUserBySubId } from "@/lib/cuelinksSync";
import {
  isDatabaseConfigured,
  getMockLinkByClickRefId,
  recordAmazonConversion,
  getMockTelegramConfigByTelegramId,
  getMockTelegramConfigByUserId,
  getAllMockTelegramConfigs,
  findMockUserById,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Parses numeric currency strings like "₹1,499.00", "$25.50", "1499", "(50.00)"
 */
function parseCurrencyNumber(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val || typeof val !== "string") return 0;
  const clean = val.replace(/[^0-9.-]/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses CSV lines handling quotes, escaped quotes, and commas inside quotes.
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const cleanText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawRows = cleanText.split("\n");

  for (const rawRow of rawRows) {
    if (!rawRow.trim()) continue;
    const row: string[] = [];
    let inQuotes = false;
    let current = "";

    for (let i = 0; i < rawRow.length; i++) {
      const char = rawRow[i];
      const nextChar = rawRow[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    lines.push(row);
  }

  return lines;
}

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Matches an ascsubtag with internal links, telegram configurations, or users table to retrieve the owner's userId.
 */
async function matchUserForAscsubtag(ascsubtag: string): Promise<{ userId: string; linkId: string | null }> {
  const cleanTag = (ascsubtag || "").trim();
  if (!cleanTag) {
    return { userId: DEMO_USER.id, linkId: null };
  }

  const stripped = cleanTag.replace(/_tg$|-tg$|_web$|_link$/i, "").trim();
  const prefix = (stripped.includes("_") ? stripped.split("_")[0] : stripped) || stripped;

  // 1. Database lookups (if database is configured)
  if (isDatabaseConfigured()) {
    try {
      // 1a. Check TelegramChannelConfig (telegram_configurations)
      const tgConditions: any[] = [
        { telegramUserId: { equals: cleanTag, mode: "insensitive" } },
        { telegramUserId: { equals: stripped, mode: "insensitive" } },
      ];
      if (isValidUuid(cleanTag)) tgConditions.push({ userId: cleanTag });
      if (isValidUuid(stripped)) tgConditions.push({ userId: stripped });

      const tgConfig = await prisma.telegramChannelConfig.findFirst({
        where: { OR: tgConditions },
        select: { userId: true },
      });
      if (tgConfig?.userId) {
        return { userId: tgConfig.userId, linkId: null };
      }

      // 1b. Check User table (users) by subIdPrefix, referralCode, id
      const userConditions: any[] = [
        { subIdPrefix: { equals: cleanTag, mode: "insensitive" } },
        { subIdPrefix: { equals: stripped, mode: "insensitive" } },
        { referralCode: { equals: cleanTag, mode: "insensitive" } },
        { referralCode: { equals: stripped, mode: "insensitive" } },
      ];
      if (prefix && prefix !== cleanTag && prefix !== stripped) {
        userConditions.push(
          { subIdPrefix: { equals: prefix, mode: "insensitive" } },
          { referralCode: { equals: prefix, mode: "insensitive" } }
        );
      }
      if (isValidUuid(cleanTag)) userConditions.push({ id: cleanTag });
      if (isValidUuid(stripped)) userConditions.push({ id: stripped });

      const user = await prisma.user.findFirst({
        where: { OR: userConditions },
        select: { id: true },
      });
      if (user?.id) {
        return { userId: user.id, linkId: null };
      }

      // 1c. Direct match in Prisma GeneratedLink
      const link = await prisma.generatedLink.findFirst({
        where: {
          OR: [
            { subId: { equals: cleanTag, mode: "insensitive" } },
            { subId: { equals: stripped, mode: "insensitive" } },
            { code: { equals: cleanTag, mode: "insensitive" } },
            { code: { equals: stripped, mode: "insensitive" } },
          ],
        },
        select: { userId: true, id: true },
      });
      if (link?.userId) {
        return { userId: link.userId, linkId: link.id };
      }

      // 1d. Check ShortLink
      const shortLink = await prisma.shortLink.findFirst({
        where: {
          OR: [
            { subId: { equals: cleanTag, mode: "insensitive" } },
            { subId: { equals: stripped, mode: "insensitive" } },
            { slug: { equals: cleanTag, mode: "insensitive" } },
            { slug: { equals: stripped, mode: "insensitive" } },
          ],
        },
        select: { userId: true, id: true },
      });
      if (shortLink?.userId) {
        return { userId: shortLink.userId, linkId: null };
      }
    } catch (e) {
      console.warn("DB lookup error in amazon matchUserForAscsubtag:", e);
    }
  }

  // 2. In-memory Mock Telegram configs
  const mockTg =
    getMockTelegramConfigByTelegramId(cleanTag) ||
    getMockTelegramConfigByTelegramId(stripped) ||
    getMockTelegramConfigByUserId(cleanTag) ||
    getMockTelegramConfigByUserId(stripped);
  if (mockTg?.userId) {
    return { userId: mockTg.userId, linkId: null };
  }

  const allMockTg = getAllMockTelegramConfigs();
  const matchedTg = allMockTg.find(
    (cfg) =>
      cfg.userId.toLowerCase() === cleanTag.toLowerCase() ||
      cfg.userId.toLowerCase() === stripped.toLowerCase() ||
      (cfg.telegramUserId && cfg.telegramUserId.toLowerCase() === cleanTag.toLowerCase()) ||
      (cfg.telegramUserId && cfg.telegramUserId.toLowerCase() === stripped.toLowerCase())
  );
  if (matchedTg?.userId) {
    return { userId: matchedTg.userId, linkId: null };
  }

  // 3. In-memory Mock Users
  const mockUserDirect = findMockUserById(cleanTag) || findMockUserById(stripped);
  if (mockUserDirect?.id) {
    return { userId: mockUserDirect.id, linkId: null };
  }

  const g = globalThis as any;
  if (g.mockUsers) {
    const cleanLower = cleanTag.toLowerCase();
    const strippedLower = stripped.toLowerCase();
    const prefixLower = prefix.toLowerCase();
    for (const u of g.mockUsers.values()) {
      const uId = (u.id || "").toLowerCase();
      const uPrefix = (u.subIdPrefix || "").toLowerCase();
      const uRef = (u.referralCode || "").toLowerCase();

      if (uId === cleanLower || uId === strippedLower) {
        return { userId: u.id, linkId: null };
      }
      if (
        (uPrefix &&
          (uPrefix === cleanLower ||
            uPrefix === strippedLower ||
            uPrefix === prefixLower ||
            cleanLower === `${uPrefix}_tg`)) ||
        (uRef &&
          (uRef === cleanLower ||
            uRef === strippedLower ||
            uRef === prefixLower ||
            cleanLower === `${uRef}_tg`))
      ) {
        return { userId: u.id, linkId: null };
      }
    }
  }

  // 4. Check in-memory mock link state
  const mockLink = getMockLinkByClickRefId(cleanTag) || getMockLinkByClickRefId(stripped);
  if (mockLink?.userId) {
    return { userId: mockLink.userId, linkId: mockLink.id };
  }

  // 5. Fallback to subId prefix resolver
  try {
    const resolvedId = (await resolveUserBySubId(cleanTag)) || (await resolveUserBySubId(stripped));
    if (resolvedId) {
      return { userId: resolvedId, linkId: null };
    }
  } catch {}

  // 6. Default fallback to demo partner user ID
  return { userId: DEMO_USER.id, linkId: null };
}

export async function POST(req: Request) {
  // 1. Admin Authentication Check
  const user = await getApiUser().catch(() => null);
  if (!isAdminUser(user)) {
    return NextResponse.json(
      { error: "Access denied. Admin authorization required." },
      { status: 403 }
    );
  }

  // 2. Extract CSV Text from Multipart Form or JSON/Text body
  let csvText = "";
  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (file && typeof file === "object" && "text" in file) {
        csvText = await (file as any).text();
      } else if (typeof file === "string") {
        csvText = file;
      }
      if (!csvText) {
        const textParam = formData.get("csvText");
        if (textParam && typeof textParam === "string") {
          csvText = textParam;
        }
      }
    } else if (contentType.includes("application/json")) {
      const json = await req.json().catch(() => ({}));
      csvText = json.csvText || json.csv || json.content || "";
    } else {
      csvText = await req.text();
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to read CSV payload: " + (err?.message || "Unknown error") },
      { status: 400 }
    );
  }

  if (!csvText || !csvText.trim()) {
    return NextResponse.json(
      { error: "Empty CSV content. Please provide a valid Amazon Associates CSV report." },
      { status: 400 }
    );
  }

  // 3. Parse CSV rows
  const parsedRows = parseCSV(csvText);
  if (parsedRows.length < 2) {
    return NextResponse.json(
      { error: "CSV does not contain enough data rows (header + minimum 1 record required)." },
      { status: 422 }
    );
  }

  // Find header row and index mappings
  let headerIndex = 0;
  let headers = (parsedRows[0] || []).map((h) => h.toLowerCase().trim());

  // Handle reports where metadata comments precede the actual column header row
  for (let i = 0; i < Math.min(parsedRows.length, 10); i++) {
    const candidateRow = parsedRows[i];
    if (!candidateRow) continue;
    const row = candidateRow.map((c) => c.toLowerCase().trim());
    if (
      row.some((c) => c.includes("tag") || c.includes("subtag") || c.includes("fee") || c.includes("price") || c.includes("commission"))
    ) {
      headerIndex = i;
      headers = row;
      break;
    }
  }

  // Identify column indices
  const findColumn = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h === k || h.includes(k)));

  const tagCol = findColumn([
    "tracking tag / ascsubtag",
    "ascsubtag",
    "tracking tag",
    "tracking id",
    "subtag",
    "sub id",
    "subid",
    "clickrefid",
    "click ref",
    "tag",
  ]);

  const priceCol = findColumn([
    "item price",
    "price",
    "revenue",
    "sale amount",
    "amount",
    "order amount",
    "order value",
    "product price",
    "shipped items revenue",
    "ordered items revenue",
  ]);

  const commCol = findColumn([
    "advertising fee (commission)",
    "advertising fee",
    "commission",
    "ad fees",
    "earnings",
    "fee",
    "comm",
    "total earnings",
  ]);

  const dateCol = findColumn([
    "date",
    "order date",
    "shipped date",
    "transaction date",
    "date of sale",
  ]);

  const orderIdCol = findColumn([
    "order id",
    "transaction id",
    "item id",
    "asin",
    "order",
    "id",
  ]);

  const statusCol = findColumn([
    "status",
    "order status",
    "transaction status",
    "shipment status",
  ]);

  if (commCol === -1 && priceCol === -1) {
    return NextResponse.json(
      {
        error:
          "Could not identify commission or price columns in CSV. Expected headers: Tracking Tag / ascsubtag, Item Price, Advertising Fee (Commission), Date.",
        detectedHeaders: headers,
      },
      { status: 422 }
    );
  }

  // 4. Ensure Amazon Partner Store exists in Database
  let amazonStoreId: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      let storeRecord = await prisma.partnerStore.findUnique({ where: { slug: "amazon" } });
      if (!storeRecord) {
        storeRecord = await prisma.partnerStore.create({
          data: {
            slug: "amazon",
            name: "Amazon",
            commissionRateBps: 500,
            userShareBps: 7000,
          },
        });
      }
      amazonStoreId = storeRecord.id;
    } catch (e) {
      console.warn("Could not ensure Amazon PartnerStore in DB:", e);
    }
  }

  // 5. Process Data Rows
  let processedCount = 0;
  let totalItemPricePaise = 0;
  let totalCommissionPaise = 0;
  let totalUserProfitPaise = 0;
  let totalAdminCutPaise = 0;

  const ordersDetail: any[] = [];
  const now = new Date();

  for (let i = headerIndex + 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    const ascsubtag = tagCol !== -1 && row[tagCol] ? row[tagCol].trim() : "";
    const rawPrice = priceCol !== -1 && row[priceCol] ? row[priceCol] : "0";
    const rawComm = commCol !== -1 && row[commCol] ? row[commCol] : "0";
    const rawDate = dateCol !== -1 && row[dateCol] ? row[dateCol].trim() : "";
    const rawOrderId = orderIdCol !== -1 && row[orderIdCol] ? row[orderIdCol].trim() : "";
    const rawStatus = statusCol !== -1 && row[statusCol] ? row[statusCol].trim().toLowerCase() : "";

    const itemPrice = parseCurrencyNumber(rawPrice);
    const commission = parseCurrencyNumber(rawComm);

    // Skip blank or zero-fee rows if not meaningful
    if (itemPrice === 0 && commission === 0 && !ascsubtag) continue;

    // Calculate commission split:
    // userCut = commission * 0.70
    // adminCut = commission * 0.30
    const rowCommPaise = Math.round(commission * 100);
    const userProfitPaise = Math.round(rowCommPaise * 0.70);
    const adminCutPaise = rowCommPaise - userProfitPaise;
    const itemPricePaise = Math.round(itemPrice * 100);

    // Determine status: "PENDING" (or "CONFIRMED" / "APPROVED" based on report)
    let ledgerStatus: "PENDING" | "CONFIRMED" | "REJECTED" = "PENDING";
    if (
      rawStatus.includes("ship") ||
      rawStatus.includes("approv") ||
      rawStatus.includes("confirm") ||
      rawStatus.includes("paid") ||
      rawStatus.includes("clear")
    ) {
      ledgerStatus = "CONFIRMED";
    } else if (
      rawStatus.includes("cancel") ||
      rawStatus.includes("return") ||
      rawStatus.includes("reject") ||
      rawStatus.includes("refund")
    ) {
      ledgerStatus = "REJECTED";
    }

    // Parse date safely
    let parsedDate = now;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) parsedDate = d;
    }

    // Match ascsubtag with internal links.clickRefId to retrieve respective userId
    const { userId: matchedUserId, linkId: matchedLinkId } = await matchUserForAscsubtag(ascsubtag);

    // Order/Transaction ID
    const externalOrderId =
      rawOrderId ||
      `AMZ-${parsedDate.getTime()}-${i}`;

    // Insert/Update records in EarningsLedger
    if (isDatabaseConfigured() && amazonStoreId) {
      try {
        await prisma.earningsLedger.upsert({
          where: {
            storeId_externalOrderId_externalItemId: {
              storeId: amazonStoreId,
              externalOrderId,
              externalItemId: "",
            },
          },
          update: {
            status: ledgerStatus,
            orderAmountPaise: itemPricePaise,
            commissionPaise: rowCommPaise,
            userAmountPaise: userProfitPaise,
            confirmedAt: ledgerStatus === "CONFIRMED" ? now : undefined,
            rejectedAt: ledgerStatus === "REJECTED" ? now : undefined,
            updatedAt: now,
          },
          create: {
            userId: matchedUserId,
            storeId: amazonStoreId,
            linkId: matchedLinkId,
            kind: "COMMISSION",
            status: ledgerStatus,
            externalOrderId,
            externalItemId: "",
            orderAmountPaise: itemPricePaise,
            commissionPaise: rowCommPaise,
            userAmountPaise: userProfitPaise,
            createdAt: parsedDate,
            pendingAt: now,
            confirmedAt: ledgerStatus === "CONFIRMED" ? now : undefined,
          },
        });

        // Also upsert into Conversion model so standard sync queries pick it up
        await prisma.conversion.upsert({
          where: { transactionId: externalOrderId },
          update: {
            saleAmount: itemPrice,
            commission,
            status: ledgerStatus === "CONFIRMED" ? "approved" : ledgerStatus.toLowerCase(),
            subid: ascsubtag || null,
            userId: matchedUserId,
            updatedAt: now,
          },
          create: {
            transactionId: externalOrderId,
            storeName: "Amazon",
            saleAmount: itemPrice,
            commission,
            status: ledgerStatus === "CONFIRMED" ? "approved" : ledgerStatus.toLowerCase(),
            subid: ascsubtag || null,
            userId: matchedUserId,
            createdAt: parsedDate,
          },
        });
      } catch (dbErr) {
        console.warn("DB insert error for Amazon row, fallback to mockData:", dbErr);
      }
    }

    // In-memory mockData update for real-time responsiveness
    recordAmazonConversion({
      txId: externalOrderId,
      userId: matchedUserId,
      subId: ascsubtag,
      itemPricePaise,
      commissionPaise: rowCommPaise,
      userProfitPaise,
      adminCutPaise,
      status: ledgerStatus,
      date: parsedDate,
    });

    processedCount++;
    totalItemPricePaise += itemPricePaise;
    totalCommissionPaise += rowCommPaise;
    totalUserProfitPaise += userProfitPaise;
    totalAdminCutPaise += adminCutPaise;

    ordersDetail.push({
      orderId: externalOrderId,
      ascsubtag: ascsubtag || "Direct/Unassigned",
      userId: matchedUserId,
      itemPrice,
      commission,
      userProfit: userProfitPaise / 100,
      adminCut: adminCutPaise / 100,
      status: ledgerStatus,
      date: parsedDate.toISOString().split("T")[0],
    });
  }

  const totalUserProfit = totalUserProfitPaise / 100;
  const totalAdminCut = totalAdminCutPaise / 100;

  return NextResponse.json({
    success: true,
    processedCount,
    totalOrders: processedCount,
    totalItemPrice: totalItemPricePaise / 100,
    totalCommission: totalCommissionPaise / 100,
    totalUserProfit,
    totalUserProfitPaise,
    totalAdminCut,
    totalAdminCutPaise,
    orders: ordersDetail.slice(0, 50),
    message: `Processed ${processedCount} orders, Total User Profit: ₹${totalUserProfit.toFixed(2)}, Admin Cut: ₹${totalAdminCut.toFixed(2)}`,
  });
}
