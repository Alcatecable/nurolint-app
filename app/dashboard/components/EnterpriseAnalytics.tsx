'use client';

import React, { useMemo, useState, useEffect, useCallback } from "react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  scansThisMonth: number;
  issuesFixed: number;
  lastActive: Date;
  status: 'online' | 'offline' | 'away';
}

interface UsageTrend {
  date: string;
  scans: number;
  issuesFound: number;
  issuesFixed: number;
}

interface ComplianceRule {
  id: string;
  name: string;
  category: string;
  status: 'passing' | 'warning' | 'failing';
  lastChecked: Date;
  affectedFiles: number;
}

interface EnterpriseAnalyticsProps {
  teamId?: string;
}

export default function EnterpriseAnalytics({ teamId }: EnterpriseAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "compliance">("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [usageTrends, setUsageTrends] = useState<UsageTrend[]>([]);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ timeRange });
      if (teamId) params.append('teamId', teamId);
      
      const response = await fetch(`/api/analytics/enterprise?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTeamMembers(data.teamMembers.map((m: TeamMember & { lastActive: string }) => ({
          ...m,
          lastActive: new Date(m.lastActive)
        })));
        
        setUsageTrends(data.usageTrends || []);
        
        setComplianceRules(data.complianceRules.map((r: ComplianceRule & { lastChecked: string }) => ({
          ...r,
          lastChecked: new Date(r.lastChecked)
        })));
      }
    } catch (err) {
      console.error('Error fetching enterprise analytics:', err);
      setError('Unable to load analytics data');
      setTeamMembers([]);
      setUsageTrends([]);
      setComplianceRules([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, teamId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const metrics = useMemo(() => {
    const totalScans = usageTrends.reduce((sum, t) => sum + t.scans, 0);
    const totalIssuesFound = usageTrends.reduce((sum, t) => sum + t.issuesFound, 0);
    const totalIssuesFixed = usageTrends.reduce((sum, t) => sum + t.issuesFixed, 0);
    const fixRate = totalIssuesFound > 0 ? (totalIssuesFixed / totalIssuesFound) * 100 : 0;
    const passingRules = complianceRules.filter(r => r.status === 'passing').length;
    const complianceScore = complianceRules.length > 0 ? (passingRules / complianceRules.length) * 100 : 0;
    const activeMembers = teamMembers.filter(m => m.status !== 'offline').length;

    return {
      totalScans,
      totalIssuesFound,
      totalIssuesFixed,
      fixRate,
      complianceScore,
      activeMembers,
      totalMembers: teamMembers.length
    };
  }, [usageTrends, complianceRules, teamMembers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passing': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'failing': return '#e53e3e';
      case 'online': return '#4caf50';
      case 'away': return '#ff9800';
      case 'offline': return '#666666';
      default: return '#666666';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="enterprise-analytics-root">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading enterprise analytics...</p>
        </div>
        <style jsx>{`
          .enterprise-analytics-root {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            border: 2px solid #000000;
            border-radius: 16px;
          }
          .loading-state {
            text-align: center;
            padding: 3rem;
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid #000000;
            border-top: 2px solid #ffffff;
            border-radius: 50%;
            margin: 0 auto 1rem;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enterprise-analytics-root">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchAnalytics} className="retry-btn">Try Again</button>
        </div>
        <style jsx>{`
          .enterprise-analytics-root {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            border: 2px solid #000000;
            border-radius: 16px;
          }
          .error-state {
            text-align: center;
            padding: 3rem;
            color: rgba(255, 255, 255, 0.7);
          }
          .retry-btn {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: rgba(33, 150, 243, 0.2);
            border: 1px solid #000000;
            border-radius: 8px;
            color: #ffffff;
            cursor: pointer;
          }
          .retry-btn:hover {
            background: rgba(33, 150, 243, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="enterprise-analytics-root">
      <div className="analytics-header">
        <div className="header-title">
          <h2>Enterprise Analytics</h2>
          <p>Team metrics, usage trends, and compliance insights</p>
        </div>

        <div className="header-controls">
          <div className="time-filters">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`filter-btn ${timeRange === range ? "active" : ""}`}
              >
                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        {(["overview", "team", "compliance"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            {tab === "overview" ? "Overview" : tab === "team" ? "Team Activity" : "Compliance"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="metrics-grid">
            <div className="metric-card primary">
              <div className="metric-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.totalScans}</div>
                <div className="metric-label">Total Scans</div>
                <div className="metric-change">
                  <span className="trend-indicator success">+12% vs last period</span>
                </div>
              </div>
            </div>

            <div className="metric-card success">
              <div className="metric-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.fixRate.toFixed(0)}%</div>
                <div className="metric-label">Fix Rate</div>
                <div className="metric-change">
                  <span className="fixes-applied">{metrics.totalIssuesFixed} issues resolved</span>
                </div>
              </div>
            </div>

            <div className="metric-card warning">
              <div className="metric-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.complianceScore.toFixed(0)}%</div>
                <div className="metric-label">Compliance Score</div>
                <div className="metric-breakdown">
                  <span className="passing">{complianceRules.filter(r => r.status === 'passing').length} passing</span>
                  <span className="warning">{complianceRules.filter(r => r.status === 'warning').length} warnings</span>
                </div>
              </div>
            </div>

            <div className="metric-card performance">
              <div className="metric-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.activeMembers}/{metrics.totalMembers}</div>
                <div className="metric-label">Active Members</div>
                <div className="metric-trend">
                  <span className="trend-text">Team engagement</span>
                </div>
              </div>
            </div>
          </div>

          <div className="usage-trends-section">
            <div className="section-header">
              <h3>Usage Trends</h3>
              <p>Analysis activity over the selected time period</p>
            </div>
            <div className="trends-chart">
              {usageTrends.map((trend, index) => (
                <div key={index} className="trend-bar-group">
                  <div className="trend-bars">
                    <div 
                      className="trend-bar scans" 
                      style={{ height: `${(trend.scans / 70) * 100}%` }}
                      title={`${trend.scans} scans`}
                    />
                    <div 
                      className="trend-bar fixed" 
                      style={{ height: `${(trend.issuesFixed / 300) * 100}%` }}
                      title={`${trend.issuesFixed} issues fixed`}
                    />
                  </div>
                  <span className="trend-label">{trend.date}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-dot scans" /> Scans</span>
              <span className="legend-item"><span className="legend-dot fixed" /> Issues Fixed</span>
            </div>
          </div>
        </>
      )}

      {activeTab === "team" && (
        <div className="team-section">
          <div className="section-header">
            <h3>Team Activity</h3>
            <p>Individual performance and engagement metrics</p>
          </div>
          <div className="team-list">
            {teamMembers.map((member) => (
              <div key={member.id} className="team-member-card">
                <div className="member-avatar">
                  <span className="avatar-initial">{member.name.charAt(0)}</span>
                  <span 
                    className="status-dot" 
                    style={{ backgroundColor: getStatusColor(member.status) }}
                  />
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-role">{member.role}</div>
                  <div className="member-meta">
                    <span className="last-active">Active {formatRelativeTime(member.lastActive)}</span>
                  </div>
                </div>
                <div className="member-stats">
                  <div className="stat">
                    <span className="stat-value">{member.scansThisMonth}</span>
                    <span className="stat-label">Scans</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{member.issuesFixed}</span>
                    <span className="stat-label">Fixed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="compliance-section">
          <div className="section-header">
            <h3>Compliance Rules</h3>
            <p>Enterprise policy enforcement and code quality standards</p>
          </div>
          <div className="compliance-list">
            {complianceRules.map((rule) => (
              <div key={rule.id} className="compliance-rule-card">
                <div className="rule-status">
                  <span 
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(rule.status) }}
                  />
                </div>
                <div className="rule-info">
                  <div className="rule-name">{rule.name}</div>
                  <div className="rule-category">{rule.category}</div>
                </div>
                <div className="rule-meta">
                  <span className={`status-badge ${rule.status}`}>
                    {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                  </span>
                  {rule.affectedFiles > 0 && (
                    <span className="affected-files">{rule.affectedFiles} files affected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .enterprise-analytics-root {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          border: 2px solid #000000;
          border-radius: 16px;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.5rem 0;
          line-height: 1.2;
        }

        .header-title p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          font-size: 1rem;
        }

        .time-filters {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid #000000;
          border-radius: 12px;
          padding: 4px;
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .filter-btn.active {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%);
          color: #ffffff;
          border: 2px solid #000000;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 4px;
        }

        .tab-btn {
          flex: 1;
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
          color: #ffffff;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .metric-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 16px;
          backdrop-filter: blur(25px) saturate(1.2);
          -webkit-backdrop-filter: blur(25px) saturate(1.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .metric-card.primary {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%);
          border: 2px solid #000000;
        }

        .metric-card.success {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%);
          border: 2px solid #000000;
        }

        .metric-card.warning {
          background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 152, 0, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%);
          border: 2px solid #000000;
        }

        .metric-card.performance {
          background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(156, 39, 176, 0.15) 50%, rgba(255, 255, 255, 0.1) 100%);
          border: 2px solid #000000;
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid #000000;
          border-radius: 12px;
          color: #ffffff;
          flex-shrink: 0;
        }

        .metric-content {
          flex: 1;
          min-width: 0;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .metric-label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .metric-change {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trend-indicator {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .trend-indicator.success {
          color: #4caf50;
        }

        .fixes-applied {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .metric-breakdown {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .metric-breakdown .passing {
          color: #4caf50;
        }

        .metric-breakdown .warning {
          color: #ff9800;
        }

        .metric-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trend-text {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 0.25rem 0;
        }

        .section-header p {
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          font-size: 0.875rem;
        }

        .usage-trends-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 16px;
          padding: 1.5rem;
        }

        .trends-chart {
          display: flex;
          gap: 1.5rem;
          justify-content: space-around;
          align-items: flex-end;
          height: 160px;
          padding: 1rem 0;
        }

        .trend-bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .trend-bars {
          display: flex;
          gap: 4px;
          align-items: flex-end;
          height: 120px;
        }

        .trend-bar {
          width: 24px;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }

        .trend-bar.scans {
          background: linear-gradient(180deg, rgba(33, 150, 243, 0.8) 0%, rgba(33, 150, 243, 0.4) 100%);
        }

        .trend-bar.fixed {
          background: linear-gradient(180deg, rgba(76, 175, 80, 0.8) 0%, rgba(76, 175, 80, 0.4) 100%);
        }

        .trend-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .chart-legend {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }

        .legend-dot.scans {
          background: rgba(33, 150, 243, 0.8);
        }

        .legend-dot.fixed {
          background: rgba(76, 175, 80, 0.8);
        }

        .team-section, .compliance-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 16px;
          padding: 1.5rem;
        }

        .team-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .team-member-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .team-member-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .member-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          background: rgba(33, 150, 243, 0.2);
          border: 2px solid #000000;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .avatar-initial {
          font-size: 1.25rem;
          font-weight: 600;
          color: rgba(33, 150, 243, 0.9);
        }

        .status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #000000;
        }

        .member-info {
          flex: 1;
          min-width: 0;
        }

        .member-name {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.125rem;
        }

        .member-role {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .member-meta {
          margin-top: 0.25rem;
        }

        .last-active {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .member-stats {
          display: flex;
          gap: 1.5rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
        }

        .stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .compliance-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .compliance-rule-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid #000000;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .compliance-rule-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .rule-status {
          flex-shrink: 0;
        }

        .status-indicator {
          display: block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .rule-info {
          flex: 1;
          min-width: 0;
        }

        .rule-name {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.125rem;
        }

        .rule-category {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .rule-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.passing {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }

        .status-badge.warning {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
        }

        .status-badge.failing {
          background: rgba(229, 62, 62, 0.2);
          color: #e53e3e;
        }

        .affected-files {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 768px) {
          .analytics-header {
            flex-direction: column;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .tab-navigation {
            flex-direction: column;
          }

          .member-stats {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
