const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/github/repos — List user's GitHub repos
router.get('/repos', auth, async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: {
        sort: 'updated',
        per_page: 100,
        type: 'all',
      },
    });

    const repos = response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      default_branch: repo.default_branch,
      private: repo.private,
      updated_at: repo.updated_at,
      stargazers_count: repo.stargazers_count,
    }));

    res.json({ repos });
  } catch (err) {
    console.error('GitHub repos error:', err.message);
    res.status(500).json({ error: 'Failed to fetch GitHub repos' });
  }
});

module.exports = router;
