import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
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
      query = query.eq("layer", parseInt(layer));
    }
    if (severity) {
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

    return NextResponse.json({
      rules,
      grouped,
      total: rules?.length || 0,
      categories: [...new Set(rules?.map((r: any) => r.category) || [])],
      layers: [...new Set(rules?.map((r: any) => r.layer) || [])].sort((a, b) => a - b),
    });
  } catch (error) {
    console.error("Rules fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
