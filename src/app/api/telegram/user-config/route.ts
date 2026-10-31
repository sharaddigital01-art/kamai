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
  saveMockTelegramConfig,
  DEMO_USER,
} from "@/lib/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const queryTelegramId = (
      searchParams.get("telegramUserId") ||
      searchParams.get("telegramId") ||
      searchParams.get("tgId")
    )?.trim();
    const queryUserId = (
      searchParams.get("userId") ||
      searchParams.get("id")
    )?.trim();

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

    // 3. Single User Lookup: queryUserId OR queryTelegramId OR logged-in session user
    let user: any = null;
    let config: any = null;
    let targetUserId = queryUserId;

    if (queryUserId) {
      if (isDatabaseConfigured()) {
        try {
          config = await prisma.telegramChannelConfig.findUnique({
            where: { userId: queryUserId },
            include: { user: true },
          });
          if (config?.user) {
            user = config.user;
          } else {
            user = await prisma.user.findUnique({ where: { id: queryUserId } });
          }
        } catch (dbErr) {
          console.warn("DB lookup fallback in user-config by userId:", dbErr);
        }
      }

      if (!user) {
        user = findMockUserById(queryUserId);
      }

      if (!config && user) {
        config = getMockTelegramConfigByUserId(user.id);
      }
    }

    if (!config && queryTelegramId) {
      if (isDatabaseConfigured()) {
        try {
          config = await prisma.telegramChannelConfig.findFirst({
            where: { telegramUserId: queryTelegramId },
            include: { user: true },
          });
          if (config?.user) {
            user = config.user;
            targetUserId = config.userId;
          }
        } catch (dbErr) {
          console.warn("DB lookup fallback in user-config by telegramId:", dbErr);
        }
      }

      if (!config) {
        config = getMockTelegramConfigByTelegramId(queryTelegramId);
        if (config) {
          user = findMockUserById(config.userId);
          targetUserId = config.userId;
        }
      }

      // If not found by telegramId, but queryUserId was provided (e.g. /start AUTH_<userId>)
      if ((!config || !user) && queryUserId) {
        if (isDatabaseConfigured()) {
          try {
            config = await prisma.telegramChannelConfig.findUnique({
              where: { userId: queryUserId },
              include: { user: true },
            });
            if (config) {
              user = config.user;
              if (config.telegramUserId !== queryTelegramId) {
                config = await prisma.telegramChannelConfig.update({
                  where: { userId: queryUserId },
                  data: {
                    telegramUserId: queryTelegramId,
                    isActive: true,
                    updatedAt: new Date(),
                  },
                  include: { user: true },
                });
              }
            } else {
              const u = await prisma.user.findUnique({ where: { id: queryUserId } });
              if (u) {
                user = u;
                config = await prisma.telegramChannelConfig.create({
                  data: {
                    userId: queryUserId,
                    telegramUserId: queryTelegramId,
                    isActive: true,
                  },
                  include: { user: true },
                });
              }
            }
          } catch (dbErr) {
            console.warn("DB fallback linking telegramId to userId:", dbErr);
          }
        }

        if (!config) {
          config = getMockTelegramConfigByUserId(queryUserId);
          if (config) {
            config.telegramUserId = queryTelegramId;
            config.isActive = true;
            user = findMockUserById(queryUserId);
          }
        }
      }
    }

    if (!config && !user) {
      if (!targetUserId && !isHeaderAuth) {
        const sessionUser = await getApiUser().catch(() => null);
        targetUserId = sessionUser?.id;
      }

      if (!targetUserId && isHeaderAuth) {
        targetUserId = DEMO_USER.id;
      }

      if (targetUserId) {
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
            console.warn("DB lookup fallback in user-config by targetUserId:", dbErr);
          }
        }

        if (!user) {
          user = findMockUserById(targetUserId);
        }

        if (!config && user) {
          config = getMockTelegramConfigByUserId(user.id);
        }
      }
    }

    if (!config && !user && queryTelegramId) {
      return NextResponse.json(
        {
          error: `No linked account found for Telegram ID '${queryTelegramId}'. Please send /start in the bot with your account link.`,
          connected: false,
          isTelegramConnected: false,
        },
        { status: 404 }
      );
    }

    if (!targetUserId && !config && !user) {
      return NextResponse.json(
        { error: "Authentication required or missing userId parameter." },
        { status: 401 }
      );
    }

    const isConnected = Boolean(
      config?.sessionString ||
      config?.telegramUserId ||
      config?.isActive ||
      (config && (config.targetChannelId || (Array.isArray(config.targetChannels) && config.targetChannels.length > 0)))
    );
    const isTelegramConnected = Boolean(config?.sessionString || config?.telegramUserId);
    const userTrackingSubId =
      user?.trackingSubId ||
      (user?.subIdPrefix
        ? `${user.subIdPrefix}_tg`
        : config?.userId
        ? `${config.userId.slice(0, 6)}_tg`
        : targetUserId
        ? `${targetUserId.slice(0, 6)}_tg`
        : "EK_tg");

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
      userId: user?.id || config?.userId || targetUserId || "",
      telegramUserId: config?.telegramUserId || "",
      sessionString: config?.sessionString || null,
      sourceChannels,
      targetChannels,
      targetChannelId: config?.targetChannelId || null,
      targetChannelName: config?.targetChannelName || null,
      trackingSubId: userTrackingSubId,
      subId: userTrackingSubId,
      isActive: config?.isActive !== undefined ? config.isActive : true,
    };

    return NextResponse.json({
      success: true,
      connected: isConnected,
      isActive: config?.isActive !== undefined ? config.isActive : true,
      subId: userTrackingSubId,
      trackingSubId: userTrackingSubId,
      targetChannelId: config?.targetChannelId || null,
      targetChannelName: config?.targetChannelName || null,
      sourceChannels,
      targetChannels,
      sessionString: config?.sessionString || null,
      telegramUserId: config?.telegramUserId || null,
      telegramUsername: config?.telegramUsername || null,
      userId: user?.id || config?.userId || targetUserId || null,
      isTelegramConnected,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            subIdPrefix: user.subIdPrefix,
            trackingSubId: userTrackingSubId,
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

/**
 * POST /api/telegram/user-config
 * Allows worker or frontend to update Telegram channel configuration by userId or telegramUserId.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const queryTelegramId = (
      json.telegramUserId ??
      json.telegramId ??
      json.tgId
    )?.toString().trim() || null;
    const directUserId = (
      json.userId ??
      json.id
    )?.toString().trim() || undefined;
    const {
      telegramUsername,
      sessionString,
      sourceChannels,
      targetChannels,
      targetChannelId,
      targetChannelName,
      isActive = true,
    } = json;

    const telegramUserId = queryTelegramId;

    // Check worker secret header
    const workerSecretHeader = req.headers.get("x-worker-secret")?.trim();
    const expectedSecret =
      process.env.TELEGRAM_WORKER_SECRET?.trim() || "kamaikaro-tg-worker-secret-2026";
    const isWorkerAuth = workerSecretHeader === expectedSecret;

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
        console.warn("DB error in POST user-config by telegramId:", dbErr);
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
        { error: "Authentication required or unlinked Telegram user ID." },
        { status: 401 }
      );
    }

    // Fetch user profile to calculate real subId
    let userRecord: any = null;
    if (isDatabaseConfigured()) {
      try {
        userRecord = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
      } catch (dbErr) {
        console.warn("DB user fetch error in POST user-config:", dbErr);
      }
    }
    if (!userRecord) {
      userRecord = findMockUserById(targetUserId) || (targetUserId === DEMO_USER.id ? DEMO_USER : null);
    }

    const subIdPrefix = userRecord?.subIdPrefix || userRecord?.referralCode || targetUserId.slice(0, 6);
    const realTrackingSubId = userRecord?.trackingSubId || `${subIdPrefix}_tg`;

    let savedConfig: any = null;
    if (isDatabaseConfigured()) {
      try {
        savedConfig = await prisma.telegramChannelConfig.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            telegramUserId: telegramUserId || null,
            telegramUsername: telegramUsername || null,
            sessionString: sessionString || null,
            sourceChannels: sourceChannels !== undefined ? (sourceChannels as any) : undefined,
            targetChannels: targetChannels !== undefined ? (targetChannels as any) : undefined,
            targetChannelId: targetChannelId || null,
            targetChannelName: targetChannelName || null,
            isActive: true,
          },
          update: {
            ...(telegramUserId ? { telegramUserId } : {}),
            ...(telegramUsername !== undefined ? { telegramUsername } : {}),
            ...(sessionString ? { sessionString } : {}),
            ...(sourceChannels !== undefined ? { sourceChannels: sourceChannels as any } : {}),
            ...(targetChannels !== undefined ? { targetChannels: targetChannels as any } : {}),
            ...(targetChannelId !== undefined ? { targetChannelId } : {}),
            ...(targetChannelName !== undefined ? { targetChannelName } : {}),
            isActive: true,
            updatedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("Database upsert error in POST user-config:", dbErr);
      }
    }

    const mockSaved = saveMockTelegramConfig({
      userId: targetUserId,
      telegramUserId: telegramUserId || undefined,
      telegramUsername: telegramUsername || undefined,
      sessionString: sessionString || undefined,
      sourceChannels: sourceChannels !== undefined ? sourceChannels : undefined,
      targetChannels: targetChannels !== undefined ? targetChannels : undefined,
      targetChannelId,
      targetChannelName,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Telegram configuration saved successfully",
      connected: true,
      isActive: true,
      subId: realTrackingSubId,
      trackingSubId: realTrackingSubId,
      userId: targetUserId,
      telegramUserId: telegramUserId || savedConfig?.telegramUserId || mockSaved.telegramUserId,
      telegramUsername: telegramUsername || savedConfig?.telegramUsername || mockSaved.telegramUsername,
      sessionString: sessionString || savedConfig?.sessionString || mockSaved.sessionString,
      isTelegramConnected: true,
      sourceChannels: savedConfig?.sourceChannels ?? mockSaved.sourceChannels ?? DEFAULT_SOURCE_CHANNELS,
      targetChannels: savedConfig?.targetChannels ?? mockSaved.targetChannels ?? [],
      targetChannelId: targetChannelId ?? savedConfig?.targetChannelId ?? mockSaved.targetChannelId,
      targetChannelName: targetChannelName ?? savedConfig?.targetChannelName ?? mockSaved.targetChannelName,
    });
  } catch (err: any) {
    console.error("POST user-config error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error saving user config." },
      { status: 500 }
    );
  }
}
