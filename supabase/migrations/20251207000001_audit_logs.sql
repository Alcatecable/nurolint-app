-- ========================================
-- AUDIT LOGS TABLE
-- Phase 2: Security & Compliance
-- ========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID,
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
    ) OR
    user_id = auth.uid()
  );

-- System inserts via service role (uses service_role key)
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
