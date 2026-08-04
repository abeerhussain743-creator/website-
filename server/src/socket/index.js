import jwt from 'jsonwebtoken';
import { setIO } from '../services/notificationService.js';

export function initSocket(io) {
  setIO(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('join-team', (teamId) => {
      if (teamId) socket.join(`team:${teamId}`);
    });

    socket.on('disconnect', () => {});
  });
}
