/**
 * Worker Manager
 * Starts and manages all BullMQ workers
 */

import repoAnalysisWorker from './repoAnalysisWorker.js';
import logger from '../utils/logger.js';

// Store active workers
const workers = {
  repoAnalysis: repoAnalysisWorker
};

/**
 * Start all workers
 */
function startWorkers() {
  logger.info('Starting all workers...');
  
  Object.entries(workers).forEach(([name, worker]) => {
    logger.info(`Worker ${name} started`);
  });

  logger.info('All workers started successfully');
}

/**
 * Stop all workers
 */
async function stopWorkers() {
  logger.info('Stopping all workers...');
  
  const closePromises = Object.entries(workers).map(async ([name, worker]) => {
    try {
      await worker.close();
      logger.info(`Worker ${name} stopped`);
    } catch (error) {
      logger.error(`Error stopping worker ${name}:`, error);
    }
  });

  await Promise.all(closePromises);
  logger.info('All workers stopped');
}

/**
 * Get worker status
 */
async function getWorkerStatus() {
  const status = {};

  for (const [name, worker] of Object.entries(workers)) {
    try {
      status[name] = {
        isRunning: worker.isRunning(),
        isPaused: worker.isPaused(),
        name: worker.name
      };
    } catch (error) {
      status[name] = {
        error: error.message
      };
    }
  }

  return status;
}

export {
  workers,
  startWorkers,
  stopWorkers,
  getWorkerStatus
};

// Made with Bob
