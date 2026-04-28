# 🚀 DeployX: The Intelligent Cloud Engine

<p align="center">
  <img src="https://img.shields.io/badge/DeployX-AI--Deployment--PaaS-00E5FF?style=for-the-badge&logo=rocket" />
  <img src="https://img.shields.io/badge/Powered%20By-Gemini%202.0-blue?style=for-the-badge&logo=google-gemini" />
  <img src="https://img.shields.io/badge/Infrastructure-Docker--Native-2496ED?style=for-the-badge&logo=docker" />
</p>

---

## 🌟 What is DeployX?
DeployX is an **All-in-One Deployment Platform** designed to take your code from GitHub to a live URL in seconds. No more manual server setup, no more Nginx configuration, and no more build crashes. 

**Our secret sauce?** An AI-driven "Self-Healing" brain that fixes your code errors automatically during the build process.

---

## 🛤️ The 1-2-3 Workflow (How it Works)

DeployX simplifies the complex world of DevOps into 3 simple stages:

### 1️⃣ Connect & Scan 🔍
- **Import**: Link your GitHub repository.
- **AI Analysis**: Our AI engine scans your files to understand if you're deploying a **Frontend** (React/Next) or **Backend** (Node/Express).
- **Environment**: Add your API keys and Secrets directly in our clean UI.

### 2️⃣ Build & Heal 🛠️
- **Automatic Dockerization**: DeployX creates a custom "Container" for your app.
- **Self-Healing**: If a build fails (e.g., a missing package), our **AI Agent** reads the error logs, writes a code fix, and restarts the build. You don't have to lift a finger!

### 3️⃣ Go Live 🚀
- **Instant URL**: Your app is assigned a unique subdomain (e.g. `myapp.deployx.io`).
- **Smart Routing**: Our custom Proxy automatically directs internet traffic to your specific container.

---

## 🏗️ Under the Hood (Architecture)

We’ve built a robust distributed system to ensure your apps are always online:

```mermaid
graph TD
    A[User Dashboard] -->|Command| B[DeployX Backend]
    B -->|Task| C[Worker Engine]
    C -->|Build| D[Docker Containers]
    D -->|Error Logs| E{AI Engine}
    E -->|Auto-Patch| C
    F[Dynamic Proxy] -->|Route Traffic| D
    G[Internet] -->|Visit URL| F
```

- **The Brain (AI Engine)**: Uses Google Gemini 2.0 to solve DevOps puzzles.
- **The Muscle (Docker)**: Keeps every app isolated and secure.
- **The Router (Proxy)**: Acts as the traffic police for your live links.

---

## 🆚 Why DeployX is Better

| Feature | The Old Manual Way | The DeployX Way |
| :--- | :--- | :--- |
| **Setup Time** | Hours (SSH, Nginx, Linux setup) | **30 Seconds** |
| **Error Handling** | Manual debugging for hours | **AI Auto-Fixes in real-time** |
| **SSL & URLs** | Hard to configure | **Instant & Automatic** |
| **Monorepo Support** | Very complex | **One-click sub-folder deploy** |

---

## 🚀 Getting Started (Installation)

Follow these steps to run DeployX on your own server:

### 1. Prerequisites
- Docker & Docker Compose
- Node.js v18+
- GitHub OAuth Credentials

### 2. Setup Environment Variables
Create a `.env` file in the `backend` directory:
```env
MONGODB_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FRONTEND_URL=http://your-ip:5173
```

### 3. Run with Docker Compose
From the root directory, run:
```bash
docker-compose up -d --build
```
This will start:
- **Frontend**: Dashboard on port `5173`
- **Backend**: API on port `3001`
- **Proxy**: Routing engine on port `8000`
- **Redis**: Queue management

---

## 🛠️ Built With

- **Frontend**: React, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, BullMQ, Dockerode.
- **AI**: Gemini 2.0 Flash & Groq Fallback.

---

## 🏁 Hackathon Summary
We built DeployX to solve the biggest problem for developers: **Deployment Stress.** By combining AI with industry-standard containerization, we've created a platform where anyone can be a DevOps engineer.

<p align="center">
  <br />
  <b>Stop Configuring. Start Shipping.</b>
  <br />
  <sub>Developed with passion for the Sherians Hackathon 2026.</sub>
</p>