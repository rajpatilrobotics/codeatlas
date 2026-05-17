const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const {
  repoAnalysisQueue,
  parsingQueue,
  graphGenerationQueue,
  embeddingsQueue,
  summarizationQueue
} = require('../queues');

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

module.exports = { serverAdapter };

// Made with Bob
