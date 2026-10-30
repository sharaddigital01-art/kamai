import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  saveMockTelegramConfig,
  getMockTelegramConfigByTelegramId,
  getMockTelegramConfigByUserId,
  findMockUserById,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";

const SaveSessionSchema = z.object({
  sessionString: z.string().min(10, "Valid session string is required"),
  userId: z.string().trim().optional(),
  telegramUserId: z.union([z.string(), z.number()]).optional(),
  telegramUsername: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = SaveSessionSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const {
      sessionString,
      userId: directUserId,
      telegramUserId: rawTelegramUserId,
      telegramUsername,
      isActive = true,
    } = result.data;

    const telegramUserId = rawTelegramUserId !== undefined ? String(rawTelegramUserId).trim() : null;

    // 1. Check Worker Secret Authorization
    const workerSecretHeader = req.headers.get("x-worker-secret")?.trim();
    const expectedSecret =
      process.env.TELEGRAM_WORKER_SECRET?.trim() || "kamaikaro-tg-worker-secret-2026";
    const isWorkerAuth = workerSecretHeader === expectedSecret;

    // 2. Identify target user
    let user = await getApiUser().catch(() => null);
    let targetUserId = user?.id || directUserId;

    if (!targetUserId && telegramUserId && isDatabaseConfigured()) {
      try {
        const existingCfg = await prisma.telegramChannelConfig.findFirst({
          where: { telegramUserId },
          select: { userId: true },
        });
        if (existingCfg) {
          targetUserId = existingCfg.userId;
        }
      } catch (dbErr) {
        console.warn("DB lookup error in save-session:", dbErr);
      }
    }

    if (!targetUserId && telegramUserId) {
      const mockCfg = getMockTelegramConfigByTelegramId(telegramUserId);
      if (mockCfg) {
        targetUserId = mockCfg.userId;
      }
    }

    // If still no user and authenticated via worker, fall back to DEMO_USER
    if (!targetUserId && isWorkerAuth) {
      targetUserId = DEMO_USER.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Authentication required or unlinked Telegram user ID." },
        { status: 401 }
      );
    }

    // 3. Save session string to database
    let savedConfig: any = null;

    if (isDatabaseConfigured()) {
      try {
        savedConfig = await prisma.telegramChannelConfig.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            telegramUserId: telegramUserId || null,
            telegramUsername: telegramUsername || null,
            sessionString,
            isActive,
          },
          update: {
            sessionString,
            ...(telegramUserId ? { telegramUserId } : {}),
            ...(telegramUsername !== undefined ? { telegramUsername } : {}),
            isActive,
            updatedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("Database upsert error in save-session:", dbErr);
      }
    }

    // Fallback in-memory save
    const mockSaved = saveMockTelegramConfig({
      userId: targetUserId,
      telegramUserId: telegramUserId || undefined,
      telegramUsername: telegramUsername || undefined,
      sessionString,
      isActive,
    });

    return NextResponse.json({
      success: true,
      message: "Telegram session string stored successfully",
      userId: targetUserId,
      telegramUserId: telegramUserId || savedConfig?.telegramUserId || mockSaved.telegramUserId,
      isActive: savedConfig?.isActive ?? mockSaved.isActive,
    });
  } catch (err: any) {
    console.error("save-session error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error saving Telegram session." },
      { status: 500 }
    );
  }
}
