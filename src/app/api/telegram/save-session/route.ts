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
  DEFAULT_SOURCE_CHANNELS,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";

const SaveSessionSchema = z.object({
  sessionString: z.string().min(10, "Valid session string is required"),
  userId: z.string().trim().optional(),
  telegramUserId: z.union([z.string(), z.number()]).optional(),
  telegramUsername: z.string().trim().optional().nullable(),
  sourceChannels: z.any().optional(),
  targetChannels: z.any().optional(),
  targetChannelId: z.string().trim().optional().nullable(),
  targetChannelName: z.string().trim().optional().nullable(),
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
      sourceChannels,
      targetChannels,
      targetChannelId,
      targetChannelName,
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

    // Determine targetChannelId and Name from targetChannels if provided
    let cleanTargetChannelId = targetChannelId || null;
    let cleanTargetChannelName = targetChannelName || null;

    if (!cleanTargetChannelId && Array.isArray(targetChannels) && targetChannels.length > 0) {
      const firstTarget = targetChannels[0];
      if (typeof firstTarget === "string") {
        cleanTargetChannelId = firstTarget;
        cleanTargetChannelName = firstTarget;
      } else if (firstTarget && typeof firstTarget === "object") {
        cleanTargetChannelId = String(firstTarget.id || firstTarget.username || "");
        cleanTargetChannelName = firstTarget.title || cleanTargetChannelId;
      }
    }

    // 3. Save session string and channels to database
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
            sourceChannels: sourceChannels !== undefined ? (sourceChannels as any) : undefined,
            targetChannels: targetChannels !== undefined ? (targetChannels as any) : undefined,
            targetChannelId: cleanTargetChannelId,
            targetChannelName: cleanTargetChannelName,
            isActive: true,
          },
          update: {
            sessionString,
            ...(telegramUserId ? { telegramUserId } : {}),
            ...(telegramUsername !== undefined ? { telegramUsername } : {}),
            ...(sourceChannels !== undefined ? { sourceChannels: sourceChannels as any } : {}),
            ...(targetChannels !== undefined ? { targetChannels: targetChannels as any } : {}),
            ...(cleanTargetChannelId !== null ? { targetChannelId: cleanTargetChannelId } : {}),
            ...(cleanTargetChannelName !== null ? { targetChannelName: cleanTargetChannelName } : {}),
            isActive: true,
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
      sourceChannels: sourceChannels !== undefined ? sourceChannels : undefined,
      targetChannels: targetChannels !== undefined ? targetChannels : undefined,
      targetChannelId: cleanTargetChannelId,
      targetChannelName: cleanTargetChannelName,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Telegram session and channel configuration saved successfully",
      userId: targetUserId,
      telegramUserId: telegramUserId || savedConfig?.telegramUserId || mockSaved.telegramUserId,
      telegramUsername: telegramUsername || savedConfig?.telegramUsername || mockSaved.telegramUsername,
      sessionString: sessionString,
      sourceChannels: savedConfig?.sourceChannels ?? mockSaved.sourceChannels ?? DEFAULT_SOURCE_CHANNELS,
      targetChannels: savedConfig?.targetChannels ?? mockSaved.targetChannels ?? [],
      targetChannelId: cleanTargetChannelId ?? savedConfig?.targetChannelId ?? mockSaved.targetChannelId,
      targetChannelName: cleanTargetChannelName ?? savedConfig?.targetChannelName ?? mockSaved.targetChannelName,
      isActive: true,
      connected: true,
    });
  } catch (err: any) {
    console.error("save-session error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error saving Telegram session." },
      { status: 500 }
    );
  }
}
