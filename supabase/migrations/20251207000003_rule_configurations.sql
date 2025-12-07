-- ========================================
-- NEUROLINT ENTERPRISE FEATURES MIGRATION
-- Feature 7: Rules & Fix Packs Dashboard
-- ========================================

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

CREATE INDEX IF NOT EXISTS idx_rule_definitions_category ON public.rule_definitions(category);
CREATE INDEX IF NOT EXISTS idx_rule_definitions_layer ON public.rule_definitions(layer);
CREATE INDEX IF NOT EXISTS idx_rule_definitions_severity ON public.rule_definitions(severity);
CREATE INDEX IF NOT EXISTS idx_rule_definitions_rule_id ON public.rule_definitions(rule_id);

ALTER TABLE public.rule_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rule_definitions_select_policy" ON public.rule_definitions
  FOR SELECT USING (true);

-- Trigger for updated_at
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

CREATE INDEX IF NOT EXISTS idx_team_rule_configs_team ON public.team_rule_configs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_rule_configs_rule ON public.team_rule_configs(rule_id);

ALTER TABLE public.team_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_rule_configs_select_policy" ON public.team_rule_configs
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    ) OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "team_rule_configs_insert_policy" ON public.team_rule_configs
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "team_rule_configs_update_policy" ON public.team_rule_configs
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "team_rule_configs_delete_policy" ON public.team_rule_configs
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
  );

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

CREATE INDEX IF NOT EXISTS idx_project_rule_configs_project ON public.project_rule_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rule_configs_rule ON public.project_rule_configs(rule_id);

ALTER TABLE public.project_rule_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_rule_configs_select_policy" ON public.project_rule_configs
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "project_rule_configs_insert_policy" ON public.project_rule_configs
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "project_rule_configs_update_policy" ON public.project_rule_configs
  FOR UPDATE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "project_rule_configs_delete_policy" ON public.project_rule_configs
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE TRIGGER update_project_rule_configs_updated_at 
  BEFORE UPDATE ON public.project_rule_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SEED DEFAULT RULE DEFINITIONS (NeuroLint 7-Layer Rules)
-- ========================================
INSERT INTO public.rule_definitions (rule_id, name, description, category, layer, severity, auto_fixable, is_premium) VALUES
  -- Layer 1: TypeScript Strict Mode
  ('ts-strict-null-checks', 'Strict Null Checks', 'Enforce strict null checks in TypeScript code', 'typescript', 1, 'error', true, false),
  ('ts-no-implicit-any', 'No Implicit Any', 'Disallow implicit any types', 'typescript', 1, 'warning', true, false),
  ('ts-strict-property-init', 'Strict Property Initialization', 'Ensure class properties are initialized', 'typescript', 1, 'warning', true, false),
  
  -- Layer 2: React Best Practices
  ('react-hooks-rules', 'Hooks Rules', 'Enforce Rules of Hooks', 'react', 2, 'error', false, false),
  ('react-key-prop', 'Key Prop Required', 'Ensure key prop in lists', 'react', 2, 'error', true, false),
  ('react-no-array-index-key', 'No Array Index Key', 'Avoid using array index as key', 'react', 2, 'warning', true, false),
  ('react-memo-usage', 'Memo Usage', 'Suggest React.memo for performance', 'react', 2, 'info', true, true),
  
  -- Layer 3: Performance Optimization
  ('perf-usememo', 'useMemo Optimization', 'Suggest useMemo for expensive computations', 'performance', 3, 'info', true, true),
  ('perf-usecallback', 'useCallback Optimization', 'Suggest useCallback for callback stability', 'performance', 3, 'info', true, true),
  ('perf-lazy-loading', 'Lazy Loading', 'Suggest lazy loading for components', 'performance', 3, 'info', true, true),
  
  -- Layer 4: Accessibility
  ('a11y-alt-text', 'Alt Text Required', 'Require alt text for images', 'accessibility', 4, 'error', true, false),
  ('a11y-aria-roles', 'ARIA Roles', 'Validate ARIA role usage', 'accessibility', 4, 'warning', true, false),
  ('a11y-keyboard-navigation', 'Keyboard Navigation', 'Ensure keyboard accessibility', 'accessibility', 4, 'warning', false, false),
  
  -- Layer 5: Code Quality
  ('quality-no-console', 'No Console', 'Remove console.log statements', 'quality', 5, 'warning', true, false),
  ('quality-no-debugger', 'No Debugger', 'Remove debugger statements', 'quality', 5, 'error', true, false),
  ('quality-naming-convention', 'Naming Convention', 'Enforce naming conventions', 'quality', 5, 'warning', true, false),
  
  -- Layer 6: Security
  ('security-no-eval', 'No Eval', 'Disallow eval() usage', 'security', 6, 'error', false, false),
  ('security-xss-prevention', 'XSS Prevention', 'Prevent XSS vulnerabilities', 'security', 6, 'error', false, true),
  ('security-sensitive-data', 'Sensitive Data Exposure', 'Detect hardcoded secrets', 'security', 6, 'error', true, true),
  
  -- Layer 7: Next.js Specific
  ('nextjs-image-optimization', 'Image Optimization', 'Use next/image for images', 'nextjs', 7, 'warning', true, false),
  ('nextjs-link-usage', 'Link Usage', 'Use next/link for navigation', 'nextjs', 7, 'warning', true, false),
  ('nextjs-metadata', 'Metadata', 'Ensure proper metadata configuration', 'nextjs', 7, 'info', true, false),
  ('nextjs-server-components', 'Server Components', 'Optimize server/client component usage', 'nextjs', 7, 'info', true, true)
ON CONFLICT (rule_id) DO NOTHING;
