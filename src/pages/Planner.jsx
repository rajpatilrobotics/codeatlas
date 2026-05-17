'use client';
import React, { useState } from 'react';
import './Planner.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Separator from '../components/ui/Separator';

// Mock tasks data
const MOCK_TASKS = [
  {
    id: 1,
    title: 'Implement User Authentication',
    description: 'Add JWT-based authentication with login and signup',
    priority: 'high',
    complexity: 'medium',
    estimatedTime: '4-6 hours',
    status: 'todo',
    subtasks: [
      { id: 11, text: 'Create auth service with JWT generation', completed: false },
      { id: 12, text: 'Build login and signup API endpoints', completed: false },
      { id: 13, text: 'Add password hashing with bcrypt', completed: false },
      { id: 14, text: 'Create protected route middleware', completed: false },
      { id: 15, text: 'Write unit tests for auth service', completed: false }
    ],
    files: ['src/services/authService.js', 'src/api/routes/auth.js', 'src/middleware/auth.js'],
    dependencies: []
  },
  {
    id: 2,
    title: 'Build Dashboard UI',
    description: 'Create responsive dashboard with charts and stats',
    priority: 'medium',
    complexity: 'high',
    estimatedTime: '6-8 hours',
    status: 'in-progress',
    subtasks: [
      { id: 21, text: 'Design dashboard layout', completed: true },
      { id: 22, text: 'Implement stats cards component', completed: true },
      { id: 23, text: 'Add chart library integration', completed: false },
      { id: 24, text: 'Create data fetching hooks', completed: false },
      { id: 25, text: 'Make responsive for mobile', completed: false }
    ],
    files: ['src/pages/Dashboard.jsx', 'src/components/StatsCard.jsx', 'src/hooks/useDashboard.js'],
    dependencies: [1]
  },
  {
    id: 3,
    title: 'Setup Database Schema',
    description: 'Design and implement PostgreSQL database schema',
    priority: 'high',
    complexity: 'medium',
    estimatedTime: '3-4 hours',
    status: 'completed',
    subtasks: [
      { id: 31, text: 'Design entity relationships', completed: true },
      { id: 32, text: 'Create migration files', completed: true },
      { id: 33, text: 'Add seed data', completed: true },
      { id: 34, text: 'Setup database connection', completed: true }
    ],
    files: ['src/config/database.js', 'migrations/001_initial.sql'],
    dependencies: []
  },
  {
    id: 4,
    title: 'Add Error Handling',
    description: 'Implement comprehensive error handling and logging',
    priority: 'low',
    complexity: 'low',
    estimatedTime: '2-3 hours',
    status: 'todo',
    subtasks: [
      { id: 41, text: 'Create error handler middleware', completed: false },
      { id: 42, text: 'Add logging service', completed: false },
      { id: 43, text: 'Implement error boundaries in React', completed: false }
    ],
    files: ['src/middleware/errorHandler.js', 'src/utils/logger.js'],
    dependencies: [1, 2]
  }
];

const PRIORITY_COLORS = {
  high: 'danger',
  medium: 'warning',
  low: 'success'
};

const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  completed: 'Completed'
};

function Planner() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const hasRepository = true;

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
        };
      }
      return task;
    }));
  };

  const getProgressPercentage = (task) => {
    const completed = task.subtasks.filter(st => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  if (!hasRepository) {
    return (
      <div className="planner-page">
        <EmptyState
          icon="📋"
          title="No Repository Analyzed"
          description="Analyze a repository to generate an AI-powered task breakdown"
          action={
            <Button variant="primary" size="medium">
              Analyze Repository
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="planner-page">
      {/* Header */}
      <div className="planner-header">
        <div>
          <h1 className="planner-title">AI Planner</h1>
          <p className="planner-subtitle">Smart task breakdown and project planning</p>
        </div>
        <div className="planner-actions">
          <Button variant="secondary" size="small">
            Export Plan
          </Button>
          <Button variant="primary" size="small">
            Generate Tasks
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="planner-stats">
        <Card className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </Card>
        <Card className="stat-card todo">
          <div className="stat-value">{stats.todo}</div>
          <div className="stat-label">To Do</div>
        </Card>
        <Card className="stat-card in-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </Card>
        <Card className="stat-card completed">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="filters-card">
        <div className="filters-row">
          <Input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon="🔍"
          />
          <div className="status-filters">
            {['all', 'todo', 'in-progress', 'completed'].map(status => (
              <button
                key={status}
                className={`filter-button ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'All' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      <div className="tasks-container">
        {filteredTasks.map(task => (
          <Card 
            key={task.id}
            className={`task-card ${task.status} ${selectedTask?.id === task.id ? 'selected' : ''}`}
            onClick={() => setSelectedTask(task)}
          >
            <div className="task-header">
              <div className="task-header-left">
                <h3 className="task-title">{task.title}</h3>
                <div className="task-badges">
                  <Badge variant={PRIORITY_COLORS[task.priority]} size="small">
                    {task.priority}
                  </Badge>
                  <Badge variant="secondary" size="small">
                    {task.complexity} complexity
                  </Badge>
                  <span className="task-time">⏱️ {task.estimatedTime}</span>
                </div>
              </div>
              <Badge 
                variant={task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'warning' : 'secondary'}
                size="small"
              >
                {STATUS_LABELS[task.status]}
              </Badge>
            </div>

            <p className="task-description">{task.description}</p>

            {/* Progress Bar */}
            <div className="task-progress">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-percentage">{getProgressPercentage(task)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage(task)}%` }}
                />
              </div>
            </div>

            {/* Subtasks */}
            {selectedTask?.id === task.id && (
              <div className="task-details">
                <Separator />
                
                <div className="subtasks-section">
                  <h4 className="subtasks-title">Subtasks</h4>
                  <div className="subtasks-list">
                    {task.subtasks.map(subtask => (
                      <label key={subtask.id} className="subtask-item">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => toggleSubtask(task.id, subtask.id)}
                          className="subtask-checkbox"
                        />
                        <span className={`subtask-text ${subtask.completed ? 'completed' : ''}`}>
                          {subtask.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="files-section">
                  <h4 className="files-title">Related Files</h4>
                  <div className="files-list">
                    {task.files.map((file, idx) => (
                      <code key={idx} className="file-tag">{file}</code>
                    ))}
                  </div>
                </div>

                {task.dependencies.length > 0 && (
                  <div className="dependencies-section">
                    <h4 className="dependencies-title">Dependencies</h4>
                    <div className="dependencies-list">
                      {task.dependencies.map(depId => {
                        const depTask = tasks.find(t => t.id === depId);
                        return depTask ? (
                          <div key={depId} className="dependency-item">
                            <span className="dependency-icon">🔗</span>
                            <span className="dependency-name">{depTask.title}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No Tasks Found"
          description="Try adjusting your filters or search query"
        />
      )}
    </div>
  );
}

export default Planner;

// Made with Bob
