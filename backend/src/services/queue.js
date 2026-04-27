const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Connect to Redis (from docker-compose)
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create the Deployment Queue
const deployQueue = new Queue('deployments', { connection });

async function enqueueDeployment(jobData) {
  return await deployQueue.add('build', jobData, {
    removeOnComplete: true,
    removeOnFail: false,
  });
}

module.exports = { deployQueue, enqueueDeployment, connection };
