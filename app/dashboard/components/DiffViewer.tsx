'use client';

import React, { useState, useMemo } from "react";

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'header';
  content: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

interface DiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  filename?: string;
  language?: string;
  viewMode?: 'unified' | 'split';
  onClose?: () => void;
  onApply?: () => void;
  showApplyButton?: boolean;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const result: DiffLine[] = [];

  const lcs = computeLCS(originalLines, modifiedLines);
  
  let oldIdx = 0;
  let newIdx = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const match of lcs) {
    while (oldIdx < match.oldIdx) {
      result.push({
        type: 'removed',
        content: originalLines[oldIdx] ?? '',
        lineNumberOld: oldLineNum++
      });
      oldIdx++;
    }
    while (newIdx < match.newIdx) {
      result.push({
        type: 'added',
        content: modifiedLines[newIdx] ?? '',
        lineNumberNew: newLineNum++
      });
      newIdx++;
    }
    result.push({
      type: 'unchanged',
      content: originalLines[oldIdx] ?? '',
      lineNumberOld: oldLineNum++,
      lineNumberNew: newLineNum++
    });
    oldIdx++;
    newIdx++;
  }

  while (oldIdx < originalLines.length) {
    result.push({
      type: 'removed',
      content: originalLines[oldIdx] ?? '',
      lineNumberOld: oldLineNum++
    });
    oldIdx++;
  }
  while (newIdx < modifiedLines.length) {
    result.push({
      type: 'added',
      content: modifiedLines[newIdx] ?? '',
      lineNumberNew: newLineNum++
    });
    newIdx++;
  }

  return result;
}

interface LCSMatch {
  oldIdx: number;
  newIdx: number;
}

function computeLCS(oldLines: string[], newLines: string[]): LCSMatch[] {
  const m = oldLines.length;
  const n = newLines.length;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0) as number[]);
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const dpRow = dp[i];
      const dpRowPrev = dp[i - 1];
      if (!dpRow || !dpRowPrev) continue;
      
      if (oldLines[i - 1] === newLines[j - 1]) {
        dpRow[j] = (dpRowPrev[j - 1] ?? 0) + 1;
      } else {
        dpRow[j] = Math.max(dpRowPrev[j] ?? 0, dpRow[j - 1] ?? 0);
      }
    }
  }
  
  const result: LCSMatch[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    const dpRow = dp[i];
    const dpRowPrev = dp[i - 1];
    if (!dpRow || !dpRowPrev) break;
    
    if (oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ oldIdx: i - 1, newIdx: j - 1 });
      i--;
      j--;
    } else if ((dpRowPrev[j] ?? 0) > (dpRow[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }
  
  return result;
}

export default function DiffViewer({
  originalCode,
  modifiedCode,
  filename = 'file',
  language = 'typescript',
  viewMode: initialViewMode = 'unified',
  onClose,
  onApply,
  showApplyButton = false
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>(initialViewMode);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  const diffLines = useMemo(() => computeDiff(originalCode, modifiedCode), [originalCode, modifiedCode]);
  
  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [diffLines]);

  const filteredLines = useMemo(() => {
    if (!showOnlyChanges) return diffLines;
    
    const result: DiffLine[] = [];
    const addedIndices = new Set<number>();
    let contextStart = -1;
    
    for (let i = 0; i < diffLines.length; i++) {
      const line = diffLines[i];
      if (!line) continue;
      
      if (line.type !== 'unchanged') {
        if (contextStart === -1) {
          const start = Math.max(0, i - 3);
          for (let j = start; j < i; j++) {
            if (!addedIndices.has(j)) {
              const contextLine = diffLines[j];
              if (contextLine) {
                result.push(contextLine);
                addedIndices.add(j);
              }
            }
          }
        }
        if (!addedIndices.has(i)) {
          result.push(line);
          addedIndices.add(i);
        }
        contextStart = i;
      } else if (contextStart !== -1 && i - contextStart <= 3) {
        if (!addedIndices.has(i)) {
          result.push(line);
          addedIndices.add(i);
        }
      } else if (contextStart !== -1 && i - contextStart > 3) {
        contextStart = -1;
      }
    }
    
    return result;
  }, [diffLines, showOnlyChanges]);

  const renderUnifiedDiff = () => (
    <div className="diff-content unified">
      {filteredLines.map((line, idx) => (
        <div key={idx} className={`diff-line ${line.type}`}>
          <span className="line-number old">{line.lineNumberOld || ''}</span>
          <span className="line-number new">{line.lineNumberNew || ''}</span>
          <span className="line-prefix">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span className="line-content">{line.content || ' '}</span>
        </div>
      ))}
    </div>
  );

  const renderSplitDiff = () => {
    const oldLines: DiffLine[] = [];
    const newLines: DiffLine[] = [];
    
    let oldIdx = 0, newIdx = 0;
    for (const line of filteredLines) {
      if (line.type === 'unchanged') {
        while (oldIdx < oldLines.length || newIdx < newLines.length) {
          if (oldIdx < oldLines.length) oldIdx++;
          if (newIdx < newLines.length) newIdx++;
        }
        oldLines.push(line);
        newLines.push(line);
        oldIdx = oldLines.length;
        newIdx = newLines.length;
      } else if (line.type === 'removed') {
        oldLines.push(line);
      } else if (line.type === 'added') {
        newLines.push(line);
      }
    }

    const maxLen = Math.max(oldLines.length, newLines.length);

    return (
      <div className="diff-content split">
        <div className="split-pane old-pane">
          <div className="pane-header">Original</div>
          {Array.from({ length: maxLen }).map((_, idx) => {
            const line = oldLines[idx];
            if (!line) return <div key={idx} className="diff-line empty"><span className="line-content"> </span></div>;
            return (
              <div key={idx} className={`diff-line ${line.type}`}>
                <span className="line-number">{line.lineNumberOld || ''}</span>
                <span className="line-content">{line.content || ' '}</span>
              </div>
            );
          })}
        </div>
        <div className="split-pane new-pane">
          <div className="pane-header">Modified</div>
          {Array.from({ length: maxLen }).map((_, idx) => {
            const line = newLines[idx];
            if (!line) return <div key={idx} className="diff-line empty"><span className="line-content"> </span></div>;
            return (
              <div key={idx} className={`diff-line ${line.type}`}>
                <span className="line-number">{line.lineNumberNew || ''}</span>
                <span className="line-content">{line.content || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <span className="filename">{filename}</span>
          <span className="language-badge">{language}</span>
        </div>
        <div className="diff-stats">
          <span className="stat added">+{stats.added}</span>
          <span className="stat removed">-{stats.removed}</span>
          <span className="stat unchanged">{stats.unchanged} unchanged</span>
        </div>
      </div>

      <div className="diff-toolbar">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'unified' ? 'active' : ''}`}
            onClick={() => setViewMode('unified')}
          >
            Unified
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
        </div>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showOnlyChanges}
            onChange={(e) => setShowOnlyChanges(e.target.checked)}
          />
          Show only changes
        </label>
        <div className="toolbar-actions">
          {showApplyButton && onApply && (
            <button className="btn btn-success" onClick={onApply}>
              Apply Changes
            </button>
          )}
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <div className="diff-body">
        {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}
      </div>

      <style jsx>{`
        .diff-viewer {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid #000000;
          border-radius: 12px;
          overflow: hidden;
        }

        .diff-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .diff-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #ffffff;
        }

        .diff-title svg {
          color: rgba(255, 255, 255, 0.5);
        }

        .filename {
          font-weight: 600;
          font-family: monospace;
        }

        .language-badge {
          padding: 0.125rem 0.5rem;
          background: rgba(33, 150, 243, 0.2);
          color: #2196f3;
          border-radius: 4px;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 500;
        }

        .diff-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .stat {
          font-weight: 500;
        }

        .stat.added {
          color: #4caf50;
        }

        .stat.removed {
          color: #e53e3e;
        }

        .stat.unchanged {
          color: rgba(255, 255, 255, 0.5);
        }

        .diff-toolbar {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .view-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 2px;
        }

        .toggle-btn {
          padding: 0.375rem 0.75rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          color: #ffffff;
        }

        .toggle-btn.active {
          background: rgba(33, 150, 243, 0.2);
          color: #ffffff;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
        }

        .filter-toggle input {
          accent-color: #2196f3;
        }

        .toolbar-actions {
          margin-left: auto;
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #000000;
          transition: all 0.2s;
        }

        .btn-success {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
          color: #4caf50;
        }

        .btn-success:hover {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(255, 255, 255, 0.12) 100%);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .diff-body {
          max-height: 500px;
          overflow: auto;
        }

        .diff-content {
          font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        .diff-content.unified {
          padding: 0;
        }

        .diff-content.split {
          display: flex;
        }

        .split-pane {
          flex: 1;
          min-width: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .split-pane:last-child {
          border-right: none;
        }

        .pane-header {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .diff-line {
          display: flex;
          min-height: 1.5rem;
          white-space: pre;
        }

        .diff-line.unchanged {
          background: transparent;
        }

        .diff-line.added {
          background: rgba(76, 175, 80, 0.1);
        }

        .diff-line.removed {
          background: rgba(229, 62, 62, 0.1);
        }

        .diff-line.empty {
          background: rgba(255, 255, 255, 0.02);
        }

        .line-number {
          flex-shrink: 0;
          width: 3rem;
          padding: 0 0.5rem;
          text-align: right;
          color: rgba(255, 255, 255, 0.3);
          user-select: none;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .unified .line-number.old {
          width: 2.5rem;
        }

        .unified .line-number.new {
          width: 2.5rem;
        }

        .line-prefix {
          flex-shrink: 0;
          width: 1.5rem;
          text-align: center;
          font-weight: 600;
        }

        .added .line-prefix {
          color: #4caf50;
        }

        .removed .line-prefix {
          color: #e53e3e;
        }

        .line-content {
          flex: 1;
          padding: 0 0.75rem;
          color: rgba(255, 255, 255, 0.9);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .added .line-content {
          color: #81c784;
        }

        .removed .line-content {
          color: #e57373;
        }
      `}</style>
    </div>
  );
}
