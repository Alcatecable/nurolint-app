import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedHandler } from "../../../../../lib/auth-middleware";

interface AutoPRRequest {
  repositoryName: string;
  branch: string;
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
  autoMerge?: boolean;
  draftPR?: boolean;
  labels?: string[];
}

interface AutoPRResponse {
  success: boolean;
  pullRequest?: {
    id: number;
    number: number;
    url: string;
    htmlUrl: string;
    title: string;
    state: string;
    draft: boolean;
    createdAt: string;
    branchName: string;
    filesChanged: number;
  };
  error?: string;
}

interface PRStatus {
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
  closedAt?: string;
  htmlUrl: string;
}

export const GET = createAuthenticatedHandler(async (request, user) => {
  try {
    const url = new URL(request.url);
    const repositoryName = url.searchParams.get("repository");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const authHeader = request.headers.get("x-github-token");

    if (!authHeader) {
      return NextResponse.json(
        { error: "GitHub access token required" },
        { status: 401 }
      );
    }

    let query = `is:pr author:@me`;
    if (repositoryName) {
      query += ` repo:${repositoryName}`;
    }
    if (status === 'open') {
      query += ` is:open`;
    } else if (status === 'merged') {
      query += ` is:merged`;
    } else if (status === 'closed') {
      query += ` is:closed is:unmerged`;
    }
    query += ` label:neurolint-auto-pr`;

    const searchResponse = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=${limit}&sort=created&order=desc`,
      {
        headers: {
          Authorization: `Bearer ${authHeader}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "NeuroLint-Pro/1.0",
        },
      }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      return NextResponse.json(
        { error: error.message || "Failed to fetch PRs" },
        { status: searchResponse.status }
      );
    }

    const searchResult = await searchResponse.json();

    const prStatuses: PRStatus[] = searchResult.items.map((item: any) => ({
      id: `pr-${item.id}`,
      repositoryName: item.repository_url.split('/repos/')[1] || '',
      prNumber: item.number,
      status: item.pull_request?.merged_at ? 'merged' : 
              item.state === 'closed' ? 'closed' : 'open',
      title: item.title,
      branchName: item.head?.ref || 'unknown',
      filesChanged: 0,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      mergedAt: item.pull_request?.merged_at,
      closedAt: item.closed_at,
      htmlUrl: item.html_url,
    }));

    return NextResponse.json({
      pullRequests: prStatuses,
      total: searchResult.total_count,
      pagination: {
        limit,
        hasMore: searchResult.total_count > limit,
      },
    });
  } catch (error) {
    console.error("Auto PR list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = createAuthenticatedHandler(async (request, user) => {
  try {
    const body: AutoPRRequest = await request.json();
    const {
      repositoryName,
      branch,
      baseBranch = "main",
      fixes,
      title,
      description,
      autoMerge = false,
      draftPR = true,
      labels = ["neurolint-auto-pr", "automated"],
    } = body;

    if (!repositoryName || !fixes || fixes.length === 0) {
      return NextResponse.json(
        { error: "Repository name and at least one fix are required" },
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

    const timestamp = Date.now();
    const branchName = branch || `neurolint/auto-fix-${timestamp}`;

    const baseRefResponse = await fetch(
      `https://api.github.com/repos/${repositoryName}/git/ref/heads/${baseBranch}`,
      {
        headers: {
          Authorization: `Bearer ${authHeader}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "NeuroLint-Pro/1.0",
        },
      }
    );

    if (!baseRefResponse.ok) {
      return NextResponse.json(
        { error: `Base branch '${baseBranch}' not found` },
        { status: 404 }
      );
    }

    const baseRef = await baseRefResponse.json();
    const baseSha = baseRef.object.sha;

    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${repositoryName}/git/refs`,
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
        return NextResponse.json(
          { error: error.message || "Failed to create branch" },
          { status: createBranchResponse.status }
        );
      }
    }

    const issueTypes = [...new Set(fixes.map(f => f.issueType))];
    const prTitle = title || `fix: NeuroLint auto-fix for ${issueTypes.join(", ")} issues`;
    
    const fixesSummary = fixes.map(f => 
      `- **${f.filePath}**: ${f.description}`
    ).join("\n");

    const prDescription = description || `## NeuroLint Automated Code Fixes

This pull request was automatically generated by NeuroLint to address the following issues:

### Files Modified (${fixes.length})
${fixesSummary}

### Issue Categories
${issueTypes.map(t => `- ${t}`).join("\n")}

---
*This PR was created automatically by [NeuroLint](https://neurolint.com). Please review the changes before merging.*

🔍 **Review Checklist:**
- [ ] Code changes look correct
- [ ] No unintended side effects
- [ ] Tests pass (if applicable)
`;

    for (const fix of fixes) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${repositoryName}/contents/${fix.filePath}?ref=${branchName}`,
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

      const updateResponse = await fetch(
        `https://api.github.com/repos/${repositoryName}/contents/${fix.filePath}`,
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

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error(`Failed to update ${fix.filePath}:`, error);
      }
    }

    const prResponse = await fetch(
      `https://api.github.com/repos/${repositoryName}/pulls`,
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
          draft: draftPR,
        }),
      }
    );

    if (!prResponse.ok) {
      const error = await prResponse.json();
      return NextResponse.json(
        { error: error.message || "Failed to create pull request" },
        { status: prResponse.status }
      );
    }

    const pullRequest = await prResponse.json();

    if (labels.length > 0) {
      await fetch(
        `https://api.github.com/repos/${repositoryName}/issues/${pullRequest.number}/labels`,
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

    if (autoMerge && !draftPR) {
      await fetch(
        `https://api.github.com/repos/${repositoryName}/pulls/${pullRequest.number}/merge`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authHeader}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "NeuroLint-Pro/1.0",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merge_method: "squash",
            commit_title: prTitle,
          }),
        }
      );
    }

    const response: AutoPRResponse = {
      success: true,
      pullRequest: {
        id: pullRequest.id,
        number: pullRequest.number,
        url: pullRequest.url,
        htmlUrl: pullRequest.html_url,
        title: pullRequest.title,
        state: pullRequest.state,
        draft: pullRequest.draft,
        createdAt: pullRequest.created_at,
        branchName,
        filesChanged: fixes.length,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Auto PR creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const DELETE = createAuthenticatedHandler(async (request, user) => {
  try {
    const url = new URL(request.url);
    const repositoryName = url.searchParams.get("repository");
    const prNumber = url.searchParams.get("pr_number");
    const deleteBranch = url.searchParams.get("delete_branch") === "true";

    if (!repositoryName || !prNumber) {
      return NextResponse.json(
        { error: "Repository name and PR number are required" },
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

    const prResponse = await fetch(
      `https://api.github.com/repos/${repositoryName}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${authHeader}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "NeuroLint-Pro/1.0",
        },
      }
    );

    if (!prResponse.ok) {
      return NextResponse.json(
        { error: "Pull request not found" },
        { status: 404 }
      );
    }

    const pr = await prResponse.json();
    const branchName = pr.head.ref;

    const closeResponse = await fetch(
      `https://api.github.com/repos/${repositoryName}/pulls/${prNumber}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authHeader}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "NeuroLint-Pro/1.0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: "closed" }),
      }
    );

    if (!closeResponse.ok) {
      const error = await closeResponse.json();
      return NextResponse.json(
        { error: error.message || "Failed to close pull request" },
        { status: closeResponse.status }
      );
    }

    if (deleteBranch && branchName.startsWith("neurolint/")) {
      await fetch(
        `https://api.github.com/repos/${repositoryName}/git/refs/heads/${branchName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authHeader}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "NeuroLint-Pro/1.0",
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pull request #${prNumber} closed${deleteBranch ? " and branch deleted" : ""}`,
    });
  } catch (error) {
    console.error("Auto PR deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
