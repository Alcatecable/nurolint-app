-- ========================================
-- NEUROLINT ENTERPRISE FEATURES MIGRATION
-- Phase 4 - Feature 8: Usage Analytics Dashboard
-- ========================================

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

CREATE INDEX IF NOT EXISTS idx_usage_metrics_team ON public.usage_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user ON public.usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_date ON public.usage_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type ON public.usage_metrics(metric_type);

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_metrics_select_policy" ON public.usage_metrics
  FOR SELECT USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "usage_metrics_insert_policy" ON public.usage_metrics
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_usage_metrics_updated_at 
  BEFORE UPDATE ON public.usage_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON public.api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON public.api_key_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created ON public.api_key_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_status ON public.api_key_usage(status_code);

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_key_usage_select_policy" ON public.api_key_usage
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );

CREATE POLICY "api_key_usage_insert_policy" ON public.api_key_usage
  FOR INSERT WITH CHECK (true);
