import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from "../../../../lib/auth-middleware";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const teamId = searchParams.get('teamId');

    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        teamMembers: [],
        usageTrends: [],
        complianceRules: [],
        message: 'Database not configured'
      });
    }

    let teamMemberIds: string[] = [];
    const teamMembers: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      scansThisMonth: number;
      issuesFixed: number;
      lastActive: string;
      status: 'online' | 'offline' | 'away';
    }> = [];

    if (teamId) {
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, role, joined_at')
        .eq('team_id', teamId);

      if (!membersError && members && members.length > 0) {
        teamMemberIds = members.map(m => m.user_id);
        
        const [profilesResult, usageResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, full_name, updated_at')
            .in('id', teamMemberIds),
          supabase
            .from('usage_metrics')
            .select('user_id, analyses_count, issues_fixed')
            .in('user_id', teamMemberIds)
            .gte('metric_date', startDate.toISOString())
        ]);

        const profilesMap = new Map<string, { email?: string; full_name?: string; updated_at?: string }>();
        if (profilesResult.data) {
          for (const p of profilesResult.data) {
            profilesMap.set(p.id, p);
          }
        }

        const usageMap = new Map<string, { scans: number; fixed: number }>();
        if (usageResult.data) {
          for (const u of usageResult.data) {
            const existing = usageMap.get(u.user_id) || { scans: 0, fixed: 0 };
            usageMap.set(u.user_id, {
              scans: existing.scans + (u.analyses_count || 0),
              fixed: existing.fixed + (u.issues_fixed || 0)
            });
          }
        }

        for (const member of members) {
          const profile = profilesMap.get(member.user_id);
          const usage = usageMap.get(member.user_id) || { scans: 0, fixed: 0 };

          const lastActive = profile?.updated_at ? new Date(profile.updated_at) : new Date();
          const timeDiff = now.getTime() - lastActive.getTime();
          const minutesAgo = timeDiff / 60000;
          
          let status: 'online' | 'offline' | 'away' = 'offline';
          if (minutesAgo < 5) status = 'online';
          else if (minutesAgo < 30) status = 'away';

          teamMembers.push({
            id: member.user_id,
            name: profile?.full_name || profile?.email?.split('@')[0] || 'Unknown User',
            email: profile?.email || '',
            role: member.role || 'member',
            scansThisMonth: usage.scans,
            issuesFixed: usage.fixed,
            lastActive: lastActive.toISOString(),
            status
          });
        }
      }
    } else {
      teamMemberIds = [auth.user.id];
      
      const [profileResult, usageResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('email, full_name, updated_at')
          .eq('id', auth.user.id)
          .single(),
        supabase
          .from('usage_metrics')
          .select('analyses_count, issues_fixed')
          .eq('user_id', auth.user.id)
          .gte('metric_date', startDate.toISOString())
      ]);

      const scansThisMonth = usageResult.data?.reduce((sum, u) => sum + (u.analyses_count || 0), 0) || 0;
      const issuesFixed = usageResult.data?.reduce((sum, u) => sum + (u.issues_fixed || 0), 0) || 0;

      teamMembers.push({
        id: auth.user.id,
        name: profileResult.data?.full_name || profileResult.data?.email?.split('@')[0] || 'Current User',
        email: profileResult.data?.email || '',
        role: 'owner',
        scansThisMonth,
        issuesFixed,
        lastActive: new Date().toISOString(),
        status: 'online'
      });
    }

    const usageTrends: Array<{
      date: string;
      scans: number;
      issuesFound: number;
      issuesFixed: number;
    }> = [];

    const weeksToFetch = timeRange === '7d' ? 1 : timeRange === '30d' ? 4 : 12;
    
    if (teamMemberIds.length > 0) {
      const { data: allMetrics } = await supabase
        .from('usage_metrics')
        .select('metric_date, analyses_count, issues_found, issues_fixed')
        .in('user_id', teamMemberIds)
        .gte('metric_date', startDate.toISOString())
        .order('metric_date', { ascending: true });

      for (let week = 0; week < weeksToFetch; week++) {
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - (week * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 7);

        let scans = 0;
        let issuesFound = 0;
        let issuesFixed = 0;

        if (allMetrics) {
          for (const m of allMetrics) {
            const metricDate = new Date(m.metric_date);
            if (metricDate >= weekStart && metricDate < weekEnd) {
              scans += m.analyses_count || 0;
              issuesFound += m.issues_found || 0;
              issuesFixed += m.issues_fixed || 0;
            }
          }
        }

        usageTrends.unshift({
          date: `Week ${weeksToFetch - week}`,
          scans,
          issuesFound,
          issuesFixed
        });
      }
    } else {
      for (let week = 0; week < weeksToFetch; week++) {
        usageTrends.unshift({
          date: `Week ${weeksToFetch - week}`,
          scans: 0,
          issuesFound: 0,
          issuesFixed: 0
        });
      }
    }

    const complianceRules: Array<{
      id: string;
      name: string;
      category: string;
      status: 'passing' | 'warning' | 'failing';
      lastChecked: string;
      affectedFiles: number;
    }> = [];

    const [rulesResult, teamConfigsResult, analysisResult] = await Promise.all([
      supabase.from('rule_definitions').select('*').order('category', { ascending: true }),
      teamId ? supabase.from('team_rule_configs').select('rule_id, enabled, severity_override').eq('team_id', teamId) : Promise.resolve({ data: null }),
      teamMemberIds.length > 0 
        ? supabase.from('analysis_history').select('result').in('user_id', teamMemberIds).gte('created_at', startDate.toISOString()).limit(100)
        : Promise.resolve({ data: null })
    ]);

    const teamConfigsMap = new Map<string, { enabled: boolean; severity_override?: string }>();
    if (teamConfigsResult.data) {
      for (const config of teamConfigsResult.data) {
        teamConfigsMap.set(config.rule_id, config);
      }
    }

    const issueCountByRule = new Map<string, number>();
    if (analysisResult.data) {
      for (const analysis of analysisResult.data) {
        const result = analysis.result as { analysis?: { detectedIssues?: Array<{ type?: string }> } };
        if (result?.analysis?.detectedIssues) {
          for (const issue of result.analysis.detectedIssues) {
            if (issue.type) {
              issueCountByRule.set(issue.type, (issueCountByRule.get(issue.type) || 0) + 1);
            }
          }
        }
      }
    }

    if (rulesResult.data) {
      for (const rule of rulesResult.data) {
        const config = teamConfigsMap.get(rule.id);
        let status: 'passing' | 'warning' | 'failing' = 'passing';
        
        if (config && !config.enabled) {
          status = 'warning';
        }

        const affectedFiles = issueCountByRule.get(rule.id) 
          || issueCountByRule.get(rule.rule_id) 
          || issueCountByRule.get(rule.name) 
          || 0;
        
        if (affectedFiles > 10) {
          status = 'failing';
        } else if (affectedFiles > 0) {
          status = 'warning';
        }

        complianceRules.push({
          id: rule.id,
          name: rule.name,
          category: rule.category,
          status,
          lastChecked: new Date().toISOString(),
          affectedFiles
        });
      }
    }

    if (complianceRules.length === 0) {
      complianceRules.push(
        { id: '1', name: 'React 18 Compatibility', category: 'Framework', status: 'passing', lastChecked: new Date().toISOString(), affectedFiles: 0 },
        { id: '2', name: 'Accessibility Standards', category: 'A11y', status: 'passing', lastChecked: new Date().toISOString(), affectedFiles: 0 },
        { id: '3', name: 'Security Best Practices', category: 'Security', status: 'passing', lastChecked: new Date().toISOString(), affectedFiles: 0 },
        { id: '4', name: 'Performance Patterns', category: 'Performance', status: 'passing', lastChecked: new Date().toISOString(), affectedFiles: 0 },
        { id: '5', name: 'TypeScript Strict Mode', category: 'Type Safety', status: 'passing', lastChecked: new Date().toISOString(), affectedFiles: 0 }
      );
    }

    return NextResponse.json({
      success: true,
      teamMembers,
      usageTrends,
      complianceRules,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    });

  } catch (error) {
    console.error('Enterprise analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
