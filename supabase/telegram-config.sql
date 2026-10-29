-- Migration: Add TelegramChannelConfig table and Row Level Security
CREATE TABLE IF NOT EXISTS "TelegramChannelConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "telegramUserId" TEXT,
    "telegramUsername" TEXT,
    "sourceChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetChannelId" TEXT,
    "targetChannelName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramChannelConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TelegramChannelConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramChannelConfig_userId_key" ON "TelegramChannelConfig"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramChannelConfig_telegramUserId_key" ON "TelegramChannelConfig"("telegramUserId");
CREATE INDEX IF NOT EXISTS "TelegramChannelConfig_telegramUserId_idx" ON "TelegramChannelConfig"("telegramUserId");

-- Enable Row Level Security (RLS)
ALTER TABLE "TelegramChannelConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own telegram config" ON "TelegramChannelConfig";
CREATE POLICY "own telegram config" ON "TelegramChannelConfig" FOR SELECT TO authenticated USING (auth.uid() = "userId");
