'use client';
import React, { useState } from 'react';
import './Documentation.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Separator from '../components/ui/Separator';

// Mock data (will be replaced with real data)
const MOCK_API_ROUTES = [
  { method: 'GET', path: '/api/users', description: 'Retrieve all users', file: 'src/api/routes/users.js' },
  { method: 'POST', path: '/api/users', description: 'Create a new user', file: 'src/api/routes/users.js' },
  { method: 'GET', path: '/api/users/:id', description: 'Get user by ID', file: 'src/api/routes/users.js' },
  { method: 'PUT', path: '/api/users/:id', description: 'Update user', file: 'src/api/routes/users.js' },
  { method: 'DELETE', path: '/api/users/:id', description: 'Delete user', file: 'src/api/routes/users.js' },
  { method: 'POST', path: '/api/auth/login', description: 'User authentication', file: 'src/api/routes/auth.js' },
  { method: 'POST', path: '/api/auth/register', description: 'User registration', file: 'src/api/routes/auth.js' },
  { method: 'GET', path: '/api/products', description: 'List all products', file: 'src/api/routes/products.js' },
];

const MOCK_ENV_VARS = [
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true },
  { name: 'JWT_SECRET', description: 'Secret key for JWT tokens', required: true },
  { name: 'PORT', description: 'Server port number', required: false },
  { name: 'NODE_ENV', description: 'Environment (development/production)', required: true },
  { name: 'REDIS_URL', description: 'Redis cache connection', required: false },
  { name: 'AWS_ACCESS_KEY', description: 'AWS credentials', required: false },
  { name: 'SMTP_HOST', description: 'Email server host', required: false },
];

const MOCK_FUNCTIONS = [
  {
    name: 'authenticateUser',
    params: ['email', 'password'],
    file: 'src/services/authService.js',
    line: 45,
    description: 'Validates user credentials and returns JWT token',
    code: `async function authenticateUser(email, password) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');
  
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid password');
  
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
}`
  },
  {
    name: 'createProduct',
    params: ['productData'],
    file: 'src/controllers/productController.js',
    line: 23,
    description: 'Creates a new product in the database',
    code: `async function createProduct(productData) {
  const product = new Product({
    name: productData.name,
    price: productData.price,
    category: productData.category
  });
  
  await product.save();
  return product;
}`
  },
  {
    name: 'validateInput',
    params: ['data', 'schema'],
    file: 'src/utils/validation.js',
    line: 12,
    description: 'Validates input data against schema',
    code: `function validateInput(data, schema) {
  const errors = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && !data[key]) {
      errors.push(\`\${key} is required\`);
    }
  }
  
  return errors.length > 0 ? errors : null;
}`
  }
];

const MOCK_TECH_STACK = [
  'React 18', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 
  'JWT', 'Bcrypt', 'Axios', 'React Router', 'Webpack'
];

const MOCK_INSIGHTS = {
  totalFiles: 156,
  totalLines: 12450,
  patterns: ['MVC', 'Repository Pattern', 'Service Layer'],
  functions: 89,
  classes: 34,
  securityIssues: 3
};

function Documentation() {
  const [selectedTab, setSelectedTab] = useState('api');
  const [expandedFunction, setExpandedFunction] = useState(null);
  const hasRepository = true; // Will be replaced with real state

  const getMethodColor = (method) => {
    const colors = {
      GET: 'var(--status-success)',
      POST: 'var(--accent-cyan)',
      PUT: 'var(--status-warning)',
      DELETE: 'var(--status-error)',
      PATCH: 'var(--status-warning)'
    };
    return colors[method] || 'var(--text-tertiary)';
  };

  if (!hasRepository) {
    return (
      <div className="documentation-page">
        <EmptyState
          icon="📚"
          title="No Repository Analyzed"
          description="Analyze a repository first to view auto-generated documentation"
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
    <div className="documentation-page">
      {/* Header */}
      <div className="docs-header">
        <div>
          <h1 className="docs-title">Documentation</h1>
          <p className="docs-subtitle">Auto-generated from code analysis</p>
        </div>
        <div className="docs-actions">
          <Button variant="secondary" size="small">
            Export PDF
          </Button>
          <Button variant="primary" size="small">
            Generate Docs
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="docs-tabs">
        <button
          className={`docs-tab ${selectedTab === 'api' ? 'active' : ''}`}
          onClick={() => setSelectedTab('api')}
        >
          <span className="tab-icon">🔌</span>
          API Endpoints
        </button>
        <button
          className={`docs-tab ${selectedTab === 'functions' ? 'active' : ''}`}
          onClick={() => setSelectedTab('functions')}
        >
          <span className="tab-icon">💡</span>
          Key Functions
        </button>
        <button
          className={`docs-tab ${selectedTab === 'env' ? 'active' : ''}`}
          onClick={() => setSelectedTab('env')}
        >
          <span className="tab-icon">🔧</span>
          Environment
        </button>
        <button
          className={`docs-tab ${selectedTab === 'insights' ? 'active' : ''}`}
          onClick={() => setSelectedTab('insights')}
        >
          <span className="tab-icon">📊</span>
          Insights
        </button>
      </div>

      {/* Content Area */}
      <div className="docs-content">
        {/* API Endpoints Tab */}
        {selectedTab === 'api' && (
          <div className="docs-section">
            <Card>
              <div className="section-header">
                <h2 className="section-title">API Endpoints</h2>
                <Badge variant="secondary">{MOCK_API_ROUTES.length} routes</Badge>
              </div>
              <Separator />
              <div className="api-routes-list">
                {MOCK_API_ROUTES.map((route, idx) => (
                  <div key={idx} className="api-route-item">
                    <div className="api-route-header">
                      <div className="api-route-method-path">
                        <span 
                          className="api-method-badge"
                          style={{ backgroundColor: getMethodColor(route.method) }}
                        >
                          {route.method}
                        </span>
                        <code className="api-path">{route.path}</code>
                      </div>
                      <Button variant="ghost" size="small">
                        Test
                      </Button>
                    </div>
                    <p className="api-route-description">{route.description}</p>
                    <div className="api-route-meta">
                      <span className="meta-item">📄 {route.file}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tech Stack */}
            <Card>
              <h3 className="section-title">Tech Stack</h3>
              <Separator />
              <div className="tech-stack-grid">
                {MOCK_TECH_STACK.map((tech, idx) => (
                  <div key={idx} className="tech-badge">
                    {tech}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Key Functions Tab */}
        {selectedTab === 'functions' && (
          <div className="docs-section">
            <Card>
              <div className="section-header">
                <h2 className="section-title">Key Functions</h2>
                <Badge variant="secondary">{MOCK_FUNCTIONS.length} functions</Badge>
              </div>
              <Separator />
              <div className="functions-list">
                {MOCK_FUNCTIONS.map((func, idx) => (
                  <div key={idx} className="function-item">
                    <div 
                      className="function-header"
                      onClick={() => setExpandedFunction(expandedFunction === idx ? null : idx)}
                    >
                      <div className="function-signature">
                        <code className="function-name">{func.name}</code>
                        <span className="function-params">
                          ({func.params.join(', ')})
                        </span>
                      </div>
                      <span className="expand-icon">
                        {expandedFunction === idx ? '▼' : '▶'}
                      </span>
                    </div>
                    
                    <p className="function-description">{func.description}</p>
                    
                    <div className="function-meta">
                      <span className="meta-item">📄 {func.file}:{func.line}</span>
                    </div>

                    {expandedFunction === idx && (
                      <div className="function-code-block">
                        <pre>
                          <code>{func.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Environment Variables Tab */}
        {selectedTab === 'env' && (
          <div className="docs-section">
            <Card>
              <div className="section-header">
                <h2 className="section-title">Environment Variables</h2>
                <Badge variant="secondary">{MOCK_ENV_VARS.length} variables</Badge>
              </div>
              <Separator />
              <div className="env-vars-list">
                {MOCK_ENV_VARS.map((envVar, idx) => (
                  <div key={idx} className="env-var-item">
                    <div className="env-var-header">
                      <code className="env-var-name">{envVar.name}</code>
                      {envVar.required && (
                        <Badge variant="danger" size="small">Required</Badge>
                      )}
                    </div>
                    <p className="env-var-description">{envVar.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Setup Instructions */}
            <Card>
              <h3 className="section-title">Setup Instructions</h3>
              <Separator />
              <div className="setup-instructions">
                <p className="instruction-text">
                  Create a <code>.env</code> file in the root directory:
                </p>
                <pre className="env-example">
                  <code>
{`# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Authentication
JWT_SECRET=your-secret-key-here

# Server
PORT=3000
NODE_ENV=development

# Optional
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY=your-aws-key`}
                  </code>
                </pre>
              </div>
            </Card>
          </div>
        )}

        {/* Insights Tab */}
        {selectedTab === 'insights' && (
          <div className="docs-section">
            <Card>
              <h2 className="section-title">Codebase Insights</h2>
              <Separator />
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-value">{MOCK_INSIGHTS.totalFiles}</div>
                  <div className="insight-label">Total Files</div>
                </div>
                <div className="insight-card">
                  <div className="insight-value">{MOCK_INSIGHTS.totalLines.toLocaleString()}</div>
                  <div className="insight-label">Lines of Code</div>
                </div>
                <div className="insight-card">
                  <div className="insight-value">{MOCK_INSIGHTS.functions}</div>
                  <div className="insight-label">Functions</div>
                </div>
                <div className="insight-card">
                  <div className="insight-value">{MOCK_INSIGHTS.classes}</div>
                  <div className="insight-label">Classes</div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="section-title">Architecture Patterns</h3>
              <Separator />
              <div className="patterns-list">
                {MOCK_INSIGHTS.patterns.map((pattern, idx) => (
                  <div key={idx} className="pattern-item">
                    <span className="pattern-icon">✓</span>
                    <span className="pattern-name">{pattern}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="section-title">Code Quality</h3>
              <Separator />
              <div className="quality-metrics">
                <div className="quality-item">
                  <span className="quality-label">Security Issues</span>
                  <Badge variant={MOCK_INSIGHTS.securityIssues > 0 ? 'danger' : 'success'}>
                    {MOCK_INSIGHTS.securityIssues} found
                  </Badge>
                </div>
                <div className="quality-item">
                  <span className="quality-label">Code Coverage</span>
                  <Badge variant="success">87%</Badge>
                </div>
                <div className="quality-item">
                  <span className="quality-label">Maintainability</span>
                  <Badge variant="success">Good</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default Documentation;

// Made with Bob
