export interface SecurityIssue {
  id: string;
  type: 'ioc' | 'vulnerability' | 'backdoor' | 'exfiltration' | 'crypto-miner' | 'supply-chain';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  description: string;
  line: number;
  column: number;
  category: string;
  cve?: string;
  remediation: string;
}

export interface SecurityScanResult {
  issues: SecurityIssue[];
  summary: {
    totalThreats: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    categories: Record<string, number>;
  };
  compromiseIndicators: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'clean';
}

interface SecurityPattern {
  id: string;
  type: SecurityIssue['type'];
  severity: SecurityIssue['severity'];
  category: string;
  pattern: RegExp;
  message: string;
  description: string;
  remediation: string;
  cve?: string;
}

export class SecurityScanner {
  private patterns: SecurityPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.patterns = [
      {
        id: 'eval-injection',
        type: 'ioc',
        severity: 'critical',
        category: 'Code Injection',
        pattern: /\beval\s*\([^)]*\)/g,
        message: 'Dangerous eval() usage detected',
        description: 'eval() executes arbitrary code and is a common attack vector',
        remediation: 'Remove eval() and use JSON.parse() for data or Function constructor alternatives'
      },
      {
        id: 'function-constructor',
        type: 'ioc',
        severity: 'high',
        category: 'Code Injection',
        pattern: /new\s+Function\s*\([^)]*\)/g,
        message: 'Dynamic Function constructor detected',
        description: 'Function constructor can execute arbitrary code similar to eval()',
        remediation: 'Avoid dynamic function creation, use static functions instead'
      },
      {
        id: 'base64-payload',
        type: 'backdoor',
        severity: 'high',
        category: 'Obfuscation',
        pattern: /atob\s*\(\s*['"`][A-Za-z0-9+/=]{50,}['"`]\s*\)/g,
        message: 'Suspicious Base64 encoded payload detected',
        description: 'Large Base64 strings decoded at runtime may contain malicious code',
        remediation: 'Review the decoded content and verify its legitimacy'
      },
      {
        id: 'hex-encoding',
        type: 'ioc',
        severity: 'medium',
        category: 'Obfuscation',
        pattern: /\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){10,}/g,
        message: 'Hex-encoded string detected',
        description: 'Long hex-encoded strings may be hiding malicious payloads',
        remediation: 'Decode and review the content'
      },
      {
        id: 'reverse-shell',
        type: 'backdoor',
        severity: 'critical',
        category: 'Backdoor',
        pattern: /child_process.*exec.*\b(nc|netcat|bash|sh|cmd)\b/gi,
        message: 'Potential reverse shell command detected',
        description: 'This pattern is commonly used in reverse shells and backdoors',
        remediation: 'Remove the code and audit for compromise'
      },
      {
        id: 'env-exfiltration',
        type: 'exfiltration',
        severity: 'high',
        category: 'Data Exfiltration',
        pattern: /fetch\s*\([^)]*process\.env/g,
        message: 'Environment variable exfiltration attempt',
        description: 'Sending process.env data over network could leak secrets',
        remediation: 'Never transmit environment variables, especially secrets'
      },
      {
        id: 'credentials-in-code',
        type: 'vulnerability',
        severity: 'high',
        category: 'Hardcoded Credentials',
        pattern: /(password|apikey|api_key|secret|token)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi,
        message: 'Potential hardcoded credentials detected',
        description: 'Hardcoded credentials in source code are a security risk',
        remediation: 'Move credentials to environment variables'
      },
      {
        id: 'crypto-miner',
        type: 'crypto-miner',
        severity: 'critical',
        category: 'Crypto Mining',
        pattern: /\b(coinhive|cryptonight|monero|stratum\+tcp|minergate)/gi,
        message: 'Crypto mining library or protocol detected',
        description: 'Unauthorized crypto mining uses resources without consent',
        remediation: 'Remove crypto mining code immediately'
      },
      {
        id: 'postinstall-script',
        type: 'supply-chain',
        severity: 'high',
        category: 'Supply Chain',
        pattern: /"postinstall"\s*:\s*"[^"]*\b(curl|wget|sh|bash|node\s+-e)/g,
        message: 'Suspicious postinstall script detected',
        description: 'Postinstall scripts that download/execute code are high risk',
        remediation: 'Review and remove suspicious postinstall commands'
      },
      {
        id: 'rsc-action-injection',
        type: 'vulnerability',
        severity: 'critical',
        category: 'RSC Security',
        pattern: /'use server'[\s\S]*?(eval|Function|import\()/g,
        message: 'Dynamic code execution in Server Action',
        description: 'Server Actions with dynamic code execution can lead to RCE',
        remediation: 'Never use eval or dynamic imports in Server Actions',
        cve: 'CVE-2025-55182'
      },
      {
        id: 'unsafe-redirect',
        type: 'vulnerability',
        severity: 'medium',
        category: 'Open Redirect',
        pattern: /redirect\s*\(\s*(?!['"`]\/|['"`]http)/g,
        message: 'Potentially unsafe redirect',
        description: 'Redirects using user input can lead to phishing attacks',
        remediation: 'Validate redirect URLs against an allowlist'
      },
      {
        id: 'dangerously-set-html',
        type: 'vulnerability',
        severity: 'medium',
        category: 'XSS',
        pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*[^}]*\}\s*\}/g,
        message: 'dangerouslySetInnerHTML usage detected',
        description: 'Setting HTML directly can lead to XSS if not sanitized',
        remediation: 'Sanitize HTML content with DOMPurify or similar'
      },
      {
        id: 'sql-injection',
        type: 'vulnerability',
        severity: 'critical',
        category: 'SQL Injection',
        pattern: /\$\{[^}]*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
        message: 'Potential SQL injection vulnerability',
        description: 'String interpolation in SQL queries can lead to injection',
        remediation: 'Use parameterized queries or an ORM'
      },
      {
        id: 'webshell-pattern',
        type: 'backdoor',
        severity: 'critical',
        category: 'Webshell',
        pattern: /\b(passthru|shell_exec|system|exec)\s*\(\s*\$_(GET|POST|REQUEST)/gi,
        message: 'Webshell pattern detected',
        description: 'This pattern is commonly found in webshells',
        remediation: 'Remove the code and audit for compromise'
      },
      {
        id: 'prototype-pollution',
        type: 'vulnerability',
        severity: 'high',
        category: 'Prototype Pollution',
        pattern: /\[['"`]__proto__['"`]\]|\[['"`]constructor['"`]\]\[['"`]prototype['"`]\]/g,
        message: 'Potential prototype pollution',
        description: 'Accessing __proto__ or constructor.prototype can lead to pollution',
        remediation: 'Validate and sanitize object keys'
      }
    ];
  }

  scan(code: string, filename: string): SecurityScanResult {
    const issues: SecurityIssue[] = [];
    const categories: Record<string, number> = {};

    for (const pattern of this.patterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(code)) !== null) {
        issues.push({
          id: `${pattern.id}-${match.index}`,
          type: pattern.type,
          severity: pattern.severity,
          message: pattern.message,
          description: pattern.description,
          line: this.getLineNumber(code, match.index),
          column: this.getColumnNumber(code, match.index),
          category: pattern.category,
          cve: pattern.cve,
          remediation: pattern.remediation
        });

        categories[pattern.category] = (categories[pattern.category] || 0) + 1;
      }
    }

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    let riskLevel: SecurityScanResult['riskLevel'] = 'clean';
    if (criticalCount > 0) riskLevel = 'critical';
    else if (highCount > 0) riskLevel = 'high';
    else if (mediumCount > 0) riskLevel = 'medium';
    else if (lowCount > 0) riskLevel = 'low';

    return {
      issues,
      summary: {
        totalThreats: issues.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        categories
      },
      compromiseIndicators: issues.filter(i => i.type === 'ioc' || i.type === 'backdoor').length,
      riskLevel
    };
  }

  private getLineNumber(code: string, index: number): number {
    return code.slice(0, index).split('\n').length;
  }

  private getColumnNumber(code: string, index: number): number {
    const lines = code.slice(0, index).split('\n');
    return (lines[lines.length - 1]?.length || 0) + 1;
  }
}
