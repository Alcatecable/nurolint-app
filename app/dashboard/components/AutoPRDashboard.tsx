'use client';

import React, { useState, useEffect } from "react";

interface AutoPR {
  id: string;
  repositoryName: string;
  prNumber: number;
  status: 'pending' | 'open' | 'merged' | 'closed' | 'failed';
  title: string;
  branchName: string;
  filesChanged: number;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  htmlUrl: string;
}

interface AutoPRStats {
  totalCreated: number;
  merged: number;
  open: number;
  closed: number;
  successRate: number;
}

export default function AutoPRDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");
  const [selectedRepository, setSelectedRepository] = useState<string>("all");

  const [pullRequests] = useState<AutoPR[]>([
    {
      id: "1",
      repositoryName: "acme/web-app",
      prNumber: 142,
      status: 'merged',
      title: "fix: NeuroLint auto-fix for console, accessibility issues",
      branchName: "neurolint/auto-fix-1701234567890",
      filesChanged: 4,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
      mergedAt: new Date(Date.now() - 43200000).toISOString(),
      htmlUrl: "https://github.com/acme/web-app/pull/142"
    },
    {
      id: "2",
      repositoryName: "acme/web-app",
      prNumber: 145,
      status: 'open',
      title: "fix: NeuroLint auto-fix for TypeScript strict mode violations",
      branchName: "neurolint/auto-fix-1701334567890",
      filesChanged: 7,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      htmlUrl: "https://github.com/acme/web-app/pull/145"
    },
    {
      id: "3",
      repositoryName: "acme/api-server",
      prNumber: 89,
      status: 'open',
      title: "fix: NeuroLint auto-fix for security header validation",
      branchName: "neurolint/auto-fix-1701434567890",
      filesChanged: 2,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      htmlUrl: "https://github.com/acme/api-server/pull/89"
    },
    {
      id: "4",
      repositoryName: "acme/mobile-app",
      prNumber: 56,
      status: 'closed',
      title: "fix: NeuroLint auto-fix for React 18 patterns",
      branchName: "neurolint/auto-fix-1701134567890",
      filesChanged: 3,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      htmlUrl: "https://github.com/acme/mobile-app/pull/56"
    }
  ]);

  const [stats] = useState<AutoPRStats>({
    totalCreated: 47,
    merged: 38,
    open: 4,
    closed: 5,
    successRate: 88.4
  });

  const [repositories] = useState([
    { name: "acme/web-app", prsCreated: 28 },
    { name: "acme/api-server", prsCreated: 12 },
    { name: "acme/mobile-app", prsCreated: 7 }
  ]);

  const [settings, setSettings] = useState({
    autoCreatePR: true,
    draftByDefault: true,
    autoMergeOnApproval: false,
    maxFilesPerPR: 25,
    requireReviewBeforeMerge: true,
    notifyOnPRCreation: true,
    defaultLabels: ["neurolint-auto-pr", "automated"]
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'merged': return '#4caf50';
      case 'open': return '#2196f3';
      case 'closed': return '#e53e3e';
      case 'pending': return '#ff9800';
      case 'failed': return '#e53e3e';
      default: return '#666666';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'merged': return 'rgba(76, 175, 80, 0.2)';
      case 'open': return 'rgba(33, 150, 243, 0.2)';
      case 'closed': return 'rgba(229, 62, 62, 0.2)';
      case 'pending': return 'rgba(255, 152, 0, 0.2)';
      case 'failed': return 'rgba(229, 62, 62, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredPRs = selectedRepository === "all" 
    ? pullRequests 
    : pullRequests.filter(pr => pr.repositoryName === selectedRepository);

  if (isLoading) {
    return (
      <div className="auto-pr-dashboard">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading Auto PR data...</p>
        </div>
        <style jsx>{`
          .auto-pr-dashboard {
            padding: 1.5rem;
          }
          .loading-state {
            text-align: center;
            padding: 3rem;
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid #000000;
            border-top: 2px solid #ffffff;
            border-radius: 50%;
            margin: 0 auto 1rem;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auto-pr-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h3>Auto PR Management</h3>
          <p>Manage automated pull requests created by NeuroLint</p>
        </div>
        <button className="btn btn-primary">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create PR
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalCreated}</div>
          <div className="stat-label">Total PRs Created</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{stats.merged}</div>
          <div className="stat-label">Merged</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{stats.open}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      <div className="tab-navigation">
        {(["overview", "history", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="overview-section">
          <div className="filter-bar">
            <select 
              value={selectedRepository} 
              onChange={(e) => setSelectedRepository(e.target.value)}
              className="repo-filter"
            >
              <option value="all">All Repositories</option>
              {repositories.map(repo => (
                <option key={repo.name} value={repo.name}>{repo.name}</option>
              ))}
            </select>
          </div>

          <div className="pr-list">
            {filteredPRs.map((pr) => (
              <div key={pr.id} className="pr-card">
                <div className="pr-header">
                  <div className="pr-info">
                    <a 
                      href={pr.htmlUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="pr-title"
                    >
                      #{pr.prNumber} {pr.title}
                    </a>
                    <div className="pr-meta">
                      <span className="repo-name">{pr.repositoryName}</span>
                      <span className="separator">•</span>
                      <span className="files-changed">{pr.filesChanged} files</span>
                      <span className="separator">•</span>
                      <span className="branch-name">{pr.branchName}</span>
                    </div>
                  </div>
                  <span 
                    className="status-badge"
                    style={{ 
                      background: getStatusBg(pr.status),
                      color: getStatusColor(pr.status)
                    }}
                  >
                    {pr.status}
                  </span>
                </div>
                <div className="pr-footer">
                  <span className="timestamp">Created {formatRelativeTime(pr.createdAt)}</span>
                  {pr.mergedAt && (
                    <span className="merged-info">Merged {formatRelativeTime(pr.mergedAt)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="history-section">
          <div className="repo-stats">
            <h4>Repository Activity</h4>
            <div className="repo-list">
              {repositories.map(repo => (
                <div key={repo.name} className="repo-stat-card">
                  <div className="repo-info">
                    <span className="repo-name">{repo.name}</span>
                    <span className="pr-count">{repo.prsCreated} PRs created</span>
                  </div>
                  <div className="repo-bar">
                    <div 
                      className="repo-bar-fill"
                      style={{ width: `${(repo.prsCreated / stats.totalCreated) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="timeline">
            <h4>Recent Activity</h4>
            <div className="timeline-list">
              {pullRequests.slice(0, 5).map((pr) => (
                <div key={pr.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: getStatusColor(pr.status) }} />
                  <div className="timeline-content">
                    <div className="timeline-title">PR #{pr.prNumber} {pr.status === 'merged' ? 'merged' : pr.status === 'open' ? 'opened' : 'closed'}</div>
                    <div className="timeline-meta">{pr.repositoryName} • {formatRelativeTime(pr.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="settings-section">
          <div className="settings-group">
            <h4>PR Creation</h4>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Auto-create PRs</span>
                <span className="setting-description">Automatically create PRs when fixes are available</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoCreatePR}
                  onChange={(e) => setSettings(s => ({ ...s, autoCreatePR: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Draft PRs by default</span>
                <span className="setting-description">Create new PRs as drafts for review</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.draftByDefault}
                  onChange={(e) => setSettings(s => ({ ...s, draftByDefault: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Max files per PR</span>
                <span className="setting-description">Maximum number of files to include in a single PR</span>
              </div>
              <input
                type="number"
                value={settings.maxFilesPerPR}
                onChange={(e) => setSettings(s => ({ ...s, maxFilesPerPR: parseInt(e.target.value) || 25 }))}
                className="number-input"
                min="1"
                max="100"
              />
            </div>
          </div>

          <div className="settings-group">
            <h4>Merge Settings</h4>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Require review before merge</span>
                <span className="setting-description">Require at least one approval before auto-merge</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.requireReviewBeforeMerge}
                  onChange={(e) => setSettings(s => ({ ...s, requireReviewBeforeMerge: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Auto-merge on approval</span>
                <span className="setting-description">Automatically merge PRs when approved</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoMergeOnApproval}
                  onChange={(e) => setSettings(s => ({ ...s, autoMergeOnApproval: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="settings-group">
            <h4>Notifications</h4>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-name">Notify on PR creation</span>
                <span className="setting-description">Send notification when a new auto-PR is created</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifyOnPRCreation}
                  onChange={(e) => setSettings(s => ({ ...s, notifyOnPRCreation: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .auto-pr-dashboard {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.25rem 0;
        }

        .header-content p {
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          font-size: 0.875rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
          color: #ffffff;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.3) 0%, rgba(255, 255, 255, 0.12) 100%);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          text-align: center;
        }

        .stat-card.success {
          border-color: rgba(76, 175, 80, 0.3);
        }

        .stat-card.info {
          border-color: rgba(33, 150, 243, 0.3);
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
        }

        .stat-card.success .stat-value {
          color: #4caf50;
        }

        .stat-card.info .stat-value {
          color: #2196f3;
        }

        .stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 0.25rem;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 4px;
        }

        .tab-btn {
          flex: 1;
          padding: 0.625rem 1rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
          color: #ffffff;
        }

        .filter-bar {
          margin-bottom: 1rem;
        }

        .repo-filter {
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .repo-filter option {
          background: #1a1a1a;
          color: #ffffff;
        }

        .pr-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .pr-card {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          transition: background 0.2s ease;
        }

        .pr-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .pr-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .pr-title {
          font-weight: 600;
          color: #ffffff;
          text-decoration: none;
          display: block;
          margin-bottom: 0.5rem;
        }

        .pr-title:hover {
          color: #2196f3;
        }

        .pr-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .separator {
          color: rgba(255, 255, 255, 0.3);
        }

        .repo-name {
          color: rgba(255, 255, 255, 0.7);
        }

        .branch-name {
          font-family: monospace;
          font-size: 0.7rem;
          padding: 0.125rem 0.375rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .status-badge {
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pr-footer {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .merged-info {
          color: #4caf50;
        }

        .history-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .repo-stats h4,
        .timeline h4 {
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 1rem 0;
        }

        .repo-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .repo-stat-card {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
        }

        .repo-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .pr-count {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .repo-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .repo-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2196f3, #4caf50);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .timeline-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .timeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 0.25rem;
          flex-shrink: 0;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-title {
          font-size: 0.875rem;
          color: #ffffff;
        }

        .timeline-meta {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .settings-group {
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
        }

        .settings-group h4 {
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 1rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .setting-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .setting-name {
          font-size: 0.875rem;
          color: #ffffff;
          display: block;
        }

        .setting-description {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          display: block;
          margin-top: 0.25rem;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.1);
          transition: 0.3s;
          border-radius: 24px;
          border: 1px solid #000000;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 2px;
          bottom: 2px;
          background-color: #ffffff;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: rgba(76, 175, 80, 0.5);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .number-input {
          width: 80px;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 6px;
          color: #ffffff;
          font-size: 0.875rem;
          text-align: center;
        }

        .number-input:focus {
          outline: none;
          border-color: #2196f3;
        }
      `}</style>
    </div>
  );
}
