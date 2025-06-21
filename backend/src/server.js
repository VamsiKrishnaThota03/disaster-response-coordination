import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Export necessary instances for route handlers
const instances = {
  app,
  httpServer,
  io,
  logger
};

// Import routes
import disasterRoutes from './routes/disasterRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import socialMediaRoutes from './routes/socialMediaRoutes.js';

// Use routes
app.use('/api/disasters', disasterRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/social-media', socialMediaRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('A user connected');

  socket.on('disconnect', () => {
    logger.info('User disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export { app, io }; 