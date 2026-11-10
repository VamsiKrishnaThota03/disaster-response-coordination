import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './utils/logger.js';
import { app, allowedOrigins } from './app.js';
import { assertSafe, bypassAllowed } from './config/authBypass.js';

// Refuse to open a port when AUTH_DISABLED is set somewhere it must not apply.
// Failing the deploy is far better than serving an unauthenticated admin API.
try {
  assertSafe();
} catch (error) {
  logger.error(error.message);
  process.exit(1);
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins(), methods: ['GET', 'POST'] },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

// Routes emit disaster_updated / report_created / resource_created through this.
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

if (bypassAllowed()) {
  logger.warn(
    'AUTH_DISABLED=true: every request is treated as a signed-in admin. Local development only!'
  );
}

const PORT = Number(process.env.PORT) || 3001;
// Loopback for local development; Render sets RENDER=true and needs all interfaces.
const HOST = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');

httpServer.listen(PORT, HOST, () => {
  logger.info(`Server listening on http://${HOST}:${PORT}`);
});

// Drain in-flight requests and close sockets when the platform replaces the
// container, so a deploy does not surface as dropped WebSocket connections.
function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, io };
