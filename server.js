const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API endpoint
app.post("/api/create-user", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Имя обязательно" });
  }
  res.json({ success: true, user: { name } });
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

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});