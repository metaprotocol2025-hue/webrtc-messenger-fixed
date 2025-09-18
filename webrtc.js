let localStream;
let remoteStream;
let peerConnection;
let socket;
let currentRoom;
let currentName;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

async function init() {
  socket = io("/", { transports: ["websocket"] });

  // Получаем камеру/микрофон
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    log("✅ Камера и микрофон подключены");
  } catch (err) {
    console.error("Ошибка доступа к камере/микрофону:", err);
  }

  // Слушаем сигналы
  socket.on("offer", handleOffer);
  socket.on("answer", handleAnswer);
  socket.on("ice-candidate", handleCandidate);
  
  // UI обработчики
  setupUI();
}

function setupUI() {
  const joinBtn = document.getElementById('joinBtn');
  const callBtn = document.getElementById('callBtn');
  const endBtn = document.getElementById('endBtn');
  const roomInput = document.getElementById('roomInput');
  const nameInput = document.getElementById('nameInput');
  const sendBtn = document.getElementById('sendBtn');
  const messageInput = document.getElementById('messageInput');
  const roomStatus = document.getElementById('roomStatus');

  joinBtn.onclick = () => {
    const room = roomInput.value.trim();
    const name = nameInput.value.trim();
    
    if (!room || !name) {
      alert('Введите название комнаты и имя');
      return;
    }

    currentRoom = room;
    currentName = name;
    
    socket.emit('join-room', room, name);
    roomStatus.textContent = `В комнате: ${room}`;
    joinBtn.disabled = true;
    callBtn.disabled = false;
    
    log(`Вы вошли в комнату ${room}`);
  };

  callBtn.onclick = () => {
    if (!currentRoom) return;
    startCall();
    callBtn.disabled = true;
    endBtn.disabled = false;
  };

  endBtn.onclick = () => {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteStream = null;
    }
    remoteVideo.srcObject = null;
    
    callBtn.disabled = false;
    endBtn.disabled = true;
    log('Звонок завершен');
  };

  sendBtn.onclick = () => {
    const message = messageInput.value.trim();
    if (!message || !currentRoom) return;
    
    socket.emit('chat-message', {
      roomId: currentRoom,
      message: message,
      userName: currentName
    });
    
    addMessage(currentName, message);
    messageInput.value = '';
  };

  messageInput.onkeypress = (e) => {
    if (e.key === 'Enter') sendBtn.onclick();
  };

  // Socket события
  socket.on('user-connected', (data) => {
    log(`${data.userName} присоединился`);
  });

  socket.on('user-disconnected', (data) => {
    log(`${data.userName} покинул комнату`);
  });

  socket.on('chat-message', (data) => {
    addMessage(data.userName, data.message);
  });
}

function addMessage(sender, message) {
  const div = document.createElement('div');
  div.className = 'message';
  if (sender === 'system') {
    div.className += ' system';
  }
  div.textContent = `${sender}: ${message}`;
  document.getElementById('messages').appendChild(div);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function log(msg) {
  console.log(msg);
  const chat = document.getElementById("messages");
  if (chat) {
    const div = document.createElement("div");
    div.textContent = "system: " + msg;
    chat.appendChild(div);
  }
}

async function createPeerConnection() {
  const config = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  };

  peerConnection = new RTCPeerConnection(config);

  // Поток для удалённых треков
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  // Добавляем локальные треки
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ Добавлен локальный трек:", track.kind);
    });
  }

  // Пришёл удалённый трек
  peerConnection.ontrack = (event) => {
    log("📡 Пришёл трек: " + event.track.kind);
    remoteStream.addTrack(event.track);
    remoteVideo.srcObject = remoteStream;
  };

  // ICE кандидаты
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      log("➡️ Отправлен ICE кандидат");
      socket.emit("ice-candidate", {
        roomId: currentRoom,
        candidate: event.candidate,
        senderName: currentName
      });
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    log("ICE state: " + peerConnection.iceConnectionState);
  };
}

// Начало звонка
async function startCall() {
  await createPeerConnection();
  
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, roomId: currentRoom, senderName: currentName });
  log("📞 Отправлен offer");
}

// Обработка offer
async function handleOffer({ offer, senderName }) {
  log("📥 Получен offer от " + senderName);
  await createPeerConnection();
  
  // Жёстко добавляем свои треки
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ (Offer) Добавлен локальный трек:", track.kind);
    });
  }
  
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer, roomId: currentRoom, senderName: currentName });
  log("📤 Отправлен answer");
}

// Обработка answer
async function handleAnswer({ answer }) {
  log("📥 Получен answer");
  
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  
  // Жёстко добавляем свои треки после setRemoteDescription
  if (localStream && peerConnection.getSenders().length === 0) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ (Answer) Добавлен локальный трек:", track.kind);
    });
  }
}

// Обработка ICE
async function handleCandidate({ candidate }) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    log("✅ Добавлен ICE кандидат");
  } catch (err) {
    console.error("Ошибка ICE:", err);
  }
}

init();