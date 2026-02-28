import { io } from 'socket.io-client';

const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
});

if (typeof window !== 'undefined') {
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
}

export default socket;
