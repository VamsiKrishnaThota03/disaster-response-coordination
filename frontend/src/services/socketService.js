import io from 'socket.io-client';
import { BACKEND_URL, SOCKET_CONFIG } from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (!this.socket) {
      console.log('Initializing socket connection to:', BACKEND_URL);
      this.socket = io(BACKEND_URL, SOCKET_CONFIG);

      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  addListener(event, callback) {
    const socket = this.getSocket();
    socket.on(event, callback);
    
    // Store the listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeListener(event, callback) {
    const socket = this.getSocket();
    socket.off(event, callback);
    
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  removeAllListeners(event) {
    const socket = this.getSocket();
    socket.off(event);
    
    // Clear stored listeners
    if (this.listeners.has(event)) {
      this.listeners.delete(event);
    }
  }
}

export default new SocketService(); 