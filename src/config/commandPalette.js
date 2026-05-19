import {
  GitBranch,
  Shield,
  FileCode,
  Lightbulb,
  FileSearch,
  AlertTriangle,
  Network,
  Bug,
  MessageSquare,
  FolderOpen,
  RefreshCw,
  LayoutDashboard,
  Target,
  Flame,
  FileText,
  Route,
  Boxes,
} from 'lucide-react';

/** Static navigation & workflow commands */
export const STATIC_COMMANDS = [
  { id: 'nav-repository-graph', label: 'Open Repository Graph', group: 'Workflows', icon: GitBranch, tabId: 'repository-graph', keywords: 'graph dependencies nodes' },
  { id: 'nav-security', label: 'Open Security Scanner', group: 'Workflows', icon: Shield, tabId: 'security', keywords: 'security scan vulnerabilities' },
  { id: 'nav-documentation', label: 'Open Documentation', group: 'Workflows', icon: FileCode, tabId: 'documentation', keywords: 'docs readme api' },
  { id: 'nav-planner', label: 'Open Planner', group: 'Workflows', icon: Lightbulb, tabId: 'planner', keywords: 'plan tasks changes' },
  { id: 'search-files', label: 'Search files', group: 'Intelligence', icon: FileSearch, tabId: 'documentation', keywords: 'file path search find src' },
  { id: 'nav-debug', label: 'Open Debug Navigator', group: 'Workflows', icon: Bug, tabId: 'debug-navigator', keywords: 'debug trace logs' },
  { id: 'nav-chat', label: 'Ask AI', group: 'AI', icon: MessageSquare, tabId: 'chat', keywords: 'ai chat watson ask question' },
  { id: 'nav-architecture', label: 'Explain architecture', group: 'Intelligence', icon: Network, tabId: 'architecture', keywords: 'architecture diagram structure' },
  { id: 'nav-risky', label: 'Show risky modules', group: 'Intelligence', icon: AlertTriangle, tabId: 'security', keywords: 'risk high security modules' },
  { id: 'nav-dashboard', label: 'Open Dashboard', group: 'Workflows', icon: LayoutDashboard, tabId: 'dashboard', keywords: 'home mission control' },
  { id: 'nav-blast', label: 'Open Blast Radius', group: 'Intelligence', icon: Target, tabId: 'blast-radius', keywords: 'blast impact radius' },
  { id: 'nav-heatmap', label: 'Open Heatmap', group: 'Intelligence', icon: Flame, tabId: 'heatmap', keywords: 'heatmap activity hotspots' },
  { id: 'nav-workspaces', label: 'Open recent workspaces', group: 'Workspaces', icon: FolderOpen, tabId: 'saved-workspaces', keywords: 'workspace saved recent' },
  { id: 'action-new-repo', label: 'Switch repository', group: 'Actions', icon: RefreshCw, action: 'new-analysis', keywords: 'switch repo change github' },
];

export const GRAPH_NODE_SAMPLES = [
  'API Gateway',
  'Auth Service',
  'User Service',
  'Database',
  'Cache',
  'Frontend',
  'Worker Queue',
];
