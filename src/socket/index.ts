import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { env } from '@config/env';
import { corsOptions } from '@config/cors';
import { logger } from '@shared/utils/logger';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@shared/types';
import { prisma } from '@database/prisma/client';
// import { registerChatEvents } from './chat.handler'; // CHAT_DISABLED

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
  });

  // ─── JWT Authentication on Handshake ─────────────────────────────────────
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication token required'));

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { isActive: true },
      });
      if (!user?.isActive) return next(new Error('Account is suspended'));
      (socket as Socket & { user: JwtPayload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: JwtPayload }).user;
    logger.info(`Socket connected: ${socket.id} | User: ${user.id}`);

    // Join personal room for targeted notifications
    socket.join(`user:${user.id}`);

    // ── Chat events ───────────────────────────────────────────────────────────
    // registerChatEvents(socket as Socket & { user: JwtPayload }); // CHAT_DISABLED

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
