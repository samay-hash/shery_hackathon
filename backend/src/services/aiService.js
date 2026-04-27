const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let genAI = null;
let model = null;

function initAI() {
  if (!GEMINI_API_KEY) {
    console.log('⚠️  No GEMINI_API_KEY set — AI features will use fallback rules');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('🧠 Gemini AI initialized');
    return true;
  } catch (err) {
    console.error('AI init error:', err.message);
    return false;
  }
}

// Initialize on load
initAI();

/**
 * Analyze build error logs and suggest fixes
 */
async function analyzeBuildError(logs, framework, projectName) {
  const errorLines = logs
    .filter(l => l.level === 'error' || l.level === 'warn' || l.message.includes('Error') || l.message.includes('failed'))
    .slice(-30)
    .map(l => l.message)
    .join('\n');

  if (!model) return fallbackErrorAnalysis(errorLines, framework);

  try {
    const prompt = `You are a DevOps AI assistant for "DeployX".
A deployment for project "${projectName}" (framework: ${framework}) just FAILED.
Here are the error logs:
\`\`\`
${errorLines}
\`\`\`
Analyze the error and provide:
1. Root Cause (1-2 sentences)
2. Fix Steps (numbered list, max 4 steps)
3. Confidence (high/medium/low)
Respond in JSON format: {"rootCause": "...", "fixSteps": ["step1", "step2"], "confidence": "high"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { rootCause: text.slice(0, 200), fixSteps: [], confidence: 'low' };
  } catch (err) {
    console.error('AI analysis error:', err.message);
    return fallbackErrorAnalysis(errorLines, framework);
  }
}

/**
 * Scan a project repo and recommend optimal settings
 */
async function scanProjectRecommendations(packageJson, files, currentFramework) {
  if (!model) return fallbackScan(packageJson, currentFramework);

  try {
    const prompt = `You are a DevOps AI. Analyze this project and recommend optimal deployment settings.
package.json: ${JSON.stringify(packageJson).slice(0, 1500)}
Files: ${files.slice(0, 30).join(', ')}
Framework: ${currentFramework}
Respond in JSON: {"framework": "react|nextjs|node|static", "buildCommand": "npm run build", "startCommand": "npm start", "outputDir": "dist", "nodeVersion": "18", "tips": []}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return fallbackScan(packageJson, currentFramework);
  } catch (err) {
    return fallbackScan(packageJson, currentFramework);
  }
}

/**
 * Generate a human-readable deployment summary
 */
async function generateDeploySummary(deployment, logs) {
  if (!model) return `Deployment v${deployment.version} ${deployment.status}.`;
  try {
    const logSummary = logs.slice(-10).map(l => `[${l.level}] ${l.message}`).join('\n');
    const prompt = `Write a 2-sentence deployment summary for a PaaS dashboard. Status: ${deployment.status}. Logs: ${logSummary}`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `Deployment v${deployment.version} ${deployment.status}.`;
  }
}

function fallbackErrorAnalysis(errorText, framework) {
  const lower = errorText.toLowerCase();
  if (lower.includes('module not found')) return { rootCause: 'Missing npm dependency.', fixSteps: ['Run npm install'], confidence: 'high' };
  if (lower.includes('clone failed')) return { rootCause: 'Failed to clone repo.', fixSteps: ['Check URL/auth'], confidence: 'high' };
  return { rootCause: 'Build failed.', fixSteps: ['Check full logs'], confidence: 'low' };
}

function fallbackScan(packageJson, currentFramework) {
  return { framework: currentFramework || 'node', buildCommand: 'npm run build', startCommand: 'npm start', outputDir: 'dist', nodeVersion: '18', tips: [] };
}

module.exports = { analyzeBuildError, scanProjectRecommendations, generateDeploySummary, initAI };
