import {
  LayoutDashboard,
  FileText,
  Network,
  BookOpen,
  FileCode,
  GitBranch,
  Target,
  Lightbulb,
  Bug,
  Flame,
  Shield,
  MessageSquare,
  FolderOpen,
} from 'lucide-react';

export const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', subtitle: 'Repository mission control', icon: LayoutDashboard },
      { id: 'summary', label: 'Summary', subtitle: 'Repository overview and insights', icon: FileText },
      { id: 'architecture-v2', label: 'Architecture V2', subtitle: 'Experimental system intelligence map', icon: GitBranch },
      { id: 'onboarding', label: 'Onboarding Guide', subtitle: 'Get started with this repository', icon: BookOpen },
      { id: 'documentation', label: 'Documentation', subtitle: 'Generated docs and references', icon: FileCode },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    items: [
      { id: 'repository-graph', label: 'Repository Graph', subtitle: 'Visual dependency map', icon: GitBranch, future: true },
      { id: 'blast-radius', label: 'Blast Radius', subtitle: 'Impact analysis for changes', icon: Target, future: true },
      { id: 'planner', label: 'Planner', subtitle: 'Plan and analyze system changes', icon: Lightbulb, future: true },
      { id: 'debug-navigator', label: 'Debug Navigator', subtitle: 'Trace and debug flows', icon: Bug, future: true },
      { id: 'heatmap', label: 'Heatmap', subtitle: 'Code activity and hotspots', icon: Flame, future: true },
    ],
  },
  {
    id: 'security',
    label: 'SECURITY',
    items: [
      { id: 'security', label: 'Security Scanner', subtitle: 'Vulnerabilities and security posture', icon: Shield },
    ],
  },
  {
    id: 'ai-workspace',
    label: 'AI WORKSPACE',
    items: [
      { id: 'chat', label: 'Chat', subtitle: 'Ask questions about this repository', icon: MessageSquare },
    ],
  },
  {
    id: 'workspaces',
    label: 'WORKSPACES',
    items: [
      { id: 'saved-workspaces', label: 'Saved Workspaces', subtitle: 'Your saved analysis sessions', icon: FolderOpen, future: true },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export function getNavItem(tabId) {
  return ALL_NAV_ITEMS.find((item) => item.id === tabId) || ALL_NAV_ITEMS[0];
}
