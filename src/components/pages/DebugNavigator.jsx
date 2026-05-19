import React from 'react';
import Card from '../ui/Card';
import ComingSoon from '../ui/ComingSoon';

const MOCK_FILES = [
  'src/index.js',
  'src/App.jsx',
  'src/services/githubService.js',
  'src/components/TabContent/Chat.jsx',
  'api/watsonx/generate.js',
];

const MOCK_LOGS = [
  { level: 'info', msg: 'Repository analysis started', time: '12:01:02' },
  { level: 'info', msg: 'Fetched 1,247 files from GitHub', time: '12:01:15' },
  { level: 'warn', msg: 'High complexity detected in App.jsx', time: '12:01:28' },
  { level: 'info', msg: 'Code analysis complete', time: '12:01:45' },
];

function DebugNavigator() {
  return (
    <ComingSoon>
      <div className="ca-debug-grid">
        <Card title="File Tree">
          <ul className="ca-debug-tree">
            {MOCK_FILES.map((f) => (
              <li key={f} className="ca-debug-tree-item">
                {f}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Trace Log">
          <div className="ca-debug-logs">
            {MOCK_LOGS.map((log, i) => (
              <div key={i} className={`ca-debug-log ca-debug-log-${log.level}`}>
                <span className="ca-debug-log-time">{log.time}</span>
                <span className="ca-debug-log-level">[{log.level}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ComingSoon>
  );
}

export default DebugNavigator;
