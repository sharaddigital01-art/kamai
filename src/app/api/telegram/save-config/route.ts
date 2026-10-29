import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConfigured,
  DEFAULT_SOURCE_CHANNELS,
  saveMockTelegramConfig,
  getMockTelegramConfigByUserId,
} from "@/lib/mockData";

export const runtime = "nodejs";

const SaveConfigSchema = z.object({
  userId: z.string().trim().optional(),
  targetChannelId: z.string().trim().optional().nullable(),
  targetChannelName: z.string().trim().optional().nullable(),
  sourceChannels: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
  disconnect: z.boolean().optional(),
});

function normalizeChannelTag(tag: string): string {
  const clean = tag.trim();
  if (!clean) return "";
  if (clean.startsWith("-100") || clean.startsWith("@")) return clean;
  // If it's a link like https://t.me/channelname
  const match = clean.match(/t\.me\/([a-zA-Z0-9_]+)/i);
  if (match && match[1]) return `@${match[1]}`;
  return `@${clean.replace(/^@/, "")}`;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = SaveConfigSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const {
      userId: directUserId,
      targetChannelId,
      targetChannelName,
      sourceChannels,
      isActive,
      disconnect,
    } = result.data;

    // Identify user
    let user = await getApiUser();
    let targetUserId = user?.id || directUserId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Authentication required to update Telegram configuration." },
        { status: 401 }
      );
    }

    // Clean targetChannelId
    let cleanTargetChannelId: string | null = null;
    if (targetChannelId) {
      cleanTargetChannelId = normalizeChannelTag(targetChannelId);
    }

    // Clean and deduplicate source channels
    let cleanSourceChannels = DEFAULT_SOURCE_CHANNELS;
    if (sourceChannels && Array.isArray(sourceChannels)) {
      cleanSourceChannels = Array.from(
        new Set(
          sourceChannels
            .map((s) => normalizeChannelTag(s))
            .filter((s) => s.length > 2)
        )
      );
    }

    let updatedConfig: any = null;

    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.telegramChannelConfig.findUnique({
          where: { userId: targetUserId },
        });

        if (disconnect) {
          // Unlink Telegram account while preserving channel settings
          updatedConfig = await prisma.telegramChannelConfig.update({
            where: { userId: targetUserId },
            data: {
              telegramUserId: null,
              telegramUsername: null,
              updatedAt: new Date(),
            },
          });
        } else {
          updatedConfig = await prisma.telegramChannelConfig.upsert({
            where: { userId: targetUserId },
            update: {
              targetChannelId: cleanTargetChannelId !== undefined ? cleanTargetChannelId : existing?.targetChannelId,
              targetChannelName: targetChannelName !== undefined ? targetChannelName : existing?.targetChannelName,
              sourceChannels: cleanSourceChannels,
              isActive: isActive !== undefined ? isActive : existing?.isActive ?? true,
              updatedAt: new Date(),
            },
            create: {
              userId: targetUserId,
              targetChannelId: cleanTargetChannelId,
              targetChannelName: targetChannelName || null,
              sourceChannels: cleanSourceChannels,
              isActive: isActive !== undefined ? isActive : true,
            },
          });
        }
      } catch (dbErr) {
        console.warn("Database save-config error, using fallback store:", dbErr);
      }
    }

    if (!updatedConfig) {
      if (disconnect) {
        updatedConfig = saveMockTelegramConfig({
          userId: targetUserId,
          telegramUserId: null,
          telegramUsername: null,
        });
      } else {
        updatedConfig = saveMockTelegramConfig({
          userId: targetUserId,
          targetChannelId: cleanTargetChannelId,
          targetChannelName,
          sourceChannels: cleanSourceChannels,
          isActive,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: disconnect
        ? "Telegram bot disconnected successfully."
        : "Telegram channel automation settings saved successfully!",
      config: {
        id: updatedConfig.id,
        userId: updatedConfig.userId,
        telegramUserId: updatedConfig.telegramUserId,
        telegramUsername: updatedConfig.telegramUsername,
        targetChannelId: updatedConfig.targetChannelId,
        targetChannelName: updatedConfig.targetChannelName,
        sourceChannels: updatedConfig.sourceChannels,
        isActive: updatedConfig.isActive,
      },
    });
  } catch (err: any) {
    console.error("save-config error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error saving Telegram config." },
      { status: 500 }
    );
  }
}
