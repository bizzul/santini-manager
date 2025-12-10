-- Create Supplier_category table
CREATE TABLE IF NOT EXISTS "public"."Supplier_category" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "description" VARCHAR(500) NOT NULL,
    "site_id" UUID REFERENCES "public"."sites"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add index for site_id for better query performance
CREATE INDEX IF NOT EXISTS "idx_supplier_category_site_id" ON "public"."Supplier_category"("site_id");

-- Add unique constraint for name + site_id to prevent duplicate categories per site
CREATE UNIQUE INDEX IF NOT EXISTS "idx_supplier_category_name_site" ON "public"."Supplier_category"("name", "site_id");

-- Enable RLS
ALTER TABLE "public"."Supplier_category" ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can view categories if they have access to the site
CREATE POLICY "Users can view supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR SELECT
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: Users can create categories for their sites
CREATE POLICY "Users can insert supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR INSERT
    WITH CHECK (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE: Users can update categories for their sites
CREATE POLICY "Users can update supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR UPDATE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- DELETE: Users can delete categories for their sites
CREATE POLICY "Users can delete supplier categories for their sites"
    ON "public"."Supplier_category"
    FOR DELETE
    USING (
        site_id IN (
            SELECT site_id
            FROM "public"."user_sites"
            WHERE user_id = auth.uid()
        )
    );

-- SUPERADMIN: Full access to all supplier categories
CREATE POLICY "Superadmins have full access to supplier categories"
    ON "public"."Supplier_category"
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
GRANT ALL ON TABLE "public"."Supplier_category" TO "authenticated";
GRANT ALL ON TABLE "public"."Supplier_category" TO "service_role";

-- Grant sequence permissions
GRANT ALL ON SEQUENCE "public"."Supplier_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Supplier_category_id_seq" TO "service_role";

-- Add supplier_category_id to Supplier table
ALTER TABLE "public"."Supplier" 
ADD COLUMN IF NOT EXISTS "supplier_category_id" INTEGER REFERENCES "public"."Supplier_category"("id") ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS "idx_supplier_category_id" ON "public"."Supplier"("supplier_category_id");

-- Comment on table
COMMENT ON TABLE "public"."Supplier_category" IS 'Categories for suppliers, similar to Product_category';
