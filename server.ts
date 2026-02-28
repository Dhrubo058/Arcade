import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Next from 'next';
import { parse } from 'url';

console.log('Starting custom server...');

const dev = process.env.NODE_ENV !== 'production';
// @ts-ignore - next is callable but TS with NodeNext can be picky about default exports
const app = (Next.default || Next)({ dev });
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
const hostDisconnectTimeouts = new Map();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Remove rooms with no players AND no host for a while
    if ((!room.players || room.players.length === 0) && !io.sockets.sockets.get(room.host)) {
      console.log(`[CLEANUP] Removing empty/abandoned room: ${roomId}`);
      rooms.delete(roomId);
      hostDisconnectTimeouts.delete(roomId);
      continue;
    }

    // Verify host is still connected (with grace period)
    const hostSocket = io.sockets.sockets.get(room.host);
    if (!hostSocket && !hostDisconnectTimeouts.has(roomId)) {
      console.log(`[CLEANUP] Host disconnected for room ${roomId}, starting grace period...`);
      // Give host 10 seconds to reconnect before closing room
      const timeout = setTimeout(() => {
        if (!io.sockets.sockets.get(room.host)) {
          console.log(`[CLEANUP] Grace period expired for room ${roomId}, closing...`);
          io.to(roomId).emit('room-closed');
          rooms.delete(roomId);
          hostDisconnectTimeouts.delete(roomId);
        }
      }, 10000);
      hostDisconnectTimeouts.set(roomId, timeout);
    } else if (hostSocket && hostDisconnectTimeouts.has(roomId)) {
      console.log(`[CLEANUP] Host reconnected for room ${roomId}, clearing grace period.`);
      clearTimeout(hostDisconnectTimeouts.get(roomId));
      hostDisconnectTimeouts.delete(roomId);
    }
  }
}, 30000);

io.on('connection', (socket) => {
  console.log(`[SERVER] New connection: ${socket.id} from ${socket.handshake.address}`);
  console.log(`[SERVER] Transport: ${socket.conn.transport.name}`);

  socket.conn.on('upgrade', (transport) => {
    console.log(`[SERVER] Transport upgraded to: ${transport.name} for ${socket.id}`);
  });

  socket.on('create-room', (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, {
      host: socket.id,
      players: [], // Host is not a player
      game: null
    });
    socket.join(roomId);
    callback({ roomId, players: [] });
  });

  socket.on('join-room', ({ roomId, name }, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.players.length < 4) {
        const isOp = room.players.length === 0; // First player is OP
        const player = { 
          id: socket.id, 
          type: 'controller', 
          name: name || `Player ${room.players.length + 1}`,
          isOp: isOp
        };
        room.players.push(player);
        socket.join(roomId);
        io.to(roomId).emit('player-joined', room.players);
        callback({ success: true, players: room.players, isOp });
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
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      const isOp = player?.isOp;
      const isHost = room.host === socket.id;

      if (isHost || isOp) {
        room.game = game;
        io.to(roomId).emit('game-selected', game);
      }
    }
  });

  socket.on('start-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      const isOp = player?.isOp;
      const isHost = room.host === socket.id;

      if ((isHost || isOp) && room.game) {
        io.to(roomId).emit('game-started', room.game);
      }
    }
  });

  socket.on('kick-player', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const opPlayer = room.players.find(p => p.id === socket.id);
      if (opPlayer?.isOp || room.host === socket.id) {
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
          const kickedPlayer = room.players[playerIndex];
          room.players.splice(playerIndex, 1);
          
          // If kicked player was OP, assign to someone else
          if (kickedPlayer.isOp && room.players.length > 0) {
            room.players[0].isOp = true;
          }

          io.to(playerId).emit('kicked');
          io.to(roomId).emit('player-left', room.players);
        }
      }
    }
  });

  socket.on('transfer-op', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const opPlayer = room.players.find(p => p.id === socket.id);
      if (opPlayer?.isOp || room.host === socket.id) {
        room.players.forEach(p => p.isOp = (p.id === playerId));
        io.to(roomId).emit('player-joined', room.players); // Refresh list
      }
    }
  });

  socket.on('controller-input', ({ roomId, input, state }) => {
    // Broadcast input to the room (host will receive it)
    const room = rooms.get(roomId);
    if (room) {
      // Validate host is still connected before emitting
      const hostSocket = io.sockets.sockets.get(room.host);
      if (!hostSocket) {
        console.log(`[SERVER] Host for room ${roomId} not found, closing room.`);
        io.to(roomId).emit('room-closed');
        rooms.delete(roomId);
        return;
      }

      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        io.to(room.host).emit('player-input', { playerIndex, input, state });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up rooms
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const removedPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        if (room.host === socket.id) {
          // Host disconnected, close room
          io.to(roomId).emit('room-closed');
          rooms.delete(roomId);
        } else {
          // If the disconnected player was OP, assign to someone else
          if (removedPlayer.isOp && room.players.length > 0) {
            room.players[0].isOp = true;
          }
          io.to(roomId).emit('player-left', room.players);
        }
      } else if (room.host === socket.id) {
        // Host disconnected even if not in players array
        io.to(roomId).emit('room-closed');
        rooms.delete(roomId);
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
