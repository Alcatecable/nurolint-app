import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient, isSupabaseConfigured } from "../../../../../lib/supabase-server";
import { AnalysisJobQueueClient } from "../../../../../lib/analysis-job-queue";

interface VercelDeploymentPayload {
  type: string;
  id: string;
  payload: {
    deployment: {
      id: string;
      name: string;
      url: string;
      meta: {
        githubCommitSha?: string;
        githubCommitRef?: string;
        githubOrg?: string;
        githubRepo?: string;
        gitlabCommitSha?: string;
        gitlabCommitRef?: string;
        bitbucketCommitSha?: string;
        bitbucketRepoFullName?: string;
      };
      target?: string;
      createdAt: number;
      readyState?: string;
    };
    user: {
      id: string;
      username?: string;
    };
    team?: {
      id: string;
      name?: string;
      slug?: string;
    };
    project: {
      id: string;
      name: string;
    };
    links: {
      deployment: string;
      project: string;
    };
  };
  createdAt: number;
}

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  processed: boolean;
  analysisTriggered: boolean;
  deploymentId?: string;
  projectName?: string;
  commitSha?: string;
}

const processedEvents: Map<string, WebhookEvent> = new Map();

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env["VERCEL_WEBHOOK_SECRET"];
  
  if (!secret) {
    console.warn("[Vercel Webhook] VERCEL_WEBHOOK_SECRET not configured");
    return false;
  }
  
  if (!signature) {
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac("sha1", secret)
    .update(payload)
    .digest("hex");
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

interface IntegrationInfo {
  id: string;
  userId: string;
  settings: Record<string, unknown>;
}

async function lookupIntegration(integrationId: string): Promise<IntegrationInfo | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from("integrations")
    .select("id, user_id, settings")
    .eq("id", integrationId)
    .eq("provider", "vercel")
    .eq("is_active", true)
    .single();
  
  if (error || !data) {
    console.warn("[Vercel Webhook] Integration not found:", integrationId);
    return null;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    settings: data.settings || {}
  };
}

async function storeIntegrationRun(
  integrationId: string,
  status: "running" | "completed" | "failed",
  result: Record<string, unknown>,
  executionTimeMs?: number
): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  
  try {
    const insertData: Record<string, unknown> = {
      integration_id: integrationId,
      status,
      result,
      started_at: new Date().toISOString()
    };
    
    if (status !== "running") {
      insertData["completed_at"] = new Date().toISOString();
    }
    if (executionTimeMs !== undefined) {
      insertData["execution_time_ms"] = executionTimeMs;
    }
    
    const { data, error } = await supabase
      .from("integration_runs")
      .insert(insertData)
      .select("id")
      .single();
    
    if (error) {
      console.error("[Vercel Webhook] Failed to store run:", error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error("[Vercel Webhook] Error storing run:", error);
    return null;
  }
}

async function updateIntegrationRun(
  runId: string,
  status: "running" | "completed" | "failed",
  result: Record<string, unknown>,
  executionTimeMs?: number
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  
  try {
    const updateData: Record<string, unknown> = {
      status,
      result
    };
    
    if (status !== "running") {
      updateData["completed_at"] = new Date().toISOString();
    }
    if (executionTimeMs !== undefined) {
      updateData["execution_time_ms"] = executionTimeMs;
    }
    
    const { error } = await supabase
      .from("integration_runs")
      .update(updateData)
      .eq("id", runId);
    
    return !error;
  } catch {
    return false;
  }
}

async function triggerAnalysisForDeployment(
  deployment: VercelDeploymentPayload["payload"]["deployment"],
  project: VercelDeploymentPayload["payload"]["project"],
  integration: IntegrationInfo,
  runId: string | null
): Promise<{ success: boolean; jobId?: string; message: string }> {
  const startTime = Date.now();
  const meta = deployment.meta || {};
  const commitSha = meta.githubCommitSha || meta.gitlabCommitSha || meta.bitbucketCommitSha;
  const repoInfo = meta.githubRepo 
    ? `${meta.githubOrg}/${meta.githubRepo}`
    : meta.bitbucketRepoFullName;
  
  console.log(`[Vercel Webhook] Processing deployment for user ${integration.userId}`, {
    project: project.name,
    deploymentUrl: deployment.url,
    commitSha,
    repo: repoInfo,
    target: deployment.target || "preview"
  });
  
  if (!repoInfo || !commitSha) {
    const executionTime = Date.now() - startTime;
    if (runId) {
      await updateIntegrationRun(runId, "completed", {
        status: "skipped",
        reason: "No repository or commit information in deployment metadata",
        deployment_id: deployment.id,
        deployment_url: deployment.url,
        project_name: project.name
      }, executionTime);
    }
    
    return {
      success: true,
      message: "Deployment recorded. Analysis skipped - no repository info available in deployment metadata."
    };
  }
  
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      message: "Database not configured for analysis queue"
    };
  }
  
  try {
    const jobClient = new AnalysisJobQueueClient(supabase, integration.userId);
    
    const sampleCode = `// Vercel deployment analysis placeholder
// Deployment: ${deployment.id}
// Project: ${project.name}
// Repository: ${repoInfo}
// Commit: ${commitSha}
// Target: ${deployment.target || "preview"}
// 
// To enable full analysis, connect your GitHub integration
// and configure automatic repository scanning.
export const deploymentInfo = {
  id: "${deployment.id}",
  project: "${project.name}",
  url: "${deployment.url}",
  commit: "${commitSha}",
  timestamp: "${new Date().toISOString()}"
};`;

    const job = await jobClient.createJob({
      code: sampleCode,
      filename: `vercel-deployment-${deployment.id}.ts`,
      layers: [1, 2, 3],
      priority: "normal",
      options: {
        source: "vercel-webhook",
        deploymentId: deployment.id,
        projectName: project.name,
        repository: repoInfo,
        commitSha,
        target: deployment.target || "preview"
      }
    });
    
    const executionTime = Date.now() - startTime;
    
    if (runId) {
      await updateIntegrationRun(runId, "completed", {
        status: "analysis_queued",
        job_id: job.id,
        deployment_id: deployment.id,
        deployment_url: deployment.url,
        project_name: project.name,
        repository: repoInfo,
        commit_sha: commitSha,
        target: deployment.target || "preview"
      }, executionTime);
    }
    
    return {
      success: true,
      jobId: job.id,
      message: `Analysis job ${job.id} queued for ${repoInfo}@${commitSha.substring(0, 7)}`
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("[Vercel Webhook] Failed to create analysis job:", error);
    
    if (runId) {
      await updateIntegrationRun(runId, "failed", {
        status: "analysis_failed",
        error: errorMessage,
        deployment_id: deployment.id,
        project_name: project.name
      }, executionTime);
    }
    
    return {
      success: false,
      message: `Failed to queue analysis: ${errorMessage}`
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-vercel-signature");
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get("integration");
    
    if (process.env["VERCEL_WEBHOOK_SECRET"]) {
      if (!verifySignature(rawBody, signature)) {
        console.error("[Vercel Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }
    
    let body: VercelDeploymentPayload;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    
    const eventId = body.id || `event-${Date.now()}`;
    
    if (processedEvents.has(eventId)) {
      return NextResponse.json({
        success: true,
        message: "Event already processed",
        eventId
      });
    }
    
    const event: WebhookEvent = {
      id: eventId,
      type: body.type,
      timestamp: new Date(body.createdAt).toISOString(),
      processed: false,
      analysisTriggered: false
    };
    
    const supportedEvents = [
      "deployment.created",
      "deployment.ready",
      "deployment.succeeded"
    ];
    
    if (!supportedEvents.includes(body.type)) {
      event.processed = true;
      processedEvents.set(eventId, event);
      
      if (processedEvents.size > 1000) {
        const oldestKey = processedEvents.keys().next().value;
        if (oldestKey) processedEvents.delete(oldestKey);
      }
      
      return NextResponse.json({
        success: true,
        message: `Event type '${body.type}' acknowledged but not processed`,
        eventId
      });
    }
    
    const { deployment, project } = body.payload;
    
    event.deploymentId = deployment.id;
    event.projectName = project.name;
    const commitSha = deployment.meta?.githubCommitSha || 
                      deployment.meta?.gitlabCommitSha || 
                      deployment.meta?.bitbucketCommitSha;
    if (commitSha) {
      event.commitSha = commitSha;
    }
    
    let integration: IntegrationInfo | null = null;
    let runId: string | null = null;
    
    if (integrationId) {
      integration = await lookupIntegration(integrationId);
      
      if (integration) {
        runId = await storeIntegrationRun(integration.id, "running", {
          event_type: body.type,
          event_id: eventId,
          deployment_id: deployment.id,
          deployment_url: deployment.url,
          project_id: project.id,
          project_name: project.name,
          target: deployment.target || "preview",
          commit_sha: commitSha,
          received_at: new Date().toISOString()
        });
      }
    }
    
    if (body.type === "deployment.created" || body.type === "deployment.ready") {
      let analysisResult: { success: boolean; jobId?: string; message: string };
      
      if (integration) {
        analysisResult = await triggerAnalysisForDeployment(
          deployment,
          project,
          integration,
          runId
        );
      } else {
        analysisResult = {
          success: true,
          message: "Deployment event received. Add ?integration=YOUR_INTEGRATION_ID to webhook URL to enable automatic analysis."
        };
        
        if (runId) {
          await updateIntegrationRun(runId, "completed", {
            status: "no_integration",
            deployment_id: deployment.id
          }, Date.now() - startTime);
        }
      }
      
      event.analysisTriggered = analysisResult.success && !!analysisResult.jobId;
      event.processed = true;
      processedEvents.set(eventId, event);
      
      if (processedEvents.size > 1000) {
        const oldestKey = processedEvents.keys().next().value;
        if (oldestKey) processedEvents.delete(oldestKey);
      }
      
      return NextResponse.json({
        success: analysisResult.success,
        message: analysisResult.message,
        eventId,
        jobId: analysisResult.jobId,
        runId,
        deployment: {
          id: deployment.id,
          name: deployment.name,
          url: deployment.url,
          target: deployment.target || "preview"
        },
        project: {
          id: project.id,
          name: project.name
        }
      });
    }
    
    event.processed = true;
    processedEvents.set(eventId, event);
    
    if (runId) {
      await updateIntegrationRun(runId, "completed", {
        status: "event_processed",
        event_type: body.type
      }, Date.now() - startTime);
    }
    
    return NextResponse.json({
      success: true,
      message: "Deployment event processed",
      eventId,
      runId,
      type: body.type
    });
    
  } catch (error) {
    console.error("[Vercel Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showRecent = searchParams.get("recent") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
  
  if (showRecent) {
    const events = Array.from(processedEvents.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    return NextResponse.json({
      success: true,
      events,
      total: processedEvents.size
    });
  }
  
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || "https://your-app.com";
  
  return NextResponse.json({
    success: true,
    integration: "vercel",
    version: "1.0.0",
    databaseConfigured: isSupabaseConfigured(),
    supportedEvents: [
      "deployment.created",
      "deployment.ready", 
      "deployment.succeeded"
    ],
    setup: {
      steps: [
        "1. Create a Vercel integration in NeuroLint settings",
        "2. Go to your Vercel project settings",
        "3. Navigate to 'Webhooks' section",
        "4. Add a new webhook with the URL below (include your integration ID)",
        "5. Select deployment events to trigger on",
        "6. Copy the webhook secret and set VERCEL_WEBHOOK_SECRET in NeuroLint"
      ],
      requiredEnvVars: [
        "VERCEL_WEBHOOK_SECRET"
      ],
      webhookUrl: `${baseUrl}/api/integrations/vercel/webhook?integration=YOUR_INTEGRATION_ID`
    },
    features: [
      "Automatic analysis job creation on deployment",
      "Integration with NeuroLint analysis queue",
      "Git commit tracking (GitHub, GitLab, Bitbucket)",
      "Production vs preview deployment detection",
      "Event deduplication",
      "Integration run history tracking"
    ],
    endpoints: {
      webhook: "POST /api/integrations/vercel/webhook?integration=ID",
      recentEvents: "GET /api/integrations/vercel/webhook?recent=true&limit=10",
      info: "GET /api/integrations/vercel/webhook"
    }
  });
}
