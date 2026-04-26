const httpProxy = require('http-proxy');
const http = require('http');
const Project = require('./models/Project');

// Create the proxy instance
const proxy = httpProxy.createProxyServer({});

// Create the routing server
const proxyServer = http.createServer(async (req, res) => {
  const host = req.headers.host; // e.g., "solmap.localhost:8000" or "solmap.deployx.dev"
  
  if (!host) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request: No Host header provided.');
  }

  // Extract the subdomain. Assuming the first part of the host is the subdomain
  const subdomain = host.split('.')[0];

  try {
    // Look up the project in MongoDB by subdomain
    const project = await Project.findOne({ subdomain: subdomain.toLowerCase() });
    
    // If project not found or no active port is mapped
    if (!project || !project.activePort) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end(`
        <div style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1 style="color: #FF4757;">404 - Project Not Found</h1>
          <p>The subdomain <b>${subdomain}</b> is not linked to any active deployment on DeployX.</p>
        </div>
      `);
    }

    // Proxy the traffic to the corresponding Docker container's port
    proxy.web(req, res, { target: `http://localhost:${project.activePort}` });
  } catch (err) {
    console.error(`[Proxy] Routing error for ${host}:`, err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    return res.end('Internal Server Error inside Proxy');
  }
});

// Handle proxy errors (e.g., container died)
proxy.on('error', (err, req, res) => {
  console.error(`[Proxy] Target error for ${req.headers.host}:`, err.message);
  res.writeHead(502, { 'Content-Type': 'text/html' });
  res.end(`
    <div style="font-family: system-ui; text-align: center; padding: 50px;">
      <h1 style="color: #FFA502;">502 - Bad Gateway</h1>
      <p>The container for this project might be down, restarting, or has crashed.</p>
      <p>Please check your logs on the DeployX Dashboard.</p>
    </div>
  `);
});

// Handle WebSocket upgrades (for apps that use WebSockets)
proxyServer.on('upgrade', async (req, socket, head) => {
  const host = req.headers.host;
  if (!host) return socket.destroy();
  
  const subdomain = host.split('.')[0];
  try {
    const project = await Project.findOne({ subdomain: subdomain.toLowerCase() });
    if (project && project.activePort) {
      proxy.ws(req, socket, head, { target: `http://localhost:${project.activePort}` });
    } else {
      socket.destroy();
    }
  } catch {
    socket.destroy();
  }
});

module.exports = { proxyServer };
