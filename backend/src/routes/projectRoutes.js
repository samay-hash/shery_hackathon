const express = require('express');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Deployment = require('../models/Deployment');
const { detectFramework, startBuildPipeline } = require('../services/buildService');
const { enqueueDeployment } = require('../services/queue');

const router = express.Router();

// GET /api/projects — List user's projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id, status: { $ne: 'deleted' } })
      .sort({ updatedAt: -1 });

    // Attach latest deployment to each project
    const projectsWithDeploy = await Promise.all(
      projects.map(async (p) => {
        const latestDeployment = await Deployment.findOne({ project: p._id })
          .sort({ createdAt: -1 });
        return { ...p.toJSON(), latestDeployment };
      })
    );

    res.json({ projects: projectsWithDeploy });
  } catch (err) {
    console.error('List projects error:', err.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects — Create new project
router.post('/', auth, async (req, res) => {
  try {
    const { repoUrl, name, branch = 'main', rootDir = '.' } = req.body;

    if (!repoUrl || !name) {
      return res.status(400).json({ error: 'repoUrl and name are required' });
    }

    // Extract full name from URL (e.g., "user/repo")
    const repoFullName = repoUrl
      .replace('https://github.com/', '')
      .replace('.git', '')
      .replace(/\/$/, '');

    // Detect framework from repo (simplified — full detection happens at build time)
    const framework = 'unknown';

    // Generate unique subdomain based on project name
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const subdomain = `${sanitizedName}-${uniqueSuffix}`;

    const project = await Project.create({
      name,
      owner: req.user._id,
      repoUrl,
      repoFullName,
      branch,
      framework,
      subdomain,
      rootDir,
    });

    // Add to user's projects
    req.user.projects.push(project._id);
    await req.user.save();

    res.status(201).json({ project });
  } catch (err) {
    console.error('Create project error:', err.message);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id — Get project details
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const latestDeployment = await Deployment.findOne({ project: project._id })
      .sort({ createdAt: -1 });

    res.json({ project: { ...project.toJSON(), latestDeployment } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id — Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const allowed = ['name', 'branch', 'buildCommand', 'startCommand', 'outputDir', 'rootDir', 'autoDeployEnabled', 'customDomain'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true }
    );

    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id — Soft delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: 'deleted' },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// PUT /api/projects/:id/env — Update environment variables
router.put('/:id/env', auth, async (req, res) => {
  try {
    const { envVars } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { envVars },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update env vars' });
  }
});

// POST /api/projects/:id/deploy
router.post('/:id/deploy', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const lastDeploy = await Deployment.findOne({ project: project._id }).sort({ version: -1 });
    const version = (lastDeploy?.version || 0) + 1;

    const deployment = await Deployment.create({
      project: project._id, version, branch: project.branch,
      status: 'queued', triggeredBy: 'manual', envSnapshot: project.envVars,
    });

    await enqueueDeployment({
      projectId: project._id,
      deploymentId: deployment._id,
      user: req.user
    });

    res.status(201).json({ deployment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger deployment' });
  }
});

// GET /api/projects/:id/deployments
router.get('/:id/deployments', auth, async (req, res) => {
  try {
    const deployments = await Deployment.find({ project: req.params.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ deployments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

module.exports = router;
