const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoint
app.post("/api/create-user", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Имя обязательно" });
  }
  res.json({ success: true, user: { name } });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Socket.IO
io.on("connection", (socket) => {
  console.log("✅ Новый клиент подключился:", socket.id);

  socket.on('join-room', (roomId, username) => {
    console.log(`Пользователь ${username} присоединяется к комнате ${roomId}`);
    
    // Leave previous room if any
    if (socket.roomId) {
      socket.leave(socket.roomId);
    }
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    
    // Store user info
    users.set(socket.id, { username, roomId, socketId: socket.id });
    
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
    socket.to(roomId).emit('user-joined', { 
      username, 
      socketId: socket.id 
    });
    
    console.log(`Комната ${roomId} теперь содержит ${room.users.size} пользователей`);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Offer от', socket.id, 'к', data.target);
    if (data.target === 'all') {
      // Отправляем всем в комнате кроме отправителя
      socket.to(socket.roomId).emit('offer', {
        offer: data.offer,
        sender: socket.id,
        senderName: socket.username
      });
    } else {
      socket.to(data.target).emit('offer', {
        offer: data.offer,
        sender: socket.id,
        senderName: socket.username
      });
    }
  });

  socket.on('answer', (data) => {
    console.log('Answer от', socket.id, 'к', data.target);
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id,
      senderName: socket.username
    });
  });

  socket.on('ice-candidate', (data) => {
    console.log('ICE candidate от', socket.id, 'к', data.target);
    if (data.target === 'all') {
      // Отправляем всем в комнате кроме отправителя
      socket.to(socket.roomId).emit('ice-candidate', {
        candidate: data.candidate,
        sender: socket.id,
        senderName: socket.username
      });
    } else {
      socket.to(data.target).emit('ice-candidate', {
        candidate: data.candidate,
        sender: socket.id,
        senderName: socket.username
      });
    }
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
        console.log(`Сообщение в комнате ${socket.roomId}: ${socket.username}: ${data.message}`);
      }
    }
  });

  // Handle call initiation
  socket.on('call-user', (data) => {
    console.log('Звонок от', socket.id, 'к', data.target);
    socket.to(data.target).emit('call-user', {
      caller: socket.id,
      callerName: socket.username
    });
  });

  socket.on('call-accepted', (data) => {
    console.log('Звонок принят', socket.id, 'от', data.caller);
    socket.to(data.caller).emit('call-accepted', {
      callee: socket.id,
      calleeName: socket.username
    });
  });

  socket.on('call-rejected', (data) => {
    console.log('Звонок отклонен', socket.id, 'от', data.caller);
    socket.to(data.caller).emit('call-rejected', {
      callee: socket.id,
      calleeName: socket.username
    });
  });

  socket.on('end-call', () => {
    console.log('Звонок завершен', socket.id);
    socket.to(socket.roomId).emit('call-ended', {
      endedBy: socket.id,
      endedByName: socket.username
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log("❌ Клиент отключился:", socket.id);
    
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
          console.log(`Комната ${socket.roomId} удалена (пустая)`);
        }
      }
    }
    
    users.delete(socket.id);
  });
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 WebRTC Messenger готов: http://localhost:${PORT}`);
});