import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, decimal, primaryKey, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  emailConfirmed: boolean("email_confirmed").default(false),
  plan: text("plan").default("free"),
  subscriptionStatus: text("subscription_status").default("active"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionId: text("subscription_id"),
  paymentMethod: text("payment_method").default("card"),
  usage: jsonb("usage").default({ remainingFixes: -1, remainingAnalyzes: -1, lastReset: null }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailIdx: index("idx_profiles_email").on(table.email),
  planIdx: index("idx_profiles_plan").on(table.plan),
  subscriptionStatusIdx: index("idx_profiles_subscription_status").on(table.subscriptionStatus),
}));

export const analysisHistory = pgTable("analysis_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  filename: text("filename").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  result: jsonb("result").notNull(),
  layers: integer("layers").array().default([]),
  executionTime: integer("execution_time").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_analysis_history_user_id").on(table.userId),
  timestampIdx: index("idx_analysis_history_timestamp").on(table.timestamp),
  filenameIdx: index("idx_analysis_history_filename").on(table.filename),
}));

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  files: jsonb("files").default([]),
  stats: jsonb("stats").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastAnalyzed: timestamp("last_analyzed", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("idx_projects_user_id").on(table.userId),
  lastAnalyzedIdx: index("idx_projects_last_analyzed").on(table.lastAnalyzed),
}));

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  defaultLayers: integer("default_layers").array().default([]),
  autoSave: boolean("auto_save").default(true),
  notifications: boolean("notifications").default(true),
  theme: text("theme").default("dark"),
  emailNotifications: boolean("email_notifications").default(true),
  webhookNotifications: boolean("webhook_notifications").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingData: jsonb("onboarding_data").default({}),
  collaborationEnabled: boolean("collaboration_enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_user_settings_user_id").on(table.userId),
}));

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  permissions: jsonb("permissions").default({}),
  lastUsed: timestamp("last_used", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_api_keys_user_id").on(table.userId),
  isActiveIdx: index("idx_api_keys_is_active").on(table.isActive),
}));

export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  action: text("action").notNull(),
  metadata: jsonb("metadata").default({}),
  filesProcessed: integer("files_processed").default(0),
  layersUsed: integer("layers_used").array().default([]),
  executionTimeMs: integer("execution_time_ms").default(0),
  costUsd: decimal("cost_usd", { precision: 10, scale: 6 }).default("0.000000"),
  creditsUsed: integer("credits_used").default(0),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_usage_logs_user_id").on(table.userId),
  actionIdx: index("idx_usage_logs_action").on(table.action),
  timestampIdx: index("idx_usage_logs_timestamp").on(table.timestamp),
}));

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").notNull(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  ownerIdIdx: index("idx_teams_owner_id").on(table.ownerId),
}));

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  teamIdIdx: index("idx_team_members_team_id").on(table.teamId),
  userIdIdx: index("idx_team_members_user_id").on(table.userId),
  uniqueTeamUser: unique("unique_team_user").on(table.teamId, table.userId),
}));

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull(),
  inviterId: uuid("inviter_id").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  role: text("role").default("member"),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  teamIdIdx: index("idx_team_invitations_team_id").on(table.teamId),
  inviteeEmailIdx: index("idx_team_invitations_invitee_email").on(table.inviteeEmail),
}));

export const collaborationSessions = pgTable("collaboration_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().unique().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  hostUserId: uuid("host_user_id").notNull(),
  documentContent: text("document_content"),
  filename: text("filename"),
  language: text("language"),
  isActive: boolean("is_active").default(true),
  participantCount: integer("participant_count").default(0),
  isPublic: boolean("is_public").default(false),
  lastActivity: timestamp("last_activity", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  hostUserIdIdx: index("idx_collaboration_sessions_host_user_id").on(table.hostUserId),
  isActiveIdx: index("idx_collaboration_sessions_is_active").on(table.isActive),
}));

export const collaborationParticipants = pgTable("collaboration_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull(),
  userName: text("user_name").notNull(),
  userColor: text("user_color").default("#3B82F6"),
  role: text("role").default("viewer"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  isActive: boolean("is_active").default(true),
  leftAt: timestamp("left_at", { withTimezone: true }),
  lastActivity: timestamp("last_activity", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdIdx: index("idx_collaboration_participants_session_id").on(table.sessionId),
  userIdIdx: index("idx_collaboration_participants_user_id").on(table.userId),
  isActiveIdx: index("idx_collaboration_participants_is_active").on(table.isActive),
  uniqueSessionUser: unique("unique_session_user").on(table.sessionId, table.userId),
}));

export const collaborationComments = pgTable("collaboration_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull(),
  content: text("content").notNull(),
  filePath: text("file_path"),
  lineNumber: integer("line_number"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdIdx: index("idx_collaboration_comments_session_id").on(table.sessionId),
  userIdIdx: index("idx_collaboration_comments_user_id").on(table.userId),
}));

export const collaborationAnalyses = pgTable("collaboration_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  inputCode: text("input_code").notNull(),
  outputCode: text("output_code").notNull(),
  layersExecuted: integer("layers_executed").array().default([]),
  dryRun: boolean("dry_run").default(false),
  executionTime: integer("execution_time").default(0),
  success: boolean("success").default(false),
  analysisResults: jsonb("analysis_results").default({}),
  triggeredBy: uuid("triggered_by"),
  triggeredByName: text("triggered_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdIdx: index("idx_collaboration_analyses_session_id").on(table.sessionId),
  triggeredByIdx: index("idx_collaboration_analyses_triggered_by").on(table.triggeredBy),
  createdAtIdx: index("idx_collaboration_analyses_created_at").on(table.createdAt),
}));

export const projectSubscriptions = pgTable("project_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique(),
  userId: uuid("user_id").notNull(),
  plan: text("plan").notNull(),
  billingPeriod: text("billing_period").default("monthly"),
  status: text("status").default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  projectIdIdx: index("idx_project_subscriptions_project_id").on(table.projectId),
  userIdIdx: index("idx_project_subscriptions_user_id").on(table.userId),
}));

export const projectUsage = pgTable("project_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id").notNull(),
  currentMonth: text("current_month").notNull(),
  monthlyFixCount: integer("monthly_fix_count").default(0),
  totalFixCount: integer("total_fix_count").default(0),
  lastFixDate: timestamp("last_fix_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  projectIdIdx: index("idx_project_usage_project_id").on(table.projectId),
  uniqueProjectMonth: unique("unique_project_month").on(table.projectId, table.currentMonth),
}));

export const billingCycles = pgTable("billing_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  cycleStart: timestamp("cycle_start", { withTimezone: true }).notNull(),
  cycleEnd: timestamp("cycle_end", { withTimezone: true }).notNull(),
  plan: text("plan").notNull(),
  fixesUsed: integer("fixes_used").default(0),
  fixesLimit: integer("fixes_limit").default(-1),
  costUsd: decimal("cost_usd", { precision: 10, scale: 4 }).default("0.0000"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_billing_cycles_user_id").on(table.userId),
  cycleStartIdx: index("idx_billing_cycles_cycle_start").on(table.cycleStart),
}));

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: text("events").array().default([]),
  secret: text("secret"),
  isActive: boolean("is_active").default(true),
  timeoutSeconds: integer("timeout_seconds").default(10),
  retryCount: integer("retry_count").default(3),
  retryDelaySeconds: integer("retry_delay_seconds").default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_webhooks_user_id").on(table.userId),
}));

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  attempts: integer("attempts").default(0),
  nextRetry: timestamp("next_retry", { withTimezone: true }),
  processingTimeMs: integer("processing_time_ms").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  webhookIdIdx: index("idx_webhook_events_webhook_id").on(table.webhookId),
  createdAtIdx: index("idx_webhook_events_created_at").on(table.createdAt),
}));

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  providerUserId: text("provider_user_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  settings: jsonb("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_integrations_user_id").on(table.userId),
  providerIdx: index("idx_integrations_provider").on(table.provider),
}));

export const integrationRuns = pgTable("integration_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull(),
  status: text("status").default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  result: jsonb("result").default({}),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  integrationIdIdx: index("idx_integration_runs_integration_id").on(table.integrationId),
}));

export const fixHistory = pgTable("fix_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"),
  filename: text("filename").notNull(),
  originalCode: text("original_code").notNull(),
  fixedCode: text("fixed_code").notNull(),
  layersApplied: integer("layers_applied").array().default([]),
  issuesFixed: jsonb("issues_fixed").default([]),
  executionTime: integer("execution_time").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_fix_history_user_id").on(table.userId),
  projectIdIdx: index("idx_fix_history_project_id").on(table.projectId),
  createdAtIdx: index("idx_fix_history_created_at").on(table.createdAt),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  paypalSubscriptionId: text("paypal_subscription_id"),
  paypalPayerId: text("paypal_payer_id"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_subscriptions_user_id").on(table.userId),
  statusIdx: index("idx_subscriptions_status").on(table.status),
  planIdx: index("idx_subscriptions_plan").on(table.plan),
}));

export const analysisJobs = pgTable("analysis_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  code: text("code").notNull(),
  filename: text("filename"),
  layers: integer("layers").array().notNull().default([1, 2, 3, 4, 5, 6, 7]),
  options: jsonb("options").default({}),
  result: jsonb("result"),
  error: text("error"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_analysis_jobs_user_id").on(table.userId),
  statusIdx: index("idx_analysis_jobs_status").on(table.status),
  expiresAtIdx: index("idx_analysis_jobs_expires_at").on(table.expiresAt),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id"),
  userId: uuid("user_id"),
  actorType: text("actor_type").default("user"),
  actorIpAddress: text("actor_ip_address"),
  actorUserAgent: text("actor_user_agent"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id"),
  resourceName: text("resource_name"),
  status: text("status").default("success"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  teamIdIdx: index("idx_audit_logs_team").on(table.teamId),
  userIdIdx: index("idx_audit_logs_user").on(table.userId),
  actionIdx: index("idx_audit_logs_action").on(table.action),
  resourceIdx: index("idx_audit_logs_resource").on(table.resourceType, table.resourceId),
  createdAtIdx: index("idx_audit_logs_created").on(table.createdAt),
}));

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  categoryIdx: index("idx_permissions_category").on(table.category),
}));

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(),
  permissionId: uuid("permission_id").notNull(),
}, (table) => ({
  roleIdx: index("idx_role_permissions_role").on(table.role),
  permissionIdx: index("idx_role_permissions_permission").on(table.permissionId),
  uniqueRolePermission: unique("unique_role_permission").on(table.role, table.permissionId),
}));

export const ruleDefinitions = pgTable("rule_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: text("rule_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  layer: integer("layer").notNull(),
  severity: text("severity").default("warning"),
  autoFixable: boolean("auto_fixable").default(false),
  documentationUrl: text("documentation_url"),
  examples: jsonb("examples").default({}),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  categoryIdx: index("idx_rule_definitions_category").on(table.category),
  layerIdx: index("idx_rule_definitions_layer").on(table.layer),
  severityIdx: index("idx_rule_definitions_severity").on(table.severity),
  ruleIdIdx: index("idx_rule_definitions_rule_id").on(table.ruleId),
}));

export const teamRuleConfigs = pgTable("team_rule_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull(),
  ruleId: uuid("rule_id").notNull(),
  enabled: boolean("enabled").default(true),
  severityOverride: text("severity_override"),
  autoFixEnabled: boolean("auto_fix_enabled").default(true),
  customConfig: jsonb("custom_config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  teamIdIdx: index("idx_team_rule_configs_team").on(table.teamId),
  ruleIdIdx: index("idx_team_rule_configs_rule").on(table.ruleId),
  uniqueTeamRule: unique("unique_team_rule").on(table.teamId, table.ruleId),
}));

export const projectRuleConfigs = pgTable("project_rule_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  ruleId: uuid("rule_id").notNull(),
  enabled: boolean("enabled").default(true),
  severityOverride: text("severity_override"),
  autoFixEnabled: boolean("auto_fix_enabled").default(true),
  customConfig: jsonb("custom_config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  projectIdIdx: index("idx_project_rule_configs_project").on(table.projectId),
  ruleIdIdx: index("idx_project_rule_configs_rule").on(table.ruleId),
  uniqueProjectRule: unique("unique_project_rule").on(table.projectId, table.ruleId),
}));

export const usageMetrics = pgTable("usage_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id"),
  userId: uuid("user_id"),
  metricDate: timestamp("metric_date", { mode: "date" }).notNull(),
  metricType: text("metric_type").notNull(),
  analysesCount: integer("analyses_count").default(0),
  filesAnalyzed: integer("files_analyzed").default(0),
  issuesFound: integer("issues_found").default(0),
  issuesFixed: integer("issues_fixed").default(0),
  avgAnalysisTimeMs: integer("avg_analysis_time_ms").default(0),
  totalExecutionTimeMs: integer("total_execution_time_ms").default(0),
  apiCalls: integer("api_calls").default(0),
  apiErrors: integer("api_errors").default(0),
  creditsUsed: integer("credits_used").default(0),
  costUsd: decimal("cost_usd", { precision: 10, scale: 4 }).default("0.0000"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  teamIdIdx: index("idx_usage_metrics_team").on(table.teamId),
  userIdIdx: index("idx_usage_metrics_user").on(table.userId),
  metricDateIdx: index("idx_usage_metrics_date").on(table.metricDate),
  metricTypeIdx: index("idx_usage_metrics_type").on(table.metricType),
}));

export const apiKeyUsage = pgTable("api_key_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  apiKeyId: uuid("api_key_id").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  requestBodySize: integer("request_body_size"),
  responseBodySize: integer("response_body_size"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  apiKeyIdIdx: index("idx_api_key_usage_key").on(table.apiKeyId),
  endpointIdx: index("idx_api_key_usage_endpoint").on(table.endpoint),
  createdAtIdx: index("idx_api_key_usage_created").on(table.createdAt),
  statusCodeIdx: index("idx_api_key_usage_status").on(table.statusCode),
}));
