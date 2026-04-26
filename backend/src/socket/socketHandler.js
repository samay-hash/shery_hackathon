function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a deployment room for targeted log streaming
    socket.on('join:deployment', (deploymentId) => {
      socket.join(`deploy:${deploymentId}`);
      console.log(`📡 ${socket.id} joined deploy:${deploymentId}`);
    });

    socket.on('leave:deployment', (deploymentId) => {
      socket.leave(`deploy:${deploymentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

// Emit a log entry to all clients watching a deployment
function emitDeployLog(io, deploymentId, log) {
  io.to(`deploy:${deploymentId}`).emit('deploy:log', log);
}

// Emit status change
function emitDeployStatus(io, deploymentId, status) {
  io.to(`deploy:${deploymentId}`).emit('deploy:status', { deploymentId, status });
}

module.exports = { setupSocket, emitDeployLog, emitDeployStatus };
