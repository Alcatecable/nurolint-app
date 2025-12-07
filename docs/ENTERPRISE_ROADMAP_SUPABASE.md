# NeuroLint Enterprise Feature Roadmap - Supabase Implementation

**Timeline**: 8-10 weeks  
**Goal**: $250k-$1.2M acquisition-ready SaaS  
**Standard**: Enterprise-grade, not MVP  
**Database**: Supabase (PostgreSQL with RLS)

---

## Table of Contents

1. [Architecture Foundation](#architecture-foundation)
2. [Implementation Status Overview](#implementation-status-overview)
3. [Phase 1: Core Enterprise Credibility](#phase-1-core-enterprise-credibility-weeks-1-2)
4. [Phase 2: Security & Compliance](#phase-2-security--compliance-weeks-3-4)
5. [Phase 3: Enterprise Controls](#phase-3-enterprise-controls-weeks-5-6)
6. [Phase 4: Analytics & Integration](#phase-4-analytics--integration-weeks-7-8)
7. [Phase 5: Polish & Launch](#phase-5-polish--launch-weeks-9-10)
8. [Missing Features to Implement](#missing-features-to-implement)

---

## Architecture Foundation

### Current Technology Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | Next.js 14 (App Router) | ✅ Implemented |
| Database | Supabase PostgreSQL | ✅ Configured |
| Authentication | Supabase Auth | ✅ Implemented |
| ORM | Drizzle ORM | ✅ Configured |
| Styling | Tailwind CSS | ✅ Implemented |
| Real-time | Supabase Realtime | ✅ Configured |

### Supabase-Specific Patterns (Required for All New Tables)

1. **Authentication**: All user references use `auth.users(id)`
2. **Row-Level Security (RLS)**: Every table MUST have:
   - `ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;`
   - At least one policy for SELECT, INSERT, UPDATE, DELETE as needed
3. **Timestamps**: Use `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
4. **Updated At Trigger**: All tables with `updated_at` must use:
   ```sql
   CREATE TRIGGER update_tablename_updated_at 
     BEFORE UPDATE ON public.table_name 
     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```
5. **Real-time**: Add tables to publication when real-time is needed:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
   ```
6. **Foreign Key Convention**: Use `ON DELETE CASCADE` for child tables

### API Route Structure (Next.js App Router)

The codebase uses Next.js App Router pattern, NOT versioned REST APIs:

```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── signup/route.ts
│   ├── logout/route.ts
│   └── api-keys/route.ts
├── teams/
│   ├── route.ts
│   └── [teamId]/invitations/route.ts
├── projects/
│   ├── route.ts
│   └── [projectId]/files/route.ts
├── collaboration/
│   ├── sessions/route.ts
│   └── sessions/[sessionId]/route.ts
├── integrations/
│   ├── github/auth/route.ts
│   └── cicd/route.ts
└── analytics/route.ts
```

---

## Implementation Status Overview

### ✅ FULLY IMPLEMENTED

| Feature | Table(s) | Location | Notes |
|---------|----------|----------|-------|
| User Profiles | `profiles` | `20250809233514_initial_schema.sql` | With plan, subscription status |
| Analysis History | `analysis_history` | `20250809233514_initial_schema.sql` | Tracks all analysis runs |
| Projects | `projects` | `20250809233514_initial_schema.sql` | User projects with files, stats |
| User Settings | `user_settings` | `20250809233514_initial_schema.sql` | Dashboard preferences |
| API Keys | `api_keys` | `20250809233514_initial_schema.sql` | Key hashing, permissions |
| Usage Logs | `usage_logs` | `20250809233514_initial_schema.sql` | Action tracking, cost |
| Teams (Tenancy) | `teams` | `20250809233549_collaboration_tables.sql` | Team-based multi-tenancy |
| Team Members | `team_members` | `20250809233549_collaboration_tables.sql` | Role-based membership |
| Team Invitations | `team_invitations` | `20250809233549_collaboration_tables.sql` | 7-day expiry |
| Collaboration Sessions | `collaboration_sessions` | `20250809233549_collaboration_tables.sql` | Real-time sessions |
| Collaboration Participants | `collaboration_participants` | `20250809233549_collaboration_tables.sql` | Live presence |
| Collaboration Comments | `collaboration_comments` | `20250809233549_collaboration_tables.sql` | Code comments |
| Project Subscriptions | `project_subscriptions` | `20250809233633_billing_and_integrations.sql` | Per-project billing |
| Project Usage | `project_usage` | `20250809233633_billing_and_integrations.sql` | Monthly fix counts |
| Billing Cycles | `billing_cycles` | `20250809233633_billing_and_integrations.sql` | Period tracking |
| Webhooks | `webhooks` | `20250809233633_billing_and_integrations.sql` | Event notifications |
| Webhook Events | `webhook_events` | `20250809233633_billing_and_integrations.sql` | Event history |
| Integrations | `integrations` | `20250809233633_billing_and_integrations.sql` | GitHub, GitLab, etc. |
| Integration Runs | `integration_runs` | `20250809233633_billing_and_integrations.sql` | CI/CD run tracking |
| Fix History | `fix_history` | `20250809233633_billing_and_integrations.sql` | Original/fixed code |
| Analysis Jobs | `analysis_jobs` | `shared/schema.ts` | Async job queue |
| Subscriptions | `subscriptions` | `shared/schema.ts` | PayPal integration |
| Collaboration Analyses | `collaboration_analyses` | `shared/schema.ts` | Session analysis results |

### ⚠️ PARTIALLY IMPLEMENTED (Needs Enhancement)

| Feature | Current State | Gap | Priority |
|---------|---------------|-----|----------|
| Team-based tenancy | `teams` table exists | Missing org hierarchy for enterprise accounts | MEDIUM |
| Analysis tracking | `analysis_history` exists | Missing granular `analysis_issues` table | MEDIUM |
| GitHub integration | `integrations` table exists | Missing `repository_connections` for repo-level tracking | LOW |
| Usage analytics | `usage_logs` exists | Missing aggregated `usage_metrics` views | LOW |

### ❌ NOT IMPLEMENTED (Critical for Enterprise)

| Feature | Required Tables | Priority | Effort |
|---------|-----------------|----------|--------|
| Audit Logs | `audit_logs` | **HIGH** | 2 days |
| RBAC Permissions | `permissions`, `role_permissions` | **HIGH** | 2 days |
| Rule Configurations | `rule_definitions`, `team_rule_configs`, `project_rule_configs` | MEDIUM | 2 days |
| API Key Usage Tracking | `api_key_usage` | MEDIUM | 1 day |

---

## Phase 1: Core Enterprise Credibility (Weeks 1-2)

**Phase Status**: ✅ **COMPLETE** (Updated: December 2024)

All Phase 1 API routes are now production-ready with Supabase database integration (no in-memory storage).

### Feature 1: Team Workspaces (Multi-Tenancy)

**Status**: ✅ IMPLEMENTED (Production-Ready)

**Current Implementation**:
- `teams` table with owner_id, settings
- `team_members` table with role-based access (owner, admin, member)
- `team_invitations` with 7-day expiry and status tracking
- RLS policies enforcing team-level data isolation
- Real-time enabled via supabase_realtime publication
- **All API routes use Supabase** (migrated from in-memory Maps)

**API Routes** (All Production-Ready):
- `POST /api/teams` - Create team ✅
- `GET /api/teams` - List user's teams ✅
- `PUT /api/teams` - Update team settings ✅
- `DELETE /api/teams` - Delete team ✅
- `GET /api/teams/[teamId]/invitations` - List invitations ✅
- `POST /api/teams/[teamId]/invitations` - Send invitation ✅
- `DELETE /api/teams/[teamId]/invitations` - Cancel invitation ✅
- `PATCH /api/teams/[teamId]/invitations` - Accept/decline invitation ✅

**Enhancement Option**: If true organization hierarchy is needed (organizations containing multiple teams), the following schema can be added:

```sql
-- ========================================
-- ORGANIZATIONS TABLE (Optional: For org > team hierarchy)
-- ========================================
-- NOTE: Only implement if team-based tenancy is insufficient

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL CHECK (length(name) >= 3 AND length(name) <= 255),
  slug VARCHAR(100) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'professional', 'business', 'enterprise')),
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_select_policy" ON public.organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_insert_policy" ON public.organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_update_policy" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "org_delete_policy" ON public.organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Trigger
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON public.organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Real-time (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;

-- Then add organization_id to teams table:
ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
```

---

### Feature 2: Project-Based Analysis

**Status**: ✅ IMPLEMENTED

**Current Implementation**:
- `projects` table with user_id, files (JSONB), stats, last_analyzed
- `analysis_history` table tracks all runs with result (JSONB), layers, execution_time
- `analysis_jobs` table for async processing with status, progress, priority

**Existing API Routes**:
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/[projectId]/files` - Get project files
- `POST /api/analyze` - Run analysis
- `POST /api/analysis/async` - Async analysis
- `GET /api/analysis-history` - Get analysis history

**Enhancement Option**: For granular issue tracking, add:

```sql
-- ========================================
-- ANALYSIS ISSUES TABLE (Granular issue tracking)
-- ========================================
CREATE TABLE IF NOT EXISTS public.analysis_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES public.analysis_history(id) ON DELETE CASCADE NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  line_number INTEGER,
  column_number INTEGER,
  rule_id VARCHAR(100) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('error', 'warning', 'info')) DEFAULT 'warning',
  message TEXT NOT NULL,
  suggestion TEXT,
  fixed BOOLEAN DEFAULT FALSE,
  fix_applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_issues_analysis ON public.analysis_issues(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_rule ON public.analysis_issues(rule_id);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_severity ON public.analysis_issues(severity);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_fixed ON public.analysis_issues(fixed);

-- Enable RLS
ALTER TABLE public.analysis_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "analysis_issues_select_policy" ON public.analysis_issues
  FOR SELECT USING (
    analysis_id IN (
      SELECT id FROM public.analysis_history 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analysis_issues_insert_policy" ON public.analysis_issues
  FOR INSERT WITH CHECK (
    analysis_id IN (
      SELECT id FROM public.analysis_history 
      WHERE user_id = auth.uid()
    )
  );
```

**Drizzle Schema Addition** (shared/schema.ts):

```typescript
export const analysisIssues = pgTable("analysis_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").notNull(),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  columnNumber: integer("column_number"),
  ruleId: text("rule_id").notNull(),
  severity: text("severity").default("warning"),
  message: text("message").notNull(),
  suggestion: text("suggestion"),
  fixed: boolean("fixed").default(false),
  fixAppliedAt: timestamp("fix_applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  analysisIdIdx: index("idx_analysis_issues_analysis").on(table.analysisId),
  ruleIdIdx: index("idx_analysis_issues_rule").on(table.ruleId),
  severityIdx: index("idx_analysis_issues_severity").on(table.severity),
}));
```

---

### Feature 3: GitHub Integration (OAuth)

**Status**: ✅ IMPLEMENTED

**Current Implementation**:
- `integrations` table with provider, access_token, refresh_token, token_expires_at
- OAuth flow via GitHub App
- Repository listing and scanning

**Existing API Routes**:
- `GET /api/integrations/github/auth` - Start OAuth
- `GET /api/integrations/github/callback` - OAuth callback
- `GET /api/integrations/github/repositories` - List repos
- `POST /api/integrations/github/repositories/scan` - Scan repo
- `POST /api/integrations/github/repositories/analyze` - Analyze repo
- `GET /api/integrations/github/status` - Connection status
- `POST /api/integrations/github/actions` - GitHub Actions config

**Enhancement Option**: For repo-level connections:

```sql
-- ========================================
-- REPOSITORY CONNECTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.repository_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  repository_full_name VARCHAR(255) NOT NULL,
  repository_id VARCHAR(100),
  default_branch VARCHAR(100) DEFAULT 'main',
  webhook_id VARCHAR(100),
  webhook_secret TEXT,
  auto_analyze BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repo_connections_project ON public.repository_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_repo_connections_integration ON public.repository_connections(integration_id);
CREATE INDEX IF NOT EXISTS idx_repo_connections_repo_name ON public.repository_connections(repository_full_name);

-- Enable RLS
ALTER TABLE public.repository_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "repo_connections_all_policy" ON public.repository_connections
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER update_repository_connections_updated_at 
  BEFORE UPDATE ON public.repository_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Phase 2: Security & Compliance (Weeks 3-4)

**Phase Status**: ✅ **COMPLETE** (Updated: December 2024)

All Phase 2 features (Audit Logs and RBAC) are now implemented with Supabase database integration.

### Feature 4: Audit Logs

**Status**: ✅ IMPLEMENTED (Production-Ready)

**Business Requirement**: Complete traceability for SOC 2, ISO 27001, GDPR compliance.

**Implementation Complete**:
- Supabase migration: `20251207000001_audit_logs.sql`
- Drizzle schema: `shared/schema.ts` (auditLogs table)
- Audit logging utility: `lib/audit-logger.ts`
- API endpoint: `GET /api/audit-logs` with filtering support

**API Features**:
- Filter by team, action, resource type, date range
- Pagination support (limit/offset)
- Permission-based access (admins/owners only for team logs)

#### Supabase Schema

```sql
-- ========================================
-- AUDIT LOGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type VARCHAR(50) DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'api', 'webhook')),
  actor_ip_address INET,
  actor_user_agent TEXT,
  
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  resource_name VARCHAR(255),
  
  status VARCHAR(50) CHECK (status IN ('success', 'failure', 'pending')) DEFAULT 'success',
  error_message TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  changes JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_team ON public.audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Read-only for team admins/owners)
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

-- System inserts via service role (no policy needed, uses service_role key)
-- For user-triggered inserts:
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );
```

#### Events to Audit

| Category | Action | Description |
|----------|--------|-------------|
| User | `user.login` | User signed in |
| User | `user.logout` | User signed out |
| User | `user.password_changed` | Password updated |
| User | `user.mfa_enabled` | MFA activated |
| Team | `team.created` | New team created |
| Team | `team.updated` | Team settings changed |
| Team | `team.deleted` | Team deleted |
| Team | `team.member_invited` | Member invitation sent |
| Team | `team.member_added` | Member joined |
| Team | `team.member_removed` | Member removed |
| Team | `team.role_changed` | Member role updated |
| Project | `project.created` | New project |
| Project | `project.updated` | Project settings changed |
| Project | `project.deleted` | Project deleted |
| Project | `project.analyzed` | Analysis triggered |
| Project | `project.fixed` | Fixes applied |
| Integration | `integration.connected` | Integration connected |
| Integration | `integration.disconnected` | Integration disconnected |
| Security | `security.api_key_created` | API key generated |
| Security | `security.api_key_revoked` | API key revoked |
| Security | `security.permission_denied` | Unauthorized access attempt |

#### Drizzle Schema (shared/schema.ts)

```typescript
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id"),
  userId: uuid("user_id"),
  actorType: text("actor_type").default("user"),
  actorIpAddress: text("actor_ip_address"),
  actorUserAgent: text("actor_user_agent"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id"),
  resourceName: text("resource_name"),
  status: text("status").default("success"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  teamIdIdx: index("idx_audit_logs_team").on(table.teamId),
  userIdIdx: index("idx_audit_logs_user").on(table.userId),
  actionIdx: index("idx_audit_logs_action").on(table.action),
  createdAtIdx: index("idx_audit_logs_created").on(table.createdAt),
}));
```

#### API Routes (Next.js App Router)

Create new file: `app/api/audit-logs/route.ts`

```typescript
// GET /api/audit-logs?team_id=xxx&action=xxx&start_date=xxx&end_date=xxx
export async function GET(request: Request) {
  // Query audit logs with filtering
}
```

Create new file: `app/api/audit-logs/export/route.ts`

```typescript
// GET /api/audit-logs/export?format=csv|json
export async function GET(request: Request) {
  // Export filtered audit logs
}
```

---

### Feature 5: Security & Compliance Page

**Status**: ⚠️ NEEDS VERIFICATION

**Required Content**:
- Data encryption (TLS 1.3, AES-256-GCM at rest)
- Infrastructure security (Supabase/Vercel SOC 2 Type II)
- Authentication (bcrypt via Supabase, JWT, OAuth 2.0)
- GDPR compliance statement
- SOC 2 progress timeline
- `/.well-known/security.txt` file

**Implementation**: Create `app/security/page.tsx` with static content.

---

## Phase 3: Enterprise Controls (Weeks 5-6)

### Feature 6: Role-Based Access Control (RBAC)

**Status**: ✅ IMPLEMENTED (Production-Ready)

**Implementation Complete**:
- Supabase migration: `20251207000002_rbac_permissions.sql`
- Drizzle schema: `shared/schema.ts` (permissions, rolePermissions tables)
- RBAC utility: `lib/rbac.ts`
- Default permissions seeded for all roles (owner, admin, member, viewer)

**Features**:
- Granular permissions system with 21 default permissions
- Role-based permission inheritance
- Permission caching for performance
- Helper functions: `hasPermission()`, `checkTeamAccess()`, `getUserPermissions()`

**Current State**: Full RBAC with granular permissions table and role mappings.

#### Supabase Schema

```sql
-- ========================================
-- PERMISSIONS TABLE (Define all permissions)
-- ========================================
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

-- ========================================
-- ROLE PERMISSIONS TABLE (Role to permission mapping)
-- ========================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(role, permission_id)
);

-- Enable RLS (public read)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
  FOR SELECT USING (true);

-- Seed role permissions
-- Owner gets all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'owner', id FROM public.permissions ON CONFLICT DO NOTHING;

-- Admin gets most permissions (except delete team and billing update)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions 
WHERE name NOT IN ('team.delete', 'team.billing.update')
ON CONFLICT DO NOTHING;

-- Member gets view and analysis permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'member', id FROM public.permissions 
WHERE name IN (
  'team.view', 'project.view', 'project.analyze', 
  'member.view', 'integration.view', 'api_key.view'
)
ON CONFLICT DO NOTHING;
```

#### Permission Check Function

```sql
-- Function to check if user has permission in a team
CREATE OR REPLACE FUNCTION public.user_has_team_permission(
  p_user_id UUID,
  p_team_id UUID,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  has_permission BOOLEAN;
BEGIN
  -- Check if owner of team
  IF EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's role in the team
  SELECT role INTO user_role
  FROM public.team_members
  WHERE user_id = p_user_id 
    AND team_id = p_team_id;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check role_permissions table
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role = user_role AND p.name = p_permission_name
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Drizzle Schema

```typescript
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(),
  permissionId: uuid("permission_id").notNull(),
}, (table) => ({
  uniqueRolePermission: unique("unique_role_permission").on(table.role, table.permissionId),
}));
```

---

### Feature 7: Rules & Fix Packs Dashboard

**Status**: ❌ NOT IMPLEMENTED

**Business Requirement**: Allow teams to configure which rules are enabled/disabled.

#### Supabase Schema

```sql
-- ========================================
-- RULE DEFINITIONS TABLE (All available rules)
-- ========================================
CREATE TABLE IF NOT EXISTS public.rule_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  layer INTEGER NOT NULL CHECK (layer BETWEEN 1 AND 7),
  severity VARCHAR(50) DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
  auto_fixable BOOLEAN DEFAULT FALSE,
  documentation_url TEXT,
  examples JSONB DEFAULT '{}'::jsonb,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rule_definitions_category ON public.rule_definitions(category);
CREATE INDEX IF NOT EXISTS idx_rule_definitions_layer ON public.rule_definitions(layer);
CREATE INDEX IF NOT EXISTS idx_rule_definitions_severity ON public.rule_definitions(severity);

-- Enable RLS (public read)
ALTER TABLE public.rule_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rule_definitions_select_policy" ON public.rule_definitions
  FOR SELECT USING (true);

-- Trigger
CREATE TRIGGER update_rule_definitions_updated_at 
  BEFORE UPDATE ON public.rule_definitions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- TEAM RULE CONFIGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.team_rule_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.rule_definitions(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  severity_override VARCHAR(50) CHECK (severity_override IN ('error', 'warning', 'info')),
  auto_fix_enabled BOOLEAN DEFAULT TRUE,
  custom_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, rule_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_rule_configs_team ON public.team_rule_configs(team_id);

-- Enable RLS
ALTER TABLE public.team_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_rule_configs_select_policy" ON public.team_rule_configs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "team_rule_configs_modify_policy" ON public.team_rule_configs
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger
CREATE TRIGGER update_team_rule_configs_updated_at 
  BEFORE UPDATE ON public.team_rule_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PROJECT RULE CONFIGS TABLE (Override team settings)
-- ========================================
CREATE TABLE IF NOT EXISTS public.project_rule_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.rule_definitions(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  severity_override VARCHAR(50) CHECK (severity_override IN ('error', 'warning', 'info')),
  auto_fix_enabled BOOLEAN DEFAULT TRUE,
  custom_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, rule_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_rule_configs_project ON public.project_rule_configs(project_id);

-- Enable RLS
ALTER TABLE public.project_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_rule_configs_policy" ON public.project_rule_configs
  FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Trigger
CREATE TRIGGER update_project_rule_configs_updated_at 
  BEFORE UPDATE ON public.project_rule_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Phase 4: Analytics & Integration (Weeks 7-8)

### Feature 8: Usage Analytics Dashboard

**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Current State**: `usage_logs` table exists with per-action tracking. Missing aggregated views.

#### Supabase Schema (Enhancement)

```sql
-- ========================================
-- USAGE METRICS TABLE (Aggregated metrics)
-- ========================================
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('daily', 'weekly', 'monthly')),
  
  analyses_count INTEGER DEFAULT 0,
  files_analyzed INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  
  avg_analysis_time_ms INTEGER DEFAULT 0,
  total_execution_time_ms INTEGER DEFAULT 0,
  
  api_calls INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,
  
  credits_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0.0000,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, user_id, metric_date, metric_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_metrics_team ON public.usage_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user ON public.usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_date ON public.usage_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type ON public.usage_metrics(metric_type);

-- Enable RLS
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_metrics_select_policy" ON public.usage_metrics
  FOR SELECT USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger
CREATE TRIGGER update_usage_metrics_updated_at 
  BEFORE UPDATE ON public.usage_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Feature 9: CI/CD Integration Templates

**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Current State**: 
- `integration_runs` table exists for tracking runs
- API routes exist: `/api/integrations/cicd`, `/api/integrations/github/actions`

**Existing API Routes**:
- `GET/POST /api/integrations/cicd` - CI/CD config management
- `POST /api/integrations/cicd/[integrationId]/webhook` - Webhook handler
- `POST /api/integrations/github/actions` - GitHub Actions workflow generation
- `POST /api/integrations/jenkins` - Jenkins config generation
- `POST /api/integrations/gitlab` - GitLab CI config generation

---

### Feature 10: API Keys & Documentation

**Status**: ⚠️ PARTIALLY IMPLEMENTED

**Current State**: `api_keys` table exists with key_hash, permissions, last_used. Missing detailed usage tracking.

**Existing API Routes**:
- `GET/POST /api/auth/api-keys` - Manage API keys
- `GET /api/docs` - API documentation

#### Enhancement: API Key Usage Tracking

```sql
-- ========================================
-- API KEY USAGE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_body_size INTEGER,
  response_body_size INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON public.api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON public.api_key_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created ON public.api_key_usage(created_at DESC);

-- Enable RLS
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_key_usage_select_policy" ON public.api_key_usage
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

-- System can insert (service role)
CREATE POLICY "api_key_usage_insert_policy" ON public.api_key_usage
  FOR INSERT WITH CHECK (true);
```

---

## Phase 5: Polish & Launch (Weeks 9-10)

### Onboarding Flow

- [x] User settings with `onboarding_completed` flag
- [x] `onboarding_data` JSONB for tracking progress
- [ ] Welcome wizard UI component
- [ ] First project creation flow
- [ ] GitHub integration prompt

### Documentation Site

- [x] `/api/docs` endpoint exists
- [ ] OpenAPI 3.0 specification generation
- [ ] Integration guides (GitHub, GitLab, Jenkins)

### Legal Pages

- [ ] Privacy Policy at `/privacy`
- [ ] Terms of Service at `/terms`
- [ ] Cookie Policy
- [ ] DPA (Data Processing Agreement) template

### Marketing & SEO

- [ ] Landing page optimization
- [ ] Case studies section
- [ ] Testimonials

### Email Templates (via Resend)

- [ ] Welcome email
- [ ] Team invitation (partially in team invitations flow)
- [ ] Password reset
- [ ] Analysis complete notification
- [ ] Weekly digest

---

## Missing Features to Implement

### Priority 1 (HIGH - Enterprise Critical)

| Feature | Tables Required | API Routes | Estimated Effort |
|---------|-----------------|------------|------------------|
| Audit Logs | `audit_logs` | `/api/audit-logs`, `/api/audit-logs/export` | 2 days |
| RBAC System | `permissions`, `role_permissions` + function | N/A (internal) | 2 days |

### Priority 2 (MEDIUM - Enhanced Enterprise)

| Feature | Tables Required | API Routes | Estimated Effort |
|---------|-----------------|------------|------------------|
| Analysis Issues | `analysis_issues` | Extend `/api/analysis-history` | 1 day |
| Rule Configurations | `rule_definitions`, `team_rule_configs`, `project_rule_configs` | `/api/rules`, `/api/teams/[id]/rules` | 2 days |
| Usage Metrics | `usage_metrics` | Extend `/api/analytics` | 2 days |

### Priority 3 (LOW - Nice to Have)

| Feature | Tables Required | API Routes | Estimated Effort |
|---------|-----------------|------------|------------------|
| Repository Connections | `repository_connections` | Extend GitHub integration | 1 day |
| API Key Usage | `api_key_usage` | Extend `/api/auth/api-keys` | 1 day |
| Organizations Hierarchy | `organizations` | `/api/organizations` | 2 days (only if teams insufficient) |

---

## Next Steps

1. **Create Migration File**: Generate `supabase/migrations/20250810_enterprise_audit_rbac.sql`
2. **Update Drizzle Schema**: Add `auditLogs`, `permissions`, `rolePermissions` to `shared/schema.ts`
3. **Run Migration**: `npm run db:push`
4. **Build Audit Middleware**: Create `lib/audit-logger.ts` for automatic event logging
5. **Build Permission Middleware**: Create `lib/permissions.ts` for RBAC checks
6. **Create API Routes**: `/api/audit-logs/route.ts`, `/api/audit-logs/export/route.ts`

---

## Appendix: Migration File Template

Save as `supabase/migrations/20250810_enterprise_audit_rbac.sql`:

```sql
-- ========================================
-- NEUROLINT ENTERPRISE FEATURES MIGRATION
-- Audit Logs + RBAC System
-- ========================================

-- [Include audit_logs table from Feature 4]
-- [Include permissions table from Feature 6]
-- [Include role_permissions table from Feature 6]
-- [Include user_has_team_permission function from Feature 6]
```

---

This document was generated based on the enterprise roadmap requirements and accurate codebase analysis.

**Last Updated**: December 2024
**Status**: Ready for Implementation
