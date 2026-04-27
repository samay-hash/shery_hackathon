const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const Docker = require('dockerode');
const tar = require('tar-fs');
const Deployment = require('../models/Deployment');
const Project = require('../models/Project');
const { emitDeployLog, emitDeployStatus } = require('../socket/socketHandler');
const { analyzeBuildError } = require('./aiService');

const BUILDS_DIR = path.join(__dirname, '..', '..', 'builds');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function log(io, deployment, level, message, source = 'build') {
  const entry = { timestamp: new Date(), level, message, source };
  if (io) emitDeployLog(io, deployment._id.toString(), entry);
  await Deployment.findByIdAndUpdate(deployment._id, { $push: { logs: entry } });
}

// ... detectFramework ...
function detectFramework(repoPath, rootDir = '.') {
  try {
    let pkgPath = path.join(repoPath, rootDir, 'package.json');
    let detectedRoot = rootDir;

    if (!fs.existsSync(pkgPath) && rootDir === '.') {
      if (fs.existsSync(path.join(repoPath, 'frontend', 'package.json'))) {
        detectedRoot = 'frontend';
        pkgPath = path.join(repoPath, 'frontend', 'package.json');
      } else if (fs.existsSync(path.join(repoPath, 'backend', 'package.json'))) {
        detectedRoot = 'backend';
        pkgPath = path.join(repoPath, 'backend', 'package.json');
      }
    }

    if (!fs.existsSync(pkgPath)) {
      if (fs.existsSync(path.join(repoPath, detectedRoot, 'index.html'))) return { type: 'static', build: '', start: '', output: '.', port: 80, detectedRoot };
      return { type: 'unknown', build: '', start: '', output: '.', port: 8080, detectedRoot };
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.next) return { type: 'nextjs', build: 'npm run build', start: 'npm start', output: '.next', port: 3000, detectedRoot };
    if (deps.react || deps['react-dom']) return { type: 'react', build: 'npm run build', start: '', output: 'dist', port: 80, detectedRoot };
    if (deps.vue) return { type: 'vue', build: 'npm run build', start: '', output: 'dist', port: 80, detectedRoot };
    if (deps.express || deps.fastify || deps.koa) return { type: 'node', build: 'npm install', start: pkg.scripts?.start || 'node index.js', output: '.', port: 3000, detectedRoot };
    return { type: 'node', build: 'npm install', start: pkg.scripts?.start || 'node index.js', output: '.', port: 3000, detectedRoot };
  } catch {
    return { type: 'unknown', build: '', start: '', output: '.', port: 8080, detectedRoot: rootDir };
  }
}

function generateDockerfile(framework, project) {
  const buildCmd = project.buildCommand || framework.build;
  const startCmd = project.startCommand || framework.start;
  const rootDir = framework.detectedRoot || (project.rootDir && project.rootDir !== '.' ? project.rootDir : '.');

  switch (framework.type) {
    case 'react':
    case 'vue':
      return `FROM node:20-alpine AS builder
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
      return `FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/${rootDir}
RUN npm install
RUN ${buildCmd || 'npm run build'}
EXPOSE 3000
CMD ["${startCmd || 'npm start'}"]`;

    case 'node':
      return `FROM node:20-alpine
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
      return `FROM node:20-alpine
WORKDIR /app
COPY . .
WORKDIR /app/${rootDir}
RUN npm install 2>/dev/null || true
EXPOSE 8080
CMD ["node", "index.js"]`;
  }
}

let nextPort = 4001;
function getNextPort() {
  return nextPort++;
}

async function cleanupOldContainers(projectName, io, deployment) {
  try {
    const prefix = `deployx-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const containers = await docker.listContainers({ all: true });
    for (const c of containers) {
      if (c.Names.some(n => n.includes(prefix))) {
        const container = docker.getContainer(c.Id);
        if (c.State === 'running') await container.stop();
        await container.remove();
        await log(io, deployment, 'info', `♻ Cleaned up old container: ${c.Names[0]}`);
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

// 🌟 AI Self-Healing Auto-Patch Logic
async function attemptSelfHealing(errorLogs, buildDir, project, deployment, io) {
  await log(io, deployment, 'warn', '🧠 AI Engine analyzing failure and attempting self-healing...');
  try {
    const analysis = await analyzeBuildError(errorLogs, project.framework, project.name);
    await log(io, deployment, 'info', `🧠 AI Diagnosis: ${analysis.rootCause}`);
    
    // Check if AI provided a patch payload (Assuming analyzeBuildError is updated to return `patch`)
    if (analysis.patch && analysis.patch.file && analysis.patch.replace) {
      const filePath = path.join(buildDir, analysis.patch.file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(analysis.patch.search || '', analysis.patch.replace);
        fs.writeFileSync(filePath, content);
        await log(io, deployment, 'success', `✨ AI Auto-Patched file: ${analysis.patch.file}`);
        return true; // Patch applied
      }
    }
    return false; // Could not heal
  } catch (e) {
    return false;
  }
}

// Main build pipeline with Dockerode & Tar-FS Streaming
async function startBuildPipeline(project, deployment, user, io, retryCount = 0) {
  const startTime = Date.now();
  const deployId = deployment._id.toString();
  const buildDir = path.join(BUILDS_DIR, deployId);

  try {
    if (retryCount === 0) {
      await cleanupOldContainers(project.name, io, deployment);
      await Deployment.findByIdAndUpdate(deployment._id, { status: 'building' });
      if (io) emitDeployStatus(io, deployId, 'building');

      fs.mkdirSync(buildDir, { recursive: true });
      await log(io, deployment, 'info', '▸ Cloning repository...');
      const cloneUrl = project.repoUrl.replace('https://', `https://${user.accessToken}@`);
      execSync(`git clone --depth 1 --branch ${project.branch} ${cloneUrl} ${buildDir}`, { stdio: 'pipe' });
      await log(io, deployment, 'success', '✓ Repository cloned successfully');
    }

    const framework = detectFramework(buildDir, project.rootDir);
    if (retryCount === 0) await log(io, deployment, 'info', `▸ Detected framework: ${framework.type}`);
    await Project.findByIdAndUpdate(project._id, { framework: framework.type });

    const dockerfile = generateDockerfile(framework, project);
    fs.writeFileSync(path.join(buildDir, 'Dockerfile'), dockerfile);
    await log(io, deployment, 'info', '▸ Generated optimal Dockerfile');

    const imageName = `deployx-${project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}:v${deployment.version}`;
    await log(io, deployment, 'info', `▸ Building Docker image using Dockerode tar-fs stream...`);

    // Tar-FS pack
    const tarStream = tar.pack(buildDir);
    
    // Build Image via Dockerode
    const buildStream = await docker.buildImage(tarStream, { t: imageName });
    
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(buildStream, 
        (err, res) => err ? reject(err) : resolve(res),
        (event) => {
          if (event.stream) log(io, deployment, 'info', `  ${event.stream.trim()}`);
          if (event.errorDetail) reject(new Error(event.errorDetail.message));
        }
      );
    });

    await log(io, deployment, 'success', `✓ Image built: ${imageName}`);

    // DEPLOYING
    await Deployment.findByIdAndUpdate(deployment._id, { status: 'deploying', imageId: imageName });
    if (io) emitDeployStatus(io, deployId, 'deploying');
    await log(io, deployment, 'info', '▸ Starting container...', 'deploy');

    const port = getNextPort();
    
    const plainEnvVars = (project.envVars && typeof project.envVars.toJSON === 'function') 
      ? project.envVars.toJSON() : (project.envVars || {});
    const envArray = Object.entries(plainEnvVars).filter(([k]) => k !== '_id').map(([k, v]) => `${k}=${v}`);

    const containerName = `deployx-${project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-v${deployment.version}`;
    
    const container = await docker.createContainer({
      Image: imageName,
      name: containerName,
      Env: envArray,
      ExposedPorts: { [`${framework.port || 80}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${framework.port || 80}/tcp`]: [{ HostPort: `${port}` }] }
      }
    });

    await container.start();
    await log(io, deployment, 'success', `✓ Container started: ${containerName}`, 'deploy');

    // LIVE
    const duration = Math.round((Date.now() - startTime) / 1000);
    await Project.findByIdAndUpdate(project._id, { activePort: port });

    const frontendHost = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : 'localhost';
    const publicUrl = /^[0-9.]+$/.test(frontendHost)
      ? `http://${project.subdomain}.${frontendHost}.nip.io:8000`
      : `http://${project.subdomain}.localhost:8000`;

    await log(io, deployment, 'success', `🚀 Deployment LIVE at ${publicUrl}`, 'deploy');

    await Deployment.findByIdAndUpdate(deployment._id, {
      status: 'live', containerId: container.id, deployUrl: publicUrl, buildDuration: duration, finishedAt: new Date(),
    });
    if (io) emitDeployStatus(io, deployId, 'live');

  } catch (err) {
    if (retryCount < 2) {
      await log(io, deployment, 'error', `✗ Build failed: ${err.message}`);
      
      // Get the latest logs for AI
      const updatedDeploy = await Deployment.findById(deployment._id);
      const errorLogs = updatedDeploy.logs.slice(-50);
      
      const healed = await attemptSelfHealing(errorLogs, buildDir, project, deployment, io);
      if (healed) {
        await log(io, deployment, 'info', `🔄 Retrying build pipeline after AI patch (Retry ${retryCount + 1}/2)...`);
        return startBuildPipeline(project, deployment, user, io, retryCount + 1);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    await log(io, deployment, 'error', `✗ Deployment ultimately failed: ${err.message}`);
    await Deployment.findByIdAndUpdate(deployment._id, {
      status: 'failed', buildDuration: duration, finishedAt: new Date(),
    });
    if (io) emitDeployStatus(io, deployId, 'failed');
  }
}

module.exports = { startBuildPipeline, detectFramework, generateDockerfile };
