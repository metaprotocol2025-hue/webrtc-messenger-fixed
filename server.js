const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (roomId, username) => {
    console.log(`User ${username} joining room ${roomId}`);
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        messages: []
      });
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, { username, socketId: socket.id });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { username, socketId: socket.id });
    
    // Send room info to the joining user
    socket.emit('room-joined', {
      roomId,
      users: Array.from(room.users.values()),
      messages: room.messages
    });

    console.log(`Room ${roomId} now has ${room.users.size} users`);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Offer received from', socket.id, 'to', data.target);
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id,
      senderName: socket.username
    });
  });

  socket.on('answer', (data) => {
    console.log('Answer received from', socket.id, 'to', data.target);
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id,
      senderName: socket.username
    });
  });

  socket.on('ice-candidate', (data) => {
    console.log('ICE candidate received from', socket.id, 'to', data.target);
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id,
      senderName: socket.username
    });
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        const message = {
          id: Date.now(),
          username: socket.username,
          message: data.message,
          timestamp: new Date().toISOString()
        };
        
        room.messages.push(message);
        
        // Broadcast to all users in the room
        io.to(socket.roomId).emit('chat-message', message);
        console.log(`Chat message in room ${socket.roomId}: ${socket.username}: ${data.message}`);
      }
    }
  });

  // Handle call initiation
  socket.on('call-user', (data) => {
    console.log('Call initiated from', socket.id, 'to', data.target);
    socket.to(data.target).emit('incoming-call', {
      caller: socket.id,
      callerName: socket.username
    });
  });

  socket.on('call-accepted', (data) => {
    console.log('Call accepted by', socket.id, 'from', data.caller);
    socket.to(data.caller).emit('call-accepted', {
      callee: socket.id,
      calleeName: socket.username
    });
  });

  socket.on('call-rejected', (data) => {
    console.log('Call rejected by', socket.id, 'from', data.caller);
    socket.to(data.caller).emit('call-rejected', {
      callee: socket.id,
      calleeName: socket.username
    });
  });

  socket.on('end-call', () => {
    console.log('Call ended by', socket.id);
    socket.to(socket.roomId).emit('call-ended', {
      endedBy: socket.id,
      endedByName: socket.username
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.users.delete(socket.id);
        
        // Notify others in the room
        socket.to(socket.roomId).emit('user-left', {
          socketId: socket.id,
          username: socket.username
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`Room ${socket.roomId} deleted (empty)`);
        }
      }
    }
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebRTC Messenger ready at http://localhost:${PORT}`);
});
