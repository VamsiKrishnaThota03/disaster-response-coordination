// Production backend URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://disaster-response-coordination.onrender.com';

// Socket.IO configuration
export const SOCKET_CONFIG = {
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
  agent: false,
  upgrade: true,
  rejectUnauthorized: false,
  path: '/socket.io'
}; 