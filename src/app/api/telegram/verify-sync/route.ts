import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  findMockUserById,
  DEFAULT_SOURCE_CHANNELS,
  saveMockTelegramConfig,
} from "@/lib/mockData";

export const runtime = "nodejs";

const VerifySyncSchema = z.object({
  authPayload: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  telegramUserId: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  telegramUsername: z.string().trim().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = VerifySyncSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { authPayload, userId: directUserId, telegramUserId, telegramUsername } = result.data;

    // Extract raw userId from either "AUTH_<uuid>" or direct "userId"
    let targetUserId = directUserId;
    if (!targetUserId && authPayload) {
      targetUserId = authPayload.replace(/^AUTH_/i, "").trim();
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing user identification parameter (authPayload or userId)." },
        { status: 400 }
      );
    }

    // 1. Fetch user to verify account exists
    let user: any = null;

    if (isDatabaseConfigured()) {
      try {
        user = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
      } catch (dbErr) {
        console.warn("DB user lookup fallback in verify-sync:", dbErr);
      }
    }

    if (!user) {
      user = findMockUserById(targetUserId);
    }

    if (!user) {
      return NextResponse.json(
        { error: `User with ID '${targetUserId}' was not found. Please register or log in on EarnKaro first.` },
        { status: 404 }
      );
    }

    // 2. Upsert TelegramChannelConfig
    let config: any = null;
    const cleanUsername = telegramUsername ? telegramUsername.replace(/^@/, "") : null;

    if (isDatabaseConfigured()) {
      try {
        config = await prisma.telegramChannelConfig.upsert({
          where: { userId: user.id },
          update: {
            telegramUserId,
            telegramUsername: cleanUsername,
            updatedAt: new Date(),
          },
          create: {
            userId: user.id,
            telegramUserId,
            telegramUsername: cleanUsername,
            sourceChannels: DEFAULT_SOURCE_CHANNELS,
            isActive: true,
          },
        });
      } catch (dbErr) {
        console.warn("DB config upsert fallback in verify-sync:", dbErr);
      }
    }

    if (!config) {
      config = saveMockTelegramConfig({
        userId: user.id,
        telegramUserId,
        telegramUsername: cleanUsername,
      });
    }

    const trackingSubId = `${user.subIdPrefix || "EK"}_tg`;

    return NextResponse.json({
      success: true,
      message: "Telegram account connected successfully!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subIdPrefix: user.subIdPrefix,
        trackingSubId,
        referralCode: user.referralCode,
      },
      config: {
        id: config.id,
        telegramUserId: config.telegramUserId,
        telegramUsername: config.telegramUsername,
        targetChannelId: config.targetChannelId,
        targetChannelName: config.targetChannelName,
        sourceChannels: config.sourceChannels,
        isActive: config.isActive,
      },
    });
  } catch (err: any) {
    console.error("verify-sync error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error verifying Telegram user." },
      { status: 500 }
    );
  }
}
