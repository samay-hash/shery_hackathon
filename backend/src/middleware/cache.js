/**
 * Simple in-memory cache middleware for API responses.
 * Caches GET requests for a configurable TTL.
 */
const cache = new Map();

function cacheMiddleware(ttlSeconds = 30) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = `${req.originalUrl}:${req.user?._id || 'anon'}`;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttlSeconds * 1000) {
      return res.json(cached.data);
    }

    // Override res.json to intercept and cache
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson(data);
    };

    next();
  };
}

function clearCache(pattern) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

// Auto-cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache.entries()) {
    if (now - val.timestamp > 300000) cache.delete(key); // 5 min max
  }
}, 60000);

module.exports = { cacheMiddleware, clearCache };
