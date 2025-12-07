"use client";

import React, { useState } from "react";
import AutoPRDashboard from "./AutoPRDashboard";
import GitHubActionsGenerator from "./GitHubActionsGenerator";
import GitLabCIGenerator from "./GitLabCIGenerator";

interface IntegrationsHubProps {
  onNavigateToApiKeys: () => void;
}

export default function IntegrationsHub({ onNavigateToApiKeys }: IntegrationsHubProps) {
  const [showAutoPRDashboard, setShowAutoPRDashboard] = useState(false);
  const [showActionsGenerator, setShowActionsGenerator] = useState(false);
  const [showGitLabCIGenerator, setShowGitLabCIGenerator] = useState(false);

  if (showGitLabCIGenerator) {
    return <GitLabCIGenerator onBack={() => setShowGitLabCIGenerator(false)} />;
  }

  if (showActionsGenerator) {
    return <GitHubActionsGenerator onBack={() => setShowActionsGenerator(false)} />;
  }

  if (showAutoPRDashboard) {
    return (
      <div className="tab-content">
        <button 
          className="back-btn"
          onClick={() => setShowAutoPRDashboard(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid #000000',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Integrations
        </button>
        <AutoPRDashboard />
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="integrations-overview">
        <h3>Integrations & Automations</h3>
        <p className="tab-description">
          Connect NeuroLint with your development workflow.
        </p>

        <div className="integration-categories">
          <div className="integration-category featured">
            <div className="category-header">
              <h4>CI/CD Pipelines</h4>
              <span className="category-status" data-status="available">
                Available
              </span>
            </div>
            <p>
              Automatically analyze code in your CI/CD pipeline with GitHub
              Actions, GitLab CI, Jenkins, and more.
            </p>
            <div className="supported-platforms">
              <span className="platform-badge">GitHub Actions</span>
              <span className="platform-badge">GitLab CI</span>
              <span className="platform-badge">Jenkins</span>
              <span className="platform-badge">Azure DevOps</span>
            </div>
            <div className="api-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowActionsGenerator(true)}
                aria-label="Open GitHub Actions Workflow Generator"
              >
                GitHub Actions
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowGitLabCIGenerator(true)}
                aria-label="Open GitLab CI Pipeline Generator"
              >
                GitLab CI
              </button>
            </div>
          </div>

          <div className="integration-category featured">
            <div className="category-header">
              <h4>Deployment Webhooks</h4>
              <span className="category-status" data-status="available">
                Available
              </span>
            </div>
            <p>
              Automatically trigger analysis when deployments are created on Vercel, Netlify, and other platforms.
            </p>
            <div className="webhook-features">
              <div className="feature-item">
                Vercel deployment integration
              </div>
              <div className="feature-item">Git commit tracking</div>
              <div className="feature-item">Production vs preview detection</div>
              <div className="feature-item">Event deduplication</div>
            </div>
            <div className="supported-platforms" style={{ marginTop: '0.75rem' }}>
              <span className="platform-badge">Vercel</span>
              <span className="platform-badge">Netlify</span>
              <span className="platform-badge">Railway</span>
            </div>
            <div className="api-actions" style={{ marginTop: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => window.open("/api/integrations/vercel/webhook", "_blank")}
                aria-label="View Vercel webhook setup instructions"
              >
                Vercel Setup
              </button>
            </div>
          </div>

          <div className="integration-category">
            <div className="category-header">
              <h4>Team Notifications</h4>
              <span className="category-status" data-status="available">
                Available
              </span>
            </div>
            <p>
              Keep your team informed with Slack and Microsoft Teams
              integrations.
            </p>
            <div className="notification-channels">
              <div className="channel-item">
                <span>Slack Channels</span>
              </div>
              <div className="channel-item">
                <span>Email Notifications</span>
              </div>
              <div className="channel-item">
                <span>Microsoft Teams</span>
              </div>
            </div>
          </div>

          <div className="integration-category featured">
            <div className="category-header">
              <h4>Auto PR Generation</h4>
              <span className="category-status" data-status="available">
                Available
              </span>
            </div>
            <p>
              Automatically create pull requests with code fixes from NeuroLint
              analysis results.
            </p>
            <div className="auto-pr-features">
              <div className="feature-item">Automated branch creation</div>
              <div className="feature-item">Draft PR support</div>
              <div className="feature-item">Batch PR creation</div>
              <div className="feature-item">PR tracking & history</div>
            </div>
            <div className="api-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowAutoPRDashboard(true)}
                aria-label="Open Auto PR Dashboard"
              >
                Manage Auto PRs
              </button>
            </div>
          </div>

          <div className="integration-category">
            <div className="category-header">
              <h4>API Access</h4>
              <span className="category-status" data-status="available">
                Available
              </span>
            </div>
            <p>
              Programmatic access to NeuroLint analysis engine with
              comprehensive REST API.
            </p>
            <div className="api-features">
              <div className="feature-item">API key authentication</div>
              <div className="feature-item">Rate limiting</div>
              <div className="feature-item">OpenAPI documentation</div>
              <div className="feature-item">SDKs coming soon</div>
            </div>
            <div className="api-actions">
              <button
                className="btn btn-primary"
                onClick={() => window.open("/api/docs?format=html", "_blank")}
                aria-label="Open API documentation in new tab"
              >
                View API Docs
              </button>
              <button
                className="btn btn-secondary"
                onClick={onNavigateToApiKeys}
                aria-label="Navigate to API keys management section"
              >
                Manage API Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { IntegrationsHubProps };
