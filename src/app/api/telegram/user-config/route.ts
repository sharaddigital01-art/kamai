import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  findMockUserById,
  DEFAULT_SOURCE_CHANNELS,
  getMockTelegramConfigByTelegramId,
  getMockTelegramConfigByUserId,
  getAllMockTelegramConfigs,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const queryTelegramId = searchParams.get("telegramId")?.trim();
    const queryUserId = searchParams.get("userId")?.trim();

    // 1. Shared secret worker authentication header
    const workerSecretHeader = req.headers.get("x-worker-secret")?.trim();
    const expectedSecret =
      process.env.TELEGRAM_WORKER_SECRET?.trim() || "kamaikaro-tg-worker-secret-2026";

    let isHeaderAuth = false;
    if (workerSecretHeader) {
      if (workerSecretHeader === expectedSecret) {
        isHeaderAuth = true;
      } else {
        return NextResponse.json(
          { error: "Invalid worker secret header." },
          { status: 401 }
        );
      }
    }

    // 2. Multi-channel listing: requested by Python worker via activeOnly=true or worker header
    if (activeOnly || (isHeaderAuth && !queryTelegramId && !queryUserId)) {
      const configs: Array<{
        userId: string;
        telegramUserId: string;
        sessionString: string | null;
        sourceChannels: any;
        targetChannels: any;
        targetChannelId: string | null;
        targetChannelName: string | null;
        trackingSubId: string;
        isActive: boolean;
      }> = [];

      if (isDatabaseConfigured()) {
        try {
          const dbConfigs = await prisma.telegramChannelConfig.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            include: { user: true },
          });

          for (const item of dbConfigs) {
            const subIdPrefix = item.user?.subIdPrefix || "EK";
            const targetChannelsList =
              item.targetChannels && Array.isArray(item.targetChannels) && item.targetChannels.length > 0
                ? item.targetChannels
                : item.targetChannelId
                ? [{ id: item.targetChannelId, title: item.targetChannelName || item.targetChannelId }]
                : [];

            configs.push({
              userId: item.userId,
              telegramUserId: item.telegramUserId || "",
              sessionString: item.sessionString || null,
              sourceChannels:
                item.sourceChannels && Array.isArray(item.sourceChannels) && item.sourceChannels.length > 0
                  ? item.sourceChannels
                  : DEFAULT_SOURCE_CHANNELS,
              targetChannels: targetChannelsList,
              targetChannelId: item.targetChannelId || null,
              targetChannelName: item.targetChannelName || null,
              trackingSubId: `${subIdPrefix}_tg`,
              isActive: item.isActive,
            });
          }
        } catch (dbErr) {
          console.warn("DB lookup fallback in user-config (activeOnly):", dbErr);
        }
      }

      // Fallback / mock runtime data
      if (configs.length === 0) {
        const mockList = getAllMockTelegramConfigs(activeOnly);
        for (const item of mockList) {
          const u = findMockUserById(item.userId) || DEMO_USER;
          const subIdPrefix = u?.subIdPrefix || "EK";
          const targetChannelsList =
            item.targetChannels && Array.isArray(item.targetChannels) && item.targetChannels.length > 0
              ? item.targetChannels
              : item.targetChannelId
              ? [{ id: item.targetChannelId, title: item.targetChannelName || item.targetChannelId }]
              : [];

          configs.push({
            userId: item.userId,
            telegramUserId: item.telegramUserId || "",
            sessionString: item.sessionString || null,
            sourceChannels:
              item.sourceChannels && Array.isArray(item.sourceChannels) && item.sourceChannels.length > 0
                ? item.sourceChannels
                : DEFAULT_SOURCE_CHANNELS,
            targetChannels: targetChannelsList,
            targetChannelId: item.targetChannelId || null,
            targetChannelName: item.targetChannelName || null,
            trackingSubId: `${subIdPrefix}_tg`,
            isActive: item.isActive,
          });
        }
      }

      return NextResponse.json({
        success: true,
        configs,
      });
    }

    // 3. Single User Lookup: queryTelegramId -> queryUserId -> logged-in session user
    let user: any = null;
    let config: any = null;

    if (queryTelegramId) {
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
      let targetUserId = queryUserId;
      if (!targetUserId && !isHeaderAuth) {
        const sessionUser = await getApiUser().catch(() => null);
        targetUserId = sessionUser?.id;
      }

      if (!targetUserId && !isHeaderAuth) {
        return NextResponse.json(
          { error: "Authentication required or missing userId parameter." },
          { status: 401 }
        );
      }

      if (!targetUserId && isHeaderAuth) {
        targetUserId = DEMO_USER.id;
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
        user = findMockUserById(targetUserId!);
      }

      if (!config && user) {
        config = getMockTelegramConfigByUserId(user.id);
      }
    }

    const isConnected = Boolean(
      config?.sessionString ||
      config?.telegramUserId ||
      (config?.isActive && (config?.targetChannelId || (Array.isArray(config?.targetChannels) && config.targetChannels.length > 0)))
    );
    const trackingSubId = user ? `${user.subIdPrefix || "EK"}_tg` : null;

    const sourceChannels =
      config?.sourceChannels && Array.isArray(config.sourceChannels) && config.sourceChannels.length > 0
        ? config.sourceChannels
        : DEFAULT_SOURCE_CHANNELS;

    const targetChannels =
      config?.targetChannels && Array.isArray(config.targetChannels) && config.targetChannels.length > 0
        ? config.targetChannels
        : config?.targetChannelId
        ? [{ id: config.targetChannelId, title: config.targetChannelName || config.targetChannelId }]
        : [];

    const singleConfigItem = {
      userId: user?.id || config?.userId || "",
      telegramUserId: config?.telegramUserId || "",
      sessionString: config?.sessionString || null,
      sourceChannels,
      targetChannels,
      targetChannelId: config?.targetChannelId || null,
      targetChannelName: config?.targetChannelName || null,
      trackingSubId: trackingSubId || "EK_tg",
      isActive: config?.isActive !== undefined ? config.isActive : true,
    };

    return NextResponse.json({
      success: true,
      connected: isConnected,
      telegramUserId: config?.telegramUserId || null,
      telegramUsername: config?.telegramUsername || null,
      sessionString: config?.sessionString || null,
      sourceChannels,
      targetChannels,
      targetChannelId: config?.targetChannelId || null,
      targetChannelName: config?.targetChannelName || null,
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
      configs: [singleConfigItem],
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
