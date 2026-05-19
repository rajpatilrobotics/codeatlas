export const PLANNER_TASKS = [
  {
    id: '1',
    title: 'Refactor authentication middleware',
    risk: 'medium',
    riskLabel: 'Medium Risk',
    systems: ['Auth', 'API Gateway', 'User Service'],
    files: ['auth/middleware.ts', 'auth/session.ts', 'api/routes/auth.ts'],
  },
  {
    id: '2',
    title: 'Migrate database connection pooling',
    risk: 'high',
    riskLabel: 'High Risk',
    systems: ['Database', 'API', 'Cache'],
    files: ['db/pool.ts', 'config/database.ts', 'services/data.ts'],
  },
  {
    id: '3',
    title: 'Add rate limiting to public endpoints',
    risk: 'low',
    riskLabel: 'Low Risk',
    systems: ['API Gateway'],
    files: ['middleware/rateLimit.ts', 'api/index.ts'],
  },
];
