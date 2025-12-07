import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedHandler } from "../../../../lib/auth-middleware";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";
import { AnalysisJobQueueClient } from "../../../../lib/analysis-job-queue";

export interface MonorepoConfig {
  type: 'nx' | 'turborepo' | 'lerna' | 'pnpm-workspace' | 'yarn-workspace' | 'standard';
  workspaces: WorkspaceInfo[];
  rootConfig: Record<string, any>;
  detected: boolean;
}

export interface WorkspaceInfo {
  name: string;
  path: string;
  type: 'app' | 'package' | 'lib' | 'tool';
  dependencies: string[];
  hasProjectConfig: boolean;
}

interface NxProjectConfig {
  name?: string;
  projectType?: 'application' | 'library';
  targets?: Record<string, any>;
  implicitDependencies?: string[];
}

interface TurboConfig {
  pipeline?: Record<string, any>;
  globalDependencies?: string[];
}

function detectMonorepoType(files: Record<string, string>): MonorepoConfig['type'] {
  if (files['nx.json']) return 'nx';
  if (files['turbo.json']) return 'turborepo';
  if (files['lerna.json']) return 'lerna';
  if (files['pnpm-workspace.yaml']) return 'pnpm-workspace';
  
  try {
    const packageJson = JSON.parse(files['package.json'] || '{}');
    if (packageJson.workspaces) return 'yarn-workspace';
  } catch {}
  
  return 'standard';
}

function parseNxWorkspaces(files: Record<string, string>): WorkspaceInfo[] {
  const workspaces: WorkspaceInfo[] = [];
  
  try {
    const nxJson = JSON.parse(files['nx.json'] || '{}');
    const projectPaths = Object.keys(files)
      .filter(f => f.endsWith('/project.json'))
      .map(f => f.replace('/project.json', ''));
    
    for (const projectPath of projectPaths) {
      const projectConfigStr = files[`${projectPath}/project.json`];
      if (!projectConfigStr) continue;
      
      try {
        const projectConfig: NxProjectConfig = JSON.parse(projectConfigStr);
        workspaces.push({
          name: projectConfig.name || projectPath.split('/').pop() || projectPath,
          path: projectPath,
          type: projectConfig.projectType === 'application' ? 'app' : 'lib',
          dependencies: projectConfig.implicitDependencies || [],
          hasProjectConfig: true,
        });
      } catch {}
    }
    
    if (workspaces.length === 0) {
      const defaultPaths = ['apps', 'packages', 'libs'];
      for (const basePath of defaultPaths) {
        const subdirs = Object.keys(files)
          .filter(f => f.startsWith(`${basePath}/`) && f.split('/').length === 3)
          .map(f => f.split('/')[1])
          .filter((v, i, a) => a.indexOf(v) === i);
        
        for (const subdir of subdirs) {
          if (!subdir) continue;
          workspaces.push({
            name: subdir,
            path: `${basePath}/${subdir}`,
            type: basePath === 'apps' ? 'app' : basePath === 'libs' ? 'lib' : 'package',
            dependencies: [],
            hasProjectConfig: false,
          });
        }
      }
    }
  } catch {}
  
  return workspaces;
}

function parseTurborepoWorkspaces(files: Record<string, string>): WorkspaceInfo[] {
  const workspaces: WorkspaceInfo[] = [];
  
  try {
    const packageJson = JSON.parse(files['package.json'] || '{}');
    const workspaceGlobs: string[] = packageJson.workspaces || [];
    
    const basePaths = workspaceGlobs
      .map(g => g.replace('/*', '').replace('/**', ''))
      .filter(p => !p.includes('*'));
    
    for (const basePath of basePaths) {
      const subdirs = Object.keys(files)
        .filter(f => f.startsWith(`${basePath}/`) && f.endsWith('/package.json'))
        .map(f => {
          const parts = f.split('/');
          return parts.slice(0, parts.length - 1).join('/');
        });
      
      for (const subdir of subdirs) {
        const pkgPath = `${subdir}/package.json`;
        let name = subdir.split('/').pop() || subdir;
        let deps: string[] = [];
        
        if (files[pkgPath]) {
          try {
            const pkg = JSON.parse(files[pkgPath]);
            name = pkg.name || name;
            deps = Object.keys(pkg.dependencies || {}).filter(d => d.startsWith('@'));
          } catch {}
        }
        
        workspaces.push({
          name,
          path: subdir,
          type: basePath.includes('app') ? 'app' : 'package',
          dependencies: deps,
          hasProjectConfig: !!files[pkgPath],
        });
      }
    }
  } catch {}
  
  return workspaces;
}

function parseStandardWorkspaces(files: Record<string, string>): WorkspaceInfo[] {
  const workspaces: WorkspaceInfo[] = [];
  
  try {
    const packageJson = JSON.parse(files['package.json'] || '{}');
    const workspaceGlobs: string[] = packageJson.workspaces || [];
    
    if (workspaceGlobs.length > 0) {
      return parseTurborepoWorkspaces(files);
    }
    
    const commonPaths = ['packages', 'apps', 'libs', 'tools'];
    for (const basePath of commonPaths) {
      const subdirs = Object.keys(files)
        .filter(f => f.startsWith(`${basePath}/`) && f.endsWith('/package.json'))
        .map(f => {
          const parts = f.split('/');
          return parts.slice(0, parts.length - 1).join('/');
        });
      
      for (const subdir of subdirs) {
        const pkgPath = `${subdir}/package.json`;
        let name = subdir.split('/').pop() || subdir;
        
        if (files[pkgPath]) {
          try {
            const pkg = JSON.parse(files[pkgPath]);
            name = pkg.name || name;
          } catch {}
        }
        
        workspaces.push({
          name,
          path: subdir,
          type: basePath === 'apps' ? 'app' : basePath === 'tools' ? 'tool' : 'package',
          dependencies: [],
          hasProjectConfig: !!files[pkgPath],
        });
      }
    }
  } catch {}
  
  return workspaces;
}

export function detectMonorepo(files: Record<string, string>): MonorepoConfig {
  const type = detectMonorepoType(files);
  
  let workspaces: WorkspaceInfo[] = [];
  let rootConfig: Record<string, any> = {};
  
  switch (type) {
    case 'nx':
      workspaces = parseNxWorkspaces(files);
      try {
        rootConfig = JSON.parse(files['nx.json'] || '{}');
      } catch {}
      break;
    
    case 'turborepo':
      workspaces = parseTurborepoWorkspaces(files);
      try {
        rootConfig = JSON.parse(files['turbo.json'] || '{}');
      } catch {}
      break;
    
    case 'lerna':
      workspaces = parseStandardWorkspaces(files);
      try {
        rootConfig = JSON.parse(files['lerna.json'] || '{}');
      } catch {}
      break;
    
    case 'pnpm-workspace':
    case 'yarn-workspace':
    case 'standard':
      workspaces = parseStandardWorkspaces(files);
      break;
  }
  
  return {
    type,
    workspaces,
    rootConfig,
    detected: type !== 'standard' || workspaces.length > 0,
  };
}

export const POST = createAuthenticatedHandler(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const { action, files, targetWorkspaces, analysisOptions } = body;
    
    if (action === 'detect') {
      if (!files || typeof files !== 'object') {
        return NextResponse.json(
          { error: 'Files object is required for detection' },
          { status: 400 }
        );
      }
      
      const config = detectMonorepo(files);
      return NextResponse.json({
        success: true,
        monorepo: config,
      });
    }
    
    if (action === 'analyze') {
      if (!files || typeof files !== 'object') {
        return NextResponse.json(
          { error: 'Files object is required for analysis' },
          { status: 400 }
        );
      }
      
      const config = detectMonorepo(files);
      const supabase = getSupabaseServerClient();
      if (!supabase) {
        return NextResponse.json(
          { error: 'Database connection unavailable' },
          { status: 500 }
        );
      }
      const queueClient = new AnalysisJobQueueClient(supabase, user.id);
      
      let workspacesToAnalyze = config.workspaces;
      if (targetWorkspaces && Array.isArray(targetWorkspaces) && targetWorkspaces.length > 0) {
        workspacesToAnalyze = config.workspaces.filter(
          w => targetWorkspaces.includes(w.name) || targetWorkspaces.includes(w.path)
        );
      }
      
      const jobs = [];
      const typedFiles = files as Record<string, string>;
      for (const workspace of workspacesToAnalyze) {
        const workspaceFiles = Object.entries(typedFiles)
          .filter(([path]) => path.startsWith(workspace.path + '/'))
          .reduce((acc, [path, content]) => {
            acc[path.replace(workspace.path + '/', '')] = content;
            return acc;
          }, {} as Record<string, string>);
        
        const codeToAnalyze = Object.entries(workspaceFiles)
          .filter(([path]) => /\.(ts|tsx|js|jsx|py|go|rs)$/.test(path))
          .map(([path, content]) => `// File: ${path}\n${content}`)
          .join('\n\n// ===== NEXT FILE =====\n\n');
        
        if (codeToAnalyze.trim()) {
          const job = await queueClient.createJob({
            code: codeToAnalyze,
            filename: `${workspace.name}/analysis`,
            layers: analysisOptions?.layers || [1, 2, 3, 4, 5, 6, 7],
            priority: analysisOptions?.priority || 'normal',
            options: {
              monorepo: true,
              workspaceName: workspace.name,
              workspacePath: workspace.path,
              workspaceType: workspace.type,
              monorepoType: config.type,
              ...analysisOptions,
            },
          });
          
          jobs.push({
            jobId: job.id,
            workspace: workspace.name,
            workspacePath: workspace.path,
            status: job.status,
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        monorepo: config,
        analysis: {
          totalWorkspaces: workspacesToAnalyze.length,
          jobsCreated: jobs.length,
          jobs,
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "detect" or "analyze"' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Monorepo API error:', error);
    return NextResponse.json(
      { error: 'Failed to process monorepo request' },
      { status: 500 }
    );
  }
});

export const GET = createAuthenticatedHandler(async (request: NextRequest, user: any) => {
  return NextResponse.json({
    supportedTypes: ['nx', 'turborepo', 'lerna', 'pnpm-workspace', 'yarn-workspace'],
    configFiles: {
      nx: ['nx.json', 'project.json'],
      turborepo: ['turbo.json', 'package.json (with workspaces)'],
      lerna: ['lerna.json'],
      'pnpm-workspace': ['pnpm-workspace.yaml'],
      'yarn-workspace': ['package.json (with workspaces)'],
    },
    actions: {
      detect: 'Detect monorepo type and workspaces from files',
      analyze: 'Run analysis on specific workspaces',
    },
    usage: {
      detect: {
        method: 'POST',
        body: {
          action: 'detect',
          files: { 'path/to/file': 'content' },
        },
      },
      analyze: {
        method: 'POST',
        body: {
          action: 'analyze',
          files: { 'path/to/file': 'content' },
          targetWorkspaces: ['optional', 'workspace', 'names'],
          analysisOptions: {
            layers: [1, 2, 3, 4, 5, 6, 7],
            priority: 'normal',
          },
        },
      },
    },
  });
});
