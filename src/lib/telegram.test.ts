import { describe, it, expect, beforeAll } from "vitest";
import {
  DEFAULT_SOURCE_CHANNELS,
  saveMockTelegramConfig,
  getMockTelegramConfigByUserId,
  getMockTelegramConfigByTelegramId,
  getAllMockTelegramConfigs,
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

  it("fetches active configs list for background Python workers", () => {
    // Reactivate for test
    saveMockTelegramConfig({
      userId: testUserId,
      isActive: true,
    });

    const activeConfigs = getAllMockTelegramConfigs(true);
    expect(activeConfigs.length).toBeGreaterThan(0);
    const userCfg = activeConfigs.find((c) => c.userId === testUserId);
    expect(userCfg).toBeDefined();
    expect(userCfg?.isActive).toBe(true);
    expect(userCfg?.targetChannelId).toBe("@my_exclusive_loot");
  });

  it("stores and returns Telethon session string and channel maps via API routes", async () => {
    // 1. Test POST /api/telegram/save-session
    const { POST: postSaveSession } = await import("@/app/api/telegram/save-session/route");
    const testSession = "1BVtsOGQBu3k8...telethon_mock_session_string...";
    const sessionReq = new Request("http://localhost:3000/api/telegram/save-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": "kamaikaro-tg-worker-secret-2026",
      },
      body: JSON.stringify({
        userId: testUserId,
        telegramUserId: "987654321",
        sessionString: testSession,
        isActive: true,
      }),
    });

    const sessionRes = await postSaveSession(sessionReq);
    expect(sessionRes.status).toBe(200);
    const sessionData = await sessionRes.json();
    expect(sessionData.success).toBe(true);
    expect(sessionData.telegramUserId).toBe("987654321");

    // 2. Test POST /api/telegram/channels
    const { POST: postChannels, GET: getChannels } = await import("@/app/api/telegram/channels/route");
    const channelsReq = new Request("http://localhost:3000/api/telegram/channels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": "kamaikaro-tg-worker-secret-2026",
      },
      body: JSON.stringify({
        userId: testUserId,
        sourceChannels: [
          { id: "-100123456789", title: "Mega Deals Hub", username: "megadeals" },
        ],
        targetChannels: [
          { id: "-100987654321", title: "My Verified Channel", username: "mychannel" },
        ],
        isActive: true,
      }),
    });

    const channelsRes = await postChannels(channelsReq);
    expect(channelsRes.status).toBe(200);
    const channelsData = await channelsRes.json();
    expect(channelsData.success).toBe(true);

    // 3. Test GET /api/telegram/channels
    const getReq = new Request(`http://localhost:3000/api/telegram/channels?userId=${testUserId}`, {
      method: "GET",
      headers: {
        "x-worker-secret": "kamaikaro-tg-worker-secret-2026",
      },
    });
    const getRes = await getChannels(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.sourceChannels.length).toBeGreaterThan(0);

    // 4. Test GET /api/telegram/user-config includes sessionString and channels
    const { GET: getUserConfig } = await import("@/app/api/telegram/user-config/route");
    const cfgReq = new Request("http://localhost:3000/api/telegram/user-config?activeOnly=true", {
      method: "GET",
      headers: {
        "x-worker-secret": "kamaikaro-tg-worker-secret-2026",
      },
    });
    const cfgRes = await getUserConfig(cfgReq);
    expect(cfgRes.status).toBe(200);
    const cfgData = await cfgRes.json();
    expect(cfgData.success).toBe(true);
    const matchingCfg = cfgData.configs.find((c: any) => c.userId === testUserId);
    expect(matchingCfg).toBeDefined();
    expect(matchingCfg?.sessionString).toBe(testSession);

    // 5. Test matching by telegramUserId alone
    const singleReq = new Request("http://localhost:3000/api/telegram/save-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": "kamaikaro-tg-worker-secret-2026",
      },
      body: JSON.stringify({
        telegramUserId: "987654321",
        sessionString: "2B_telethon_updated_session_string...",
        isActive: true,
      }),
    });
    const singleRes = await postSaveSession(singleReq);
    expect(singleRes.status).toBe(200);
    const singleData = await singleRes.json();
    expect(singleData.success).toBe(true);
    expect(singleData.isTelegramConnected).toBe(true);
    expect(singleData.userId).toBe(testUserId);

    // 6. Test GET user-config by telegramUserId returns isTelegramConnected
    const userCfgReq = new Request(`http://localhost:3000/api/telegram/user-config?telegramUserId=987654321`, {
      method: "GET",
      headers: {
        "x-worker-secret": "kamaikaro-tg-worker-secret-2026",
      },
    });
    const userCfgRes = await getUserConfig(userCfgReq);
    expect(userCfgRes.status).toBe(200);
    const userCfgData = await userCfgRes.json();
    expect(userCfgData.connected).toBe(true);
    expect(userCfgData.isTelegramConnected).toBe(true);
  }, 15000);
});
