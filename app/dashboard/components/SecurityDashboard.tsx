"use client";

import React, { useState } from "react";

interface SecurityIssue {
  id: string;
  type: string;
  severity: string;
  message: string;
  description: string;
  line: number;
  category: string;
  cve?: string;
  remediation: string;
}

interface SecurityScanResult {
  issues: SecurityIssue[];
  summary: {
    totalThreats: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  riskLevel: string;
  compromiseIndicators: number;
}

const SAMPLE_VULNERABLE_CODE = `// Sample code with security vulnerabilities
'use server';

import { exec } from 'child_process';

export async function processUserInput(input) {
  // CRITICAL: Code injection via eval
  const result = eval(input);
  
  // HIGH: Command injection
  exec(\`echo \${input}\`, (error, stdout) => {
    console.log(stdout);
  });
  
  // HIGH: Hardcoded credentials
  const apiKey = "sk-1234567890abcdef";
  
  // MEDIUM: Dangerous HTML injection
  return <div dangerouslySetInnerHTML={{ __html: input }} />;
}
`;

export default function SecurityDashboard() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("component.tsx");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<SecurityScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!code.trim()) {
      setError("Please enter code to scan");
      return;
    }

    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          filename,
          layers: [8],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed");
      }

      const securityIssues = (data.analysis?.detectedIssues || []).filter(
        (issue: any) => issue.layer === 8 || issue.type?.includes("security")
      );

      const criticalCount = securityIssues.filter((i: any) => i.severity === "critical" || i.severity === "error").length;
      const highCount = securityIssues.filter((i: any) => i.severity === "high").length;
      const mediumCount = securityIssues.filter((i: any) => i.severity === "medium" || i.severity === "warning").length;
      const lowCount = securityIssues.filter((i: any) => i.severity === "low" || i.severity === "info").length;

      let riskLevel = "clean";
      if (criticalCount > 0) riskLevel = "critical";
      else if (highCount > 0) riskLevel = "high";
      else if (mediumCount > 0) riskLevel = "medium";
      else if (lowCount > 0) riskLevel = "low";

      setResult({
        issues: securityIssues,
        summary: {
          totalThreats: securityIssues.length,
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
        },
        riskLevel,
        compromiseIndicators: securityIssues.filter((i: any) => 
          i.type === "ioc" || i.type === "backdoor"
        ).length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const loadSample = () => {
    setCode(SAMPLE_VULNERABLE_CODE);
    setFilename("vulnerable-action.tsx");
  };

  return (
    <div className="security-dashboard">
      <div className="section-header">
        <div className="section-title-group">
          <h2 className="section-title">Security Forensics</h2>
          <p className="section-subtitle">Layer 8: IoC detection, CVE scanning, and compromise analysis</p>
        </div>
        <span className="status-badge status-error">Enterprise</span>
      </div>

      <div className="analysis-grid">
        <div className="analysis-panel glass-panel">
          <div className="panel-header">
            <h3 className="panel-title">Code Input</h3>
            <button onClick={loadSample} className="secondary-button small">
              Load Sample
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="form-input"
              placeholder="component.tsx"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Code to Scan</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="code-textarea"
              placeholder="Paste your code here for security analysis..."
            />
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning || !code.trim()}
            className={`primary-button full-width ${isScanning || !code.trim() ? "disabled" : ""}`}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {isScanning ? "Scanning..." : "Run Security Scan"}
          </button>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="info-panel glass-panel">
          <h3 className="panel-title">Threat Categories</h3>
          <div className="threat-list">
            {[
              { name: "Code Injection", desc: "eval(), Function()" },
              { name: "Backdoors", desc: "Reverse shells, webshells" },
              { name: "Data Exfiltration", desc: "Env leaks, beacons" },
              { name: "Supply Chain", desc: "postinstall hooks" },
              { name: "Crypto Mining", desc: "Mining libraries" },
              { name: "RSC Attacks", desc: "Server Action exploits" },
            ].map((cat) => (
              <div key={cat.name} className="threat-item">
                <div className="threat-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="threat-name">{cat.name}</p>
                  <p className="threat-desc">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {result && (
            <div className={`risk-summary risk-${result.riskLevel}`}>
              <h4>Risk Assessment</h4>
              <p className="risk-level">{result.riskLevel.toUpperCase()}</p>
              <div className="risk-stats">
                <div className="stat-row">
                  <span>Critical</span>
                  <span>{result.summary.criticalCount}</span>
                </div>
                <div className="stat-row">
                  <span>High</span>
                  <span>{result.summary.highCount}</span>
                </div>
                <div className="stat-row">
                  <span>Medium</span>
                  <span>{result.summary.mediumCount}</span>
                </div>
                <div className="stat-row">
                  <span>IoC Detected</span>
                  <span>{result.compromiseIndicators}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="results-panel glass-panel">
          <h3 className="panel-title">Security Issues ({result.issues.length})</h3>

          {result.issues.length === 0 ? (
            <div className="empty-state">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="success-text">No security threats detected</p>
              <p className="success-subtext">Your code passed Layer 8 security forensics</p>
            </div>
          ) : (
            <div className="issues-list">
              {result.issues.map((issue, idx) => (
                <div key={issue.id || idx} className="issue-item">
                  <span className={`severity-badge severity-${issue.severity}`}>
                    {issue.severity?.toUpperCase()}
                  </span>
                  <div className="issue-content">
                    <p className="issue-title">{issue.message}</p>
                    <p className="issue-desc">{issue.description}</p>
                    {issue.cve && <span className="cve-badge">{issue.cve}</span>}
                    <div className="issue-meta">
                      <span>Line {issue.line}</span>
                      {issue.category && <span>{issue.category}</span>}
                    </div>
                    {issue.remediation && (
                      <p className="issue-fix">Fix: {issue.remediation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .security-dashboard {
          padding: 1.5rem;
        }
        .section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }
        .section-subtitle {
          color: rgba(255, 255, 255, 0.6);
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .status-error {
          background: var(--error-glow, rgba(229, 62, 62, 0.12));
          color: var(--status-error, #e53e3e);
          border: 1px solid rgba(229, 62, 62, 0.3);
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1024px) {
          .analysis-grid {
            grid-template-columns: 1fr;
          }
        }
        .glass-panel {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
          backdrop-filter: blur(25px);
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 1.5rem;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .panel-title {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 8px;
          color: #ffffff;
          font-size: 0.875rem;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
        }
        .code-textarea {
          width: 100%;
          height: 240px;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 8px;
          color: #ffffff;
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          resize: vertical;
        }
        .code-textarea:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
        }
        .primary-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid #000000;
          border-radius: 8px;
          color: #ffffff;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .primary-button:hover:not(.disabled) {
          background: rgba(255, 255, 255, 0.15);
        }
        .primary-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .primary-button.full-width {
          width: 100%;
        }
        .secondary-button {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #000000;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .secondary-button.small {
          padding: 0.375rem 0.75rem;
        }
        .error-message {
          margin-top: 1rem;
          padding: 1rem;
          background: var(--error-glow, rgba(229, 62, 62, 0.12));
          border: 1px solid rgba(229, 62, 62, 0.3);
          border-radius: 8px;
        }
        .error-message p {
          margin: 0;
          color: var(--status-error, #e53e3e);
          font-size: 0.875rem;
        }
        .threat-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .threat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }
        .threat-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--error-glow, rgba(229, 62, 62, 0.12));
          border-radius: 50%;
          color: var(--status-error, #e53e3e);
        }
        .threat-name {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 500;
          color: #ffffff;
        }
        .threat-desc {
          margin: 0;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .risk-summary {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid;
        }
        .risk-summary h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .risk-level {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .risk-stats {
          margin-top: 1rem;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          padding: 0.25rem 0;
        }
        .risk-clean {
          background: var(--active-glow, rgba(76, 175, 80, 0.12));
          border-color: rgba(76, 175, 80, 0.3);
          color: var(--status-active, #4caf50);
        }
        .risk-low {
          background: var(--info-glow, rgba(33, 150, 243, 0.12));
          border-color: rgba(33, 150, 243, 0.3);
          color: var(--status-info, #2196f3);
        }
        .risk-medium {
          background: var(--processing-glow, rgba(255, 152, 0, 0.12));
          border-color: rgba(255, 152, 0, 0.3);
          color: var(--status-processing, #ff9800);
        }
        .risk-high, .risk-critical {
          background: var(--error-glow, rgba(229, 62, 62, 0.12));
          border-color: rgba(229, 62, 62, 0.3);
          color: var(--status-error, #e53e3e);
        }
        .results-panel {
          margin-top: 1.5rem;
        }
        .empty-state {
          text-align: center;
          padding: 2rem;
        }
        .success-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--active-glow, rgba(76, 175, 80, 0.12));
          border-radius: 50%;
          color: var(--status-active, #4caf50);
        }
        .success-text {
          margin: 0;
          font-weight: 500;
          color: var(--status-active, #4caf50);
        }
        .success-subtext {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .issue-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }
        .severity-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
          height: fit-content;
        }
        .severity-critical, .severity-error {
          background: var(--status-error, #e53e3e);
          color: #ffffff;
        }
        .severity-high {
          background: var(--status-processing, #ff9800);
          color: #000000;
        }
        .severity-medium, .severity-warning {
          background: var(--status-warning, #ffd700);
          color: #000000;
        }
        .severity-low, .severity-info {
          background: var(--status-info, #2196f3);
          color: #ffffff;
        }
        .issue-content {
          flex: 1;
        }
        .issue-title {
          margin: 0;
          font-weight: 500;
          color: #ffffff;
        }
        .issue-desc {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .cve-badge {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: var(--error-glow, rgba(229, 62, 62, 0.12));
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--status-error, #e53e3e);
        }
        .issue-meta {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }
        .issue-fix {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          color: var(--status-processing, #ff9800);
        }
      `}</style>
    </div>
  );
}
