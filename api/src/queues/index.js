import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
// Use UPSTASH_REDIS_URL if available, otherwise fall back to individual params
const redisConnection = process.env.UPSTASH_REDIS_URL
  ? new Redis(process.env.UPSTASH_REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: {
        rejectUnauthorized: false
      }
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

// Create queues
const repoAnalysisQueue = new Queue('repo-analysis', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600 // 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600 // 7 days
    }
  }
});

const parsingQueue = new Queue('parsing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

const graphGenerationQueue = new Queue('graph-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

const embeddingsQueue = new Queue('embeddings', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    }
  }
});

const summarizationQueue = new Queue('summarization', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Queue event listeners for logging
const setupQueueListeners = (queue, name) => {
  queue.on('completed', (job) => {
    console.log(`✅ [${name}] Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ [${name}] Job ${job?.id} failed:`, err.message);
  });

  queue.on('progress', (job, progress) => {
    console.log(`⏳ [${name}] Job ${job.id} progress: ${progress}%`);
  });
};

// Setup listeners for all queues
setupQueueListeners(repoAnalysisQueue, 'repo-analysis');
setupQueueListeners(parsingQueue, 'parsing');
setupQueueListeners(graphGenerationQueue, 'graph-generation');
setupQueueListeners(embeddingsQueue, 'embeddings');
setupQueueListeners(summarizationQueue, 'summarization');

// Graceful shutdown
const closeQueues = async () => {
  console.log('Closing queues...');
  await Promise.all([
    repoAnalysisQueue.close(),
    parsingQueue.close(),
    graphGenerationQueue.close(),
    embeddingsQueue.close(),
    summarizationQueue.close()
  ]);
  await redisConnection.quit();
  console.log('All queues closed');
};

process.on('SIGTERM', closeQueues);
process.on('SIGINT', closeQueues);

export {
  repoAnalysisQueue,
  parsingQueue,
  graphGenerationQueue,
  embeddingsQueue,
  summarizationQueue,
  closeQueues
};

// Made with Bob
