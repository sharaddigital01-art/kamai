import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  DEFAULT_SOURCE_CHANNELS,
  saveMockTelegramConfig,
  getMockTelegramConfigByUserId,
  getMockTelegramConfigByTelegramId,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChannelItemSchema = z.union([
  z.string(),
  z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    username: z.string().nullable().optional(),
    canPost: z.boolean().optional(),
  }),
]);

const UpdateChannelsSchema = z.object({
  userId: z.string().trim().optional(),
  telegramUserId: z.union([z.string(), z.number()]).optional(),
  sourceChannels: z.array(ChannelItemSchema).optional(),
  targetChannels: z.array(ChannelItemSchema).optional(),
  targetChannelId: z.string().trim().optional().nullable(),
  targetChannelName: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/telegram/channels
 * Retrieve user's configured source and target channels.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryTelegramId = searchParams.get("telegramId")?.trim();
    const queryUserId = searchParams.get("userId")?.trim();

    // Check worker secret header
    const workerSecretHeader = req.headers.get("x-worker-secret")?.trim();
    const expectedSecret =
      process.env.TELEGRAM_WORKER_SECRET?.trim() || "kamaikaro-tg-worker-secret-2026";
    const isWorkerAuth = workerSecretHeader === expectedSecret;

    let targetUserId = queryUserId;
    let config: any = null;

    if (queryTelegramId) {
      if (isDatabaseConfigured()) {
        try {
          config = await prisma.telegramChannelConfig.findFirst({
            where: { telegramUserId: queryTelegramId },
          });
          if (config) targetUserId = config.userId;
        } catch (dbErr) {
          console.warn("DB error in GET /api/telegram/channels by telegramId:", dbErr);
        }
      }
      if (!config) {
        config = getMockTelegramConfigByTelegramId(queryTelegramId);
        if (config) targetUserId = config.userId;
      }
    }

    if (!targetUserId) {
      const sessionUser = await getApiUser().catch(() => null);
      targetUserId = sessionUser?.id;
    }

    if (!targetUserId && isWorkerAuth) {
      targetUserId = DEMO_USER.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Authentication required or missing userId parameter." },
        { status: 401 }
      );
    }

    if (!config && isDatabaseConfigured()) {
      try {
        config = await prisma.telegramChannelConfig.findUnique({
          where: { userId: targetUserId },
        });
      } catch (dbErr) {
        console.warn("DB error in GET /api/telegram/channels by userId:", dbErr);
      }
    }

    if (!config) {
      config = getMockTelegramConfigByUserId(targetUserId);
    }

    const sourceChannels =
      config?.sourceChannels && Array.isArray(config.sourceChannels)
        ? config.sourceChannels
        : [];

    const targetChannels =
      config?.targetChannels && Array.isArray(config.targetChannels)
        ? config.targetChannels
        : config?.targetChannelId
        ? [{ id: config.targetChannelId, title: config.targetChannelName || config.targetChannelId }]
        : [];

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      telegramUserId: config?.telegramUserId || null,
      telegramUsername: config?.telegramUsername || null,
      sourceChannels,
      targetChannels,
      targetChannelId: config?.targetChannelId || null,
      targetChannelName: config?.targetChannelName || null,
      isActive: config?.isActive !== undefined ? config.isActive : true,
    });
  } catch (err: any) {
    console.error("GET /api/telegram/channels error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error fetching channels." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/telegram/channels
 * Save user's selected source and target channels.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = UpdateChannelsSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const {
      userId: directUserId,
      telegramUserId: rawTelegramUserId,
      sourceChannels,
      targetChannels,
      targetChannelId,
      targetChannelName,
      isActive = true,
    } = result.data;

    const telegramUserId =
      rawTelegramUserId !== undefined ? String(rawTelegramUserId).trim() : null;

    // Check Worker Secret Header
    const workerSecretHeader = req.headers.get("x-worker-secret")?.trim();
    const expectedSecret =
      process.env.TELEGRAM_WORKER_SECRET?.trim() || "kamaikaro-tg-worker-secret-2026";
    const isWorkerAuth = workerSecretHeader === expectedSecret;

    // Identify user
    let user = await getApiUser().catch(() => null);
    let targetUserId = user?.id || directUserId;

    if (!targetUserId && telegramUserId && isDatabaseConfigured()) {
      try {
        const existingCfg = await prisma.telegramChannelConfig.findFirst({
          where: { telegramUserId },
          select: { userId: true },
        });
        if (existingCfg) targetUserId = existingCfg.userId;
      } catch (dbErr) {
        console.warn("DB lookup error in POST /api/telegram/channels:", dbErr);
      }
    }

    if (!targetUserId && telegramUserId) {
      const mockCfg = getMockTelegramConfigByTelegramId(telegramUserId);
      if (mockCfg) targetUserId = mockCfg.userId;
    }

    if (!targetUserId && isWorkerAuth) {
      targetUserId = DEMO_USER.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Authentication required to update channels." },
        { status: 401 }
      );
    }

    // Determine targetChannelId and Name from targetChannels if not explicitly provided
    let cleanTargetChannelId = targetChannelId || null;
    let cleanTargetChannelName = targetChannelName || null;

    if (!cleanTargetChannelId && targetChannels && targetChannels.length > 0) {
      const firstTarget = targetChannels[0];
      if (typeof firstTarget === "string") {
        cleanTargetChannelId = firstTarget;
        cleanTargetChannelName = firstTarget;
      } else if (firstTarget && typeof firstTarget === "object") {
        cleanTargetChannelId = String(firstTarget.id);
        cleanTargetChannelName = firstTarget.title || String(firstTarget.id);
      }
    }

    let savedConfig: any = null;

    if (isDatabaseConfigured()) {
      try {
        savedConfig = await prisma.telegramChannelConfig.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            telegramUserId: telegramUserId || null,
            sourceChannels: sourceChannels !== undefined ? (sourceChannels as any) : undefined,
            targetChannels: targetChannels !== undefined ? (targetChannels as any) : undefined,
            targetChannelId: cleanTargetChannelId,
            targetChannelName: cleanTargetChannelName,
            isActive,
          },
          update: {
            ...(telegramUserId ? { telegramUserId } : {}),
            ...(sourceChannels !== undefined ? { sourceChannels: sourceChannels as any } : {}),
            ...(targetChannels !== undefined ? { targetChannels: targetChannels as any } : {}),
            ...(cleanTargetChannelId !== null ? { targetChannelId: cleanTargetChannelId } : {}),
            ...(cleanTargetChannelName !== null ? { targetChannelName: cleanTargetChannelName } : {}),
            isActive,
            updatedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("Database error in POST /api/telegram/channels:", dbErr);
      }
    }

    const mockSaved = saveMockTelegramConfig({
      userId: targetUserId,
      telegramUserId: telegramUserId || undefined,
      sourceChannels: sourceChannels !== undefined ? sourceChannels : undefined,
      targetChannels: targetChannels !== undefined ? targetChannels : undefined,
      targetChannelId: cleanTargetChannelId,
      targetChannelName: cleanTargetChannelName,
      isActive,
    });

    return NextResponse.json({
      success: true,
      message: "Channels updated successfully",
      userId: targetUserId,
      sourceChannels: savedConfig?.sourceChannels ?? mockSaved.sourceChannels,
      targetChannels: savedConfig?.targetChannels ?? mockSaved.targetChannels,
      targetChannelId: cleanTargetChannelId,
      targetChannelName: cleanTargetChannelName,
      isActive: savedConfig?.isActive ?? mockSaved.isActive,
    });
  } catch (err: any) {
    console.error("POST /api/telegram/channels error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error updating channels." },
      { status: 500 }
    );
  }
}
