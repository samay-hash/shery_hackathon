const { Queue } = require('bullmq');
const Redis = require('ioredis');

// In Docker: service name 'redis' is the hostname. Locally: 'localhost'
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

// Create the Deployment Queue
const deployQueue = new Queue('deployments', { connection });

async function enqueueDeployment(jobData) {
  return await deployQueue.add('build', jobData, {
    removeOnComplete: true,
    removeOnFail: false,
  });
}

module.exports = { deployQueue, enqueueDeployment, connection };
