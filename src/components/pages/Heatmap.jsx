import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronUp,
  Flame,
  GitBranch,
  Layers,
  Network,
  Search,
  Shield,
  SlidersHorizontal,
  Target,
  X,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { buildDangerZoneHeatmap } from '../../utils/repository/buildDangerZoneHeatmap.js';

const RANKED_FILE_LIMIT = 18;
const MODULE_FILE_LIMIT = 3;
const MODULE_DRIVER_LIMIT = 2;
const FILE_DRIVER_LIMIT = 2;

const RISK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const DRIVER_FILTERS = [
  { value: 'all', label: 'All drivers' },
  { value: 'blast-radius', label: 'Blast radius' },
  { value: 'security', label: 'Security' },
  { value: 'auth', label: 'Auth' },
  { value: 'database', label: 'Database' },
  { value: 'api-service', label: 'API/Service' },
  { value: 'config-env', label: 'Config/Env' },
  { value: 'entrypoint', label: 'Entrypoint' },
  { value: 'graph-backed', label: 'Graph-backed' }
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Risk score' },
  { value: 'blast', label: 'Blast radius' },
  { value: 'centrality', label: 'Centrality' },
  { value: 'security', label: 'Security' },
  { value: 'complexity', label: 'Complexity' }
];

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getLevelVariant(level) {
  if (level === 'critical') return 'critical';
  if (level === 'high') return 'high';
  if (level === 'medium') return 'medium';
  return 'low';
}

function getOptionLabel(options, value) {
  return options.find(option => option.value === value)?.label || 'All';
}

function RiskBadge({ level }) {
  return (
    <Badge variant={getLevelVariant(level)} className="ca-heatmap-risk-badge">
      {level}
    </Badge>
  );
}

function SelectControl({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value) || options[0];

  function handleSelect(nextValue) {
    onChange(nextValue);
    setIsOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <div
      className={`ca-heatmap-select ${isOpen ? 'ca-heatmap-select--open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span>{label}</span>
      <button
        type="button"
        className="ca-heatmap-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(current => !current)}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown size={15} />
      </button>
      {isOpen ? (
        <div className="ca-heatmap-select-menu" role="listbox" aria-label={label}>
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuickActions({ onNavigate }) {
  return (
    <div className="ca-heatmap-actions" aria-label="Heatmap quick links">
      <button type="button" onClick={() => onNavigate?.('repository-graph')}>
        <GitBranch size={15} />
        Repository Graph
      </button>
      <button type="button" onClick={() => onNavigate?.('blast-radius')}>
        <Target size={15} />
        Blast Radius
      </button>
      <button type="button" onClick={() => onNavigate?.('planner')}>
        <Network size={15} />
        Planner
      </button>
      <button type="button" onClick={() => onNavigate?.('debug-navigator')}>
        <Bug size={15} />
        Debug Navigator
      </button>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon: Icon, level }) {
  return (
    <div className={`ca-heatmap-summary-card ${level ? `ca-heatmap-summary-card--${level}` : ''}`}>
      <div className="ca-heatmap-summary-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

function WarningList({ warnings }) {
  if (!warnings.length) return null;

  return (
    <div className="ca-heatmap-warnings">
      {warnings.map((warning) => (
        <div key={warning}>
          <AlertTriangle size={15} />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

function ModuleTile({ cluster, isSelected, onSelect }) {
  const intensity = Math.max(cluster.maxScore, cluster.averageScore) / 100;
  const visibleDrivers = cluster.dominantDrivers.slice(0, MODULE_DRIVER_LIMIT);
  const hiddenDrivers = Math.max(0, cluster.dominantDrivers.length - visibleDrivers.length);
  const visibleFiles = cluster.topFiles.slice(0, MODULE_FILE_LIMIT);
  const hiddenFiles = Math.max(0, cluster.topFiles.length - visibleFiles.length);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`ca-heatmap-module-tile ca-heatmap-module-tile--${cluster.level} ${isSelected ? 'ca-heatmap-module-tile--selected' : ''}`}
      onClick={() => onSelect(cluster.module)}
      style={{ '--heat-intensity': intensity }}
    >
      <div className="ca-heatmap-module-top">
        <div>
          <span>Module</span>
          <h3 title={cluster.module}>{cluster.module}</h3>
        </div>
        <RiskBadge level={cluster.level} />
      </div>
      <div className="ca-heatmap-module-score">
        <strong>{cluster.maxScore}</strong>
        <span>max risk</span>
      </div>
      <div className="ca-heatmap-module-meta">
        <span>{formatNumber(cluster.filesCount)} files</span>
        <span>{formatNumber(cluster.criticalFiles)} critical</span>
        <span>{formatNumber(cluster.highFiles)} high</span>
        <span>{formatPercent(cluster.graphCoverage)} graph</span>
      </div>
      <div className="ca-heatmap-driver-chips">
        {visibleDrivers.length > 0 ? (
          visibleDrivers.map(driver => (
            <span key={driver.label}>{driver.label}</span>
          ))
        ) : (
          <span>Low concentration</span>
        )}
        {hiddenDrivers > 0 ? <span>+{hiddenDrivers} more</span> : null}
      </div>
      <div className="ca-heatmap-module-files">
        {visibleFiles.map(file => (
          <div key={file.path}>
            <span title={file.path}>{file.path}</span>
            <strong>{file.score}</strong>
          </div>
        ))}
        {hiddenFiles > 0 ? (
          <div className="ca-heatmap-module-more">
            <span>+{hiddenFiles} more risky files</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ModuleDrilldown({ cluster, onClear }) {
  if (!cluster) return null;

  const topDriver = cluster.dominantDriverDetails[0] || null;
  const topFile = cluster.inspectionOrder[0] || null;

  return (
    <aside className="ca-heatmap-drilldown">
      <div className="ca-heatmap-drilldown-header">
        <div>
          <span>Selected module</span>
          <h3 title={cluster.module}>{cluster.module}</h3>
        </div>
        <button type="button" onClick={onClear}>
          <X size={14} />
          Clear
        </button>
      </div>
      <div className="ca-heatmap-drilldown-priority">
        <span>Inspect first</span>
        <strong title={topFile?.path || cluster.module}>
          {topFile?.path || `${cluster.module} files`}
        </strong>
        <small>
          {topFile
            ? `${topFile.score} risk · ${topFile.reason}`
            : 'Review the highest-scoring files in this module.'}
        </small>
      </div>
      <div className="ca-heatmap-drilldown-stats">
        <div>
          <strong>{cluster.maxScore}</strong>
          <span>max risk</span>
        </div>
        <div>
          <strong>{cluster.averageScore}</strong>
          <span>avg risk</span>
        </div>
        <div>
          <strong>{formatPercent(cluster.graphCoverage)}</strong>
          <span>graph-backed</span>
        </div>
      </div>
      <div className="ca-heatmap-drilldown-section ca-heatmap-drilldown-compact">
        <h4>Top driver</h4>
        <p>
          {topDriver
            ? `${topDriver.label} appears across ${formatNumber(topDriver.count)} file${topDriver.count === 1 ? '' : 's'} in this module.`
            : 'No dominant driver was detected for this module.'}
        </p>
      </div>
      <div className="ca-heatmap-drilldown-section">
        <h4>Dominant drivers</h4>
        <div className="ca-heatmap-driver-chips">
          {cluster.dominantDriverDetails.map(driver => (
            <span key={driver.label} title={driver.examples.join(', ')}>
              {driver.label} · {driver.count}
            </span>
          ))}
        </div>
      </div>
      <div className="ca-heatmap-drilldown-section">
        <h4>Suggested inspection order</h4>
        <div className="ca-heatmap-inspection-list">
          {cluster.inspectionOrder.map(file => (
            <div key={file.path}>
              <span title={file.path}>{file.path}</span>
              <small>{file.score} · {file.reason}</small>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DangerFileRow({ file, onNavigate, isExpanded, onToggle }) {
  const visibleDrivers = file.topDrivers.slice(0, FILE_DRIVER_LIMIT);
  const hiddenDrivers = Math.max(0, file.topDrivers.length - visibleDrivers.length);
  const maxDriverPoints = Math.max(...file.drivers.map(driver => driver.points), 1);

  return (
    <article className={`ca-heatmap-file-row ca-heatmap-file-row--${file.level}`}>
      <div className="ca-heatmap-file-score">
        <strong>{file.score}</strong>
        <RiskBadge level={file.level} />
      </div>
      <div className="ca-heatmap-file-main">
        <div className="ca-heatmap-file-heading">
          <strong title={file.path}>{file.path}</strong>
          <span>{file.module} · {file.layer} · {file.language}</span>
        </div>
        <div className="ca-heatmap-driver-chips">
          {visibleDrivers.map(driver => (
            <span key={`${file.path}-${driver.id}`} title={driver.detail}>
              {driver.label}
            </span>
          ))}
          {hiddenDrivers > 0 ? <span>+{hiddenDrivers} more</span> : null}
        </div>
      </div>
      <div className="ca-heatmap-file-evidence">
        <span>{file.isGraphBacked ? 'graph-backed' : 'fallback'}</span>
        <span>{file.affectedFilesCount ? `${formatNumber(file.affectedFilesCount)} affected` : 'impact estimated'}</span>
        <span>{file.confidence} confidence</span>
      </div>
      <div className="ca-heatmap-row-actions">
        <button type="button" onClick={() => onNavigate?.('blast-radius')}>Impact</button>
        <button type="button" onClick={() => onNavigate?.('repository-graph')}>Graph</button>
        <button type="button" onClick={() => onNavigate?.('planner')}>Planner</button>
        <button type="button" onClick={onToggle} className="ca-heatmap-why-button">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? 'Hide why' : 'Show why'}
        </button>
      </div>
      {isExpanded ? (
        <div className="ca-heatmap-file-details">
          <div className="ca-heatmap-inspect-first">
            <strong>Inspect first</strong>
            <span>{file.inspectRecommendation}</span>
          </div>
          <div className="ca-heatmap-driver-evidence-grid">
            {file.drivers.map(driver => (
              <div key={`${file.path}-${driver.id}-${driver.source}`} className="ca-heatmap-driver-evidence">
                <div>
                  <strong>{driver.label}</strong>
                  <span>{driver.source}</span>
                </div>
                <div className="ca-heatmap-driver-points">
                  <b>+{driver.points}</b>
                  <span aria-hidden="true">
                    <i style={{ width: `${Math.max(8, (driver.points / maxDriverPoints) * 100)}%` }} />
                  </span>
                </div>
                <small>{driver.detail}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function InspectFirstStrip({
  topFile,
  topModule,
  topDriver,
  selectedModule,
  riskFilter,
  driverFilter,
  sortMode,
  visibleCount,
  totalCount,
  onClear
}) {
  const activeScope = selectedModule
    ? `Module: ${selectedModule}`
    : `${formatNumber(visibleCount)} of ${formatNumber(totalCount)} files`;
  const hasFilters = selectedModule || riskFilter !== 'all' || driverFilter !== 'all';

  return (
    <section className="ca-heatmap-priority-strip" aria-label="Heatmap inspect first summary">
      <div className="ca-heatmap-priority-item ca-heatmap-priority-item--primary">
        <span>Inspect first</span>
        <strong title={topFile?.path || ''}>{topFile?.path || 'No file in current scope'}</strong>
        <small>{topFile ? `${topFile.score} risk · ${topFile.topDrivers[0]?.label || 'local evidence'}` : 'Clear filters to restore ranked results.'}</small>
      </div>
      <div className="ca-heatmap-priority-item">
        <span>Top module</span>
        <strong title={topModule?.module || ''}>{topModule?.module || 'None'}</strong>
        <small>{topModule ? `${topModule.maxScore} max risk · ${formatNumber(topModule.filesCount)} files` : 'No module cluster available'}</small>
      </div>
      <div className="ca-heatmap-priority-item">
        <span>Strongest driver</span>
        <strong title={topDriver?.label || ''}>{topDriver?.label || 'No driver'}</strong>
        <small>{topDriver ? `${formatNumber(topDriver.count || 0)} files · ${topDriver.source || 'local'}` : 'No driver evidence found'}</small>
      </div>
      <div className="ca-heatmap-priority-item ca-heatmap-priority-scope">
        <span>Current scope</span>
        <strong>{activeScope}</strong>
        <small>
          {getOptionLabel(RISK_FILTERS, riskFilter)} · {getOptionLabel(DRIVER_FILTERS, driverFilter)} · {getOptionLabel(SORT_OPTIONS, sortMode)}
        </small>
        {hasFilters ? <button type="button" onClick={onClear}>Clear</button> : null}
      </div>
    </section>
  );
}

function RiskDriverPanel({ drivers }) {
  if (!drivers.length) {
    return (
      <Card title="Risk Drivers" icon={AlertTriangle}>
        <p className="ca-page-desc">No strong risk drivers were detected from the available repository data.</p>
      </Card>
    );
  }

  const maxPoints = Math.max(...drivers.map(driver => driver.totalPoints), 1);

  return (
    <Card title="Risk Drivers" icon={AlertTriangle}>
      <div className="ca-heatmap-driver-list">
        {drivers.map(driver => (
          <div key={driver.id} className="ca-heatmap-driver-row">
            <div className="ca-heatmap-driver-row-main">
              <strong>{driver.label}</strong>
              <span>{driver.count} files · {driver.source}</span>
            </div>
            <div className="ca-heatmap-driver-meter" aria-hidden="true">
              <span style={{ width: `${Math.max(8, (driver.totalPoints / maxPoints) * 100)}%` }} />
            </div>
            <small title={driver.examples.join(', ')}>
              {driver.examples.slice(0, 2).join(', ')}
              {driver.examples.length > 2 ? ` +${driver.examples.length - 2} more` : ''}
            </small>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HeatmapControls({
  searchQuery,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  driverFilter,
  onDriverFilterChange,
  sortMode,
  onSortModeChange,
  selectedModule,
  onClear,
  visibleCount,
  totalCount
}) {
  return (
    <section className="ca-heatmap-controls">
      <div className="ca-heatmap-search">
        <Search size={16} />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search file, module, layer, language, or driver"
        />
        {searchQuery ? (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')}>
            <X size={14} />
          </button>
        ) : null}
      </div>
      <div className="ca-heatmap-filter-row">
        <SelectControl label="Risk" value={riskFilter} onChange={onRiskFilterChange} options={RISK_FILTERS} />
        <SelectControl label="Driver" value={driverFilter} onChange={onDriverFilterChange} options={DRIVER_FILTERS} />
        <SelectControl label="Sort" value={sortMode} onChange={onSortModeChange} options={SORT_OPTIONS} />
      </div>
      <div className="ca-heatmap-control-status">
        <SlidersHorizontal size={15} />
        <span>{formatNumber(visibleCount)} of {formatNumber(totalCount)} files shown</span>
        {selectedModule ? <Badge variant="info">Module: {selectedModule}</Badge> : null}
        {(searchQuery || riskFilter !== 'all' || driverFilter !== 'all' || selectedModule) ? (
          <button type="button" onClick={onClear}>Clear filters</button>
        ) : null}
      </div>
    </section>
  );
}

function fileMatchesSearch(file, query) {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  const searchable = [
    file.path,
    file.module,
    file.directory,
    file.layer,
    file.language,
    ...file.drivers.map(driver => driver.label),
    ...file.drivers.map(driver => driver.detail)
  ].join(' ').toLowerCase();

  return searchable.includes(normalizedQuery);
}

function getSortValue(file, sortMode) {
  if (sortMode === 'blast') return file.componentScores?.blastRadius || 0;
  if (sortMode === 'centrality') return file.componentScores?.centrality || 0;
  if (sortMode === 'security') return file.componentScores?.security || 0;
  if (sortMode === 'complexity') return file.componentScores?.complexity || 0;
  return file.score;
}

function Heatmap({ repoData, codeAnalysis, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [sortMode, setSortMode] = useState('score');
  const [selectedModule, setSelectedModule] = useState('');
  const [expandedFiles, setExpandedFiles] = useState(() => new Set());

  const heatmap = useMemo(() => (
    buildDangerZoneHeatmap(repoData, codeAnalysis)
  ), [repoData, codeAnalysis]);

  const hasRepository = heatmap.coverage.totalFiles > 0;
  const selectedCluster = useMemo(() => (
    heatmap.moduleClusters.find(cluster => cluster.module === selectedModule) || null
  ), [heatmap.moduleClusters, selectedModule]);
  const filteredFiles = useMemo(() => (
    heatmap.rankedFiles
      .filter(file => !selectedModule || file.module === selectedModule)
      .filter(file => riskFilter === 'all' || file.level === riskFilter)
      .filter(file => driverFilter === 'all' || file.riskCategories?.includes(driverFilter))
      .filter(file => fileMatchesSearch(file, searchQuery))
      .slice()
      .sort((a, b) => {
        const valueDelta = getSortValue(b, sortMode) - getSortValue(a, sortMode);
        return valueDelta || b.score - a.score || a.path.localeCompare(b.path);
      })
  ), [heatmap.rankedFiles, selectedModule, riskFilter, driverFilter, searchQuery, sortMode]);
  const topFiles = filteredFiles.slice(0, RANKED_FILE_LIMIT);
  const activeTopFile = topFiles[0] || null;
  const activeTopModule = selectedCluster || heatmap.moduleClusters[0] || null;
  const activeTopDriver = activeTopFile?.topDrivers?.[0] || heatmap.riskDrivers[0] || null;

  function clearFilters() {
    setSearchQuery('');
    setRiskFilter('all');
    setDriverFilter('all');
    setSelectedModule('');
  }

  function toggleExpanded(path) {
    setExpandedFiles(current => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  if (!hasRepository) {
    return (
      <div className="tab-content ca-heatmap-page">
        <EmptyState
          icon={Flame}
          title="Analyze a repository to build the Danger Zone Heatmap"
          description="Heatmap needs repository files, dependency graph signals, and code analysis before it can rank risky modules."
        />
      </div>
    );
  }

  return (
    <div className="tab-content ca-heatmap-page">
      <section className="ca-heatmap-hero">
        <div>
          <div className="ca-heatmap-kicker">Danger Zone Heatmap</div>
          <h1>Risk concentration across this repository</h1>
          <p>
            Deterministic local scoring ranks files and modules by blast radius, graph centrality,
            security findings, complexity, and path sensitivity.
          </p>
        </div>
        <QuickActions onNavigate={onNavigate} />
      </section>

      <WarningList warnings={heatmap.warnings} />

      <HeatmapControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
        driverFilter={driverFilter}
        onDriverFilterChange={setDriverFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        selectedModule={selectedModule}
        onClear={clearFilters}
        visibleCount={filteredFiles.length}
        totalCount={heatmap.rankedFiles.length}
      />

      <InspectFirstStrip
        topFile={activeTopFile}
        topModule={activeTopModule}
        topDriver={activeTopDriver}
        selectedModule={selectedModule}
        riskFilter={riskFilter}
        driverFilter={driverFilter}
        sortMode={sortMode}
        visibleCount={filteredFiles.length}
        totalCount={heatmap.rankedFiles.length}
        onClear={clearFilters}
      />

      <section className="ca-heatmap-summary-grid">
        <SummaryCard
          icon={Flame}
          label="Critical files"
          value={formatNumber(heatmap.summary.criticalFiles)}
          detail={`${formatNumber(heatmap.summary.highFiles)} high-risk files`}
          level="critical"
        />
        <SummaryCard
          icon={Layers}
          label="Risky modules"
          value={formatNumber(heatmap.summary.criticalModules)}
          detail={`${formatNumber(heatmap.moduleClusters.length)} clusters ranked`}
          level="high"
        />
        <SummaryCard
          icon={GitBranch}
          label="Graph coverage"
          value={formatPercent(heatmap.coverage.graphCoverage)}
          detail={`${formatNumber(heatmap.coverage.graphFiles)} graph files · ${formatNumber(heatmap.coverage.graphEdges)} edges`}
        />
        <SummaryCard
          icon={Shield}
          label="Security findings"
          value={formatNumber(heatmap.summary.securityFindings)}
          detail={`${formatNumber(heatmap.coverage.analyzedFiles)} analyzed files`}
        />
        <SummaryCard
          icon={Target}
          label="Blast checked"
          value={formatNumber(heatmap.coverage.blastAnalyzedCandidates)}
          detail="bounded top-candidate impact pass"
        />
        <SummaryCard
          icon={Network}
          label="Average risk"
          value={heatmap.summary.averageRisk}
          detail={`${formatNumber(heatmap.summary.scoredFiles)} files scored`}
        />
      </section>

      <section className="ca-heatmap-layout">
        <Card title="Critical Clusters" icon={Layers} className="ca-heatmap-clusters-card">
          <p className="ca-page-desc">
            Module tiles show aggregate risk concentration. Larger, hotter tiles should be inspected first.
          </p>
          <div className="ca-heatmap-module-grid">
            {heatmap.moduleClusters.map(cluster => (
              <ModuleTile
                key={cluster.module}
                cluster={cluster}
                isSelected={selectedModule === cluster.module}
                onSelect={(module) => setSelectedModule(current => current === module ? '' : module)}
              />
            ))}
          </div>
        </Card>

        <aside className="ca-heatmap-side-rail">
          {selectedCluster ? (
            <ModuleDrilldown cluster={selectedCluster} onClear={() => setSelectedModule('')} />
          ) : null}
          <RiskDriverPanel drivers={heatmap.riskDrivers} />
        </aside>
      </section>

      <Card title="Ranked Danger Files" icon={Flame}>
        <div className="ca-heatmap-ranked-header">
          <p className="ca-page-desc">
            The list is ranked by local evidence. It does not replace file-level graph exploration or single-file blast analysis.
          </p>
          <Badge variant={heatmap.coverage.dependencyGraphAvailable ? 'success' : 'warning'}>
            {heatmap.coverage.dependencyGraphAvailable ? 'Dependency graph active' : 'Graph impact unavailable'}
          </Badge>
        </div>
        <div className="ca-heatmap-file-list">
          {topFiles.length > 0 ? (
            topFiles.map(file => (
              <DangerFileRow
                key={file.path}
                file={file}
                onNavigate={onNavigate}
                isExpanded={expandedFiles.has(file.path)}
                onToggle={() => toggleExpanded(file.path)}
              />
            ))
          ) : (
            <div className="ca-heatmap-no-results">
              <Search size={18} />
              <strong>No risky files match the current filters.</strong>
              <span>
                Active scope: {selectedModule ? `module ${selectedModule}, ` : ''}
                {getOptionLabel(RISK_FILTERS, riskFilter)}, {getOptionLabel(DRIVER_FILTERS, driverFilter)}
                {searchQuery ? `, search "${searchQuery}"` : ''}.
              </span>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default Heatmap;
