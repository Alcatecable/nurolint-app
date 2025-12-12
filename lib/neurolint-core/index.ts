import { RuleEngine, type AnalysisResult, type FixResult, type Issue } from './rule-engine';
import { SecurityScanner, type SecurityScanResult, type SecurityIssue } from './security-scanner';

export interface NeuroLintConfig {
  layers: number[];
  verbose?: boolean;
  platform?: 'web' | 'cli' | 'vscode';
}

export interface AnalysisOptions {
  filename?: string;
  layers?: number[];
  verbose?: boolean;
}

function convertSecurityToIssue(issue: SecurityIssue): Issue {
  return {
    id: issue.id,
    type: issue.type,
    message: issue.message,
    description: issue.description,
    line: issue.line,
    column: issue.column,
    layer: 8,
    severity: issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info',
    rule: `security-${issue.type}`,
    fix: {
      description: issue.remediation
    }
  };
}

class NeuroLintCore {
  private ruleEngine: RuleEngine;
  private securityScanner: SecurityScanner;
  private initialized: boolean = false;
  private config: NeuroLintConfig;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.securityScanner = new SecurityScanner();
    this.config = {
      layers: [1, 2, 3, 4, 5, 6, 7, 8],
      verbose: false,
      platform: 'web'
    };
  }

  async initialize(options: Partial<NeuroLintConfig> = {}): Promise<boolean> {
    this.config = { ...this.config, ...options };
    this.initialized = true;
    return true;
  }

  async analyze(code: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const layers = options.layers || this.config.layers;
    const filename = options.filename || 'unknown.tsx';
    const verbose = options.verbose ?? this.config.verbose ?? false;

    const result = this.ruleEngine.analyze(code, {
      filename,
      layers,
      verbose
    });

    if (layers.includes(8)) {
      const securityResult = this.securityScanner.scan(code, filename);
      result.issues.push(...securityResult.issues.map(convertSecurityToIssue));
      result.security = {
        threats: securityResult.summary.totalThreats,
        vulnerabilities: securityResult.issues.filter(i => i.type === 'vulnerability').length,
        compromiseIndicators: securityResult.compromiseIndicators
      };
    }

    result.metadata = {
      executionTime: Date.now() - startTime,
      platform: this.config.platform || 'web',
      layersAnalyzed: layers,
      filename
    };

    return result;
  }

  async applyFixes(code: string, options: AnalysisOptions = {}): Promise<FixResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const layers = options.layers || this.config.layers;
    const filename = options.filename || 'unknown.tsx';
    const verbose = options.verbose ?? this.config.verbose ?? false;

    return this.ruleEngine.applyFixes(code, {
      filename,
      layers,
      verbose
    });
  }

  async scanSecurity(code: string, filename?: string): Promise<SecurityScanResult> {
    return this.securityScanner.scan(code, filename || 'unknown.tsx');
  }

  getLayerInfo(): Array<{ id: number; name: string; description: string }> {
    return [
      { id: 1, name: 'Configuration', description: 'Updates tsconfig.json, next.config.js, package.json' },
      { id: 2, name: 'Patterns', description: 'Standardizes variables, removes console statements, HTML entities' },
      { id: 3, name: 'Components', description: 'Adds keys, accessibility attributes, prop types' },
      { id: 4, name: 'Hydration', description: 'Guards client-side APIs for SSR safety' },
      { id: 5, name: 'Next.js', description: 'Optimizes App Router with use client/server directives' },
      { id: 6, name: 'Testing', description: 'Adds error boundaries, prop types, loading states' },
      { id: 7, name: 'Adaptive', description: 'Learns and applies patterns from prior fixes' },
      { id: 8, name: 'Security Forensics', description: 'Detects IoCs, supply chain attacks, CVE vulnerabilities' }
    ];
  }

  getVersion(): string {
    return '1.5.2';
  }
}

export const neurolintCore = new NeuroLintCore();

export { RuleEngine, SecurityScanner };
export type { AnalysisResult, FixResult, SecurityScanResult };
