-- Create site_modules table to track which modules are enabled for each site
CREATE TABLE IF NOT EXISTS "public"."site_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "site_modules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_modules_site_id_module_name_key" UNIQUE ("site_id", "module_name")
);

-- Add foreign key constraint
ALTER TABLE "public"."site_modules" 
    ADD CONSTRAINT "site_modules_site_id_fkey" 
    FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX "idx_site_modules_site_id" ON "public"."site_modules" USING "btree" ("site_id");
CREATE INDEX "idx_site_modules_module_name" ON "public"."site_modules" USING "btree" ("module_name");

-- Enable RLS
ALTER TABLE "public"."site_modules" ENABLE ROW LEVEL SECURITY;

-- Create policies for site_modules
CREATE POLICY "superadmin_can_manage_all_site_modules" ON "public"."site_modules"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "public"."tenants" t
            WHERE t."user_id" = "auth"."uid"()
            AND t."role" = 'superadmin'
        )
    );

CREATE POLICY "organization_members_can_view_their_site_modules" ON "public"."site_modules"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."sites" s
            JOIN "public"."tenants" t ON s.organization_id = t.organization_id
            WHERE s.id = site_modules.site_id 
            AND t.user_id = "auth"."uid"()
        )
    );

-- Insert default modules for existing sites
INSERT INTO "public"."site_modules" ("site_id", "module_name", "is_enabled")
SELECT 
    s.id as site_id,
    m.module_name,
    CASE 
        WHEN m.module_name IN ('dashboard', 'kanban', 'clients', 'inventory', 'products', 'suppliers', 'categories') 
        THEN true 
        ELSE false 
    END as is_enabled
FROM "public"."sites" s
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('kanban'),
        ('projects'),
        ('calendar'),
        ('clients'),
        ('errortracking'),
        ('timetracking'),
        ('reports'),
        ('qualitycontrol'),
        ('boxing'),
        ('inventory'),
        ('products'),
        ('suppliers'),
        ('categories')
) AS m(module_name)
ON CONFLICT ("site_id", "module_name") DO NOTHING;

-- Create function to automatically add modules for new sites
CREATE OR REPLACE FUNCTION "public"."add_default_modules_for_site"()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "public"."site_modules" ("site_id", "module_name", "is_enabled")
    VALUES 
        (NEW.id, 'dashboard', true),
        (NEW.id, 'kanban', true),
        (NEW.id, 'clients', true),
        (NEW.id, 'inventory', true),
        (NEW.id, 'products', true),
        (NEW.id, 'suppliers', true),
        (NEW.id, 'categories', true),
        (NEW.id, 'projects', false),
        (NEW.id, 'calendar', false),
        (NEW.id, 'errortracking', false),
        (NEW.id, 'timetracking', false),
        (NEW.id, 'reports', false),
        (NEW.id, 'qualitycontrol', false),
        (NEW.id, 'boxing', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add default modules when a new site is created
CREATE TRIGGER "trigger_add_default_modules_for_site"
    AFTER INSERT ON "public"."sites"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."add_default_modules_for_site"();

-- Grant permissions
GRANT ALL ON "public"."site_modules" TO "authenticated";
GRANT ALL ON "public"."site_modules" TO "service_role";




