const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("✅ Новый клиент:", socket.id);

  socket.on("join-room", (roomId, userName) => {
    console.log(`${userName} присоединяется к комнате ${roomId}`);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;
    socket.to(roomId).emit("user-connected", { userName, socketId: socket.id });
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
      const message = {
        id: Date.now(),
        userName: socket.userName,
        message: data.message,
        timestamp: new Date().toISOString()
      };
      io.to(socket.roomId).emit("chat-message", message);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ Отключился:", socket.id);
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-disconnected", {
        socketId: socket.id,
        userName: socket.userName
      });
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
