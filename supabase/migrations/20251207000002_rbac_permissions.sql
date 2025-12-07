-- ========================================
-- RBAC PERMISSIONS TABLES
-- Phase 2: Security & Compliance
-- ========================================

-- Permissions table (defines all available permissions)
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (public read)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select_policy" ON public.permissions
  FOR SELECT USING (true);

-- Role permissions mapping table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(role, permission_id)
);

-- Enable RLS (public read)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
  FOR SELECT USING (true);

-- Seed default permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('team.view', 'View team details', 'team'),
  ('team.update', 'Update team settings', 'team'),
  ('team.delete', 'Delete team', 'team'),
  ('team.billing.view', 'View billing information', 'billing'),
  ('team.billing.update', 'Update billing information', 'billing'),
  ('project.create', 'Create projects', 'project'),
  ('project.view', 'View projects', 'project'),
  ('project.update', 'Update projects', 'project'),
  ('project.delete', 'Delete projects', 'project'),
  ('project.analyze', 'Run analysis', 'analysis'),
  ('project.fix', 'Apply fixes', 'analysis'),
  ('member.view', 'View team members', 'member'),
  ('member.invite', 'Invite team members', 'member'),
  ('member.remove', 'Remove team members', 'member'),
  ('member.role.update', 'Update member roles', 'member'),
  ('integration.view', 'View integrations', 'integration'),
  ('integration.manage', 'Manage integrations', 'integration'),
  ('api_key.view', 'View API keys', 'api_key'),
  ('api_key.create', 'Create API keys', 'api_key'),
  ('api_key.revoke', 'Revoke API keys', 'api_key'),
  ('audit.view', 'View audit logs', 'audit')
ON CONFLICT (name) DO NOTHING;

-- Seed role permissions for 'owner' (all permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'owner', id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Seed role permissions for 'admin' (most permissions except team.delete and team.billing.update)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions 
WHERE name NOT IN ('team.delete', 'team.billing.update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Seed role permissions for 'member' (project and basic team access)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'member', id FROM public.permissions 
WHERE name IN (
  'team.view', 
  'project.create', 'project.view', 'project.update', 
  'project.analyze', 'project.fix',
  'member.view',
  'integration.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Seed role permissions for 'viewer' (read-only access)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer', id FROM public.permissions 
WHERE name IN ('team.view', 'project.view', 'member.view', 'integration.view')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
