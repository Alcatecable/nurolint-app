"use client";

import React, { useState, useEffect } from "react";

interface ActivationChecklistProps {
  onNavigateToAnalyzer?: () => void;
  onNavigateToDocs?: () => void;
  hasAnalysisHistory?: boolean;
  onDismiss?: () => void;
}

export default function ActivationChecklist({ 
  onNavigateToAnalyzer, 
  onNavigateToDocs,
  hasAnalysisHistory = false,
  onDismiss 
}: ActivationChecklistProps) {
  const [progress, setProgress] = useState<Record<string, boolean>>({
    "first-analysis": false,
    "review-suggestions": false,
    "apply-fix": false,
    "explore-layers": false
  });
  
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // Check if user recently completed onboarding (within last 7 days)
    const onboardingCompleted = localStorage.getItem("onboarding_completed");
    const checklistDismissed = localStorage.getItem("neurolint-checklist-dismissed");
    
    if (checklistDismissed === "true") {
      setDismissed(true);
      return;
    }
    
    // Show checklist for users who recently completed onboarding
    if (onboardingCompleted === "true") {
      setIsNewUser(true);
    }
    
    // Load saved progress
    const savedProgress = localStorage.getItem("neurolint-checklist-progress");
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Auto-mark first-analysis if user has analysis history
  useEffect(() => {
    if (hasAnalysisHistory && !progress["first-analysis"]) {
      setProgress(prev => {
        const updated = { ...prev, "first-analysis": true, "review-suggestions": true };
        localStorage.setItem("neurolint-checklist-progress", JSON.stringify(updated));
        return updated;
      });
    }
  }, [hasAnalysisHistory, progress]);

  // Save progress and check for completion celebration
  useEffect(() => {
    localStorage.setItem("neurolint-checklist-progress", JSON.stringify(progress));
    
    const allCompleted = Object.values(progress).every(v => v);
    if (allCompleted && !showCelebration && isNewUser) {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        // Auto-dismiss after celebration
        handleDismiss();
      }, 4000);
    }
  }, [progress, showCelebration, isNewUser]);

  const handleToggle = (id: string) => {
    setProgress(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDismiss = () => {
    localStorage.setItem("neurolint-checklist-dismissed", "true");
    setDismissed(true);
    onDismiss?.();
  };

  const handleStartAnalysis = () => {
    if (onNavigateToAnalyzer) {
      onNavigateToAnalyzer();
    }
  };

  const handleViewDocs = () => {
    if (onNavigateToDocs) {
      onNavigateToDocs();
    } else {
      window.open("/docs", "_blank");
    }
    handleToggle("explore-layers");
  };

  // Don't render if dismissed or not a new user
  if (dismissed || !isNewUser) {
    return null;
  }

  const items = [
    {
      id: "first-analysis",
      title: "Run your first analysis",
      description: "Paste code in the analyzer to see NeuroLint in action",
      completed: progress["first-analysis"],
      actionLabel: "Start analysis",
      action: handleStartAnalysis
    },
    {
      id: "review-suggestions",
      title: "Review suggestions",
      description: "See what improvements NeuroLint recommends",
      completed: progress["review-suggestions"]
    },
    {
      id: "apply-fix",
      title: "Apply a fix",
      description: "Use one-click apply to modernize your code",
      completed: progress["apply-fix"]
    },
    {
      id: "explore-layers",
      title: "Explore layer documentation",
      description: "Learn what each of the 7 layers does",
      completed: progress["explore-layers"],
      actionLabel: "View docs",
      action: handleViewDocs
    }
  ];

  const completedCount = Object.values(progress).filter(v => v).length;
  const progressPercent = (completedCount / 4) * 100;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 50%, rgba(0, 0, 0, 0.4) 100%)",
      border: "2px solid #000000",
      borderRadius: "16px",
      padding: "1.5rem",
      marginBottom: "1.5rem",
      position: "relative"
    }}>
      {showCelebration && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "2rem",
              marginBottom: "0.5rem"
            }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#4caf50" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div style={{
              fontSize: "1.2rem",
              fontWeight: "600",
              color: "#ffffff"
            }}>
              All tasks completed!
            </div>
            <div style={{
              fontSize: "0.9rem",
              color: "rgba(255, 255, 255, 0.7)"
            }}>
              You're ready to modernize your codebase
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1rem"
      }}>
        <div>
          <h3 style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#ffffff",
            margin: "0 0 0.25rem 0"
          }}>
            Getting Started
          </h3>
          <p style={{
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0
          }}>
            Complete these steps to get the most out of NeuroLint
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.4)",
            cursor: "pointer",
            padding: "4px",
            fontSize: "1.2rem",
            lineHeight: 1
          }}
          title="Dismiss checklist"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        height: "8px",
        marginBottom: "1rem",
        overflow: "hidden"
      }}>
        <div style={{
          background: progressPercent === 100 
            ? "linear-gradient(90deg, rgba(76, 175, 80, 0.8), rgba(76, 175, 80, 0.6))"
            : "linear-gradient(90deg, rgba(33, 150, 243, 0.8), rgba(33, 150, 243, 0.6))",
          height: "100%",
          width: `${progressPercent}%`,
          borderRadius: "8px",
          transition: "width 0.3s ease"
        }} />
      </div>

      <div style={{
        fontSize: "0.8rem",
        color: "rgba(255, 255, 255, 0.5)",
        marginBottom: "1rem"
      }}>
        {completedCount} of 4 completed
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleToggle(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              background: item.completed 
                ? "rgba(76, 175, 80, 0.1)"
                : "rgba(255, 255, 255, 0.05)",
              border: "2px solid #000000",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              border: "2px solid #000000",
              background: item.completed 
                ? "rgba(76, 175, 80, 0.3)"
                : "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease"
            }}>
              {item.completed && (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4caf50" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "0.9rem",
                fontWeight: "500",
                color: item.completed ? "rgba(255, 255, 255, 0.6)" : "#ffffff",
                textDecoration: item.completed ? "line-through" : "none"
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: "0.8rem",
                color: "rgba(255, 255, 255, 0.5)"
              }}>
                {item.description}
              </div>
            </div>
            {item.actionLabel && !item.completed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  item.action?.();
                }}
                style={{
                  padding: "0.375rem 0.75rem",
                  background: "rgba(33, 150, 243, 0.2)",
                  border: "2px solid #000000",
                  borderRadius: "6px",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
