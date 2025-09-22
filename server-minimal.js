const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store rooms
const rooms = new Map();

// Socket.IO
io.on("connection", (socket) => {
  console.log("✅ Новый клиент:", socket.id);

  socket.on("join-room", (roomId, userName) => {
    console.log(`${userName} присоединяется к комнате ${roomId}`);
    
    if (socket.roomId) {
      socket.leave(socket.roomId);
    }
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Map(), messages: [] });
    }
    
    const room = rooms.get(roomId);
    room.users.set(socket.id, { userName, socketId: socket.id });
    
    socket.to(roomId).emit("user-connected", { userName, socketId: socket.id });
    console.log(`Комната ${roomId} содержит ${room.users.size} пользователей`);
  });

  // WebRTC signaling
  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      sender: socket.id,
      senderName: socket.userName
    });
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      sender: socket.id,
      senderName: socket.userName
    });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate,
      sender: socket.id,
      senderName: socket.userName
    });
  });

  // Chat messages
  socket.on("chat-message", (data) => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        const message = {
          id: Date.now(),
          userName: socket.userName,
          message: data.message,
          timestamp: new Date().toISOString()
        };
        
        room.messages.push(message);
        io.to(socket.roomId).emit("chat-message", message);
        console.log(`Сообщение: ${socket.userName}: ${data.message}`);
      }
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ Отключился:", socket.id);
    
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(socket.roomId).emit("user-disconnected", {
          socketId: socket.id,
          userName: socket.userName
        });
        
        if (room.users.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`Комната ${socket.roomId} удалена`);
        }
      }
    }
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
  console.log(`📡 WebRTC Messenger готов`);
});
