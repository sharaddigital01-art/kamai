-- Migration: Add conversions table and Row Level Security
CREATE TABLE IF NOT EXISTS "conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "sale_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "subid" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversions_transaction_id_key" ON "conversions"("transaction_id");
CREATE INDEX IF NOT EXISTS "conversions_user_id_idx" ON "conversions"("user_id");
CREATE INDEX IF NOT EXISTS "conversions_status_idx" ON "conversions"("status");

-- Enable Row Level Security (RLS)
ALTER TABLE "conversions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own conversions" ON "conversions";
CREATE POLICY "own conversions" ON "conversions" FOR SELECT TO authenticated USING (auth.uid() = "user_id");
