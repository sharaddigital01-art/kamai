-- Migration: Add/Update TelegramChannelConfig table and columns for dynamic automation
CREATE TABLE IF NOT EXISTS "TelegramChannelConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "telegramUserId" TEXT,
    "telegramUsername" TEXT,
    "sessionString" TEXT,
    "sourceChannels" JSONB DEFAULT '[]'::jsonb,
    "targetChannels" JSONB DEFAULT '[]'::jsonb,
    "targetChannelId" TEXT,
    "targetChannelName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramChannelConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TelegramChannelConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Upgrade existing table if already created with earlier schema:
ALTER TABLE "TelegramChannelConfig" ADD COLUMN IF NOT EXISTS "sessionString" TEXT;
ALTER TABLE "TelegramChannelConfig" ADD COLUMN IF NOT EXISTS "targetChannels" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "TelegramChannelConfig" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Convert sourceChannels to JSONB if it was previously created as TEXT[]
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'TelegramChannelConfig' AND column_name = 'sourceChannels' AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE "TelegramChannelConfig" ALTER COLUMN "sourceChannels" TYPE JSONB USING to_jsonb("sourceChannels");
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramChannelConfig_userId_key" ON "TelegramChannelConfig"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramChannelConfig_telegramUserId_key" ON "TelegramChannelConfig"("telegramUserId");
CREATE INDEX IF NOT EXISTS "TelegramChannelConfig_telegramUserId_idx" ON "TelegramChannelConfig"("telegramUserId");

-- Enable Row Level Security (RLS)
ALTER TABLE "TelegramChannelConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own telegram config" ON "TelegramChannelConfig";
CREATE POLICY "own telegram config" ON "TelegramChannelConfig" FOR SELECT TO authenticated USING (auth.uid() = "userId");
