const express = require('express');
const Project = require('../models/Project');
const { startBuildPipeline } = require('../services/buildService');

const router = express.Router();

// POST /api/webhooks/github — Handle GitHub push events
router.post('/github', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    if (event !== 'push') return res.json({ message: 'Ignored' });

    const { repository, ref, head_commit } = req.body;
    const branch = ref?.replace('refs/heads/', '');
    const repoFullName = repository?.full_name;

    if (!repoFullName || !branch) return res.status(400).json({ error: 'Invalid payload' });

    const project = await Project.findOne({ repoFullName, branch, autoDeployEnabled: true });
    if (!project) return res.json({ message: 'No matching project' });

    const User = require('../models/User');
    const user = await User.findById(project.owner);
    if (!user) return res.status(404).json({ error: 'Owner not found' });

    const Deployment = require('../models/Deployment');
    const lastDeploy = await Deployment.findOne({ project: project._id }).sort({ version: -1 });
    const version = (lastDeploy?.version || 0) + 1;

    const deployment = await Deployment.create({
      project: project._id, version, branch,
      commitHash: head_commit?.id || '', commitMessage: head_commit?.message || '',
      status: 'queued', triggeredBy: 'webhook', envSnapshot: project.envVars,
    });

    const io = req.app.get('io');
    startBuildPipeline(project, deployment, user, io).catch(console.error);

    res.json({ message: 'Deploy triggered', deploymentId: deployment._id });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
