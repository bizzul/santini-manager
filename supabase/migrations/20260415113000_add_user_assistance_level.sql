-- Add per-user assistance level managed by superadmin.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS assistance_level TEXT NOT NULL DEFAULT 'basic_tutorial';

-- Restrict values to the supported UX levels.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_assistance_level_check'
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT user_assistance_level_check
        CHECK (assistance_level IN ('basic_tutorial', 'smart_support', 'advanced_support'));
    END IF;
END
$$;

COMMENT ON COLUMN "User".assistance_level IS 'Per-user assistance UX level: basic_tutorial, smart_support, advanced_support.';

CREATE INDEX IF NOT EXISTS idx_user_assistance_level ON "User" (assistance_level);
