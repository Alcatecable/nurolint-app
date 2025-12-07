import { NextRequest, NextResponse } from "next/server";

interface CITemplate {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'security' | 'mr-check' | 'scheduled';
  stages: string[];
  content: string;
}

const CI_TEMPLATES: CITemplate[] = [
  {
    id: 'basic-analysis',
    name: 'Basic Code Analysis',
    description: 'Run NeuroLint analysis on merge requests and pushes',
    category: 'analysis',
    stages: ['analyze'],
    content: `stages:
  - analyze

variables:
  NEUROLINT_LAYERS: "1,2,3,4,5,6,7"

neurolint-analysis:
  stage: analyze
  image: neurolint/cli:latest
  script:
    - neurolint analyze --api-key $NEUROLINT_API_KEY --layers $NEUROLINT_LAYERS --output report.json
  artifacts:
    paths:
      - report.json
    reports:
      codequality: report.json
    expire_in: 30 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`
  },
  {
    id: 'mr-quality-gate',
    name: 'MR Quality Gate',
    description: 'Block merge requests that fail quality thresholds',
    category: 'mr-check',
    stages: ['test'],
    content: `stages:
  - test

variables:
  NEUROLINT_MIN_SCORE: "70"
  NEUROLINT_FAIL_ON_ISSUES: "true"

neurolint-quality-gate:
  stage: test
  image: neurolint/cli:latest
  script:
    - |
      echo "Fetching changed files..."
      CHANGED_FILES=$(git diff --name-only $CI_MERGE_REQUEST_DIFF_BASE_SHA...$CI_COMMIT_SHA | grep -E '\\.(ts|tsx|js|jsx|py)$' || true)
      if [ -n "$CHANGED_FILES" ]; then
        echo "Analyzing changed files: $CHANGED_FILES"
        neurolint analyze --api-key $NEUROLINT_API_KEY --files "$CHANGED_FILES" --min-score $NEUROLINT_MIN_SCORE --fail-on-issues $NEUROLINT_FAIL_ON_ISSUES
      else
        echo "No relevant files changed"
      fi
  artifacts:
    reports:
      codequality: neurolint-report.json
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  allow_failure: false`
  },
  {
    id: 'security-scan',
    name: 'Security Vulnerability Scan',
    description: 'Deep security analysis with Layer 6 focus',
    category: 'security',
    stages: ['security'],
    content: `stages:
  - security

variables:
  NEUROLINT_SEVERITY_THRESHOLD: "medium"

neurolint-security-scan:
  stage: security
  image: neurolint/cli:latest
  script:
    - neurolint analyze --api-key $NEUROLINT_API_KEY --layers 6 --severity-threshold $NEUROLINT_SEVERITY_THRESHOLD --output security-report.json --format sarif
  artifacts:
    paths:
      - security-report.json
      - neurolint-security.sarif
    reports:
      sast: neurolint-security.sarif
    expire_in: 90 days
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_PIPELINE_SOURCE == "schedule"

create-security-issues:
  stage: security
  image: alpine:latest
  needs:
    - neurolint-security-scan
  script:
    - |
      apk add --no-cache curl jq
      CRITICAL_COUNT=$(jq '.runs[0].results | map(select(.level == "error")) | length' neurolint-security.sarif)
      if [ "$CRITICAL_COUNT" -gt 0 ]; then
        echo "Found $CRITICAL_COUNT critical security issues!"
        exit 1
      fi
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: on_failure`
  },
  {
    id: 'scheduled-analysis',
    name: 'Scheduled Full Analysis',
    description: 'Weekly comprehensive codebase analysis',
    category: 'scheduled',
    stages: ['analyze', 'report'],
    content: `stages:
  - analyze
  - report

variables:
  NEUROLINT_LAYERS: "1,2,3,4,5,6,7"

neurolint-full-analysis:
  stage: analyze
  image: neurolint/cli:latest
  script:
    - neurolint analyze --api-key $NEUROLINT_API_KEY --layers $NEUROLINT_LAYERS --output full-report.json --format json,html
    - neurolint trends --api-key $NEUROLINT_API_KEY --compare-with last-week --output trends-report.json
  artifacts:
    paths:
      - full-report.json
      - full-report.html
      - trends-report.json
    reports:
      codequality: full-report.json
    expire_in: 90 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_PIPELINE_SOURCE == "web"

send-notification:
  stage: report
  image: alpine:latest
  needs:
    - neurolint-full-analysis
  script:
    - |
      apk add --no-cache curl jq
      TOTAL_ISSUES=$(jq '.summary.totalIssues' full-report.json)
      QUALITY_SCORE=$(jq '.summary.qualityScore' full-report.json)
      curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"Weekly NeuroLint Report: Quality Score $QUALITY_SCORE, Total Issues: $TOTAL_ISSUES\"}"
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
      when: always`
  },
  {
    id: 'monorepo',
    name: 'Monorepo Analysis',
    description: 'Analyze specific packages in monorepo setup',
    category: 'analysis',
    stages: ['detect', 'analyze'],
    content: `stages:
  - detect
  - analyze

variables:
  PACKAGES_DIR: "packages"
  APPS_DIR: "apps"

detect-changes:
  stage: detect
  image: alpine:latest
  script:
    - |
      apk add --no-cache git jq
      if [ -n "$CI_MERGE_REQUEST_DIFF_BASE_SHA" ]; then
        BASE_SHA="$CI_MERGE_REQUEST_DIFF_BASE_SHA"
      elif [ -n "$CI_COMMIT_BEFORE_SHA" ] && [ "$CI_COMMIT_BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
        BASE_SHA="$CI_COMMIT_BEFORE_SHA"
      else
        BASE_SHA="HEAD~1"
      fi
      CHANGED_DIRS=$(git diff --name-only $BASE_SHA...$CI_COMMIT_SHA | cut -d'/' -f1-2 | sort -u || echo "")
      echo "$CHANGED_DIRS" > changed-packages.txt
      
      PACKAGES="[]"
      for dir in $CHANGED_DIRS; do
        if [[ "$dir" == "$PACKAGES_DIR/"* ]] || [[ "$dir" == "$APPS_DIR/"* ]]; then
          PKG_NAME=$(basename "$dir")
          PACKAGES=$(echo $PACKAGES | jq -c ". + [{\\"name\\": \\"$PKG_NAME\\", \\"path\\": \\"$dir\\"}]")
        fi
      done
      echo "$PACKAGES" > packages-matrix.json
  artifacts:
    paths:
      - changed-packages.txt
      - packages-matrix.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

analyze-packages:
  stage: analyze
  image: neurolint/cli:latest
  needs:
    - detect-changes
  parallel:
    matrix:
      - PACKAGE: [web, api, ui, utils]
  script:
    - |
      if grep -q "$PACKAGE" changed-packages.txt; then
        PKG_PATH=$(jq -r ".[] | select(.name == \\"$PACKAGE\\") | .path" packages-matrix.json)
        if [ -n "$PKG_PATH" ] && [ "$PKG_PATH" != "null" ]; then
          echo "Analyzing package: $PACKAGE at $PKG_PATH"
          neurolint analyze --api-key $NEUROLINT_API_KEY --working-directory "$PKG_PATH" --output "$PACKAGE-report.json"
        fi
      else
        echo "Package $PACKAGE was not changed, skipping"
      fi
  artifacts:
    paths:
      - "*-report.json"
    reports:
      codequality: "*-report.json"
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const templateId = searchParams.get('id');

  if (templateId) {
    const template = CI_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json(template);
  }

  let templates = CI_TEMPLATES;
  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  return NextResponse.json({
    templates: templates.map(({ content, ...rest }) => rest),
    categories: ['analysis', 'security', 'mr-check', 'scheduled']
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, customizations } = body;

    const template = CI_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    let ciContent = template.content;

    if (customizations) {
      if (customizations.defaultBranch && customizations.defaultBranch !== 'main') {
        ciContent = ciContent.replace(
          /\$CI_COMMIT_BRANCH == \$CI_DEFAULT_BRANCH/g,
          `$CI_COMMIT_BRANCH == "${customizations.defaultBranch}"`
        );
      }
      if (customizations.layers) {
        ciContent = ciContent.replace(
          /NEUROLINT_LAYERS: "[^"]*"/g,
          `NEUROLINT_LAYERS: "${customizations.layers}"`
        );
      }
      if (customizations.minScore) {
        ciContent = ciContent.replace(
          /NEUROLINT_MIN_SCORE: "[^"]*"/g,
          `NEUROLINT_MIN_SCORE: "${customizations.minScore}"`
        );
      }
      if (customizations.severityThreshold) {
        ciContent = ciContent.replace(
          /NEUROLINT_SEVERITY_THRESHOLD: "[^"]*"/g,
          `NEUROLINT_SEVERITY_THRESHOLD: "${customizations.severityThreshold}"`
        );
      }
      if (customizations.failOnIssues !== undefined) {
        ciContent = ciContent.replace(
          /NEUROLINT_FAIL_ON_ISSUES: "[^"]*"/g,
          `NEUROLINT_FAIL_ON_ISSUES: "${customizations.failOnIssues}"`
        );
      }
    }

    return NextResponse.json({
      success: true,
      pipeline: ciContent,
      filename: `.gitlab-ci.yml`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate pipeline' },
      { status: 500 }
    );
  }
}
