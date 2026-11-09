// Backend base URL. Local dev talks to the local API unless VITE_BACKEND_URL is set.
const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://disaster-response-coordination.onrender.com')
).replace(/\/$/, '');

// Socket.IO client options
const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: Infinity,
  transports: ['websocket', 'polling'],
  path: '/socket.io',
};

export { BACKEND_URL, SOCKET_CONFIG };
