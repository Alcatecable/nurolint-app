import { getSupabaseServerClient } from "./supabase-server";

const permissionCache = new Map<string, string[]>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getRolePermissions(role: string): Promise<string[]> {
  const cacheKey = `role:${role}`;
  const cached = permissionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return getDefaultPermissions(role);
  }

  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissions(name)')
      .eq('role', role);

    if (error || !data) {
      return getDefaultPermissions(role);
    }

    const permissions = data.map((rp: any) => rp.permissions?.name).filter(Boolean);
    
    permissionCache.set(cacheKey, permissions);
    setTimeout(() => permissionCache.delete(cacheKey), CACHE_TTL);
    
    return permissions;
  } catch {
    return getDefaultPermissions(role);
  }
}

export async function getUserPermissions(userId: string, teamId: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data: member, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error || !member) {
      return [];
    }

    return getRolePermissions(member.role);
  } catch {
    return [];
  }
}

export async function hasPermission(
  userId: string, 
  teamId: string, 
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, teamId);
  
  if (permissions.includes('*')) {
    return true;
  }

  if (permissions.includes(permission)) {
    return true;
  }

  const [category] = permission.split('.');
  if (permissions.includes(`${category}.*`)) {
    return true;
  }

  return false;
}

export async function checkTeamAccess(
  userId: string,
  teamId: string,
  requiredPermission?: string
): Promise<{ hasAccess: boolean; role?: string; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { hasAccess: false, error: 'Database not configured' };
  }

  try {
    const { data: member, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error || !member) {
      return { hasAccess: false, error: 'Not a team member' };
    }

    if (!requiredPermission) {
      return { hasAccess: true, role: member.role };
    }

    const hasAccess = await hasPermission(userId, teamId, requiredPermission);
    return { hasAccess, role: member.role };
  } catch {
    return { hasAccess: false, error: 'Failed to check access' };
  }
}

function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'owner':
      return ['*'];
    case 'admin':
      return [
        'team.view', 'team.update', 'team.billing.view',
        'project.create', 'project.view', 'project.update', 'project.delete',
        'project.analyze', 'project.fix',
        'member.view', 'member.invite', 'member.remove', 'member.role.update',
        'integration.view', 'integration.manage',
        'api_key.view', 'api_key.create', 'api_key.revoke',
        'audit.view'
      ];
    case 'member':
      return [
        'team.view',
        'project.create', 'project.view', 'project.update',
        'project.analyze', 'project.fix',
        'member.view',
        'integration.view'
      ];
    case 'viewer':
      return ['team.view', 'project.view', 'member.view', 'integration.view'];
    default:
      return [];
  }
}

export function clearPermissionCache(): void {
  permissionCache.clear();
}
