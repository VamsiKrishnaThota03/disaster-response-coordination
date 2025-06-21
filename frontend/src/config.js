// Production backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://disaster-response-coordination.onrender.com';

// Socket.IO configuration
const SOCKET_CONFIG = {
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
  agent: false,
  upgrade: true,
  rejectUnauthorized: false,
  path: '/socket.io',
  withCredentials: true
};

// Log the configuration in development
if (import.meta.env.DEV) {
  console.log('Backend URL:', BACKEND_URL);
  console.log('Socket.IO Config:', SOCKET_CONFIG);
}

export { BACKEND_URL, SOCKET_CONFIG }; 