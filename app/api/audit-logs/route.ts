import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const teamId = searchParams.get("teamId");
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({
        auditLogs: [],
        total: 0
      });
    }

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (teamId) {
      if (!uuidRegex.test(teamId)) {
        return NextResponse.json({ error: "Invalid team ID format" }, { status: 400 });
      }

      const { data: userMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (!userMember || (userMember.role !== 'owner' && userMember.role !== 'admin')) {
        return NextResponse.json(
          { error: "Insufficient permissions to view audit logs" },
          { status: 403 }
        );
      }

      query = query.eq('team_id', teamId);
    } else {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: auditLogs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({
        auditLogs: [],
        total: 0
      });
    }

    return NextResponse.json({
      auditLogs: auditLogs || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error("Audit logs GET error:", error);
    return NextResponse.json({
      auditLogs: [],
      total: 0
    });
  }
}
