import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logAuditEvent, extractRequestInfo } from "../../../lib/audit-logger";

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

let supabase: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('Supabase configuration missing. Teams API will not function properly.');
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const teamId = searchParams.get("teamId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({
        teams: [],
        total: 0
      });
    }

    if (teamId) {
      if (!uuidRegex.test(teamId)) {
        return NextResponse.json({ error: "Invalid team ID format" }, { status: 400 });
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }

      const { data: userMember, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (memberError || !userMember) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('team_id', teamId);

      return NextResponse.json({
        team,
        members: members || [],
        projects: projects || [],
        userRole: userMember.role,
        userPermissions: userMember.permissions || [],
      });
    }

    const { data: memberRecords, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId);

    if (memberError || !memberRecords || memberRecords.length === 0) {
      return NextResponse.json({
        teams: [],
        total: 0
      });
    }

    const teamIds = memberRecords.map((m: any) => m.team_id);
    const roleMap = new Map(memberRecords.map((m: any) => [m.team_id, m.role]));

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({
        teams: [],
        total: 0
      });
    }

    const { data: memberCounts } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds);

    const countMap = new Map<string, number>();
    if (memberCounts) {
      for (const m of memberCounts) {
        countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
      }
    }

    const userTeams = (teams || []).map((team: any) => ({
      ...team,
      userRole: roleMap.get(team.id),
      memberCount: countMap.get(team.id) || 1,
    }));

    return NextResponse.json({
      teams: userTeams,
      total: userTeams.length,
    });

  } catch (error) {
    console.error("Teams GET error:", error);
    return NextResponse.json({
      teams: [],
      total: 0
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      name,
      description = "",
      plan = "free",
      userId,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const teamData = {
      name,
      description,
      owner_id: userId,
      plan,
      settings: {
        allowMemberInvites: true,
        requireApproval: false,
        defaultRole: "member",
      },
    };

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert(teamData)
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }

    const memberData = {
      team_id: team.id,
      user_id: userId,
      role: "owner",
      permissions: ["*"],
    };

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert(memberData)
      .select()
      .single();

    if (memberError) {
      console.error('Error adding owner as member:', memberError);
      await supabase.from('teams').delete().eq('id', team.id);
      return NextResponse.json(
        { error: "Failed to create team member" },
        { status: 500 }
      );
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId: team.id,
      userId,
      actorType: 'user',
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: 'team.created',
      resourceType: 'team',
      resourceId: team.id,
      resourceName: team.name,
      status: 'success',
      metadata: { plan },
    });

    return NextResponse.json(
      {
        team,
        member,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Teams POST error:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { teamId, updates, userId } = body;

    if (!teamId || !userId) {
      return NextResponse.json(
        { error: "Team ID and user ID are required" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId) || !uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { data: userMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (memberError || !userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.owner_id;
    delete safeUpdates.created_at;
    safeUpdates.updated_at = new Date().toISOString();

    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update(safeUpdates)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json(
        { error: "Failed to update team" },
        { status: 500 }
      );
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId,
      actorType: 'user',
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: 'team.updated',
      resourceType: 'team',
      resourceId: teamId,
      resourceName: updatedTeam.name,
      status: 'success',
      changes: safeUpdates,
    });

    return NextResponse.json({ team: updatedTeam });

  } catch (error) {
    console.error("Teams PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");

    if (!teamId || !userId) {
      return NextResponse.json(
        { error: "Team ID and user ID are required" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId) || !uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.owner_id !== userId) {
      return NextResponse.json(
        { error: "Only team owner can delete the team" },
        { status: 403 }
      );
    }

    await supabase
      .from('team_invitations')
      .delete()
      .eq('team_id', teamId);

    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId);

    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete team" },
        { status: 500 }
      );
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId,
      actorType: 'user',
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: 'team.deleted',
      resourceType: 'team',
      resourceId: teamId,
      status: 'success',
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Teams DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
