import { io } from 'socket.io-client';

const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  withCredentials: true
});

if (typeof window !== 'undefined') {
  socket.on('connect', () => {
    console.log('[CLIENT] Socket connected:', socket.id);
    if (socket.io.engine) {
      console.log('[CLIENT] Transport:', socket.io.engine.transport.name);
    }
  });

  socket.io.on('open', () => {
    socket.io.engine.on('upgrade', (transport) => {
      console.log('[CLIENT] Transport upgraded to:', transport.name);
    });
  });

  socket.on('connect_error', (error) => {
    console.error('[CLIENT] Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('[CLIENT] Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
}

export default socket;
