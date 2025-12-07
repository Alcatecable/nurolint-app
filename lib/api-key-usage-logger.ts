import { getSupabaseServerClient } from "./supabase-server";

export interface ApiKeyUsageEntry {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTimeMs?: number;
  requestBodySize?: number;
  responseBodySize?: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export async function logApiKeyUsage(entry: ApiKeyUsageEntry): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.warn("API key usage logging skipped - Supabase not configured");
      return false;
    }

    const { error } = await supabase
      .from("api_key_usage")
      .insert({
        api_key_id: entry.apiKeyId,
        endpoint: entry.endpoint,
        method: entry.method,
        status_code: entry.statusCode || null,
        response_time_ms: entry.responseTimeMs || null,
        request_body_size: entry.requestBodySize || null,
        response_body_size: entry.responseBodySize || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        error_message: entry.errorMessage || null,
      });

    if (error) {
      console.error("Failed to log API key usage:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("API key usage logging error:", error);
    return false;
  }
}

export async function getApiKeyUsageStats(
  apiKeyId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCalls: number;
  successfulCalls: number;
  errorCalls: number;
  avgResponseTime: number;
  endpointBreakdown: Record<string, number>;
} | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return null;
    }

    let query = supabase
      .from("api_key_usage")
      .select("*")
      .eq("api_key_id", apiKeyId);

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error || !data) {
      return null;
    }

    const totalCalls = data.length;
    const successfulCalls = data.filter((d: any) => d.status_code && d.status_code < 400).length;
    const errorCalls = data.filter((d: any) => d.status_code && d.status_code >= 400).length;
    
    const responseTimes = data
      .map((d: any) => d.response_time_ms)
      .filter((t: any) => t !== null);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length 
      : 0;

    const endpointBreakdown: Record<string, number> = {};
    data.forEach((d: any) => {
      const key = `${d.method} ${d.endpoint}`;
      endpointBreakdown[key] = (endpointBreakdown[key] || 0) + 1;
    });

    return {
      totalCalls,
      successfulCalls,
      errorCalls,
      avgResponseTime: Math.round(avgResponseTime),
      endpointBreakdown,
    };
  } catch (error) {
    console.error("Error getting API key usage stats:", error);
    return null;
  }
}
