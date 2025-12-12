export interface Issue {
  id: string;
  type: string;
  message: string;
  description: string;
  line: number;
  column: number;
  layer: number;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  fix?: {
    description: string;
    replacement?: string;
  };
}

export interface AnalysisResult {
  issues: Issue[];
  summary: {
    totalIssues: number;
    issuesByLayer: Record<number, number>;
    issuesBySeverity: Record<string, number>;
    qualityScore: number;
    readinessScore: number;
    recommendedLayers: number[];
  };
  security?: {
    threats: number;
    vulnerabilities: number;
    compromiseIndicators: number;
  };
  metadata?: {
    executionTime: number;
    platform: string;
    layersAnalyzed: number[];
    filename: string;
  };
}

export interface FixResult {
  success: boolean;
  code: string;
  originalCode: string;
  appliedFixes: Array<{
    id: string;
    layer: number;
    description: string;
    line: number;
  }>;
  error?: string;
}

interface AnalysisOptions {
  filename: string;
  layers: number[];
  verbose?: boolean;
}

interface Rule {
  id: string;
  layer: number;
  name: string;
  description: string;
  pattern: RegExp;
  check: (code: string, match: RegExpExecArray) => Issue | null;
  fix?: (code: string, match: RegExpExecArray) => string;
}

export class RuleEngine {
  private rules: Rule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = [
      {
        id: 'html-entities',
        layer: 2,
        name: 'HTML Entities',
        description: 'Convert HTML entities to proper characters',
        pattern: /&(quot|amp|lt|gt|nbsp);/g,
        check: (code, match) => ({
          id: `html-entity-${match.index}`,
          type: 'pattern',
          message: `HTML entity "${match[0]}" should be converted`,
          description: 'HTML entities should be replaced with actual characters in JSX',
          line: this.getLineNumber(code, match.index),
          column: this.getColumnNumber(code, match.index),
          layer: 2,
          severity: 'info',
          rule: 'html-entities',
          fix: {
            description: 'Replace HTML entity with character',
            replacement: this.decodeHtmlEntity(match[0])
          }
        }),
        fix: (code, match) => code.replace(match[0], this.decodeHtmlEntity(match[0]))
      },
      {
        id: 'console-statements',
        layer: 2,
        name: 'Console Statements',
        description: 'Remove console.log statements for production',
        pattern: /console\.(log|warn|error|debug|info)\s*\([^)]*\);?/g,
        check: (code, match) => ({
          id: `console-${match.index}`,
          type: 'pattern',
          message: `Console statement "${match[1]}" should be removed`,
          description: 'Console statements should be removed in production code',
          line: this.getLineNumber(code, match.index),
          column: this.getColumnNumber(code, match.index),
          layer: 2,
          severity: 'warning',
          rule: 'console-cleanup',
          fix: {
            description: 'Remove console statement'
          }
        })
      },
      {
        id: 'missing-keys',
        layer: 3,
        name: 'Missing Keys',
        description: 'Add key props to React list items',
        pattern: /\.map\s*\(\s*\(?([^)]*)\)?\s*=>\s*[(<]/g,
        check: (code, match) => {
          const mapStart = match.index;
          const context = code.slice(mapStart, mapStart + 500);
          if (!context.includes('key=') && !context.includes('key:')) {
            return {
              id: `missing-key-${match.index}`,
              type: 'component',
              message: 'Missing key prop in map function',
              description: 'React lists need unique key props for efficient reconciliation',
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
              layer: 3,
              severity: 'warning',
              rule: 'missing-keys',
              fix: {
                description: 'Add key prop using index or unique identifier'
              }
            };
          }
          return null;
        }
      },
      {
        id: 'img-alt',
        layer: 3,
        name: 'Image Alt Text',
        description: 'Add alt attributes to images for accessibility',
        pattern: /<img\s+(?![^>]*\balt\s*=)[^>]*>/gi,
        check: (code, match) => ({
          id: `img-alt-${match.index}`,
          type: 'accessibility',
          message: 'Image missing alt attribute',
          description: 'Images must have alt text for accessibility (WCAG 2.1)',
          line: this.getLineNumber(code, match.index),
          column: this.getColumnNumber(code, match.index),
          layer: 3,
          severity: 'warning',
          rule: 'img-alt',
          fix: {
            description: 'Add alt attribute to image'
          }
        })
      },
      {
        id: 'ssr-localstorage',
        layer: 4,
        name: 'SSR localStorage',
        description: 'Guard localStorage access for SSR',
        pattern: /(?<!typeof\s+window\s*[!=]==?\s*['"]undefined['"].*?)localStorage\./g,
        check: (code, match) => {
          const context = code.slice(Math.max(0, match.index - 100), match.index);
          if (!context.includes('typeof window') && !context.includes("'use client'")) {
            return {
              id: `ssr-localStorage-${match.index}`,
              type: 'hydration',
              message: 'Unguarded localStorage access',
              description: 'localStorage is not available during SSR and needs a typeof window guard',
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
              layer: 4,
              severity: 'error',
              rule: 'ssr-safety',
              fix: {
                description: 'Add typeof window !== "undefined" guard'
              }
            };
          }
          return null;
        }
      },
      {
        id: 'ssr-window',
        layer: 4,
        name: 'SSR window',
        description: 'Guard window access for SSR',
        pattern: /(?<!typeof\s+)window\.(location|history|navigator|document)/g,
        check: (code, match) => {
          const context = code.slice(Math.max(0, match.index - 100), match.index);
          if (!context.includes('typeof window') && !context.includes("'use client'")) {
            return {
              id: `ssr-window-${match.index}`,
              type: 'hydration',
              message: `Unguarded window.${match[1]} access`,
              description: 'window object is not available during SSR',
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
              layer: 4,
              severity: 'error',
              rule: 'ssr-safety',
              fix: {
                description: 'Add typeof window !== "undefined" guard or use client directive'
              }
            };
          }
          return null;
        }
      },
      {
        id: 'missing-use-client',
        layer: 5,
        name: 'Missing use client',
        description: 'Add use client directive for client components',
        pattern: /\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)\s*\(/g,
        check: (code, match) => {
          if (!code.includes("'use client'") && !code.includes('"use client"')) {
            return {
              id: `missing-use-client-${match.index}`,
              type: 'nextjs',
              message: `Hook "${match[1]}" requires 'use client' directive`,
              description: 'React hooks can only be used in Client Components in Next.js App Router',
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
              layer: 5,
              severity: 'warning',
              rule: 'use-client',
              fix: {
                description: "Add 'use client' directive at the top of the file"
              }
            };
          }
          return null;
        }
      },
      {
        id: 'forwardref-deprecation',
        layer: 5,
        name: 'forwardRef Deprecation',
        description: 'Migrate forwardRef to direct ref props (React 19)',
        pattern: /React\.forwardRef|forwardRef\s*\(/g,
        check: (code, match) => ({
          id: `forwardref-${match.index}`,
          type: 'migration',
          message: 'forwardRef is deprecated in React 19',
          description: 'React 19 supports ref as a regular prop, forwardRef is no longer needed',
          line: this.getLineNumber(code, match.index),
          column: this.getColumnNumber(code, match.index),
          layer: 5,
          severity: 'info',
          rule: 'react19-migration',
          fix: {
            description: 'Convert to direct ref prop pattern'
          }
        })
      },
      {
        id: 'missing-error-boundary',
        layer: 6,
        name: 'Missing Error Boundary',
        description: 'Components should have error boundaries',
        pattern: /export\s+default\s+function\s+(\w+Page|\w+Layout)/g,
        check: (code, match) => {
          if (!code.includes('ErrorBoundary') && !code.includes('error.tsx')) {
            return {
              id: `error-boundary-${match.index}`,
              type: 'testing',
              message: `Page component "${match[1]}" may need an error boundary`,
              description: 'Page and layout components should have error boundaries for graceful error handling',
              line: this.getLineNumber(code, match.index),
              column: this.getColumnNumber(code, match.index),
              layer: 6,
              severity: 'info',
              rule: 'error-boundary',
              fix: {
                description: 'Add error.tsx file for error boundary'
              }
            };
          }
          return null;
        }
      }
    ];
  }

  analyze(code: string, options: AnalysisOptions): AnalysisResult {
    const issues: Issue[] = [];
    const { layers, filename } = options;

    for (const rule of this.rules) {
      if (!layers.includes(rule.layer)) continue;

      let match;
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      
      while ((match = pattern.exec(code)) !== null) {
        const issue = rule.check(code, match);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    const issuesByLayer: Record<number, number> = {};
    const issuesBySeverity: Record<string, number> = { error: 0, warning: 0, info: 0 };

    for (const issue of issues) {
      issuesByLayer[issue.layer] = (issuesByLayer[issue.layer] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    }

    const qualityScore = this.calculateQualityScore(issues);
    const readinessScore = this.calculateReadinessScore(issues, code);
    const recommendedLayers = this.getRecommendedLayers(issues);

    return {
      issues,
      summary: {
        totalIssues: issues.length,
        issuesByLayer,
        issuesBySeverity,
        qualityScore,
        readinessScore,
        recommendedLayers
      }
    };
  }

  applyFixes(code: string, options: AnalysisOptions): FixResult {
    let fixedCode = code;
    const appliedFixes: FixResult['appliedFixes'] = [];
    const { layers } = options;

    for (const rule of this.rules) {
      if (!layers.includes(rule.layer)) continue;
      if (!rule.fix) continue;

      let match;
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      
      while ((match = pattern.exec(fixedCode)) !== null) {
        const issue = rule.check(fixedCode, match);
        if (issue) {
          const before = fixedCode;
          fixedCode = rule.fix(fixedCode, match);
          
          if (before !== fixedCode) {
            appliedFixes.push({
              id: issue.id,
              layer: rule.layer,
              description: issue.fix?.description || rule.description,
              line: issue.line
            });
          }
        }
      }
    }

    return {
      success: appliedFixes.length > 0,
      code: fixedCode,
      originalCode: code,
      appliedFixes
    };
  }

  private getLineNumber(code: string, index: number): number {
    return code.slice(0, index).split('\n').length;
  }

  private getColumnNumber(code: string, index: number): number {
    const lines = code.slice(0, index).split('\n');
    return (lines[lines.length - 1]?.length || 0) + 1;
  }

  private decodeHtmlEntity(entity: string): string {
    const entities: Record<string, string> = {
      '&quot;': '"',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&nbsp;': ' '
    };
    return entities[entity] || entity;
  }

  private calculateQualityScore(issues: Issue[]): number {
    if (issues.length === 0) return 100;
    
    const weights = { error: 10, warning: 5, info: 1 };
    const totalPenalty = issues.reduce((sum, issue) => {
      return sum + (weights[issue.severity] || 1);
    }, 0);
    
    return Math.max(0, Math.round(100 - totalPenalty));
  }

  private calculateReadinessScore(issues: Issue[], code: string): number {
    let score = 100;

    if (!code.includes("'use client'") && !code.includes('"use client"')) {
      const hasHooks = /\b(useState|useEffect|useContext)\b/.test(code);
      if (hasHooks) score -= 20;
    }

    const hydrationIssues = issues.filter(i => i.layer === 4);
    score -= hydrationIssues.length * 10;

    const accessibilityIssues = issues.filter(i => i.type === 'accessibility');
    score -= accessibilityIssues.length * 5;

    return Math.max(0, Math.round(score));
  }

  private getRecommendedLayers(issues: Issue[]): number[] {
    const layersWithIssues = [...new Set(issues.map(i => i.layer))];
    return layersWithIssues.length > 0 ? layersWithIssues.sort((a, b) => a - b) : [1, 2, 3];
  }
}
