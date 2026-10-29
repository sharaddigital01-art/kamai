import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  findMockUserById,
  DEFAULT_SOURCE_CHANNELS,
  getMockTelegramConfigByTelegramId,
  getMockTelegramConfigByUserId,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryTelegramId = searchParams.get("telegramId")?.trim();
    const queryUserId = searchParams.get("userId")?.trim();

    // Determine identity: queryTelegramId -> queryUserId -> logged in session user
    let user: any = null;
    let config: any = null;

    if (queryTelegramId) {
      // 1. Worker bot querying by verified telegram user ID
      if (isDatabaseConfigured()) {
        try {
          config = await prisma.telegramChannelConfig.findFirst({
            where: { telegramUserId: queryTelegramId },
            include: { user: true },
          });
          if (config?.user) {
            user = config.user;
          }
        } catch (dbErr) {
          console.warn("DB lookup fallback in user-config by telegramId:", dbErr);
        }
      }

      if (!config) {
        config = getMockTelegramConfigByTelegramId(queryTelegramId);
        if (config) {
          user = findMockUserById(config.userId);
        }
      }

      if (!config || !user) {
        return NextResponse.json(
          {
            error: `No linked account found for Telegram ID '${queryTelegramId}'. Please send /start in the bot with your account link.`,
            connected: false,
          },
          { status: 404 }
        );
      }
    } else {
      // 2. Dashboard querying by userId or session cookie
      let targetUserId = queryUserId;
      if (!targetUserId) {
        const sessionUser = await getApiUser();
        targetUserId = sessionUser?.id;
      }

      if (!targetUserId) {
        return NextResponse.json(
          { error: "Authentication required or missing userId parameter." },
          { status: 401 }
        );
      }

      if (isDatabaseConfigured()) {
        try {
          config = await prisma.telegramChannelConfig.findUnique({
            where: { userId: targetUserId },
            include: { user: true },
          });
          if (config?.user) {
            user = config.user;
          } else {
            user = await prisma.user.findUnique({ where: { id: targetUserId } });
          }
        } catch (dbErr) {
          console.warn("DB lookup fallback in user-config by userId:", dbErr);
        }
      }

      if (!user) {
        user = findMockUserById(targetUserId);
      }

      if (!config && user) {
        config = getMockTelegramConfigByUserId(user.id);
      }
    }

    const isConnected = Boolean(config?.telegramUserId);
    const trackingSubId = user ? `${user.subIdPrefix || "EK"}_tg` : null;

    return NextResponse.json({
      success: true,
      connected: isConnected,
      telegramUserId: config?.telegramUserId || null,
      telegramUsername: config?.telegramUsername || null,
      targetChannelId: config?.targetChannelId || null,
      targetChannelName: config?.targetChannelName || null,
      sourceChannels: config?.sourceChannels && config.sourceChannels.length > 0
        ? config.sourceChannels
        : DEFAULT_SOURCE_CHANNELS,
      isActive: config?.isActive !== undefined ? config.isActive : true,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            subIdPrefix: user.subIdPrefix,
            trackingSubId,
          }
        : null,
      defaultSourceChannels: DEFAULT_SOURCE_CHANNELS,
    });
  } catch (err: any) {
    console.error("user-config error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error fetching Telegram config." },
      { status: 500 }
    );
  }
}
