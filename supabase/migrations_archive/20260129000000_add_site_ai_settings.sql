-- Migration: Add site_ai_settings table for per-site AI configuration
-- This allows each site to configure their own AI provider, API keys, and speech-to-text settings

-- Create the site_ai_settings table
CREATE TABLE IF NOT EXISTS "public"."site_ai_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    
    -- AI Provider Settings
    "ai_provider" "text" DEFAULT 'openai',
    "ai_api_key" "text",  -- API key
    "ai_model" "text" DEFAULT 'gpt-4o-mini',
    
    -- Speech-to-Text Settings  
    "speech_provider" "text" DEFAULT 'web-speech',
    "whisper_api_key" "text",  -- API key for Whisper (if different from main AI key)
    
    -- Metadata
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    
    CONSTRAINT "site_ai_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_ai_settings_site_id_key" UNIQUE ("site_id")
);

-- Add foreign key constraint
ALTER TABLE "public"."site_ai_settings" 
    ADD CONSTRAINT "site_ai_settings_site_id_fkey" 
    FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX "idx_site_ai_settings_site_id" ON "public"."site_ai_settings" USING "btree" ("site_id");

-- Enable RLS
ALTER TABLE "public"."site_ai_settings" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Superadmins can manage all AI settings
CREATE POLICY "Superadmins can manage all AI settings" ON "public"."site_ai_settings"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "public"."User"
            WHERE auth_id = auth.uid()
            AND role = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."User"
            WHERE auth_id = auth.uid()
            AND role = 'superadmin'
        )
    );

-- RLS Policy: Users can view AI settings for their sites (via user_sites or user_organizations)
CREATE POLICY "Users can view AI settings for their sites" ON "public"."site_ai_settings"
    FOR SELECT USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert AI settings for their sites
CREATE POLICY "Users can insert AI settings for their sites" ON "public"."site_ai_settings"
    FOR INSERT WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update AI settings for their sites
CREATE POLICY "Users can update AI settings for their sites" ON "public"."site_ai_settings"
    FOR UPDATE USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- RLS Policy: Users can delete AI settings for their sites
CREATE POLICY "Users can delete AI settings for their sites" ON "public"."site_ai_settings"
    FOR DELETE USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
        OR
        site_id IN (
            SELECT s.id
            FROM "public"."sites" s
            INNER JOIN "public"."user_organizations" uo ON s.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION "public"."update_site_ai_settings_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "site_ai_settings_updated_at_trigger"
    BEFORE UPDATE ON "public"."site_ai_settings"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_site_ai_settings_updated_at"();

-- Grant permissions
GRANT ALL ON "public"."site_ai_settings" TO "authenticated";
GRANT ALL ON "public"."site_ai_settings" TO "service_role";

-- Add comment for documentation
COMMENT ON TABLE "public"."site_ai_settings" IS 'Per-site AI configuration including API keys and provider settings';
COMMENT ON COLUMN "public"."site_ai_settings"."ai_api_key" IS 'API key for the AI provider';
COMMENT ON COLUMN "public"."site_ai_settings"."whisper_api_key" IS 'API key for Whisper (optional, uses ai_api_key if not set)';
