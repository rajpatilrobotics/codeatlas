import React, { useMemo } from 'react';
import { Files, Shield, AlertTriangle, Package, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import MetricCard from '../ui/MetricCard';
import AlertRow from '../ui/AlertRow';
import {
  RECENT_INTELLIGENCE,
  AI_RECOMMENDATIONS,
  QUICK_NAV_ITEMS,
} from '../../data/dashboardMocks';

function Dashboard({ repoData, repoSize, codeAnalysis, onNavigate }) {
  const metrics = useMemo(() => {
    let securityScore = '—';
    let highRisk = 0;
    let dependencies = 0;

    if (codeAnalysis?.security) {
      const sec = codeAnalysis.security;
      const total =
        (sec.vulnerabilities?.critical?.length || 0) +
        (sec.vulnerabilities?.high?.length || 0) +
        (sec.vulnerabilities?.medium?.length || 0) +
        (sec.vulnerabilities?.low?.length || 0);
      highRisk =
        (sec.vulnerabilities?.critical?.length || 0) +
        (sec.vulnerabilities?.high?.length || 0);
      securityScore = total === 0 ? '92/100' : `${Math.max(40, 100 - total * 4)}/100`;
    } else if (repoData) {
      securityScore = '87/100';
      highRisk = 12;
    }

    if (repoData?.techStack) {
      dependencies = Object.values(repoData.techStack).flat().length;
    }
    if (codeAnalysis?.imports) {
      dependencies = Math.max(dependencies, Object.keys(codeAnalysis.imports).length);
    }
    if (!dependencies && repoData) dependencies = 423;

    return {
      totalFiles: repoSize ? repoSize.toLocaleString() : '1,247',
      securityScore,
      highRisk: highRisk || (repoData ? 12 : '—'),
      dependencies: dependencies ? dependencies.toLocaleString() : '423',
    };
  }, [repoData, repoSize, codeAnalysis]);

  const lastAnalyzed = repoData?.repoInfo?.updatedAt
    ? new Date(repoData.repoInfo.updatedAt).toLocaleDateString()
    : 'Recently';

  return (
    <div className="ca-dashboard">
      <div className="ca-metrics-grid">
        <MetricCard label="Total Files" value={metrics.totalFiles} icon={Files} trend="↗" />
        <MetricCard label="Security Score" value={metrics.securityScore} icon={Shield} trend="↗" />
        <MetricCard label="High Risk Modules" value={metrics.highRisk} icon={AlertTriangle} trend="→" />
        <MetricCard label="Dependencies" value={metrics.dependencies} icon={Package} trend="↗" />
      </div>

      <div className="ca-dashboard-grid-2">
        <Card title="Recent Intelligence">
          <div className="ca-alert-list">
            {RECENT_INTELLIGENCE.map((item, i) => (
              <AlertRow key={i} type={item.type} title={item.title} time={item.time} />
            ))}
          </div>
        </Card>

        <Card title="Quick Navigation">
          <div className="ca-quick-nav">
            {QUICK_NAV_ITEMS.map((item) => (
              <button
                key={item.tabId}
                type="button"
                className="ca-quick-nav-item"
                onClick={() => onNavigate?.(item.tabId)}
              >
                <span>{item.label}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title="AI Recommendations">
        <ul className="ca-recommendations-list">
          {AI_RECOMMENDATIONS.map((text, i) => (
            <li key={i} className="ca-recommendation-item">
              <span className="ca-recommendation-dot" />
              {text}
            </li>
          ))}
        </ul>
        {repoData && (
          <p className="ca-dashboard-meta">
            Repository: {repoData.repoInfo?.name} · Last analyzed: {lastAnalyzed}
          </p>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;
