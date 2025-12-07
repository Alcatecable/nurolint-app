import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedHandler } from "../../../../../../lib/auth-middleware";

interface BatchPRRequest {
  operations: Array<{
    repositoryName: string;
    branch?: string;
    baseBranch?: string;
    fixes: Array<{
      filePath: string;
      originalContent: string;
      fixedContent: string;
      issueType: string;
      description: string;
    }>;
    title?: string;
    description?: string;
    draftPR?: boolean;
    labels?: string[];
  }>;
  concurrency?: number;
}

interface BatchResult {
  repositoryName: string;
  success: boolean;
  pullRequest?: {
    number: number;
    htmlUrl: string;
    title: string;
    branchName: string;
    filesChanged: number;
  };
  error?: string;
}

export const POST = createAuthenticatedHandler(async (request, user) => {
  try {
    const body: BatchPRRequest = await request.json();
    const { operations, concurrency = 3 } = body;

    if (!operations || operations.length === 0) {
      return NextResponse.json(
        { error: "At least one operation is required" },
        { status: 400 }
      );
    }

    if (operations.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 operations per batch request" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("x-github-token");

    if (!authHeader) {
      return NextResponse.json(
        { error: "GitHub access token required" },
        { status: 401 }
      );
    }

    const results: BatchResult[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(async (op, index) => {
          try {
            const branchName = op.branch || `neurolint/auto-fix-batch-${timestamp}-${i + index}`;
            const baseBranch = op.baseBranch || "main";

            const baseRefResponse = await fetch(
              `https://api.github.com/repos/${op.repositoryName}/git/ref/heads/${baseBranch}`,
              {
                headers: {
                  Authorization: `Bearer ${authHeader}`,
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "NeuroLint-Pro/1.0",
                },
              }
            );

            if (!baseRefResponse.ok) {
              return {
                repositoryName: op.repositoryName,
                success: false,
                error: `Base branch '${baseBranch}' not found`,
              };
            }

            const baseRef = await baseRefResponse.json();
            const baseSha = baseRef.object.sha;

            const createBranchResponse = await fetch(
              `https://api.github.com/repos/${op.repositoryName}/git/refs`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${authHeader}`,
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "NeuroLint-Pro/1.0",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ref: `refs/heads/${branchName}`,
                  sha: baseSha,
                }),
              }
            );

            if (!createBranchResponse.ok) {
              const error = await createBranchResponse.json();
              if (error.message !== "Reference already exists") {
                return {
                  repositoryName: op.repositoryName,
                  success: false,
                  error: error.message || "Failed to create branch",
                };
              }
            }

            for (const fix of op.fixes) {
              const fileResponse = await fetch(
                `https://api.github.com/repos/${op.repositoryName}/contents/${fix.filePath}?ref=${branchName}`,
                {
                  headers: {
                    Authorization: `Bearer ${authHeader}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "NeuroLint-Pro/1.0",
                  },
                }
              );

              let fileSha: string | undefined;
              if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                fileSha = fileData.sha;
              }

              await fetch(
                `https://api.github.com/repos/${op.repositoryName}/contents/${fix.filePath}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${authHeader}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "NeuroLint-Pro/1.0",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: `fix(${fix.issueType}): ${fix.description}`,
                    content: Buffer.from(fix.fixedContent).toString("base64"),
                    branch: branchName,
                    ...(fileSha && { sha: fileSha }),
                  }),
                }
              );
            }

            const issueTypes = [...new Set(op.fixes.map(f => f.issueType))];
            const prTitle = op.title || `fix: NeuroLint auto-fix for ${issueTypes.join(", ")} issues`;
            
            const fixesSummary = op.fixes.map(f => 
              `- **${f.filePath}**: ${f.description}`
            ).join("\n");

            const prDescription = op.description || `## NeuroLint Automated Code Fixes (Batch)

This pull request was automatically generated by NeuroLint.

### Files Modified (${op.fixes.length})
${fixesSummary}

---
*This PR was created automatically by [NeuroLint](https://neurolint.com).*
`;

            const prResponse = await fetch(
              `https://api.github.com/repos/${op.repositoryName}/pulls`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${authHeader}`,
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "NeuroLint-Pro/1.0",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: prTitle,
                  body: prDescription,
                  head: branchName,
                  base: baseBranch,
                  draft: op.draftPR ?? true,
                }),
              }
            );

            if (!prResponse.ok) {
              const error = await prResponse.json();
              return {
                repositoryName: op.repositoryName,
                success: false,
                error: error.message || "Failed to create pull request",
              };
            }

            const pullRequest = await prResponse.json();

            const labels = op.labels || ["neurolint-auto-pr", "automated", "batch"];
            if (labels.length > 0) {
              await fetch(
                `https://api.github.com/repos/${op.repositoryName}/issues/${pullRequest.number}/labels`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${authHeader}`,
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "NeuroLint-Pro/1.0",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ labels }),
                }
              );
            }

            return {
              repositoryName: op.repositoryName,
              success: true,
              pullRequest: {
                number: pullRequest.number,
                htmlUrl: pullRequest.html_url,
                title: pullRequest.title,
                branchName,
                filesChanged: op.fixes.length,
              },
            };
          } catch (error) {
            console.error(`Batch PR error for ${op.repositoryName}:`, error);
            return {
              repositoryName: op.repositoryName,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );

      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      summary: {
        total: operations.length,
        successful,
        failed,
      },
      results,
    }, { status: 201 });
  } catch (error) {
    console.error("Batch Auto PR error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
