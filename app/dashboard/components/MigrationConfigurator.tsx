"use client";

import React from "react";

interface MigrationConfiguratorProps {
  applyFixes: boolean;
  useEnhanced: boolean;
  selectedLayers: number[];
  isLoading: boolean;
  onApplyFixesChange: (value: boolean) => void;
  onUseEnhancedChange: (value: boolean) => void;
  onLayersChange: (layers: number[]) => void;
}

const layerDescriptions: Record<number, { name: string; description: string }> = {
  1: { name: "Configuration", description: "TypeScript strict flags, React 19 JSX" },
  2: { name: "Patterns", description: "Console removal, React 19 patterns" },
  3: { name: "Components", description: "React keys AUTO-FIX, accessibility" },
  4: { name: "Hydration & SSR", description: "AST-based browser API fixes" },
  5: { name: "Next.js Migration", description: "ReactDOM.render → createRoot" },
  6: { name: "Testing", description: "RSC testing, MSW compatibility" },
  7: { name: "Adaptive Learning", description: "Cross-layer pattern learning" },
  8: { name: "Security Forensics", description: "IoC signatures, CVE detection" },
};

export default function MigrationConfigurator({
  applyFixes,
  useEnhanced,
  selectedLayers,
  isLoading,
  onApplyFixesChange,
  onUseEnhancedChange,
  onLayersChange,
}: MigrationConfiguratorProps) {
  const handleLayerToggle = (layerId: number, checked: boolean) => {
    if (checked) {
      onLayersChange([...selectedLayers, layerId].sort());
    } else {
      onLayersChange(selectedLayers.filter((id) => id !== layerId));
    }
  };

  return (
    <div
      className="analysis-configuration"
      role="region"
      aria-labelledby="config-title"
    >
      <div className="config-header">
        <div className="config-title">
          <h2 id="config-title">Analysis Configuration</h2>
          <p>Configure analysis mode, engine type, and layer selection</p>
        </div>
      </div>

      <div className="config-layout">
        <div className="config-top-row">
          <fieldset className="control-group">
            <legend className="control-label">MODE</legend>
            <div
              className="control-options"
              role="radiogroup"
              aria-labelledby="mode-legend"
            >
              <button
                className={`control-btn ${!applyFixes ? "active" : ""}`}
                onClick={() => onApplyFixesChange(false)}
                role="radio"
                aria-checked={!applyFixes}
                aria-describedby="dry-run-description"
              >
                Dry Run (Analysis Only)
              </button>
              <button
                className={`control-btn ${applyFixes ? "active" : ""}`}
                onClick={() => onApplyFixesChange(true)}
                role="radio"
                aria-checked={applyFixes}
                aria-describedby="apply-fixes-description"
              >
                Apply Fixes
              </button>
            </div>
            <div id="dry-run-description" className="sr-only">
              Analyze code without making changes
            </div>
            <div id="apply-fixes-description" className="sr-only">
              Analyze and modify your code files
            </div>
          </fieldset>

          <fieldset className="control-group">
            <legend className="control-label">ENGINE TYPE</legend>
            <div
              className="control-options"
              role="radiogroup"
              aria-labelledby="engine-legend"
            >
              <button
                className={`control-btn ${!useEnhanced ? "active" : ""}`}
                onClick={() => onUseEnhancedChange(false)}
                role="radio"
                aria-checked={!useEnhanced}
                aria-describedby="standard-engine-description"
              >
                Standard Engine
              </button>
              <button
                className={`control-btn ${useEnhanced ? "active" : ""}`}
                onClick={() => onUseEnhancedChange(true)}
                role="radio"
                aria-checked={useEnhanced}
                aria-describedby="enhanced-engine-description"
              >
                Enhanced AST Engine
              </button>
            </div>
            <div id="standard-engine-description" className="sr-only">
              Standard regex-based pattern matching engine
            </div>
            <div id="enhanced-engine-description" className="sr-only">
              Advanced AST analysis with semantic understanding
            </div>
          </fieldset>
        </div>

        <fieldset className="control-group layer-selection-full">
          <legend className="control-label">LAYER SELECTION</legend>
          <div
            className="layer-controls"
            role="group"
            aria-labelledby="layer-presets"
          >
            <span id="layer-presets" className="sr-only">
              Layer presets
            </span>
            <button
              className={`control-btn ${selectedLayers.length === 0 ? "active" : ""}`}
              onClick={() => onLayersChange([])}
              aria-pressed={selectedLayers.length === 0}
              aria-describedby="auto-detect-description"
            >
              Auto-Detect
            </button>
            <button
              className={`control-btn ${selectedLayers.length === 8 ? "active" : ""}`}
              onClick={() => onLayersChange([1, 2, 3, 4, 5, 6, 7, 8])}
              aria-pressed={selectedLayers.length === 8}
              aria-describedby="all-layers-description"
            >
              All Layers
            </button>
          </div>
          <div id="auto-detect-description" className="sr-only">
            Let NeuroLint automatically select appropriate layers
          </div>
          <div id="all-layers-description" className="sr-only">
            Run all 8 layers of analysis and fixes
          </div>
          <div
            className="layer-checkboxes"
            role="group"
            aria-labelledby="individual-layers"
          >
            <span id="individual-layers" className="sr-only">
              Individual layer selection
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((layerId) => (
              <label key={layerId} className="layer-checkbox">
                <input
                  type="checkbox"
                  checked={selectedLayers.includes(layerId)}
                  onChange={(e) => handleLayerToggle(layerId, e.target.checked)}
                  disabled={isLoading}
                />
                <span className="checkmark"></span>
                <span className="layer-info">
                  <span className="layer-number">Layer {layerId}</span>
                  <span className="layer-name">
                    {layerDescriptions[layerId]?.name || `Layer ${layerId}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export type { MigrationConfiguratorProps };
