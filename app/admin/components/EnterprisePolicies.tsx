'use client';

import React, { useState, useEffect } from "react";

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'quality' | 'performance' | 'compliance';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  autoFix: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamControl {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'number' | 'select';
  value: boolean | number | string;
  options?: string[];
  category: string;
}

export default function EnterprisePolicies() {
  const [activeTab, setActiveTab] = useState<"rules" | "controls" | "audit">("rules");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [policyRules, setPolicyRules] = useState<PolicyRule[]>([
    {
      id: "1",
      name: "Require React 18+ Patterns",
      description: "Enforce modern React patterns including concurrent features and automatic batching",
      category: 'quality',
      severity: 'warning',
      enabled: true,
      autoFix: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "2",
      name: "No Console Statements",
      description: "Prevent console.log and other console methods in production code",
      category: 'quality',
      severity: 'error',
      enabled: true,
      autoFix: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "3",
      name: "Accessibility Standards",
      description: "Enforce WCAG 2.1 AA accessibility requirements for all components",
      category: 'compliance',
      severity: 'error',
      enabled: true,
      autoFix: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "4",
      name: "TypeScript Strict Mode",
      description: "Require strict TypeScript configuration with no implicit any",
      category: 'quality',
      severity: 'error',
      enabled: false,
      autoFix: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "5",
      name: "Performance Budget",
      description: "Enforce bundle size limits and lazy loading for large components",
      category: 'performance',
      severity: 'warning',
      enabled: true,
      autoFix: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "6",
      name: "Security Headers",
      description: "Validate proper security headers and prevent XSS vulnerabilities",
      category: 'security',
      severity: 'error',
      enabled: true,
      autoFix: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  const [teamControls, setTeamControls] = useState<TeamControl[]>([
    {
      id: "1",
      name: "Auto-fix on Analysis",
      description: "Automatically apply safe fixes when running code analysis",
      type: 'boolean',
      value: true,
      category: "Analysis"
    },
    {
      id: "2",
      name: "Require PR Approval",
      description: "Require team lead approval before merging auto-generated PRs",
      type: 'boolean',
      value: true,
      category: "Git Integration"
    },
    {
      id: "3",
      name: "Maximum Issues Per PR",
      description: "Limit the number of issues fixed in a single pull request",
      type: 'number',
      value: 25,
      category: "Git Integration"
    },
    {
      id: "4",
      name: "Default Scan Scope",
      description: "Default scope for repository scans",
      type: 'select',
      value: "changed-files",
      options: ["all-files", "changed-files", "staged-files"],
      category: "Analysis"
    },
    {
      id: "5",
      name: "Notify on Critical Issues",
      description: "Send notifications when critical issues are detected",
      type: 'boolean',
      value: true,
      category: "Notifications"
    },
    {
      id: "6",
      name: "Block Merge on Errors",
      description: "Prevent merging when error-level issues exist",
      type: 'boolean',
      value: false,
      category: "Git Integration"
    }
  ]);

  const [auditLog] = useState([
    { id: "1", action: "Policy Updated", user: "admin@company.com", target: "Require React 18+ Patterns", timestamp: new Date() },
    { id: "2", action: "Control Changed", user: "admin@company.com", target: "Auto-fix on Analysis", timestamp: new Date(Date.now() - 3600000) },
    { id: "3", action: "Policy Enabled", user: "admin@company.com", target: "Security Headers", timestamp: new Date(Date.now() - 86400000) },
    { id: "4", action: "Policy Created", user: "admin@company.com", target: "Performance Budget", timestamp: new Date(Date.now() - 172800000) }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const toggleRule = (ruleId: string) => {
    setPolicyRules(rules => 
      rules.map(rule => 
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled, updatedAt: new Date() } : rule
      )
    );
  };

  const toggleAutoFix = (ruleId: string) => {
    setPolicyRules(rules => 
      rules.map(rule => 
        rule.id === ruleId ? { ...rule, autoFix: !rule.autoFix, updatedAt: new Date() } : rule
      )
    );
  };

  const updateControl = (controlId: string, value: boolean | number | string) => {
    setTeamControls(controls =>
      controls.map(control =>
        control.id === controlId ? { ...control, value } : control
      )
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'rgba(229, 62, 62, 0.2)';
      case 'quality': return 'rgba(33, 150, 243, 0.2)';
      case 'performance': return 'rgba(156, 39, 176, 0.2)';
      case 'compliance': return 'rgba(76, 175, 80, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const getCategoryTextColor = (category: string) => {
    switch (category) {
      case 'security': return '#e53e3e';
      case 'quality': return '#2196f3';
      case 'performance': return '#9c27b0';
      case 'compliance': return '#4caf50';
      default: return '#ffffff';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#e53e3e';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#666666';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredRules = policyRules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="enterprise-policies-root">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading enterprise policies...</p>
        </div>
        <style jsx>{`
          .enterprise-policies-root {
            padding: 2rem;
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
    <div className="enterprise-policies-root">
      <div className="policies-header">
        <div className="header-title">
          <h2>Enterprise Policies</h2>
          <p>Configure organization-wide rules and team controls</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Policy
          </button>
        </div>
      </div>

      <div className="tab-navigation">
        {(["rules", "controls", "audit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            {tab === "rules" ? "Policy Rules" : tab === "controls" ? "Team Controls" : "Audit Log"}
          </button>
        ))}
      </div>

      {activeTab === "rules" && (
        <div className="rules-section">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rules-list">
            {filteredRules.map((rule) => (
              <div key={rule.id} className={`rule-card ${rule.enabled ? 'enabled' : 'disabled'}`}>
                <div className="rule-header">
                  <div className="rule-info">
                    <div className="rule-name">{rule.name}</div>
                    <div className="rule-badges">
                      <span 
                        className="category-badge"
                        style={{ 
                          background: getCategoryColor(rule.category),
                          color: getCategoryTextColor(rule.category)
                        }}
                      >
                        {rule.category}
                      </span>
                      <span 
                        className="severity-badge"
                        style={{ color: getSeverityColor(rule.severity) }}
                      >
                        {rule.severity}
                      </span>
                    </div>
                  </div>
                  <div className="rule-toggle">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleRule(rule.id)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
                <div className="rule-description">{rule.description}</div>
                <div className="rule-footer">
                  <div className="auto-fix-toggle">
                    <input
                      type="checkbox"
                      id={`autofix-${rule.id}`}
                      checked={rule.autoFix}
                      onChange={() => toggleAutoFix(rule.id)}
                      disabled={!rule.enabled}
                    />
                    <label htmlFor={`autofix-${rule.id}`}>Auto-fix</label>
                  </div>
                  <span className="updated-at">Updated {formatRelativeTime(rule.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "controls" && (
        <div className="controls-section">
          {Array.from(new Set(teamControls.map(c => c.category))).map(category => (
            <div key={category} className="control-group">
              <h3 className="control-category">{category}</h3>
              <div className="controls-list">
                {teamControls.filter(c => c.category === category).map((control) => (
                  <div key={control.id} className="control-card">
                    <div className="control-info">
                      <div className="control-name">{control.name}</div>
                      <div className="control-description">{control.description}</div>
                    </div>
                    <div className="control-input">
                      {control.type === 'boolean' && (
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={control.value as boolean}
                            onChange={(e) => updateControl(control.id, e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      )}
                      {control.type === 'number' && (
                        <input
                          type="number"
                          value={control.value as number}
                          onChange={(e) => updateControl(control.id, parseInt(e.target.value) || 0)}
                          className="number-input"
                        />
                      )}
                      {control.type === 'select' && (
                        <select
                          value={control.value as string}
                          onChange={(e) => updateControl(control.id, e.target.value)}
                          className="select-input"
                        >
                          {control.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="audit-section">
          <div className="audit-list">
            {auditLog.map((entry) => (
              <div key={entry.id} className="audit-entry">
                <div className="audit-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                </div>
                <div className="audit-content">
                  <div className="audit-action">{entry.action}</div>
                  <div className="audit-details">
                    <span className="audit-target">{entry.target}</span>
                    <span className="audit-user">by {entry.user}</span>
                  </div>
                </div>
                <div className="audit-time">{formatRelativeTime(entry.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .enterprise-policies-root {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .policies-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
        }

        .header-title p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          font-size: 1rem;
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
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
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

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .search-bar svg {
          color: rgba(255, 255, 255, 0.5);
          flex-shrink: 0;
        }

        .search-bar input {
          flex: 1;
          background: none;
          border: none;
          color: #ffffff;
          font-size: 0.875rem;
          outline: none;
        }

        .search-bar input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rule-card {
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .rule-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .rule-card.disabled {
          opacity: 0.6;
        }

        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .rule-name {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .rule-badges {
          display: flex;
          gap: 0.5rem;
        }

        .category-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .severity-badge {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .rule-description {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .rule-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .auto-fix-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .auto-fix-toggle input {
          accent-color: #2196f3;
        }

        .auto-fix-toggle input:disabled {
          opacity: 0.5;
        }

        .updated-at {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
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

        .control-group {
          margin-bottom: 2rem;
        }

        .control-category {
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .controls-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .control-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
        }

        .control-info {
          flex: 1;
        }

        .control-name {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.25rem;
        }

        .control-description {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
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

        .select-input {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 6px;
          color: #ffffff;
          font-size: 0.875rem;
        }

        .select-input option {
          background: #1a1a1a;
        }

        .audit-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .audit-entry {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
        }

        .audit-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(33, 150, 243, 0.1);
          border-radius: 8px;
          color: rgba(33, 150, 243, 0.8);
          flex-shrink: 0;
        }

        .audit-content {
          flex: 1;
        }

        .audit-action {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.125rem;
        }

        .audit-details {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .audit-target {
          color: rgba(33, 150, 243, 0.8);
        }

        .audit-user {
          margin-left: 0.5rem;
        }

        .audit-time {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 768px) {
          .policies-header {
            flex-direction: column;
          }

          .tab-navigation {
            flex-direction: column;
          }

          .control-card {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
