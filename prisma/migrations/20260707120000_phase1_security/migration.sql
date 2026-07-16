-- Rename AdminUser.password to passwordHash if the old column exists.
-- If you have existing AdminUser rows, hash the plaintext passwords outside this
-- migration before applying it, then update the passwordHash column.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminUser' AND column_name = 'password'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'AdminUser' AND column_name = 'passwordHash'
    ) THEN
        ALTER TABLE "AdminUser" RENAME COLUMN "password" TO "passwordHash";
    END IF;
END $$;

-- Create RateLimit table if it does not exist
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- Unique index for rate-limit upserts
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimit_key_window_key" ON "RateLimit"("key", "window");
