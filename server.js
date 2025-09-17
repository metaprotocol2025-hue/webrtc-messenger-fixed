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
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Middleware
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

// Socket.IO
io.on("connection", (socket) => {
  console.log("✅ Новый клиент подключился:", socket.id);

  socket.on("join-room", (roomId, userName) => {
    socket.join(roomId);
    console.log(`${userName} вошёл в комнату ${roomId}`);
    socket.to(roomId).emit("user-connected", userName);
  });

  socket.on("message", (roomId, message) => {
    socket.to(roomId).emit("message", message);
  });

  socket.on("disconnect", () => {
    console.log("❌ Клиент отключился:", socket.id);
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