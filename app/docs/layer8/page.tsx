"use client";

import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";

export default function Layer8Page() {
  const { user, signOut } = useAuth();

  return (
    <div className="docs-container">
      <div className="docs-root">
        {/* Navigation Header */}
        <header className="docs-nav-header-internal">
          <div className="docs-nav-container-internal">
            <div className="docs-nav-left-internal">
              <Link href="/" className="docs-brand-internal">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fbcdfdb608d38407b88c1584fe3705961%2F1b38a4a385ed4a0bb404148fae0ce80e?format=webp&width=800"
                  alt="NeuroLint"
                  width="32"
                  height="32"
                />
                <span>NeuroLint</span>
              </Link>
            </div>

            <nav className="docs-nav-center-internal">
              <Link href="/dashboard" className="docs-nav-link-internal">
                Dashboard
              </Link>
              <Link href="/docs" className="docs-nav-link-internal active">
                Documentation
              </Link>
              <Link href="/pricing" className="docs-nav-link-internal">
                Pricing
              </Link>
            </nav>

            <div className="docs-nav-right-internal">
              {user ? (
                <div className="docs-user-menu-internal">
                  <Link href="/dashboard" className="docs-nav-btn-internal secondary">
                    Go to Dashboard
                  </Link>
                  <button onClick={signOut} className="docs-nav-btn-internal">
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="docs-auth-links-internal">
                  <Link href="/login" className="docs-nav-btn-internal secondary">
                    Sign In
                  </Link>
                  <Link href="/signup" className="docs-nav-btn-internal">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Back Navigation */}
        <div className="back-nav">
          <Link href="/docs/layers" className="back-link">
            ← Back to Layers Overview
          </Link>
        </div>

        {/* Header */}
        <div className="layer-header severity-critical">
          <div className="layer-header-content">
            <div className="layer-badge">Security Layer</div>
            <h1>Layer 8: Security Forensics</h1>
            <p>Advanced threat detection with 80 IoC signatures and CVE vulnerability scanning</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="layer-content">
          <div className="layer-section">
            <h2>What it does</h2>
            <p>
              Layer 8 provides comprehensive security forensics for your React and Next.js applications. 
              It scans for Indicators of Compromise (IoC), detects known CVE vulnerabilities including 
              CVE-2025-55182, and identifies potential security threats in your codebase.
            </p>
            
            <h2>Key Features</h2>
            <ul>
              <li><strong>80 IoC Signatures:</strong> Comprehensive library of threat indicators</li>
              <li><strong>CVE Detection:</strong> Identifies known vulnerabilities including CVE-2025-55182</li>
              <li><strong>Dependency Analysis:</strong> Scans for vulnerable package versions</li>
              <li><strong>Secret Detection:</strong> Finds exposed API keys and credentials</li>
              <li><strong>XSS Prevention:</strong> Identifies cross-site scripting vulnerabilities</li>
              <li><strong>Injection Detection:</strong> SQL and NoSQL injection pattern recognition</li>
            </ul>
            
            <h2>Use when</h2>
            <p>
              You need to ensure your application meets security compliance requirements, before 
              deploying to production, or when auditing existing codebases for security vulnerabilities. 
              This layer is essential for enterprise applications handling sensitive data.
            </p>

            <h2>CLI Usage</h2>
            <div className="code-block">
              <code>neurolint analyze ./src --layer=8 --security-report</code>
            </div>
            <p>
              Generate a detailed security report with vulnerability classifications and 
              remediation recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
