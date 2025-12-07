"use client";

import React, { useState } from "react";

interface CITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  stages: string[];
}

interface GeneratorProps {
  onBack: () => void;
}

const TEMPLATES: CITemplate[] = [
  {
    id: 'basic-analysis',
    name: 'Basic Code Analysis',
    description: 'Run NeuroLint analysis on merge requests and pushes',
    category: 'analysis',
    stages: ['analyze']
  },
  {
    id: 'mr-quality-gate',
    name: 'MR Quality Gate',
    description: 'Block merge requests that fail quality thresholds',
    category: 'mr-check',
    stages: ['test']
  },
  {
    id: 'security-scan',
    name: 'Security Vulnerability Scan',
    description: 'Deep security analysis with Layer 6 focus',
    category: 'security',
    stages: ['security']
  },
  {
    id: 'scheduled-analysis',
    name: 'Scheduled Full Analysis',
    description: 'Weekly comprehensive codebase analysis',
    category: 'scheduled',
    stages: ['analyze', 'report']
  },
  {
    id: 'monorepo',
    name: 'Monorepo Analysis',
    description: 'Analyze specific packages in monorepo setup',
    category: 'analysis',
    stages: ['detect', 'analyze']
  }
];

export default function GitLabCIGenerator({ onBack }: GeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedPipeline, setGeneratedPipeline] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customizations, setCustomizations] = useState({
    defaultBranch: 'main',
    layers: '1,2,3,4,5,6,7',
    minScore: '70',
    severityThreshold: 'medium',
    failOnIssues: true
  });

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/integrations/gitlab/ci/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          customizations: {
            defaultBranch: customizations.defaultBranch,
            layers: customizations.layers,
            minScore: customizations.minScore,
            severityThreshold: customizations.severityThreshold,
            failOnIssues: customizations.failOnIssues
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedPipeline(data.pipeline);
      }
    } catch (error) {
      console.error('Failed to generate pipeline:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedPipeline) {
      await navigator.clipboard.writeText(generatedPipeline);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (generatedPipeline) {
      const blob = new Blob([generatedPipeline], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '.gitlab-ci.yml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'analysis': return '#4caf50';
      case 'security': return '#e53e3e';
      case 'mr-check': return '#2196f3';
      case 'scheduled': return '#ff9800';
      default: return '#888';
    }
  };

  return (
    <div className="tab-content">
      <button 
        className="back-btn"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid #000000',
          borderRadius: '8px',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Integrations
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>GitLab CI Pipeline Generator</h3>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
          Generate ready-to-use GitLab CI/CD pipelines for NeuroLint integration
        </p>
      </div>

      {!generatedPipeline ? (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Template
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {TEMPLATES.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  style={{
                    padding: '1.25rem',
                    background: selectedTemplate === template.id 
                      ? 'rgba(76, 175, 80, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: selectedTemplate === template.id
                      ? '1px solid #4caf50'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: `${getCategoryColor(template.category)}20`,
                      color: getCategoryColor(template.category),
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      {template.category}
                    </span>
                  </div>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1rem' }}>
                    {template.name}
                  </h5>
                  <p style={{ margin: '0 0 0.75rem 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.813rem', lineHeight: 1.5 }}>
                    {template.description}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {template.stages.map(stage => (
                      <span key={stage} style={{
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              marginBottom: '2rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                Customize Pipeline
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.813rem' }}>
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={customizations.defaultBranch}
                    onChange={(e) => setCustomizations(prev => ({ ...prev, defaultBranch: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.813rem' }}>
                    Analysis Layers
                  </label>
                  <input
                    type="text"
                    value={customizations.layers}
                    onChange={(e) => setCustomizations(prev => ({ ...prev, layers: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.813rem' }}>
                    Min Quality Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={customizations.minScore}
                    onChange={(e) => setCustomizations(prev => ({ ...prev, minScore: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.813rem' }}>
                    Severity Threshold
                  </label>
                  <select
                    value={customizations.severityThreshold}
                    onChange={(e) => setCustomizations(prev => ({ ...prev, severityThreshold: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="failOnIssues"
                    checked={customizations.failOnIssues}
                    onChange={(e) => setCustomizations(prev => ({ ...prev, failOnIssues: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#4caf50' }}
                  />
                  <label htmlFor="failOnIssues" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.813rem', cursor: 'pointer' }}>
                    Fail on Issues
                  </label>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate || isGenerating}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              opacity: !selectedTemplate || isGenerating ? 0.5 : 1,
              cursor: !selectedTemplate || isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Pipeline'}
          </button>
        </>
      ) : (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>Generated Pipeline</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.813rem' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.813rem' }}
              >
                Download .gitlab-ci.yml
              </button>
              <button
                onClick={() => {
                  setGeneratedPipeline(null);
                  setSelectedTemplate(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.813rem' }}
              >
                New Pipeline
              </button>
            </div>
          </div>
          
          <pre style={{
            padding: '1.5rem',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            overflow: 'auto',
            maxHeight: '500px',
            fontSize: '0.813rem',
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: 'monospace'
          }}>
            {generatedPipeline}
          </pre>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(252, 109, 38, 0.1)',
            border: '1px solid rgba(252, 109, 38, 0.3)',
            borderRadius: '8px'
          }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#fc6d26', fontSize: '0.875rem' }}>
              Next Steps
            </h5>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.813rem', lineHeight: 1.8 }}>
              <li>Download the pipeline file or copy the content</li>
              <li>Add as <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>.gitlab-ci.yml</code> in your repository root</li>
              <li>Add <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>NEUROLINT_API_KEY</code> to your GitLab CI/CD variables</li>
              <li>Push to trigger the pipeline</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
