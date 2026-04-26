const express = require('express');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Deployment = require('../models/Deployment');
const { startBuildPipeline } = require('../services/buildService');

const router = express.Router();


// GET /api/deployments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);
    if (!deployment) return res.status(404).json({ error: 'Not found' });
    res.json({ deployment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deployment' });
  }
});

// GET /api/deployments/:id/logs
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id);
    if (!deployment) return res.status(404).json({ error: 'Not found' });
    res.json({ logs: deployment.logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/deployments/:id/rollback
router.post('/:id/rollback', auth, async (req, res) => {
  try {
    const target = await Deployment.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Not found' });

    const project = await Project.findById(target.project);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const lastDeploy = await Deployment.findOne({ project: project._id }).sort({ version: -1 });
    const version = (lastDeploy?.version || 0) + 1;

    const deployment = await Deployment.create({
      project: project._id, version, branch: target.branch,
      commitHash: target.commitHash, commitMessage: `Rollback to v${target.version}`,
      status: 'queued', triggeredBy: 'rollback', envSnapshot: target.envSnapshot,
    });

    const io = req.app.get('io');
    startBuildPipeline(project, deployment, req.user, io).catch(console.error);

    res.json({ deployment });
  } catch (err) {
    res.status(500).json({ error: 'Rollback failed' });
  }
});

// POST /api/deployments/:id/stop
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const deployment = await Deployment.findByIdAndUpdate(
      req.params.id, { status: 'stopped', finishedAt: new Date() }, { new: true }
    );
    if (!deployment) return res.status(404).json({ error: 'Not found' });
    res.json({ deployment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop' });
  }
});

module.exports = router;
