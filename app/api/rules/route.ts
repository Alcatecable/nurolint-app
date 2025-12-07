import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { rateLimiter, getTierRateLimits } from "@/lib/rate-limiter";

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

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const clientIp = getClientIp(request);
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

    const rateLimitConfig = getTierRateLimits(tier);
    const rateLimitResult = user
      ? rateLimiter.checkUserRateLimit(user.id, "rules.list", tier, rateLimitConfig)
      : rateLimiter.checkIpRateLimit(clientIp, "rules.list", rateLimitConfig);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
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
      );
    }

    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const layer = url.searchParams.get("layer");
    const severity = url.searchParams.get("severity");
    const isPremium = url.searchParams.get("is_premium");

    let query = supabase
      .from("rule_definitions")
      .select("*")
      .order("layer", { ascending: true })
      .order("category", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }
    if (layer) {
      const layerNum = parseInt(layer);
      if (isNaN(layerNum) || layerNum < 1 || layerNum > 7) {
        return NextResponse.json(
          { error: "Invalid layer - must be a number between 1 and 7" },
          { status: 400 }
        );
      }
      query = query.eq("layer", layerNum);
    }
    if (severity) {
      if (!["error", "warning", "info"].includes(severity)) {
        return NextResponse.json(
          { error: "Invalid severity - must be error, warning, or info" },
          { status: 400 }
        );
      }
      query = query.eq("severity", severity);
    }
    if (isPremium !== null && isPremium !== undefined) {
      query = query.eq("is_premium", isPremium === "true");
    }

    const { data: rules, error } = await query;

    if (error) {
      console.error("Error fetching rules:", error);
      return NextResponse.json(
        { error: "Failed to fetch rules" },
        { status: 500 }
      );
    }

    const grouped = rules?.reduce((acc: Record<string, any[]>, rule: any) => {
      const key = `layer_${rule.layer}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(rule);
      return acc;
    }, {});

    const response = NextResponse.json({
      rules,
      grouped,
      total: rules?.length || 0,
      categories: [...new Set(rules?.map((r: any) => r.category) || [])],
      layers: [...new Set(rules?.map((r: any) => r.layer) || [])].sort((a, b) => a - b),
    });

    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime));

    return response;
  } catch (error) {
    console.error("Rules fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
