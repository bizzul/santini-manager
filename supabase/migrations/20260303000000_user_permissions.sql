-- User Permissions System
-- Allows granular assignment of modules, kanbans, and kanban categories to individual users

-- Permessi moduli per utente/sito
CREATE TABLE IF NOT EXISTS user_module_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, site_id, module_name)
);

-- Permessi kanban singole
CREATE TABLE IF NOT EXISTS user_kanban_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kanban_id INTEGER NOT NULL REFERENCES "Kanban"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, kanban_id)
);

-- Permessi categorie kanban
CREATE TABLE IF NOT EXISTS user_kanban_category_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kanban_category_id INTEGER NOT NULL REFERENCES "KanbanCategory"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, kanban_category_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user_site 
    ON user_module_permissions(user_id, site_id);
CREATE INDEX IF NOT EXISTS idx_user_kanban_permissions_user 
    ON user_kanban_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kanban_category_permissions_user 
    ON user_kanban_category_permissions(user_id);

-- RLS Policies

-- Enable RLS
ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kanban_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kanban_category_permissions ENABLE ROW LEVEL SECURITY;

-- user_module_permissions policies
CREATE POLICY "Users can view their own module permissions"
    ON user_module_permissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all module permissions for their sites"
    ON user_module_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can insert module permissions"
    ON user_module_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can update module permissions"
    ON user_module_permissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can delete module permissions"
    ON user_module_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

-- user_kanban_permissions policies
CREATE POLICY "Users can view their own kanban permissions"
    ON user_kanban_permissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all kanban permissions"
    ON user_kanban_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can insert kanban permissions"
    ON user_kanban_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can update kanban permissions"
    ON user_kanban_permissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can delete kanban permissions"
    ON user_kanban_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

-- user_kanban_category_permissions policies
CREATE POLICY "Users can view their own kanban category permissions"
    ON user_kanban_category_permissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all kanban category permissions"
    ON user_kanban_category_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can insert kanban category permissions"
    ON user_kanban_category_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can update kanban category permissions"
    ON user_kanban_category_permissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can delete kanban category permissions"
    ON user_kanban_category_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."authId" = auth.uid()::text
            AND u.role IN ('admin', 'superadmin')
        )
    );
