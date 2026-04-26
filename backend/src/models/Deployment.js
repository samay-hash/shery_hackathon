const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['info', 'warn', 'error', 'success'], default: 'info' },
  message: { type: String, required: true },
  source: { type: String, enum: ['build', 'deploy', 'runtime'], default: 'build' },
}, { _id: false });

const deploymentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  version: { type: Number, required: true },
  commitHash: { type: String, default: '' },
  commitMessage: { type: String, default: '' },
  branch: { type: String, default: 'main' },
  status: {
    type: String,
    enum: ['queued', 'building', 'deploying', 'live', 'failed', 'rolled-back', 'stopped'],
    default: 'queued',
  },
  buildDuration: { type: Number, default: 0 },
  containerId: { type: String, default: '' },
  imageId: { type: String, default: '' },
  deployUrl: { type: String, default: '' },
  logs: [logEntrySchema],
  envSnapshot: { type: Map, of: String, default: {} },
  triggeredBy: { type: String, enum: ['manual', 'webhook', 'rollback'], default: 'manual' },
  finishedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Deployment', deploymentSchema);
