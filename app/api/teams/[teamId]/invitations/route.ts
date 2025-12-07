import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { logAuditEvent, extractRequestInfo } from "../../../../../lib/audit-logger";

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

let supabase: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('Supabase configuration missing. Team Invitations API will not function properly.');
}

const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const getRolePermissions = (role: string): string[] => {
  switch (role) {
    case "owner":
      return ["*"];
    case "admin":
      return [
        "projects.*",
        "members.*",
        "settings.read",
        "settings.write",
        "analytics.*",
      ];
    case "member":
      return ["projects.read", "projects.write", "analytics.read"];
    case "viewer":
      return ["projects.read", "analytics.read"];
    default:
      return ["projects.read"];
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId) || !uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
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
        { status: 403 },
      );
    }

    const { data: teamInvitations, error: invitationsError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({
        invitations: [],
        total: 0
      });
    }

    return NextResponse.json({
      invitations: teamInvitations || [],
      total: teamInvitations?.length || 0,
    });
  } catch (error) {
    console.error("Team invitations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const { teamId } = params;
    const body = await request.json();
    const { email, role = "member", userId } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId) || !uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*, settings')
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

    if (memberError || !userMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const canInvite =
      userMember.role === "owner" ||
      userMember.role === "admin" ||
      (team.settings?.allowMemberInvites && userMember.role === "member");

    if (!canInvite) {
      return NextResponse.json(
        { error: "Insufficient permissions to invite members" },
        { status: 403 },
      );
    }

    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 },
      );
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitationData = {
      team_id: teamId,
      email,
      role,
      invited_by: userId,
      expires_at: expiresAt,
      status: "pending",
      token,
    };

    const { data: invitation, error: insertError } = await supabase
      .from('team_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return NextResponse.json(
        { error: "Failed to send invitation" },
        { status: 500 },
      );
    }

    console.log(`Invitation sent to ${email} for team ${team.name}`);
    console.log(`Invitation link: /invite/${token}`);

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId,
      actorType: 'user',
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: 'team.member_invited',
      resourceType: 'invitation',
      resourceId: invitation.id,
      resourceName: email,
      status: 'success',
      metadata: { role, email },
    });

    return NextResponse.json(
      {
        invitation: {
          ...invitation,
          inviteLink: `/invite/${token}`,
        },
        message: "Invitation sent successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Team invitations POST error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("inviteId");
    const userId = searchParams.get("userId");

    if (!inviteId || !userId) {
      return NextResponse.json(
        { error: "Invitation ID and user ID are required" },
        { status: 400 },
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId) || !uuidRegex.test(userId) || !uuidRegex.test(inviteId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('id, team_id')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invitation || invitation.team_id !== teamId) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
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
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', inviteId);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json(
        { error: "Failed to cancel invitation" },
        { status: 500 },
      );
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId,
      actorType: 'user',
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: 'team.invitation_cancelled',
      resourceType: 'invitation',
      resourceId: inviteId,
      status: 'success',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team invitations DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service unavailable - configuration missing' },
        { status: 503 }
      );
    }

    const { teamId } = params;
    const body = await request.json();
    const { inviteId, action, userId } = body;

    if (!inviteId || !action || !userId) {
      return NextResponse.json(
        { error: "Invitation ID, action, and user ID are required" },
        { status: 400 },
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId) || !uuidRegex.test(userId) || !uuidRegex.test(inviteId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invitation || invitation.team_id !== teamId) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is no longer pending" },
        { status: 400 },
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('team_invitations')
        .update({ status: 'expired' })
        .eq('id', inviteId);

      const { ipAddress: expiredIp, userAgent: expiredUa } = extractRequestInfo(request);
      await logAuditEvent({
        teamId,
        userId,
        actorType: 'user',
        actorIpAddress: expiredIp,
        actorUserAgent: expiredUa,
        action: 'team.invitation_expired',
        resourceType: 'invitation',
        resourceId: inviteId,
        status: 'failure',
        errorMessage: 'Invitation has expired',
      });

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 },
      );
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);

    if (action === "accept") {
      const memberData = {
        team_id: teamId,
        user_id: userId,
        role: invitation.role,
        permissions: getRolePermissions(invitation.role),
      };

      const { error: memberError } = await supabase
        .from('team_members')
        .insert(memberData);

      if (memberError) {
        console.error('Error adding team member:', memberError);
        return NextResponse.json(
          { error: "Failed to join team" },
          { status: 500 },
        );
      }

      await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      await logAuditEvent({
        teamId,
        userId,
        actorType: 'user',
        actorIpAddress: ipAddress,
        actorUserAgent: userAgent,
        action: 'team.member_added',
        resourceType: 'team',
        resourceId: teamId,
        status: 'success',
        metadata: { role: invitation.role, invitationId: inviteId },
      });

      return NextResponse.json({
        invitation: { ...invitation, status: 'accepted' },
        message: "Invitation accepted",
      });
    } else {
      await supabase
        .from('team_invitations')
        .update({ status: 'declined' })
        .eq('id', inviteId);

      await logAuditEvent({
        teamId,
        userId,
        actorType: 'user',
        actorIpAddress: ipAddress,
        actorUserAgent: userAgent,
        action: 'team.invitation_declined',
        resourceType: 'invitation',
        resourceId: inviteId,
        status: 'success',
      });

      return NextResponse.json({
        invitation: { ...invitation, status: 'declined' },
        message: "Invitation declined",
      });
    }
  } catch (error) {
    console.error("Team invitations PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to process invitation" },
      { status: 500 },
    );
  }
}
