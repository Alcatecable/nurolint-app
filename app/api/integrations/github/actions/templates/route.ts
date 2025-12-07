import { NextRequest, NextResponse } from "next/server";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'security' | 'pr-check' | 'scheduled';
  triggers: string[];
  content: string;
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'basic-analysis',
    name: 'Basic Code Analysis',
    description: 'Run NeuroLint analysis on push and pull requests',
    category: 'analysis',
    triggers: ['push', 'pull_request'],
    content: `name: NeuroLint Analysis

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run NeuroLint Analysis
        uses: neurolint/analyze-action@v1
        with:
          api-key: \${{ secrets.NEUROLINT_API_KEY }}
          layers: '1,2,3,4,5,6,7'
          fail-on-issues: 'false'
          
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: neurolint-report
          path: neurolint-report.json`
  },
  {
    id: 'pr-check',
    name: 'PR Quality Gate',
    description: 'Block PRs that fail quality thresholds',
    category: 'pr-check',
    triggers: ['pull_request'],
    content: `name: NeuroLint PR Quality Gate

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Get Changed Files
        id: changed
        uses: tj-actions/changed-files@v40
        with:
          files: |
            **/*.ts
            **/*.tsx
            **/*.js
            **/*.jsx
            **/*.py
            
      - name: Run NeuroLint on Changed Files
        if: steps.changed.outputs.any_changed == 'true'
        uses: neurolint/analyze-action@v1
        with:
          api-key: \${{ secrets.NEUROLINT_API_KEY }}
          files: \${{ steps.changed.outputs.all_changed_files }}
          fail-on-issues: 'true'
          min-quality-score: '70'
          
      - name: Comment PR Results
        if: always()
        uses: neurolint/pr-comment-action@v1
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}`
  },
  {
    id: 'security-scan',
    name: 'Security Vulnerability Scan',
    description: 'Deep security analysis with Layer 6 focus',
    category: 'security',
    triggers: ['push', 'pull_request', 'schedule'],
    content: `name: NeuroLint Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Security Analysis
        uses: neurolint/security-action@v1
        with:
          api-key: \${{ secrets.NEUROLINT_API_KEY }}
          layers: '6'
          severity-threshold: 'medium'
          
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: neurolint-security.sarif
          
      - name: Create Issues for Critical
        if: failure()
        uses: neurolint/create-issues-action@v1
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          severity: 'critical,high'`
  },
  {
    id: 'scheduled-full',
    name: 'Scheduled Full Analysis',
    description: 'Weekly comprehensive codebase analysis',
    category: 'scheduled',
    triggers: ['schedule', 'workflow_dispatch'],
    content: `name: NeuroLint Weekly Analysis

on:
  schedule:
    - cron: '0 2 * * 0'
  workflow_dispatch:
    inputs:
      layers:
        description: 'Analysis layers (comma-separated)'
        default: '1,2,3,4,5,6,7'
        required: false

jobs:
  full-analysis:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Run Full Analysis
        uses: neurolint/analyze-action@v1
        with:
          api-key: \${{ secrets.NEUROLINT_API_KEY }}
          layers: \${{ github.event.inputs.layers || '1,2,3,4,5,6,7' }}
          output-format: 'json,html,sarif'
          
      - name: Generate Trend Report
        uses: neurolint/trend-action@v1
        with:
          api-key: \${{ secrets.NEUROLINT_API_KEY }}
          compare-with: 'last-week'
          
      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: neurolint-weekly-report
          path: |
            neurolint-report.json
            neurolint-report.html
            neurolint-trends.json
          retention-days: 90
          
      - name: Send Slack Notification
        if: always()
        uses: neurolint/notify-action@v1
        with:
          webhook-url: \${{ secrets.SLACK_WEBHOOK }}
          include-trends: 'true'`
  },
  {
    id: 'monorepo',
    name: 'Monorepo Analysis',
    description: 'Analyze specific packages in monorepo setup',
    category: 'analysis',
    triggers: ['push', 'pull_request'],
    content: `name: NeuroLint Monorepo Analysis

on:
  push:
    branches: [main]
    paths:
      - 'packages/**'
      - 'apps/**'
  pull_request:
    branches: [main]
    paths:
      - 'packages/**'
      - 'apps/**'

env:
  PACKAGE_PATHS: '{"web":"apps/web","api":"apps/api","ui":"packages/ui","utils":"packages/utils"}'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            web: 'apps/web/**'
            api: 'apps/api/**'
            ui: 'packages/ui/**'
            utils: 'packages/utils/**'
            
      - name: Set Matrix
        id: set-matrix
        run: |
          PACKAGES='[]'
          if [ "\${{ steps.filter.outputs.web }}" == "true" ]; then
            PACKAGES=$(echo $PACKAGES | jq -c '. + [{"name": "web", "path": "apps/web"}]')
          fi
          if [ "\${{ steps.filter.outputs.api }}" == "true" ]; then
            PACKAGES=$(echo $PACKAGES | jq -c '. + [{"name": "api", "path": "apps/api"}]')
          fi
          if [ "\${{ steps.filter.outputs.ui }}" == "true" ]; then
            PACKAGES=$(echo $PACKAGES | jq -c '. + [{"name": "ui", "path": "packages/ui"}]')
          fi
          if [ "\${{ steps.filter.outputs.utils }}" == "true" ]; then
            PACKAGES=$(echo $PACKAGES | jq -c '. + [{"name": "utils", "path": "packages/utils"}]')
          fi
          echo "matrix={\\\"include\\\":$PACKAGES}" >> $GITHUB_OUTPUT

  analyze:
    needs: detect-changes
    if: \${{ needs.detect-changes.outputs.matrix != '{"include":[]}' }}
    runs-on: ubuntu-latest
    strategy:
      matrix: \${{ fromJson(needs.detect-changes.outputs.matrix) }}
      fail-fast: false
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Analyze \${{ matrix.name }}
        uses: neurolint/analyze-action@v1
        with:
          api-key: \${{ secrets.NEUROLINT_API_KEY }}
          working-directory: \${{ matrix.path }}
          output-prefix: \${{ matrix.name }}`
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const templateId = searchParams.get('id');

  if (templateId) {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(template);
  }

  let templates = WORKFLOW_TEMPLATES;
  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  return NextResponse.json({
    templates: templates.map(({ content, ...rest }) => rest),
    categories: ['analysis', 'security', 'pr-check', 'scheduled']
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, customizations } = body;

    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    let workflowContent = template.content;

    if (customizations) {
      if (customizations.branches) {
        workflowContent = workflowContent.replace(
          /branches: \[.*?\]/g,
          `branches: [${customizations.branches.join(', ')}]`
        );
      }
      if (customizations.layers) {
        workflowContent = workflowContent.replace(
          /layers: '[^']*'/g,
          `layers: '${customizations.layers}'`
        );
      }
      if (customizations.minQualityScore) {
        workflowContent = workflowContent.replace(
          /min-quality-score: '[^']*'/g,
          `min-quality-score: '${customizations.minQualityScore}'`
        );
      }
      if (customizations.failOnIssues !== undefined) {
        workflowContent = workflowContent.replace(
          /fail-on-issues: '[^']*'/g,
          `fail-on-issues: '${customizations.failOnIssues}'`
        );
      }
    }

    return NextResponse.json({
      success: true,
      workflow: workflowContent,
      filename: `neurolint-${template.id}.yml`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate workflow' },
      { status: 500 }
    );
  }
}
