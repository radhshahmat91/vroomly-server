import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGINS, methods: ['GET', 'POST'] },
  });

  // Every socket must present the same BetterAuth JWT used for the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('AUTH_REQUIRED'));
      const user = await authenticateToken(token);
      socket.data.userId = String(user._id);
      return next();
    } catch (err) {
      return next(new Error(err?.code || 'TOKEN_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

export const getIO = () => io;

export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${String(userId)}`).emit(event, payload);
}
