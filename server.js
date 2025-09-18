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

// API endpoint
app.post("/api/create-user", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Имя обязательно" });
  }
  res.json({ success: true, user: { name } });
});

// Serve index.html for room routes
app.get("/room/:roomId", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve index.html for all other routes
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
    
    // Leave previous room if any
    if (socket.roomId) {
      socket.leave(socket.roomId);
    }
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        messages: []
      });
    }
    
    const room = rooms.get(roomId);
    room.users.set(socket.id, { userName, socketId: socket.id });
    
    // Notify others in the room
    socket.to(roomId).emit("user-connected", { userName, socketId: socket.id });
    
    console.log(`Комната ${roomId} теперь содержит ${room.users.size} пользователей`);
  });

  // WebRTC signaling
  socket.on("offer", (data) => {
    console.log('Offer от', socket.id, 'в комнату', data.roomId);
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      sender: socket.id,
      senderName: socket.userName
    });
  });

  socket.on("answer", (data) => {
    console.log('Answer от', socket.id, 'в комнату', data.roomId);
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      sender: socket.id,
      senderName: socket.userName
    });
  });

  socket.on("ice-candidate", (data) => {
    console.log('ICE candidate от', socket.id, 'в комнату', data.roomId);
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
        
        // Broadcast to all users in the room
        io.to(socket.roomId).emit("chat-message", message);
        console.log(`Сообщение в комнате ${socket.roomId}: ${socket.userName}: ${data.message}`);
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
        
        // Notify others in the room
        socket.to(socket.roomId).emit("user-disconnected", {
          socketId: socket.id,
          userName: socket.userName
        });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(socket.roomId);
          console.log(`Комната ${socket.roomId} удалена (пустая)`);
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
  console.log(`📡 WebRTC Messenger готов: http://localhost:${PORT}`);
});