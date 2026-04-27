const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Deployment = require('../models/Deployment');

const router = express.Router();

// Simple admin check — first user is admin (or check env for ADMIN_USERS)
const ADMIN_USERS = (process.env.ADMIN_USERS || '').split(',').map(s => s.trim()).filter(Boolean);

function adminOnly(req, res, next) {
  // Allow if user is in ADMIN_USERS list, or if there are no admins defined (first user = admin)
  if (ADMIN_USERS.length === 0 || ADMIN_USERS.includes(req.user.username)) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// GET /api/admin/stats — Platform-wide statistics
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalProjects, totalDeployments, liveDeployments, failedDeployments] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Deployment.countDocuments(),
      Deployment.countDocuments({ status: 'live' }),
      Deployment.countDocuments({ status: 'failed' }),
    ]);

    // Average build duration
    const avgResult = await Deployment.aggregate([
      { $match: { buildDuration: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$buildDuration' } } }
    ]);
    const avgBuildDuration = avgResult[0]?.avgDuration?.toFixed(1) || 0;

    // Deployments per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyDeploys = await Deployment.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Framework distribution
    const frameworkDist = await Project.aggregate([
      { $group: { _id: '$framework', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalProjects,
        totalDeployments,
        liveDeployments,
        failedDeployments,
        successRate: totalDeployments > 0 ? ((liveDeployments / totalDeployments) * 100).toFixed(1) : 0,
        avgBuildDuration,
        dailyDeploys,
        frameworkDistribution: frameworkDist,
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users — List all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}, '-accessToken').sort({ createdAt: -1 }).limit(100);
    
    // Attach project count for each user
    const usersWithCounts = await Promise.all(users.map(async (user) => {
      const projectCount = await Project.countDocuments({ owner: user._id });
      const deployCount = await Deployment.countDocuments({ 
        project: { $in: await Project.find({ owner: user._id }).distinct('_id') } 
      });
      return { ...user.toJSON(), projectCount, deployCount };
    }));

    res.json({ users: usersWithCounts });
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/deployments — Recent deployments across all users
router.get('/deployments', auth, adminOnly, async (req, res) => {
  try {
    const deployments = await Deployment.find()
      .populate({ path: 'project', select: 'name repoFullName owner' })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ deployments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// DELETE /api/admin/users/:id — Remove a user
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Also clean up their projects
    await Project.updateMany({ owner: req.params.id }, { status: 'deleted' });
    res.json({ message: 'User removed', userId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

module.exports = router;
