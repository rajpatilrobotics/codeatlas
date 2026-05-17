import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import {
  repoAnalysisQueue,
  parsingQueue,
  graphGenerationQueue,
  embeddingsQueue,
  summarizationQueue
} from '../queues/index.js';

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board with all queues
createBullBoard({
  queues: [
    new BullMQAdapter(repoAnalysisQueue),
    new BullMQAdapter(parsingQueue),
    new BullMQAdapter(graphGenerationQueue),
    new BullMQAdapter(embeddingsQueue),
    new BullMQAdapter(summarizationQueue)
  ],
  serverAdapter
});

// Export function to setup Bull Board
export function setupBullBoard(app) {
  app.use('/admin/queues', serverAdapter.getRouter());
}

export { serverAdapter };

// Made with Bob
