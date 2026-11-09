import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './utils/logger.js';
import { app, allowedOrigins } from './app.js';

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

if (process.env.AUTH_DISABLED === 'true') {
  logger.warn('AUTH_DISABLED=true: every request is treated as a signed-in admin. Local development only!');
}

const PORT = Number(process.env.PORT) || 3001;
// Loopback for local development; Render sets RENDER=true and needs all interfaces.
const HOST = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');

httpServer.listen(PORT, HOST, () => {
  logger.info(`Server listening on http://${HOST}:${PORT}`);
});

export { app, io };
