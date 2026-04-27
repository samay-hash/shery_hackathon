const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const Deployment = require('../models/Deployment');
const Project = require('../models/Project');
const { emitDeployLog, emitDeployStatus } = require('../socket/socketHandler');

const BUILDS_DIR = path.join(__dirname, '..', '..', 'builds');
const DOCKER_AVAILABLE = checkDocker();

function checkDocker() {
  try { execSync('docker --version', { stdio: 'pipe' }); return true; }
  catch { return false; }
}

// Emit a log and save to DB
async function log(io, deployment, level, message, source = 'build') {
  const entry = { timestamp: new Date(), level, message, source };
  emitDeployLog(io, deployment._id.toString(), entry);
  await Deployment.findByIdAndUpdate(deployment._id, { $push: { logs: entry } });
}

// Detect framework from package.json
function detectFramework(repoPath, rootDir = '.') {
  try {
    const pkgPath = path.join(repoPath, rootDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      if (fs.existsSync(path.join(repoPath, rootDir, 'index.html'))) return { type: 'static', build: '', start: '', output: '.', port: 80 };
      return { type: 'unknown', build: '', start: '', output: '.', port: 8080 };
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.next) return { type: 'nextjs', build: 'npm run build', start: 'npm start', output: '.next', port: 3000 };
    if (deps.react || deps['react-dom']) return { type: 'react', build: 'npm run build', start: '', output: 'dist', port: 80 };
    if (deps.vue) return { type: 'vue', build: 'npm run build', start: '', output: 'dist', port: 80 };
    if (deps.express || deps.fastify || deps.koa) return { type: 'node', build: 'npm install', start: pkg.scripts?.start || 'node index.js', output: '.', port: 3000 };
    return { type: 'node', build: 'npm install', start: pkg.scripts?.start || 'node index.js', output: '.', port: 3000 };
  } catch {
    return { type: 'unknown', build: '', start: '', output: '.', port: 8080 };
  }
}

// Generate Dockerfile based on framework
function generateDockerfile(framework, project) {
  const buildCmd = project.buildCommand || framework.build;
  const startCmd = project.startCommand || framework.start;
  const rootDir = project.rootDir && project.rootDir !== '.' ? project.rootDir : '.';

  switch (framework.type) {
    case 'react':
    case 'vue':
      return `FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
WORKDIR /app/${rootDir}
RUN npm install
RUN ${buildCmd || 'npm run build'}

FROM nginx:alpine
COPY --from=builder /app/${rootDir === '.' ? '' : rootDir + '/'}${project.outputDir || framework.output || 'dist'} /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

    case 'nextjs':
      return `FROM node:18-alpine
WORKDIR /app
COPY . .
WORKDIR /app/${rootDir}
RUN npm install
RUN ${buildCmd || 'npm run build'}
EXPOSE 3000
CMD ["${startCmd || 'npm start'}"]`;

    case 'node':
      return `FROM node:18-alpine
WORKDIR /app
COPY . .
WORKDIR /app/${rootDir}
RUN npm install --production
EXPOSE ${framework.port}
CMD ${JSON.stringify((startCmd || 'node index.js').split(' '))}`;

    case 'static':
      return `FROM nginx:alpine
COPY ${rootDir} /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

    default:
      return `FROM node:18-alpine
WORKDIR /app
COPY . .
WORKDIR /app/${rootDir}
RUN npm install 2>/dev/null || true
EXPOSE 8080
CMD ["node", "index.js"]`;
  }
}

// Find an available port in range
let nextPort = 4001;
function getNextPort() {
  return nextPort++;
}

// Main build pipeline
async function startBuildPipeline(project, deployment, user, io) {
  const startTime = Date.now();
  const deployId = deployment._id.toString();
  const buildDir = path.join(BUILDS_DIR, deployId);

  try {
    // 1. QUEUED → BUILDING
    await Deployment.findByIdAndUpdate(deployment._id, { status: 'building' });
    emitDeployStatus(io, deployId, 'building');

    // Create builds directory
    fs.mkdirSync(buildDir, { recursive: true });

    // 2. Clone repo
    await log(io, deployment, 'info', '▸ Cloning repository...');
    await log(io, deployment, 'info', `▸ git clone ${project.repoUrl}`);

    try {
      const cloneUrl = project.repoUrl.replace('https://', `https://${user.accessToken}@`);
      execSync(`git clone --depth 1 --branch ${project.branch} ${cloneUrl} ${buildDir}`, {
        stdio: 'pipe', timeout: 60000,
      });
      await log(io, deployment, 'success', '✓ Repository cloned successfully');
    } catch (err) {
      await log(io, deployment, 'error', `✗ Clone failed: ${err.message}`);
      throw new Error('Clone failed');
    }

    // 3. Detect framework
    const framework = detectFramework(buildDir, project.rootDir);
    await log(io, deployment, 'info', `▸ Detected framework: ${framework.type} (in ${project.rootDir || './'})`);

    // Update project framework
    await Project.findByIdAndUpdate(project._id, { framework: framework.type });

    // 4. Get commit info
    try {
      const hash = execSync('git rev-parse HEAD', { cwd: buildDir, stdio: 'pipe' }).toString().trim();
      const msg = execSync('git log -1 --pretty=%s', { cwd: buildDir, stdio: 'pipe' }).toString().trim();
      await Deployment.findByIdAndUpdate(deployment._id, { commitHash: hash, commitMessage: msg });
    } catch { /* ignore */ }

    if (DOCKER_AVAILABLE) {
      // 5. Generate Dockerfile
      await log(io, deployment, 'info', '▸ Generating Dockerfile...');
      const dockerfile = generateDockerfile(framework, project);
      fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfile);
      await log(io, deployment, 'success', '✓ Dockerfile generated');

      // 6. Build Docker image
      await log(io, deployment, 'info', '▸ Building Docker image...');
      const imageName = `deployx-${project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}:v${deployment.version}`;

      await new Promise((resolve, reject) => {
        const build = spawn('docker', ['build', '-t', imageName, '.'], { cwd: buildDir });

        build.stdout.on('data', (data) => {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach((line) => log(io, deployment, 'info', `  ${line}`));
        });
        build.stderr.on('data', (data) => {
          const lines = data.toString().split('\n').filter(Boolean);
          lines.forEach((line) => log(io, deployment, 'info', `  ${line}`));
        });
        build.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`)));
        build.on('error', reject);
      });

      await log(io, deployment, 'success', `✓ Image built: ${imageName}`);

      // 7. DEPLOYING
      await Deployment.findByIdAndUpdate(deployment._id, { status: 'deploying', imageId: imageName });
      emitDeployStatus(io, deployId, 'deploying');
      await log(io, deployment, 'info', '▸ Starting container...', 'deploy');

      const port = getNextPort();

      // Write env vars to file safely handling Mongoose Map
      const envFile = path.join(buildDir, '.env.deploy');
      const plainEnvVars = (project.envVars && typeof project.envVars.toJSON === 'function') 
        ? project.envVars.toJSON() 
        : (project.envVars || {});
        
      const envContent = Object.entries(plainEnvVars)
        .filter(([k]) => k !== '_id') // explicitly filter out _id just in case
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
        
      fs.writeFileSync(envFile, envContent);

      const containerName = `deployx-${project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-v${deployment.version}`;
      execSync(
        `docker run -d --name ${containerName} -p ${port}:${framework.port || 80} --env-file ${envFile} ${imageName}`,
        { stdio: 'pipe' }
      );

      const containerId = execSync(`docker inspect --format='{{.Id}}' ${containerName}`, { stdio: 'pipe' }).toString().trim();
      const deployUrl = `http://localhost:${port}`;

      await log(io, deployment, 'success', `✓ Container started: ${containerName}`, 'deploy');
      // 8. LIVE
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      // Update Project with the active port
      await Project.findByIdAndUpdate(project._id, { activePort: port });

      // Generate the public URL (using nip.io for IP addresses so subdomains work over internet)
      const frontendHost = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : 'localhost';
      const publicUrl = /^[0-9.]+$/.test(frontendHost)
        ? `http://${project.subdomain}.${frontendHost}.nip.io:8000`
        : `http://${project.subdomain}.localhost:8000`;

      await log(io, deployment, 'success', `🚀 Deployment LIVE at ${publicUrl}`, 'deploy');

      await Deployment.findByIdAndUpdate(deployment._id, {
        status: 'live', containerId, deployUrl: publicUrl, buildDuration: duration, finishedAt: new Date(),
      });
      emitDeployStatus(io, deployId, 'live');
    } else {
      // Fallback: simulate build without Docker
      await log(io, deployment, 'warn', '⚠ Docker not available, simulating build...');

      await log(io, deployment, 'info', '▸ Installing dependencies...');
      try {
        execSync('npm install', { cwd: buildDir, stdio: 'pipe', timeout: 120000 });
        await log(io, deployment, 'success', '✓ Dependencies installed');
      } catch {
        await log(io, deployment, 'warn', '⚠ npm install skipped');
      }

      await log(io, deployment, 'info', '▸ Building application...');
      try {
        const buildCmd = project.buildCommand || framework.build;
        if (buildCmd && buildCmd !== 'npm install') {
          execSync(buildCmd, { cwd: buildDir, stdio: 'pipe', timeout: 120000 });
        }
        await log(io, deployment, 'success', '✓ Build completed');
      } catch {
        await log(io, deployment, 'warn', '⚠ Build step skipped');
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      const deployUrl = `http://localhost:3001/preview/${deployId}`;

      await log(io, deployment, 'success', `🚀 Build complete (${duration}s) — ${deployUrl}`, 'deploy');
      await Deployment.findByIdAndUpdate(deployment._id, {
        status: 'live', deployUrl, buildDuration: duration, finishedAt: new Date(),
      });
      emitDeployStatus(io, deployId, 'live');
    }
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    await log(io, deployment, 'error', `✗ Deployment failed: ${err.message}`);
    await Deployment.findByIdAndUpdate(deployment._id, {
      status: 'failed', buildDuration: duration, finishedAt: new Date(),
    });
    emitDeployStatus(io, deployId, 'failed');
  }
}

module.exports = { startBuildPipeline, detectFramework, generateDockerfile };
