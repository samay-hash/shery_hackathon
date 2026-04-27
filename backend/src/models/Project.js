const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repoUrl: { type: String, required: true },
  repoFullName: { type: String, required: true },
  branch: { type: String, default: 'main' },
  framework: { type: String, enum: ['react', 'nextjs', 'vue', 'node', 'static', 'unknown'], default: 'unknown' },
  buildCommand: { type: String, default: '' },
  startCommand: { type: String, default: '' },
  outputDir: { type: String, default: 'dist' },
  rootDir: { type: String, default: '.' },
  envVars: { type: Map, of: String, default: {} },
  customDomain: { type: String, default: '' },
  subdomain: { type: String, unique: true },
  activePort: { type: Number, default: null },
  webhookId: { type: String, default: '' },
  autoDeployEnabled: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'paused', 'deleted'], default: 'active' },
}, { timestamps: true });

// Virtual for latest deployment
projectSchema.virtual('deployments', {
  ref: 'Deployment',
  localField: '_id',
  foreignField: 'project',
  options: { sort: { createdAt: -1 } },
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);
