import { getSupabaseServerClient } from "./supabase-server";

export type AuditAction = 
  | 'user.login' | 'user.logout' | 'user.password_changed' | 'user.mfa_enabled'
  | 'team.created' | 'team.updated' | 'team.deleted' 
  | 'team.member_invited' | 'team.member_added' | 'team.member_removed' | 'team.role_changed'
  | 'project.created' | 'project.updated' | 'project.deleted' | 'project.analyzed' | 'project.fixed'
  | 'integration.connected' | 'integration.disconnected'
  | 'security.api_key_created' | 'security.api_key_revoked' | 'security.permission_denied';

export type ResourceType = 'user' | 'team' | 'project' | 'integration' | 'api_key' | 'analysis' | 'invitation';

export type ActorType = 'user' | 'system' | 'api' | 'webhook';

export interface AuditLogEntry {
  teamId?: string;
  userId?: string;
  actorType?: ActorType;
  actorIpAddress?: string;
  actorUserAgent?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  status?: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, any>;
  changes?: Record<string, any>;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.warn('Audit logging skipped - Supabase not configured');
      return false;
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        team_id: entry.teamId || null,
        user_id: entry.userId || null,
        actor_type: entry.actorType || 'user',
        actor_ip_address: entry.actorIpAddress || null,
        actor_user_agent: entry.actorUserAgent || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        resource_name: entry.resourceName || null,
        status: entry.status || 'success',
        error_message: entry.errorMessage || null,
        metadata: entry.metadata || {},
        changes: entry.changes || null,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Audit logging error:', error);
    return false;
  }
}

export function extractRequestInfo(request: Request): { ipAddress: string | undefined; userAgent: string | undefined } {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    request.headers.get('x-real-ip') || 
                    undefined;
  const userAgent = request.headers.get('user-agent') || undefined;
  return { ipAddress, userAgent };
}
