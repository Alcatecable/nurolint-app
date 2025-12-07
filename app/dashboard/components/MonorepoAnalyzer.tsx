"use client";

import React, { useState } from "react";

interface WorkspaceInfo {
  name: string;
  path: string;
  type: "app" | "package" | "lib" | "tool";
  dependencies: string[];
  hasProjectConfig: boolean;
}

interface MonorepoConfig {
  type: "nx" | "turborepo" | "lerna" | "pnpm-workspace" | "yarn-workspace" | "standard";
  workspaces: WorkspaceInfo[];
  rootConfig: Record<string, unknown>;
  detected: boolean;
}

interface MonorepoAnalyzerProps {
  onBack: () => void;
}

export default function MonorepoAnalyzer({ onBack }: MonorepoAnalyzerProps) {
  const [configInput, setConfigInput] = useState("");
  const [monorepoConfig, setMonorepoConfig] = useState<MonorepoConfig | null>(null);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [analysisLayers, setAnalysisLayers] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    totalWorkspaces: number;
    jobsCreated: number;
    jobs: Array<{ jobId: string; workspace: string; status: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeLabels: Record<string, string> = {
    nx: "Nx",
    turborepo: "Turborepo",
    lerna: "Lerna",
    "pnpm-workspace": "PNPM Workspaces",
    "yarn-workspace": "Yarn Workspaces",
    standard: "Standard Monorepo",
  };

  const typeIcons: Record<string, string> = {
    nx: "⚡",
    turborepo: "🚀",
    lerna: "🐉",
    "pnpm-workspace": "📦",
    "yarn-workspace": "🧶",
    standard: "📁",
  };

  const handleDetect = async () => {
    setError(null);
    setIsDetecting(true);

    try {
      let files: Record<string, string>;
      try {
        files = JSON.parse(configInput);
      } catch {
        setError('Please provide a valid JSON object with file paths and contents');
        setIsDetecting(false);
        return;
      }

      const response = await fetch("/api/analysis/monorepo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect", files }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMonorepoConfig(data.monorepo);
        setSelectedWorkspaces(data.monorepo.workspaces.map((w: WorkspaceInfo) => w.name));
      }
    } catch (err) {
      setError("Failed to detect monorepo configuration");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!monorepoConfig || selectedWorkspaces.length === 0) return;

    setError(null);
    setIsAnalyzing(true);

    try {
      const files = JSON.parse(configInput);
      const response = await fetch("/api/analysis/monorepo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          files,
          targetWorkspaces: selectedWorkspaces,
          analysisOptions: { layers: analysisLayers },
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      setError("Failed to start monorepo analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleWorkspace = (name: string) => {
    setSelectedWorkspaces((prev) =>
      prev.includes(name) ? prev.filter((w) => w !== name) : [...prev, name]
    );
  };

  const toggleLayer = (layer: number) => {
    setAnalysisLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer].sort((a, b) => a - b)
    );
  };

  const selectAllWorkspaces = () => {
    if (monorepoConfig) {
      setSelectedWorkspaces(monorepoConfig.workspaces.map((w) => w.name));
    }
  };

  const deselectAllWorkspaces = () => {
    setSelectedWorkspaces([]);
  };

  const sampleConfig = {
    "package.json": JSON.stringify({ name: "my-monorepo", workspaces: ["packages/*", "apps/*"] }),
    "turbo.json": JSON.stringify({ pipeline: { build: { dependsOn: ["^build"] } } }),
    "apps/web/package.json": JSON.stringify({ name: "@myorg/web", dependencies: { "@myorg/ui": "*" } }),
    "apps/api/package.json": JSON.stringify({ name: "@myorg/api" }),
    "packages/ui/package.json": JSON.stringify({ name: "@myorg/ui" }),
  };

  return (
    <div className="tab-content">
      <button
        className="back-btn"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid #000000",
          borderRadius: "8px",
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "0.875rem",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Integrations
      </button>

      <div className="monorepo-analyzer">
        <h3>Monorepo Analyzer</h3>
        <p className="tab-description">
          Detect and analyze workspaces in your Nx, Turborepo, Lerna, or standard monorepo setup.
        </p>

        <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
          <h4>Configuration Input</h4>
          <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)", marginBottom: "1rem" }}>
            Paste your monorepo file structure as JSON (file paths as keys, content as values).
          </p>

          <textarea
            value={configInput}
            onChange={(e) => setConfigInput(e.target.value)}
            placeholder={JSON.stringify(sampleConfig, null, 2)}
            style={{
              width: "100%",
              minHeight: "200px",
              padding: "1rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              resize: "vertical",
            }}
          />

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleDetect}
              disabled={isDetecting || !configInput.trim()}
            >
              {isDetecting ? "Detecting..." : "Detect Monorepo"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setConfigInput(JSON.stringify(sampleConfig, null, 2))}
            >
              Use Sample
            </button>
          </div>
        </div>

        {error && (
          <div
            className="glass-card"
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderColor: "var(--status-error)",
              color: "var(--status-error)",
            }}
          >
            {error}
          </div>
        )}

        {monorepoConfig && (
          <>
            <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{typeIcons[monorepoConfig.type]}</span>
                <div>
                  <h4 style={{ margin: 0 }}>{typeLabels[monorepoConfig.type]}</h4>
                  <span style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
                    {monorepoConfig.workspaces.length} workspace{monorepoConfig.workspaces.length !== 1 ? "s" : ""} detected
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <button className="btn btn-secondary" onClick={selectAllWorkspaces} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}>
                  Select All
                </button>
                <button className="btn btn-secondary" onClick={deselectAllWorkspaces} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}>
                  Deselect All
                </button>
              </div>

              <div className="workspace-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {monorepoConfig.workspaces.map((workspace) => (
                  <label
                    key={workspace.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background: selectedWorkspaces.includes(workspace.name)
                        ? "rgba(76, 175, 80, 0.15)"
                        : "rgba(255, 255, 255, 0.03)",
                      border: selectedWorkspaces.includes(workspace.name)
                        ? "1px solid var(--status-active)"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkspaces.includes(workspace.name)}
                      onChange={() => toggleWorkspace(workspace.name)}
                      style={{ accentColor: "var(--status-active)" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{workspace.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)" }}>
                        {workspace.path}
                      </div>
                    </div>
                    <span
                      className="workspace-type-badge"
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        background:
                          workspace.type === "app"
                            ? "rgba(33, 150, 243, 0.2)"
                            : workspace.type === "lib"
                            ? "rgba(156, 39, 176, 0.2)"
                            : "rgba(255, 152, 0, 0.2)",
                        color:
                          workspace.type === "app"
                            ? "#2196f3"
                            : workspace.type === "lib"
                            ? "#9c27b0"
                            : "#ff9800",
                      }}
                    >
                      {workspace.type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
              <h4>Analysis Layers</h4>
              <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)", marginBottom: "1rem" }}>
                Select which analysis layers to run on the selected workspaces.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {[1, 2, 3, 4, 5, 6, 7].map((layer) => (
                  <button
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      border: analysisLayers.includes(layer)
                        ? "1px solid var(--status-active)"
                        : "1px solid rgba(255, 255, 255, 0.2)",
                      background: analysisLayers.includes(layer)
                        ? "rgba(76, 175, 80, 0.2)"
                        : "rgba(255, 255, 255, 0.05)",
                      color: analysisLayers.includes(layer) ? "#4caf50" : "rgba(255, 255, 255, 0.7)",
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "all 0.2s ease",
                    }}
                  >
                    Layer {layer}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={isAnalyzing || selectedWorkspaces.length === 0 || analysisLayers.length === 0}
                style={{ marginTop: "1.5rem" }}
              >
                {isAnalyzing
                  ? "Starting Analysis..."
                  : `Analyze ${selectedWorkspaces.length} Workspace${selectedWorkspaces.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}

        {analysisResult && (
          <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
            <h4>Analysis Jobs Created</h4>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
                  Total Workspaces
                </span>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                  {analysisResult.totalWorkspaces}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)" }}>
                  Jobs Created
                </span>
                <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--status-active)" }}>
                  {analysisResult.jobsCreated}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {analysisResult.jobs.map((job) => (
                <div
                  key={job.jobId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{job.workspace}</span>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>
                      {job.jobId}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      background: "rgba(255, 152, 0, 0.2)",
                      color: "#ff9800",
                    }}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
          <h4>Supported Monorepo Types</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            {[
              { type: "nx", files: "nx.json, project.json" },
              { type: "turborepo", files: "turbo.json" },
              { type: "lerna", files: "lerna.json" },
              { type: "pnpm-workspace", files: "pnpm-workspace.yaml" },
              { type: "yarn-workspace", files: "package.json" },
            ].map(({ type, files }) => (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{typeIcons[type]}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{typeLabels[type]}</div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.5)" }}>{files}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
