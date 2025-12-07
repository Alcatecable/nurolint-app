import { getSupabaseServerClient } from "./supabase-server";

export interface UsageMetricData {
  teamId?: string;
  userId: string;
  analysesCount?: number;
  filesAnalyzed?: number;
  issuesFound?: number;
  issuesFixed?: number;
  executionTimeMs?: number;
}

export async function recordUsageMetric(data: UsageMetricData): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing, error: fetchError } = await supabase
      .from("usage_metrics")
      .select("*")
      .eq("user_id", data.userId)
      .eq("metric_date", today.toISOString().split("T")[0])
      .eq("metric_type", "daily")
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching existing metric:", fetchError);
      return false;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("usage_metrics")
        .update({
          analyses_count: (existing.analyses_count || 0) + (data.analysesCount || 0),
          files_analyzed: (existing.files_analyzed || 0) + (data.filesAnalyzed || 0),
          issues_found: (existing.issues_found || 0) + (data.issuesFound || 0),
          issues_fixed: (existing.issues_fixed || 0) + (data.issuesFixed || 0),
          total_execution_time_ms: (existing.total_execution_time_ms || 0) + (data.executionTimeMs || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating usage metric:", updateError);
        return false;
      }
    } else {
      const { error: insertError } = await supabase
        .from("usage_metrics")
        .insert({
          team_id: data.teamId || null,
          user_id: data.userId,
          metric_date: today.toISOString().split("T")[0],
          metric_type: "daily",
          analyses_count: data.analysesCount || 0,
          files_analyzed: data.filesAnalyzed || 0,
          issues_found: data.issuesFound || 0,
          issues_fixed: data.issuesFixed || 0,
          total_execution_time_ms: data.executionTimeMs || 0,
        });

      if (insertError) {
        console.error("Error inserting usage metric:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Usage metric recording error:", error);
    return false;
  }
}

export async function getUserUsageMetrics(
  userId: string,
  days: number = 30
): Promise<any[] | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return null;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("usage_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("metric_type", "daily")
      .gte("metric_date", startDate.toISOString().split("T")[0])
      .order("metric_date", { ascending: false });

    if (error) {
      console.error("Error fetching user metrics:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserUsageMetrics:", error);
    return null;
  }
}

export async function getTeamUsageMetrics(
  teamId: string,
  days: number = 30
): Promise<any[] | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return null;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("usage_metrics")
      .select("*")
      .eq("team_id", teamId)
      .eq("metric_type", "daily")
      .gte("metric_date", startDate.toISOString().split("T")[0])
      .order("metric_date", { ascending: false });

    if (error) {
      console.error("Error fetching team metrics:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getTeamUsageMetrics:", error);
    return null;
  }
}
