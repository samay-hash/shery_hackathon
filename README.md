# 🚀 DeployX — DevOps Deployment Panel

> **A One-Click Deployment Platform — Mini Vercel Clone**  
> Built for Sherians Hackathon 2026

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-25-339933?style=flat&logo=nodedotjs)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat&logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-29-2496ED?style=flat&logo=docker)

## ✨ Features

- **🔐 GitHub OAuth** — Seamless login with GitHub
- **📦 Repo Import** — Browse and select any repository
- **🚀 One-Click Deploy** — Auto-detect framework and deploy
- **📺 Live Log Streaming** — Real-time terminal with WebSocket
- **🔄 Instant Rollback** — Visual timeline with one-click rollback
- **🔑 Environment Variables** — Manage secrets securely
- **🐳 Docker Builds** — Isolated, reproducible deployments
- **🔔 Auto Deploy** — GitHub webhook integration (CI/CD)
- **🎨 Premium UI** — Dark theme, glassmorphism, animations

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Vanilla CSS + Framer Motion |
| State | Zustand |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.IO |
| Auth | GitHub OAuth 2.0 + JWT |
| Containers | Docker (dockerode) |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Docker (optional, for real builds)
- GitHub OAuth App credentials

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/deployx.git
cd deployx

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your GitHub OAuth credentials
```

### 3. Run Development
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 4. Open in Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/health

## 📸 Screenshots

Coming soon...

## 👥 Team

Built with ❤️ for Sherians Hackathon 2026





Client ID
Ov23libTBr5ygwkjmrAF

Client secrets
c28caa3d8fc712a26e4d6b67598a1fc67badd85e