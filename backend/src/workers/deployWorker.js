const { Worker } = require('bullmq');
const { connection } = require('../services/queue');
const { startBuildPipeline } = require('../services/buildService');
const Project = require('../models/Project');
const Deployment = require('../models/Deployment');
const mongoose = require('mongoose');

async function processJob(job) {
  const { projectId, deploymentId, user } = job.data;
  console.log(`[Worker] Picked up job for deployment ${deploymentId}`);

  try {
    const project = await Project.findById(projectId);
    const deployment = await Deployment.findById(deploymentId);
    
    if (!project || !deployment) {
      throw new Error('Project or Deployment not found in DB');
    }

    // Pass the job to the main build pipeline
    // Note: We need a way to pass 'io' for socket logs. 
    // In a microservice, worker might emit to Redis pub/sub.
    // For now, we will use a global event emitter or pass null if io is not available here.
    const { io } = require('../app'); 
    
    await startBuildPipeline(project, deployment, user, io);
    
    return { success: true };
  } catch (error) {
    console.error(`[Worker] Job failed:`, error);
    throw error;
  }
}

// Initialize the worker
const deployWorker = new Worker('deployments', processJob, { 
  connection,
  concurrency: 1 // Process 1 build at a time to prevent server overload
});

deployWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

deployWorker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job.id} failed with error: ${err.message}`);
});

module.exports = deployWorker;
