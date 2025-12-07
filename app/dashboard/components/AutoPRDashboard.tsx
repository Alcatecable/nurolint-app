'use client';

import React, { useState, useEffect, useCallback } from "react";

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

interface Repository {
  name: string;
  prsCreated: number;
}

export default function AutoPRDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");
  const [selectedRepository, setSelectedRepository] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);

  const [pullRequests, setPullRequests] = useState<AutoPR[]>([]);
  const [stats, setStats] = useState<AutoPRStats>({
    totalCreated: 0,
    merged: 0,
    open: 0,
    closed: 0,
    successRate: 0
  });
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const [settings, setSettings] = useState({
    autoCreatePR: true,
    draftByDefault: true,
    autoMergeOnApproval: false,
    maxFilesPerPR: 25,
    requireReviewBeforeMerge: true,
    notifyOnPRCreation: true,
    defaultLabels: ["neurolint-auto-pr", "automated"]
  });

  const fetchAutoPRs = useCallback(async (token: string) => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/integrations/github/auto-pr?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('neurolint_github_token');
          setIsConnected(false);
          throw new Error('Invalid or expired GitHub token. Please reconnect.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch pull requests (${response.status})`);
      }

      const data = await response.json();
      const prs: AutoPR[] = data.pullRequests || [];
      setPullRequests(prs);

      const merged = prs.filter(pr => pr.status === 'merged').length;
      const open = prs.filter(pr => pr.status === 'open').length;
      const closed = prs.filter(pr => pr.status === 'closed').length;
      const total = prs.length;
      
      setStats({
        totalCreated: total,
        merged,
        open,
        closed,
        successRate: total > 0 ? Math.round((merged / total) * 100 * 10) / 10 : 0
      });

      const repoMap = new Map<string, number>();
      prs.forEach(pr => {
        const count = repoMap.get(pr.repositoryName) || 0;
        repoMap.set(pr.repositoryName, count + 1);
      });
      setRepositories(Array.from(repoMap.entries()).map(([name, prsCreated]) => ({ name, prsCreated })));

      setIsConnected(true);
      localStorage.setItem('neurolint_github_token', token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnect = () => {
    if (githubToken.trim()) {
      fetchAutoPRs(githubToken.trim());
      setShowTokenInput(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('neurolint_github_token');
    setGithubToken('');
    setIsConnected(false);
    setPullRequests([]);
    setStats({ totalCreated: 0, merged: 0, open: 0, closed: 0, successRate: 0 });
    setRepositories([]);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('neurolint_github_token');
    if (storedToken) {
      setGithubToken(storedToken);
      fetchAutoPRs(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [fetchAutoPRs]);

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

  if (!isConnected && !showTokenInput) {
    return (
      <div className="auto-pr-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h3>Auto PR Management</h3>
            <p>Manage automated pull requests created by NeuroLint</p>
          </div>
        </div>
        
        <div className="connect-github-card">
          <div className="connect-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          <h4>Connect GitHub</h4>
          <p>Connect your GitHub account to view and manage automated pull requests created by NeuroLint.</p>
          <button className="btn btn-primary" onClick={() => setShowTokenInput(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Connect GitHub Account
          </button>
          <p className="token-hint">You will need a GitHub Personal Access Token with repo scope.</p>
        </div>

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
          .connect-github-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 3rem 2rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid #000000;
            border-radius: 16px;
          }
          .connect-icon {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 1rem;
          }
          .connect-github-card h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 0.5rem 0;
          }
          .connect-github-card > p {
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 1.5rem 0;
            max-width: 400px;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
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
          .token-hint {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 1rem;
          }
        `}</style>
      </div>
    );
  }

  if (showTokenInput) {
    return (
      <div className="auto-pr-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h3>Auto PR Management</h3>
            <p>Manage automated pull requests created by NeuroLint</p>
          </div>
        </div>
        
        <div className="token-input-card">
          <button className="back-btn" onClick={() => setShowTokenInput(false)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h4>Enter GitHub Token</h4>
          <p>Create a Personal Access Token at GitHub Settings → Developer settings → Personal access tokens.</p>
          <p className="scope-info">Required scopes: <code>repo</code>, <code>read:user</code></p>
          
          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}
          
          <div className="token-form">
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button className="btn btn-primary" onClick={handleConnect} disabled={!githubToken.trim()}>
              Connect
            </button>
          </div>
        </div>

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
          .token-input-card {
            padding: 2rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid #000000;
            border-radius: 16px;
          }
          .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.875rem;
            cursor: pointer;
            padding: 0;
            margin-bottom: 1.5rem;
          }
          .back-btn:hover {
            color: #ffffff;
          }
          .token-input-card h4 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 0.5rem 0;
          }
          .token-input-card > p {
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 0.5rem 0;
            font-size: 0.875rem;
          }
          .scope-info {
            margin-bottom: 1.5rem !important;
          }
          .scope-info code {
            background: rgba(255, 255, 255, 0.1);
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.8rem;
          }
          .error-message {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            background: rgba(229, 62, 62, 0.15);
            border: 1px solid rgba(229, 62, 62, 0.3);
            border-radius: 8px;
            color: #e53e3e;
            font-size: 0.875rem;
            margin-bottom: 1rem;
          }
          .token-form {
            display: flex;
            gap: 0.75rem;
          }
          .token-form input {
            flex: 1;
            padding: 0.75rem 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #000000;
            border-radius: 8px;
            color: #ffffff;
            font-size: 0.875rem;
            font-family: monospace;
          }
          .token-form input::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }
          .token-form input:focus {
            outline: none;
            border-color: rgba(33, 150, 243, 0.5);
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
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
          .btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.3) 0%, rgba(255, 255, 255, 0.12) 100%);
          }
          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleDisconnect}>
            Disconnect
          </button>
          <button className="btn btn-primary" onClick={() => fetchAutoPRs(githubToken)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
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
            {filteredPRs.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h4>No Auto PRs Found</h4>
                <p>NeuroLint hasn&apos;t created any pull requests yet. Run NeuroLint on your repositories to get started.</p>
              </div>
            ) : (
              filteredPRs.map((pr) => (
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
              ))
            )}
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

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
        }

        .empty-state svg {
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 1rem;
        }

        .empty-state h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          font-size: 0.875rem;
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
