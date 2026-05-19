import React from 'react';
import { Lightbulb } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Pill from '../ui/Pill';
import FileListRow from '../ui/FileListRow';
import ComingSoon from '../ui/ComingSoon';
import { PLANNER_TASKS } from '../../data/plannerMocks';

const RISK_VARIANT = { low: 'low', medium: 'medium', high: 'high' };

function Planner() {
  return (
    <ComingSoon>
      <div className="ca-planner">
        {PLANNER_TASKS.map((task) => (
          <Card key={task.id} className="ca-planner-task">
            <div className="ca-planner-task-header">
              <Lightbulb size={18} className="ca-planner-icon" />
              <h3 className="ca-planner-task-title">{task.title}</h3>
            </div>
            <Badge variant={RISK_VARIANT[task.risk]}>{task.riskLabel}</Badge>
            <div className="ca-planner-section">
              <span className="ca-planner-label">Affected Systems</span>
              <div className="ca-pill-row">
                {task.systems.map((s) => (
                  <Pill key={s}>{s}</Pill>
                ))}
              </div>
            </div>
            <div className="ca-planner-section">
              <span className="ca-planner-label">Suggested File Changes</span>
              <div className="ca-file-list">
                {task.files.map((f) => (
                  <FileListRow key={f} path={f} />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ComingSoon>
  );
}

export default Planner;
