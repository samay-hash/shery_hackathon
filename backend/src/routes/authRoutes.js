const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'deployx_secret_key_2026';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/auth/github — Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const scope = 'user:email repo admin:repo_hook';
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  res.redirect(githubUrl);
});

// GET /api/auth/github/callback — Handle OAuth callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${FRONTEND_URL}?error=no_code`);
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' },
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.redirect(`${FRONTEND_URL}?error=no_token`);
    }

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const ghUser = userResponse.data;

    // Upsert user in DB
    let user = await User.findOne({ githubId: String(ghUser.id) });
    if (user) {
      user.accessToken = accessToken;
      user.username = ghUser.login;
      user.avatarUrl = ghUser.avatar_url;
      user.email = ghUser.email || '';
      await user.save();
    } else {
      user = await User.create({
        githubId: String(ghUser.id),
        username: ghUser.login,
        email: ghUser.email || '',
        avatarUrl: ghUser.avatar_url,
        accessToken,
      });
    }

    // Generate JWT
    const jwtToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwtToken}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err.message);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
  }
});

// GET /api/auth/me — Get current user
router.get('/me', auth, (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      githubId: req.user.githubId,
      username: req.user.username,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out' });
});

module.exports = router;
