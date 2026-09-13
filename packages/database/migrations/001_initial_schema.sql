-- Migration 001: Initial Schema for Stager
-- Multi-tenant Enterprise Launchpad and Command Center

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    brand_color TEXT NOT NULL DEFAULT '#10b981',
    logo_url TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Profiles (scoped to auth.users if Supabase Auth is active)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Note: In production Supabase, profiles.id references auth.users(id).
-- In environments where auth.users may not exist yet during local script testing,
-- a conditional foreign key can be added:
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        ALTER TABLE profiles
        DROP CONSTRAINT IF EXISTS fk_profiles_auth_users;
        
        ALTER TABLE profiles
        ADD CONSTRAINT fk_profiles_auth_users
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Go-Links
CREATE TABLE IF NOT EXISTS go_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    target_url TEXT NOT NULL,
    description TEXT,
    click_count INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_go_links_org_keyword UNIQUE (org_id, keyword)
);

-- 4. Broadcasts
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- markdown supported
    department TEXT NOT NULL DEFAULT 'All',
    author_role TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Broadcast Acknowledgments
CREATE TABLE IF NOT EXISTS broadcast_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_broadcast_user UNIQUE (broadcast_id, user_id)
);

-- Indexes for high-frequency resolution and lookups
CREATE INDEX IF NOT EXISTS idx_go_links_org_keyword ON go_links(org_id, keyword);
CREATE INDEX IF NOT EXISTS idx_go_links_click_count ON go_links(org_id, click_count DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_org_pinned ON broadcasts(org_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_ack_lookup ON broadcast_acknowledgments(broadcast_id, user_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE go_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Helper to fetch current authenticated user's organization id
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS: Organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id = auth_user_org_id() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon' -- fallback for local testing without full auth setup
  );

-- RLS: Profiles
CREATE POLICY "Users can view members in their organization"
  ON profiles FOR SELECT
  USING (
    org_id = auth_user_org_id() 
    OR id = auth.uid()
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR auth.role() = 'service_role');

-- RLS: Go Links
CREATE POLICY "Users can view go_links in their organization"
  ON go_links FOR SELECT
  USING (
    org_id = auth_user_org_id() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can insert go_links in their organization"
  ON go_links FOR INSERT
  WITH CHECK (
    org_id = auth_user_org_id() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can update go_links in their organization"
  ON go_links FOR UPDATE
  USING (
    org_id = auth_user_org_id() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

-- RLS: Broadcasts
CREATE POLICY "Users can view broadcasts in their organization"
  ON broadcasts FOR SELECT
  USING (
    org_id = auth_user_org_id() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

CREATE POLICY "Staff can manage broadcasts in their organization"
  ON broadcasts FOR ALL
  USING (
    org_id = auth_user_org_id() 
    OR auth.role() = 'service_role'
  );

-- RLS: Broadcast Acknowledgments
CREATE POLICY "Users can view their own broadcast acknowledgments"
  ON broadcast_acknowledgments FOR SELECT
  USING (
    user_id = auth.uid() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can insert their own broadcast acknowledgment"
  ON broadcast_acknowledgments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );
