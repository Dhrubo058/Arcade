import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { parse } from 'url';

console.log('Starting custom server...');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = express();
const httpServer = createServer(server);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

// Health check endpoint for Railway - available immediately
server.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Room state management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`[SERVER] New connection: ${socket.id} from ${socket.handshake.address}`);
  console.log(`[SERVER] Transport: ${socket.conn.transport.name}`);

  socket.conn.on('upgrade', (transport) => {
    console.log(`[SERVER] Transport upgraded to: ${transport.name} for ${socket.id}`);
  });

  socket.on('create-room', (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const initialPlayers = [{ id: socket.id, type: 'host', name: 'Player 1' }];
    rooms.set(roomId, {
      host: socket.id,
      players: initialPlayers,
      game: null
    });
    socket.join(roomId);
    callback({ roomId, players: initialPlayers });
  });

  socket.on('join-room', ({ roomId, name }, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.players.length < 4) {
        const player = { id: socket.id, type: 'controller', name: name || `Player ${room.players.length + 1}` };
        room.players.push(player);
        socket.join(roomId);
        io.to(roomId).emit('player-joined', room.players);
        callback({ success: true, players: room.players });
      } else {
        callback({ success: false, message: 'Room full' });
      }
    } else {
      callback({ success: false, message: 'Room not found' });
    }
  });

  socket.on('get-room-info', (roomId, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      callback({ success: true, players: room.players, game: room.game });
    } else {
      callback({ success: false, message: 'Room not found' });
    }
  });

  socket.on('select-game', ({ roomId, game }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.game = game;
      io.to(roomId).emit('game-selected', game);
    }
  });

  socket.on('start-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id && room.game) {
      io.to(roomId).emit('game-started', room.game);
    }
  });

  socket.on('controller-input', ({ roomId, input, state }) => {
    // Broadcast input to the room (host will receive it)
    const room = rooms.get(roomId);
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      io.to(room.host).emit('player-input', { playerIndex, input, state });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up rooms
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.host === socket.id) {
          // Host disconnected, close room
          io.to(roomId).emit('room-closed');
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('player-left', room.players);
        }
      }
    }
  });
});

app.prepare().then(() => {
  console.log(`Next.js app prepared. Environment: ${process.env.NODE_ENV || 'development'}`);
  
  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  console.log('Next.js handler attached');
}).catch(err => {
  console.error('Error during app.prepare():', err);
  // Don't exit process, keep server running for health checks and socket.io
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`> Server listening on http://0.0.0.0:${port}`);
});
