# CodeAtlas API

Backend API for CodeAtlas - AI-native developer intelligence platform.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)
- Qdrant Cloud account

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env

# Configure your .env file with actual values

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

The API will be available at `http://localhost:3001`

## 📊 Bull Board

Queue monitoring dashboard available at:
```
http://localhost:3001/admin/queues
```

Monitor all background jobs:
- Repository analysis
- AST parsing
- Graph generation
- Embeddings
- Summarization

## 🏥 Health Check

```bash
curl http://localhost:3001/health
```

## 📡 API Endpoints

### Repository Analysis
- `POST /api/repo/analyze` - Start repository analysis
- `GET /api/repo/status/:jobId` - Get job status
- `GET /api/repo/summary/:repoId` - Get repository summary

### Graph Intelligence
- `GET /api/graph/architecture/:repoId` - Get architecture graph
- `GET /api/graph/blast-radius/:repoId` - Get blast radius analysis
- `GET /api/graph/heatmap/:repoId` - Get code heatmap

### AI Chat
- `POST /api/chat/query` - Send chat query
- `GET /api/chat/history/:repoId` - Get chat history

### Security
- `GET /api/security/scan/:repoId` - Run security scan

### Planner
- `POST /api/planner/analyze` - Analyze impact

### Debug
- `GET /api/debug/trace/:repoId` - Get debug trace

### Heatmap
- `GET /api/heatmap/activity/:repoId` - Get activity heatmap

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - 5 different rate limiters
- **Sentry** - Error tracking
- **Pino** - Structured logging

## 🗄️ Database

### Prisma Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

### Schema

- **Repository** - Repository metadata
- **File** - File information with AST data
- **Entity** - Code entities (functions, classes)
- **Relationship** - Dependencies between entities
- **Embedding** - Vector embeddings
- **ChatSession** - Chat sessions
- **ChatMessage** - Chat messages

## 🔄 Queue System

### Queues

1. **repo-analysis** - Master orchestration queue
2. **parsing** - AST parsing jobs
3. **graph-generation** - Graph building jobs
4. **embeddings** - Vector embedding generation
5. **summarization** - AI summary generation

### Queue Configuration

- Automatic retries with exponential backoff
- Job completion cleanup (100 jobs, 24 hours)
- Failed job retention (500 jobs, 7 days)
- Progress tracking
- Event logging

## 📝 Environment Variables

See `.env.example` for all required environment variables:

- Database (Neon PostgreSQL)
- Redis (Upstash)
- Qdrant Vector Database
- AI Services (Hugging Face, DeepSeek)
- Sentry Error Tracking
- GitHub Token (optional)
- Security keys

## 🚢 Deployment

### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

See `railway.json` for configuration.

### Environment Setup

1. Set up Neon PostgreSQL database
2. Set up Upstash Redis instance
3. Set up Qdrant Cloud collection
4. Configure all environment variables
5. Run database migrations
6. Deploy to Railway

## 📊 Monitoring

### Logging

- **Pino** structured logging
- Request/response logging
- Error logging with stack traces
- Pretty print in development

### Error Tracking

- **Sentry** integration
- Error filtering and sampling
- Breadcrumb tracking
- Context capture

### Queue Monitoring

- **Bull Board** dashboard
- Real-time job status
- Job history
- Retry management

## 🏗️ Architecture

```
api/
├── src/
│   ├── index.js              # Main server file
│   ├── config/
│   │   └── bullBoard.js      # Bull Board configuration
│   ├── middleware/
│   │   └── security.js       # Security middleware
│   ├── utils/
│   │   ├── logger.js         # Pino logger
│   │   └── sentry.js         # Sentry configuration
│   └── queues/
│       └── index.js          # Queue definitions
├── prisma/
│   └── schema.prisma         # Database schema
├── package.json
├── .env.example
└── README.md
```

## 🔧 Tech Stack

- **Framework**: Express.js
- **ORM**: Prisma
- **Queue**: BullMQ
- **Cache**: Redis (Upstash)
- **Database**: PostgreSQL (Neon)
- **Vector DB**: Qdrant Cloud
- **Logging**: Pino
- **Error Tracking**: Sentry
- **Security**: Helmet.js, CORS, Rate Limiting

## 📚 Documentation

- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
- [Getting Started](../GETTING_STARTED.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues
- Documentation
- Deployment Guide

---

**CodeAtlas API** - Transforming repositories into intelligent systems 🚀