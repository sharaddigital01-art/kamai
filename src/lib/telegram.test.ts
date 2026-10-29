import { describe, it, expect, beforeAll } from "vitest";
import {
  DEFAULT_SOURCE_CHANNELS,
  saveMockTelegramConfig,
  getMockTelegramConfigByUserId,
  getMockTelegramConfigByTelegramId,
  createMockUser,
} from "./mockData";

describe("Telegram Channel Automation Configuration", () => {
  const testUserId = "user-tg-test-" + Date.now();

  beforeAll(() => {
    createMockUser({
      id: testUserId,
      email: "tguser@earnkaro.test",
      name: "Telegram Deal Master",
      role: "USER",
      referralCode: "TGDEAL",
      subIdPrefix: "TG001",
    });
  });

  it("provides default source channels", () => {
    expect(DEFAULT_SOURCE_CHANNELS.length).toBeGreaterThan(0);
    expect(DEFAULT_SOURCE_CHANNELS).toContain("@lootdealsindia");
    expect(DEFAULT_SOURCE_CHANNELS).toContain("@flipkart_loot_offers");
  });

  it("saves and retrieves config by user ID", () => {
    const config = saveMockTelegramConfig({
      userId: testUserId,
      telegramUserId: "987654321",
      telegramUsername: "deal_bot_user",
      targetChannelId: "@my_exclusive_loot",
      targetChannelName: "My Loot Channel",
      sourceChannels: ["@lootdealsindia", "@flipkart_loot_offers"],
      isActive: true,
    });

    expect(config.userId).toBe(testUserId);
    expect(config.telegramUserId).toBe("987654321");
    expect(config.targetChannelId).toBe("@my_exclusive_loot");
    expect(config.sourceChannels).toContain("@lootdealsindia");
    expect(config.isActive).toBe(true);

    const retrieved = getMockTelegramConfigByUserId(testUserId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.telegramUsername).toBe("deal_bot_user");
  });

  it("retrieves config by telegramUserId for external worker bots", () => {
    const retrieved = getMockTelegramConfigByTelegramId("987654321");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe(testUserId);
    expect(retrieved?.targetChannelId).toBe("@my_exclusive_loot");
  });

  it("updates existing config and toggles active status", () => {
    const updated = saveMockTelegramConfig({
      userId: testUserId,
      isActive: false,
    });

    expect(updated.isActive).toBe(false);
    expect(updated.telegramUserId).toBe("987654321"); // preserved
    expect(updated.targetChannelId).toBe("@my_exclusive_loot"); // preserved
  });
});
