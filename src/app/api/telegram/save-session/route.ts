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
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // 2. Identify target user (matching by directUserId OR telegramUserId)
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
        } else {
          // Check if telegramUserId matches a user's id or subIdPrefix directly
          const directUser = await prisma.user.findFirst({
            where: {
              OR: [
                { id: /^[0-9a-f-]{36}$/i.test(telegramUserId) ? telegramUserId : undefined },
                { subIdPrefix: telegramUserId },
                { referralCode: telegramUserId },
              ].filter(Boolean) as any,
            },
            select: { id: true },
          });
          if (directUser) targetUserId = directUser.id;
        }
      } catch (dbErr) {
        console.warn("DB lookup error in save-session:", dbErr);
      }
    }

    if (!targetUserId && telegramUserId) {
      const mockCfg = getMockTelegramConfigByTelegramId(telegramUserId);
      if (mockCfg) {
        targetUserId = mockCfg.userId;
      } else {
        const mockUser = findMockUserById(telegramUserId);
        if (mockUser) targetUserId = mockUser.id;
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

    // Fetch actual user profile/tracking details from User table to get real trackingSubId
    let userRecord: any = null;
    if (isDatabaseConfigured()) {
      try {
        userRecord = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
      } catch (dbErr) {
        console.warn("DB user fetch error in save-session:", dbErr);
      }
    }
    if (!userRecord) {
      userRecord = findMockUserById(targetUserId) || (targetUserId === DEMO_USER.id ? DEMO_USER : null);
    }

    const subIdPrefix = userRecord?.subIdPrefix || userRecord?.referralCode || targetUserId.slice(0, 6);
    const realTrackingSubId = userRecord?.trackingSubId || `${subIdPrefix}_tg`;

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

    const finalSourceChannels = Array.isArray(sourceChannels)
      ? sourceChannels
      : sourceChannels !== undefined
      ? [sourceChannels]
      : [];

    const finalTargetChannels = Array.isArray(targetChannels)
      ? targetChannels
      : targetChannels !== undefined
      ? [targetChannels]
      : [];

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
            sourceChannels: finalSourceChannels as any,
            targetChannels: finalTargetChannels as any,
            targetChannelId: cleanTargetChannelId,
            targetChannelName: cleanTargetChannelName,
            isActive: true,
          },
          update: {
            sessionString,
            ...(telegramUserId ? { telegramUserId } : {}),
            ...(telegramUsername !== undefined ? { telegramUsername } : {}),
            ...(sourceChannels !== undefined ? { sourceChannels: finalSourceChannels as any } : {}),
            ...(targetChannels !== undefined ? { targetChannels: finalTargetChannels as any } : {}),
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
      sourceChannels: sourceChannels !== undefined ? finalSourceChannels : undefined,
      targetChannels: targetChannels !== undefined ? finalTargetChannels : undefined,
      targetChannelId: cleanTargetChannelId,
      targetChannelName: cleanTargetChannelName,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Telegram session and channel configuration saved successfully",
      trackingSubId: realTrackingSubId,
      subId: realTrackingSubId,
      isActive: true,
      isTelegramConnected: true,
      connected: true,
      userId: targetUserId,
      telegramUserId: telegramUserId || savedConfig?.telegramUserId || mockSaved.telegramUserId,
      telegramUsername: telegramUsername || savedConfig?.telegramUsername || mockSaved.telegramUsername,
      sessionString: sessionString,
      sourceChannels: savedConfig?.sourceChannels ?? mockSaved.sourceChannels ?? [],
      targetChannels: savedConfig?.targetChannels ?? mockSaved.targetChannels ?? [],
      targetChannelId: cleanTargetChannelId ?? savedConfig?.targetChannelId ?? mockSaved.targetChannelId,
      targetChannelName: cleanTargetChannelName ?? savedConfig?.targetChannelName ?? mockSaved.targetChannelName,
    });
  } catch (err: any) {
    console.error("save-session error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error saving Telegram session." },
      { status: 500 }
    );
  }
}
