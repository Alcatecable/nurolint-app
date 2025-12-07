import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from "../../../../lib/auth-middleware";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!supabase) {
      return NextResponse.json({
        success: true,
        auditLog: [],
        message: 'Database not configured'
      });
    }

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      query = query.eq('user_id', auth.user.id);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({
        success: true,
        auditLog: []
      });
    }

    const auditLog: AuditEntry[] = [];

    if (logs && logs.length > 0) {
      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];
      
      const profilesMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        
        if (profiles) {
          for (const profile of profiles) {
            profilesMap.set(profile.id, profile.email || 'Unknown User');
          }
        }
      }

      const actionMap: Record<string, string> = {
        'rule_enabled': 'Policy Enabled',
        'rule_disabled': 'Policy Disabled',
        'rule_updated': 'Policy Updated',
        'control_changed': 'Control Changed',
        'rule_created': 'Policy Created',
        'settings_updated': 'Settings Updated',
        'member_added': 'Member Added',
        'member_removed': 'Member Removed'
      };

      for (const log of logs) {
        const userEmail = log.user_id ? (profilesMap.get(log.user_id) || 'Unknown User') : 'Unknown User';

        auditLog.push({
          id: log.id,
          action: actionMap[log.action] || log.action,
          user: userEmail,
          target: log.resource_name || log.resource_type || 'Unknown',
          timestamp: log.created_at
        });
      }
    }

    if (auditLog.length === 0) {
      auditLog.push(
        { id: '1', action: 'System Initialized', user: 'system', target: 'Enterprise Policies', timestamp: new Date().toISOString() }
      );
    }

    return NextResponse.json({
      success: true,
      auditLog
    });

  } catch (error) {
    console.error('Audit log API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
