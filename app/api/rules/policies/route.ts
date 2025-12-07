import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from "../../../../lib/auth-middleware";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'quality' | 'performance' | 'compliance';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  autoFix: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TeamControl {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'number' | 'select';
  value: boolean | number | string;
  options?: string[];
  category: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!supabase) {
      return NextResponse.json({
        success: true,
        policyRules: [],
        teamControls: [],
        message: 'Database not configured'
      });
    }

    const policyRules: PolicyRule[] = [];

    const [rulesResult, teamConfigsResult, teamResult] = await Promise.all([
      supabase.from('rule_definitions').select('*').order('category', { ascending: true }),
      teamId 
        ? supabase.from('team_rule_configs').select('rule_id, enabled, auto_fix_enabled').eq('team_id', teamId)
        : Promise.resolve({ data: null, error: null }),
      teamId
        ? supabase.from('teams').select('settings').eq('id', teamId).single()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (rulesResult.error) {
      console.error('Error fetching rules:', rulesResult.error);
    }

    const teamConfigsMap = new Map<string, { enabled: boolean; auto_fix_enabled: boolean }>();
    if (teamConfigsResult.data) {
      for (const config of teamConfigsResult.data) {
        teamConfigsMap.set(config.rule_id, {
          enabled: config.enabled ?? true,
          auto_fix_enabled: config.auto_fix_enabled ?? true
        });
      }
    }

    if (rulesResult.data && rulesResult.data.length > 0) {
      for (const rule of rulesResult.data) {
        const teamConfig = teamConfigsMap.get(rule.id);
        const enabled = teamConfig?.enabled ?? true;
        const autoFix = teamConfig?.auto_fix_enabled ?? (rule.auto_fixable || false);

        let category: 'security' | 'quality' | 'performance' | 'compliance' = 'quality';
        const ruleCat = (rule.category || '').toLowerCase();
        if (ruleCat.includes('security')) category = 'security';
        else if (ruleCat.includes('performance')) category = 'performance';
        else if (ruleCat.includes('compliance') || ruleCat.includes('a11y') || ruleCat.includes('accessibility')) category = 'compliance';

        let severity: 'error' | 'warning' | 'info' = 'warning';
        const ruleSev = (rule.severity || '').toLowerCase();
        if (ruleSev === 'error' || ruleSev === 'critical') severity = 'error';
        else if (ruleSev === 'info') severity = 'info';

        policyRules.push({
          id: rule.id,
          name: rule.name,
          description: rule.description || '',
          category,
          severity,
          enabled,
          autoFix,
          createdAt: rule.created_at,
          updatedAt: rule.updated_at
        });
      }
    }

    if (policyRules.length === 0) {
      const defaultRules: PolicyRule[] = [
        { id: '1', name: 'Require React 18+ Patterns', description: 'Enforce modern React patterns including concurrent features and automatic batching', category: 'quality', severity: 'warning', enabled: true, autoFix: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '2', name: 'No Console Statements', description: 'Prevent console.log and other console methods in production code', category: 'quality', severity: 'error', enabled: true, autoFix: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '3', name: 'Accessibility Standards', description: 'Enforce WCAG 2.1 AA accessibility requirements for all components', category: 'compliance', severity: 'error', enabled: true, autoFix: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '4', name: 'TypeScript Strict Mode', description: 'Require strict TypeScript configuration with no implicit any', category: 'quality', severity: 'error', enabled: false, autoFix: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '5', name: 'Performance Budget', description: 'Enforce bundle size limits and lazy loading for large components', category: 'performance', severity: 'warning', enabled: true, autoFix: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '6', name: 'Security Headers', description: 'Validate proper security headers and prevent XSS vulnerabilities', category: 'security', severity: 'error', enabled: true, autoFix: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      policyRules.push(...defaultRules);
    }

    let teamControls: TeamControl[] = [];
    const settings = (teamResult.data?.settings || {}) as Record<string, unknown>;
    
    teamControls = [
      { id: '1', name: 'Auto-fix on Analysis', description: 'Automatically apply safe fixes when running code analysis', type: 'boolean', value: settings.autoFixOnAnalysis ?? true, category: 'Analysis' },
      { id: '2', name: 'Require PR Approval', description: 'Require team lead approval before merging auto-generated PRs', type: 'boolean', value: settings.requirePRApproval ?? true, category: 'Git Integration' },
      { id: '3', name: 'Maximum Issues Per PR', description: 'Limit the number of issues fixed in a single pull request', type: 'number', value: settings.maxIssuesPerPR ?? 25, category: 'Git Integration' },
      { id: '4', name: 'Default Scan Scope', description: 'Default scope for repository scans', type: 'select', value: settings.defaultScanScope ?? 'changed-files', options: ['all-files', 'changed-files', 'staged-files'], category: 'Analysis' },
      { id: '5', name: 'Notify on Critical Issues', description: 'Send notifications when critical issues are detected', type: 'boolean', value: settings.notifyOnCritical ?? true, category: 'Notifications' },
      { id: '6', name: 'Block Merge on Errors', description: 'Prevent merging when error-level issues exist', type: 'boolean', value: settings.blockMergeOnErrors ?? false, category: 'Git Integration' }
    ];

    return NextResponse.json({
      success: true,
      policyRules,
      teamControls
    });

  } catch (error) {
    console.error('Policies API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { ruleId, teamId, enabled, autoFix } = body;

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    if (teamId) {
      const { data: existing } = await supabase
        .from('team_rule_configs')
        .select('id')
        .eq('team_id', teamId)
        .eq('rule_id', ruleId)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from('team_rule_configs')
          .update({
            enabled: enabled ?? true,
            auto_fix_enabled: autoFix ?? true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating rule config:', updateError);
          return NextResponse.json({ error: 'Failed to update rule configuration' }, { status: 500 });
        }
      } else {
        const { error: insertError } = await supabase
          .from('team_rule_configs')
          .insert({
            team_id: teamId,
            rule_id: ruleId,
            enabled: enabled ?? true,
            auto_fix_enabled: autoFix ?? true
          });

        if (insertError) {
          console.error('Error inserting rule config:', insertError);
          return NextResponse.json({ error: 'Failed to create rule configuration' }, { status: 500 });
        }
      }

      const { error: auditError } = await supabase.from('audit_logs').insert({
        team_id: teamId,
        user_id: auth.user.id,
        action: enabled ? 'rule_enabled' : 'rule_disabled',
        resource_type: 'policy_rule',
        resource_id: ruleId,
        metadata: { enabled, autoFix }
      });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Policy update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
