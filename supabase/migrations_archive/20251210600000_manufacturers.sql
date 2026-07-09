-- Create Manufacturer_category table
CREATE TABLE IF NOT EXISTS "public"."Manufacturer_category" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" VARCHAR(500) NOT NULL,
    "site_id" UUID REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add index for site_id for better query performance
CREATE INDEX IF NOT EXISTS "idx_manufacturer_category_site_id" ON "public"."Manufacturer_category"("site_id");

-- Add unique constraint for name + site_id to prevent duplicate categories per site
CREATE UNIQUE INDEX IF NOT EXISTS "idx_manufacturer_category_name_site" ON "public"."Manufacturer_category"("name", "site_id");

-- Enable RLS
ALTER TABLE "public"."Manufacturer_category" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can view categories if they have access to the site
CREATE POLICY "Users can view manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Users can create categories for their sites
CREATE POLICY "Users can insert manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE: Users can update categories for their sites
CREATE POLICY "Users can update manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- DELETE: Users can delete categories for their sites
CREATE POLICY "Users can delete manufacturer categories for their sites"
    ON "public"."Manufacturer_category"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- SUPERADMIN: Full access to all manufacturer categories
CREATE POLICY "Superadmins have full access to manufacturer categories"
    ON "public"."Manufacturer_category"
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

-- Grant base permissions
GRANT ALL ON TABLE "public"."Manufacturer_category" TO "authenticated";
GRANT ALL ON TABLE "public"."Manufacturer_category" TO "service_role";

-- Grant sequence permissions
GRANT ALL ON SEQUENCE "public"."Manufacturer_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Manufacturer_category_id_seq" TO "service_role";

-- Comment on table
COMMENT ON TABLE "public"."Manufacturer_category" IS 'Categories for manufacturers';

-- Create Manufacturer table
CREATE TABLE IF NOT EXISTS "public"."Manufacturer" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(100),
    "description" TEXT,
    "address" TEXT,
    "cap" INTEGER,
    "location" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contact" TEXT,
    "manufacturer_image" VARCHAR(500),
    "manufacturer_category_id" INTEGER REFERENCES "public"."Manufacturer_category"("id") ON DELETE SET NULL,
    "site_id" UUID REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_manufacturer_site_id" ON "public"."Manufacturer"("site_id");
CREATE INDEX IF NOT EXISTS "idx_manufacturer_category_id" ON "public"."Manufacturer"("manufacturer_category_id");

-- Enable RLS
ALTER TABLE "public"."Manufacturer" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can view manufacturers if they have access to the site
CREATE POLICY "Users can view manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Users can create manufacturers for their sites
CREATE POLICY "Users can insert manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE: Users can update manufacturers for their sites
CREATE POLICY "Users can update manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- DELETE: Users can delete manufacturers for their sites
CREATE POLICY "Users can delete manufacturers for their sites"
    ON "public"."Manufacturer"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- SUPERADMIN: Full access to all manufacturers
CREATE POLICY "Superadmins have full access to manufacturers"
    ON "public"."Manufacturer"
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

-- Grant base permissions
GRANT ALL ON TABLE "public"."Manufacturer" TO "authenticated";
GRANT ALL ON TABLE "public"."Manufacturer" TO "service_role";

-- Grant sequence permissions
GRANT ALL ON SEQUENCE "public"."Manufacturer_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Manufacturer_id_seq" TO "service_role";

-- Comment on table
COMMENT ON TABLE "public"."Manufacturer" IS 'Manufacturers/Producers table';
