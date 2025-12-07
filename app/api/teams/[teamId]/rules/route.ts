import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasPermission, checkTeamAccess } from "@/lib/rbac";
import { logAuditEvent, extractRequestInfo } from "@/lib/audit-logger";
import { rateLimiter, getTierRateLimits } from "@/lib/rate-limiter";
import { validateCustomConfig, validateBulkRuleUpdate } from "@/lib/rule-config-validator";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SEVERITIES = ["error", "warning", "info"];

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

async function checkRateLimit(
  request: NextRequest,
  supabase: any,
  action: string
): Promise<{ allowed: boolean; response?: NextResponse; tier: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  let tier = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    tier = profile?.plan || "free";
  }

  const clientIp = getClientIp(request);
  const rateLimitConfig = getTierRateLimits(tier);
  const rateLimitResult = user
    ? rateLimiter.checkUserRateLimit(user.id, action, tier, rateLimitConfig)
    : rateLimiter.checkIpRateLimit(clientIp, action, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      tier,
      response: NextResponse.json(
        { 
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          window: rateLimitResult.window
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.resetTime),
          }
        }
      ),
    };
  }

  return { allowed: true, tier };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!uuidRegex.test(teamId)) {
      return NextResponse.json({ error: "Invalid team ID format" }, { status: 400 });
    }

    const rateLimitCheck = await checkRateLimit(request, supabase, "team.rules.list");
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await checkTeamAccess(user.id, teamId, "team.view");
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: access.error || "Access denied" },
        { status: 403 }
      );
    }

    const { data: allRules, error: rulesError } = await supabase
      .from("rule_definitions")
      .select("*")
      .order("layer", { ascending: true });

    if (rulesError) {
      return NextResponse.json(
        { error: "Failed to fetch rules" },
        { status: 500 }
      );
    }

    const { data: teamConfigs, error: configsError } = await supabase
      .from("team_rule_configs")
      .select("*")
      .eq("team_id", teamId);

    if (configsError) {
      return NextResponse.json(
        { error: "Failed to fetch team configurations" },
        { status: 500 }
      );
    }

    const configMap = new Map(
      (teamConfigs || []).map((c: any) => [c.rule_id, c])
    );

    const rulesWithConfig = (allRules || []).map((rule: any) => {
      const config = configMap.get(rule.id);
      return {
        ...rule,
        teamConfig: config || {
          enabled: true,
          severity_override: null,
          auto_fix_enabled: true,
          custom_config: {},
        },
        hasCustomConfig: !!config,
      };
    });

    return NextResponse.json({
      teamId,
      rules: rulesWithConfig,
      total: rulesWithConfig.length,
      customized: teamConfigs?.length || 0,
    });
  } catch (error) {
    console.error("Team rules fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!uuidRegex.test(teamId)) {
      return NextResponse.json({ error: "Invalid team ID format" }, { status: 400 });
    }

    const rateLimitCheck = await checkRateLimit(request, supabase, "team.rules.update");
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasUpdatePermission = await hasPermission(user.id, teamId, "team.update");
    if (!hasUpdatePermission) {
      const { ipAddress, userAgent } = extractRequestInfo(request);
      await logAuditEvent({
        teamId,
        userId: user.id,
        actorIpAddress: ipAddress,
        actorUserAgent: userAgent,
        action: "security.permission_denied",
        resourceType: "team",
        resourceId: teamId,
        status: "failure",
        errorMessage: "Insufficient permissions to update team rules",
      });
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ruleId, enabled, severityOverride, autoFixEnabled, customConfig } = body;

    if (!ruleId) {
      return NextResponse.json(
        { error: "ruleId is required" },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(ruleId)) {
      return NextResponse.json(
        { error: "Invalid ruleId format - must be a valid UUID" },
        { status: 400 }
      );
    }

    if (severityOverride !== undefined && severityOverride !== null) {
      if (!VALID_SEVERITIES.includes(severityOverride)) {
        return NextResponse.json(
          { error: `Invalid severityOverride - must be one of: ${VALID_SEVERITIES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    if (autoFixEnabled !== undefined && typeof autoFixEnabled !== "boolean") {
      return NextResponse.json(
        { error: "autoFixEnabled must be a boolean" },
        { status: 400 }
      );
    }

    if (customConfig !== undefined) {
      const configValidation = validateCustomConfig(customConfig);
      if (!configValidation.valid) {
        return NextResponse.json(
          { error: "Invalid customConfig", details: configValidation.errors },
          { status: 400 }
        );
      }
    }

    const { data: ruleExists, error: ruleCheckError } = await supabase
      .from("rule_definitions")
      .select("id")
      .eq("id", ruleId)
      .single();

    if (ruleCheckError || !ruleExists) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    const { data: existingConfig } = await supabase
      .from("team_rule_configs")
      .select("id")
      .eq("team_id", teamId)
      .eq("rule_id", ruleId)
      .single();

    let result;
    if (existingConfig) {
      const { data, error } = await supabase
        .from("team_rule_configs")
        .update({
          enabled: enabled !== undefined ? enabled : true,
          severity_override: severityOverride || null,
          auto_fix_enabled: autoFixEnabled !== undefined ? autoFixEnabled : true,
          custom_config: customConfig || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConfig.id)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json(
          { error: "Failed to update rule configuration" },
          { status: 500 }
        );
      }
      result = data;
    } else {
      const { data, error } = await supabase
        .from("team_rule_configs")
        .insert({
          team_id: teamId,
          rule_id: ruleId,
          enabled: enabled !== undefined ? enabled : true,
          severity_override: severityOverride || null,
          auto_fix_enabled: autoFixEnabled !== undefined ? autoFixEnabled : true,
          custom_config: customConfig || {},
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create rule configuration" },
          { status: 500 }
        );
      }
      result = data;
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId: user.id,
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: "team.updated",
      resourceType: "team",
      resourceId: teamId,
      resourceName: `Rule config: ${ruleId}`,
      status: "success",
      metadata: { ruleId, enabled, severityOverride, autoFixEnabled },
    });

    return NextResponse.json({
      success: true,
      config: result,
    });
  } catch (error) {
    console.error("Team rule update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!uuidRegex.test(teamId)) {
      return NextResponse.json({ error: "Invalid team ID format" }, { status: 400 });
    }

    const rateLimitCheck = await checkRateLimit(request, supabase, "team.rules.bulk");
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasUpdatePermission = await hasPermission(user.id, teamId, "team.update");
    if (!hasUpdatePermission) {
      const { ipAddress, userAgent } = extractRequestInfo(request);
      await logAuditEvent({
        teamId,
        userId: user.id,
        actorIpAddress: ipAddress,
        actorUserAgent: userAgent,
        action: "security.permission_denied",
        resourceType: "team",
        resourceId: teamId,
        status: "failure",
        errorMessage: "Insufficient permissions to bulk update team rules",
      });
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rules } = body;

    const validation = validateBulkRuleUpdate(rules);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validation.errors,
          invalidIndices: validation.invalidIndices
        },
        { status: 400 }
      );
    }

    const ruleIds = validation.validItems.map(item => item.ruleId);
    const { data: existingRules, error: rulesCheckError } = await supabase
      .from("rule_definitions")
      .select("id")
      .in("id", ruleIds);

    if (rulesCheckError) {
      return NextResponse.json(
        { error: "Failed to verify rules" },
        { status: 500 }
      );
    }

    const existingRuleIds = new Set((existingRules || []).map((r: any) => r.id));
    const missingRules = ruleIds.filter(id => !existingRuleIds.has(id));
    if (missingRules.length > 0) {
      return NextResponse.json(
        { error: "Some rules not found", missingRuleIds: missingRules },
        { status: 404 }
      );
    }

    const upsertData = validation.validItems.map(item => ({
      team_id: teamId,
      rule_id: item.ruleId,
      enabled: item.enabled !== undefined ? item.enabled : true,
      severity_override: item.severityOverride || null,
      auto_fix_enabled: item.autoFixEnabled !== undefined ? item.autoFixEnabled : true,
      custom_config: item.customConfig || {},
      updated_at: new Date().toISOString(),
    }));

    const { data: upsertResult, error: upsertError } = await supabase
      .from("team_rule_configs")
      .upsert(upsertData, { 
        onConflict: "team_id,rule_id",
        ignoreDuplicates: false 
      })
      .select();

    const results: { ruleId: string; success: boolean; error?: string }[] = [];
    
    if (upsertError) {
      validation.validItems.forEach(item => {
        results.push({ ruleId: item.ruleId, success: false, error: "Upsert failed" });
      });
    } else {
      validation.validItems.forEach(item => {
        results.push({ ruleId: item.ruleId, success: true });
      });
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId: user.id,
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: "team.updated",
      resourceType: "team",
      resourceId: teamId,
      resourceName: `Bulk rule config update: ${validation.validItems.length} rules`,
      status: errorCount === 0 ? "success" : "failure",
      metadata: { 
        totalRules: validation.validItems.length,
        successCount,
        errorCount
      },
    });

    return NextResponse.json({
      success: errorCount === 0,
      totalProcessed: validation.validItems.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Bulk team rule update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    if (!uuidRegex.test(teamId)) {
      return NextResponse.json({ error: "Invalid team ID format" }, { status: 400 });
    }

    const rateLimitCheck = await checkRateLimit(request, supabase, "team.rules.delete");
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasUpdatePermission = await hasPermission(user.id, teamId, "team.update");
    if (!hasUpdatePermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const ruleId = url.searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json(
        { error: "ruleId query parameter is required" },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(ruleId)) {
      return NextResponse.json(
        { error: "Invalid ruleId format" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("team_rule_configs")
      .delete()
      .eq("team_id", teamId)
      .eq("rule_id", ruleId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete rule configuration" },
        { status: 500 }
      );
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAuditEvent({
      teamId,
      userId: user.id,
      actorIpAddress: ipAddress,
      actorUserAgent: userAgent,
      action: "team.updated",
      resourceType: "team",
      resourceId: teamId,
      resourceName: `Rule config removed: ${ruleId}`,
      status: "success",
      metadata: { ruleId, action: "reset_to_default" },
    });

    return NextResponse.json({
      success: true,
      message: "Rule configuration reset to default",
    });
  } catch (error) {
    console.error("Team rule delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
