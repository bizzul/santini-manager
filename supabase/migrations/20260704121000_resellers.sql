-- Create Reseller table (rivenditori/distributori per paese)
CREATE TABLE IF NOT EXISTS "public"."Reseller" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "country" VARCHAR(100),
    "country_code" VARCHAR(2),
    "address" TEXT,
    "zip_city" VARCHAR(255),
    "phone" TEXT,
    "fax" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "site_id" UUID REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_reseller_site_id" ON "public"."Reseller"("site_id");
CREATE INDEX IF NOT EXISTS "idx_reseller_country_code" ON "public"."Reseller"("country_code");

-- Enable RLS
ALTER TABLE "public"."Reseller" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as Manufacturer)

CREATE POLICY "Users can view resellers for their sites"
    ON "public"."Reseller"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert resellers for their sites"
    ON "public"."Reseller"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update resellers for their sites"
    ON "public"."Reseller"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete resellers for their sites"
    ON "public"."Reseller"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Superadmins have full access to resellers"
    ON "public"."Reseller"
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

-- Grants
GRANT ALL ON TABLE "public"."Reseller" TO "authenticated";
GRANT ALL ON TABLE "public"."Reseller" TO "service_role";
GRANT ALL ON SEQUENCE "public"."Reseller_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Reseller_id_seq" TO "service_role";

COMMENT ON TABLE "public"."Reseller" IS 'Resellers/distributors per country';
