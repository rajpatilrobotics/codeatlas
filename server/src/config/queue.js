// ============================================
// CODEATLAS - BullMQ Queue Configuration
// ============================================

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

// Redis connection configuration
const redisConnection = new Redis(process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisConnection.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisConnection.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Queue configuration options
const queueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: parseInt(process.env.QUEUE_MAX_RETRIES) || 3,
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
};

// ============================================
// QUEUE DEFINITIONS
// ============================================

/**
 * Repository Analysis Queue
 * Master orchestration queue for repository processing
 */
const repoAnalysisQueue = new Queue('repo-analysis', queueOptions);

/**
 * Parsing Queue
 * AST parsing and code analysis
 */
const parsingQueue = new Queue('parsing', queueOptions);

/**
 * Graph Generation Queue
 * Build dependency graphs and relationships
 */
const graphGenerationQueue = new Queue('graph-generation', queueOptions);

/**
 * Embeddings Queue
 * Generate vector embeddings for semantic search
 */
const embeddingsQueue = new Queue('embeddings', queueOptions);

/**
 * Summarization Queue
 * AI-powered repository summarization
 */
const summarizationQueue = new Queue('summarization', queueOptions);

// ============================================
// QUEUE HELPERS
// ============================================

/**
 * Add job to repository analysis queue
 */
async function addRepoAnalysisJob(data) {
  try {
    const job = await repoAnalysisQueue.add('analyze-repo', data, {
      jobId: data.repoId,
      priority: 1
    });
    
    logger.info(`Added repo analysis job: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding repo analysis job:', error);
    throw error;
  }
}

/**
 * Add job to parsing queue
 */
async function addParsingJob(data) {
  try {
    const job = await parsingQueue.add('parse-files', data, {
      priority: 2
    });
    
    logger.info(`Added parsing job: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding parsing job:', error);
    throw error;
  }
}

/**
 * Add job to graph generation queue
 */
async function addGraphGenerationJob(data) {
  try {
    const job = await graphGenerationQueue.add('generate-graph', data, {
      priority: 3
    });
    
    logger.info(`Added graph generation job: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding graph generation job:', error);
    throw error;
  }
}

/**
 * Add job to embeddings queue
 */
async function addEmbeddingsJob(data) {
  try {
    const job = await embeddingsQueue.add('generate-embeddings', data, {
      priority: 4
    });
    
    logger.info(`Added embeddings job: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding embeddings job:', error);
    throw error;
  }
}

/**
 * Add job to summarization queue
 */
async function addSummarizationJob(data) {
  try {
    const job = await summarizationQueue.add('summarize-repo', data, {
      priority: 5
    });
    
    logger.info(`Added summarization job: ${job.id}`);
    return job;
  } catch (error) {
    logger.error('Error adding summarization job:', error);
    throw error;
  }
}

/**
 * Get job status
 */
async function getJobStatus(queueName, jobId) {
  try {
    let queue;
    switch (queueName) {
      case 'repo-analysis':
        queue = repoAnalysisQueue;
        break;
      case 'parsing':
        queue = parsingQueue;
        break;
      case 'graph-generation':
        queue = graphGenerationQueue;
        break;
      case 'embeddings':
        queue = embeddingsQueue;
        break;
      case 'summarization':
        queue = summarizationQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  } catch (error) {
    logger.error('Error getting job status:', error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
async function closeQueues() {
  logger.info('Closing queues...');
  await Promise.all([
    repoAnalysisQueue.close(),
    parsingQueue.close(),
    graphGenerationQueue.close(),
    embeddingsQueue.close(),
    summarizationQueue.close()
  ]);
  await redisConnection.quit();
  logger.info('All queues closed');
}

// Handle process termination
process.on('SIGTERM', closeQueues);
process.on('SIGINT', closeQueues);

module.exports = {
  // Queues
  repoAnalysisQueue,
  parsingQueue,
  graphGenerationQueue,
  embeddingsQueue,
  summarizationQueue,
  
  // Helpers
  addRepoAnalysisJob,
  addParsingJob,
  addGraphGenerationJob,
  addEmbeddingsJob,
  addSummarizationJob,
  getJobStatus,
  closeQueues,
  
  // Redis connection
  redisConnection
};

// Made with Bob
