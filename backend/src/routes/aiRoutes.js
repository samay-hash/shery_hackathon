const express = require('express');
const auth = require('../middleware/auth');
const Deployment = require('../models/Deployment');
const { analyzeBuildError, scanProjectRecommendations, generateDeploySummary } = require('../services/aiService');
const Project = require('../models/Project');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.post('/analyze-error', auth, async (req, res) => {
  try {
    const { deploymentId } = req.body;
    if (!deploymentId) return res.status(400).json({ error: 'deploymentId required' });
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) return res.status(404).json({ error: 'Deployment not found' });
    const project = await Project.findById(deployment.project);
    const analysis = await analyzeBuildError(deployment.logs, project?.framework || 'unknown', project?.name || 'unknown');
    res.json({ analysis });
  } catch (err) { res.status(500).json({ error: 'AI analysis failed' }); }
});

router.post('/scan-project', auth, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const BUILDS_DIR = process.env.BUILDS_DIR || '/tmp/deployx-builds';
    const latestDeploy = await Deployment.findOne({ project: projectId }).sort({ createdAt: -1 });
    let packageJson = {}; let files = [];
    if (latestDeploy) {
      const buildDir = path.join(BUILDS_DIR, latestDeploy._id.toString());
      const rootDir = project.rootDir && project.rootDir !== '.' ? project.rootDir : '';
      try {
        const pkgPath = path.join(buildDir, rootDir, 'package.json');
        if (fs.existsSync(pkgPath)) packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const scanDir = rootDir ? path.join(buildDir, rootDir) : buildDir;
        if (fs.existsSync(scanDir)) files = fs.readdirSync(scanDir).slice(0, 50);
      } catch { }
    }
    const recommendations = await scanProjectRecommendations(packageJson, files, project.framework);
    res.json({ recommendations });
  } catch (err) { res.status(500).json({ error: 'AI scan failed' }); }
});

router.post('/deploy-summary', auth, async (req, res) => {
  try {
    const { deploymentId } = req.body;
    const deployment = await Deployment.findById(deploymentId);
    const summary = await generateDeploySummary(deployment, deployment.logs);
    res.json({ summary });
  } catch (err) { res.status(500).json({ error: 'Summary generation failed' }); }
});

module.exports = router;
