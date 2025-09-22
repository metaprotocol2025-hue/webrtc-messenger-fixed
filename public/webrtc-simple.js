// Упрощенная версия webrtc.js без ES6 модулей для тестирования
// Использует config-commonjs.js

let localStream;
let remoteStream;
let peerConnection;
let socket;
let currentRoom;
let currentName;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Конфигурация ICE серверов для WebRTC
const ICE_CONFIG = {
  iceServers: [
    // Google STUN серверы (бесплатные)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    
    // Дополнительные STUN серверы
    { urls: "stun:stun.ekiga.net" },
    { urls: "stun:stun.ideasip.com" },
    { urls: "stun:stun.schlund.de" },
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.voiparound.com" },
    { urls: "stun:stun.voipbuster.com" },
    { urls: "stun:stun.voipstunt.com" },
    { urls: "stun:stun.counterpath.com" },
    { urls: "stun:stun.1und1.de" },
    { urls: "stun:stun.gmx.net" },
    
    // Metered.ca TURN серверы (бесплатные для тестов)
    {
      urls: [
        "turn:openrelay.metered.ca:80?transport=udp",
        "turn:openrelay.metered.ca:443?transport=tcp"
      ],
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    
    // Viagenie TURN сервер (дополнительный бесплатный)
    {
      urls: "turn:numb.viagenie.ca",
      username: "webrtc@live.com",
      credential: "muazkh"
    },
    
    // Дополнительные TURN серверы
    {
      urls: "turn:turn.bistri.com:80",
      username: "homeo",
      credential: "homeo"
    },
    {
      urls: "turn:turn.anyfirewall.com:443?transport=tcp",
      username: "webrtc",
      credential: "webrtc"
    },
    {
      urls: "turn:turn.anyfirewall.com:80?transport=udp",
      username: "webrtc",
      credential: "webrtc"
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "balanced",
  iceTransportPolicy: "all"
};

console.log("🔧 Используемая конфигурация ICE:", ICE_CONFIG);

// Автоматическое определение комнаты из URL
function getRoomFromURL() {
  const urlParams = window.location.pathname.split("/");
  let roomId = urlParams.includes("room") ? urlParams.pop() : null;
  
  if (!roomId) {
    // Генерируем новый случайный ID
    roomId = Math.random().toString(36).substr(2, 8);
    // Редиректим на уникальную ссылку
    window.location.href = `/room/${roomId}`;
    return null;
  }
  
  return roomId;
}

async function init() {
  socket = io("/", { transports: ["websocket"] });

  // Получаем камеру/микрофон
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      }, 
      audio: { 
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    localVideo.srcObject = localStream;
    log("✅ Камера и микрофон подключены");
    console.log("📹 Локальные треки:", localStream.getTracks().map(t => t.kind));
  } catch (err) {
    console.error("Ошибка доступа к камере/микрофону:", err);
    log("❌ Ошибка доступа к камере/микрофону: " + err.message);
    alert("Ошибка доступа к камере/микрофону. Проверьте разрешения браузера.");
  }

  // Слушаем сигналы
  socket.on("offer", handleOffer);
  socket.on("answer", handleAnswer);
  socket.on("ice-candidate", handleCandidate);
  
  // UI обработчики
  setupUI();
  
  // Автоматическое подключение к комнате
  const roomId = getRoomFromURL();
  if (roomId) {
    currentRoom = roomId;
    currentName = "Пользователь" + Math.floor(Math.random() * 1000);
    
    // Обновляем поля ввода
    document.getElementById('roomInput').value = roomId;
    document.getElementById('nameInput').value = currentName;
    
    // Автоматически подключаемся к комнате
    socket.emit('join-room', roomId, currentName);
    document.getElementById('joinBtn').disabled = true;
    document.getElementById('callBtn').disabled = false;
    
    log(`🔗 Автоматически подключились к комнате: ${roomId}`);
  }
}

function setupUI() {
  const joinBtn = document.getElementById('joinBtn');
  const callBtn = document.getElementById('callBtn');
  const endBtn = document.getElementById('endBtn');
  const roomInput = document.getElementById('roomInput');
  const nameInput = document.getElementById('nameInput');
  const sendBtn = document.getElementById('sendBtn');
  const messageInput = document.getElementById('messageInput');

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
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localVideo.srcObject = null;
    }

    // Remove dynamically created audio elements
    document.querySelectorAll('audio[data-webrtc-remote]').forEach(audio => audio.remove());
    
    remoteVideo.srcObject = null;
    
    callBtn.disabled = false;
    endBtn.disabled = true;
    log('Звонок завершен');
  };

  // Обработчики чата
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
    playJoinSound();
  });

  socket.on('user-disconnected', (data) => {
    log(`${data.userName} покинул комнату`);
    if (peerConnection) {
      // Завершаем звонок при отключении пользователя
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
      }

      // Remove dynamically created audio elements
      document.querySelectorAll('audio[data-webrtc-remote]').forEach(audio => audio.remove());
      
      remoteVideo.srcObject = null;
      
      callBtn.disabled = false;
      endBtn.disabled = true;
      log('Звонок завершен');
    }
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
  const messages = document.getElementById("messages");
  if (messages) {
    const div = document.createElement("div");
    div.className = "message system";
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
}

function playJoinSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log("🔊 Воспроизведен звук входа в комнату");
  } catch (error) {
    console.log("Не удалось воспроизвести звук:", error);
  }
}

async function createPeerConnection() {
  console.log("🔧 Создание RTCPeerConnection с конфигурацией:", ICE_CONFIG);
  
  peerConnection = new RTCPeerConnection(ICE_CONFIG);

  // Пришёл удалённый трек
  peerConnection.ontrack = (event) => {
    console.log("📡 Пришёл трек:", event.track.kind);

    if (event.track.kind === "video") {
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        console.log("✅ Установлено удалённое ВИДЕО");
        log("✅ Удаленное видео установлено");
      }
    }

    if (event.track.kind === "audio") {
      let audioElem = document.createElement("audio");
      audioElem.srcObject = event.streams[0];
      audioElem.autoplay = true;
      audioElem.controls = false;
      audioElem.style.display = "none";
      audioElem.setAttribute('data-webrtc-remote', 'true');
      document.body.appendChild(audioElem);
      console.log("✅ Установлено удалённое АУДИО");
      log("✅ Удаленное аудио установлено");
    }
  };

  // ICE кандидаты
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("🧊 ICE кандидат:", event.candidate.candidate);
      log("➡️ Отправлен ICE кандидат");
      socket.emit("ice-candidate", {
        roomId: currentRoom,
        candidate: event.candidate,
        senderName: currentName
      });
    } else {
      console.log("🧊 ICE gathering завершён");
      log("✅ ICE gathering завершён");
    }
  };

  // Улучшенное логирование состояний соединения
  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection.iceConnectionState;
    console.log("🧊 ICE connection state:", state);
    log("ICE state: " + state);
    
    if (state === 'connected' || state === 'completed') {
      log("🎉 Соединение установлено!");
    } else if (state === 'failed') {
      log("❌ Соединение не удалось установить");
    } else if (state === 'disconnected') {
      log("⚠️ Соединение разорвано");
    } else if (state === 'checking') {
      log("🔍 Проверка соединения...");
    }
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log("🔗 PeerConnection state:", state);
    log("PeerConnection state: " + state);
    
    if (state === 'connected') {
      log("✅ PeerConnection установлен");
    } else if (state === 'failed') {
      log("❌ PeerConnection не удался");
    } else if (state === 'disconnected') {
      log("⚠️ PeerConnection разорван");
    }
  };

  peerConnection.onsignalingstatechange = () => {
    const state = peerConnection.signalingState;
    console.log("📞 Signaling state:", state);
    log("Signaling state: " + state);
    
    if (state === 'stable') {
      log("✅ Сигналинг стабилен");
    } else if (state === 'have-local-offer') {
      log("📤 Отправлен offer");
    } else if (state === 'have-remote-offer') {
      log("📥 Получен offer");
    } else if (state === 'have-local-pranswer') {
      log("📤 Отправлен pranswer");
    } else if (state === 'have-remote-pranswer') {
      log("📥 Получен pranswer");
    }
  };
}

// Начало звонка
async function startCall() {
  console.log("📞 Начинаем звонок...");
  await createPeerConnection();
  
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ (Caller) добавил локальный трек:", track.kind);
    });
  }
  
  const offer = await peerConnection.createOffer();
  console.log("📄 SDP Offer:", offer.sdp);
  log("📞 SDP содержит медиа: " + (offer.sdp.includes('m=audio') ? 'аудио' : 'нет аудио') + 
      ", " + (offer.sdp.includes('m=video') ? 'видео' : 'нет видео'));
  
  await peerConnection.setLocalDescription(offer);
  console.log("✅ Local description установлен");
  
  socket.emit("offer", { offer, roomId: currentRoom, senderName: currentName });
  log("📞 Отправлен offer");
}

// Обработка offer
async function handleOffer({ offer, senderName }) {
  log("📥 Получен offer от " + senderName);
  console.log("📥 Получен offer от", senderName);
  await createPeerConnection();
  
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ (Answerer) добавил локальный трек:", track.kind);
    });
  }
  
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  console.log("✅ Remote description установлен");
  
  const answer = await peerConnection.createAnswer();
  console.log("📄 SDP Answer:", answer.sdp);
  log("📤 SDP содержит медиа: " + (answer.sdp.includes('m=audio') ? 'аудио' : 'нет аудио') + 
      ", " + (answer.sdp.includes('m=video') ? 'видео' : 'нет видео'));
  
  await peerConnection.setLocalDescription(answer);
  console.log("✅ Local description (answer) установлен");
  
  socket.emit("answer", { answer, roomId: currentRoom, senderName: currentName });
  log("📤 Отправлен answer");
}

// Обработка answer
async function handleAnswer({ answer }) {
  log("📥 Получен answer");
  console.log("📥 Получен answer");
  
  try {
    if (peerConnection.signalingState === 'have-local-offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("✅ Answer применён");
      log("✅ Answer применён");
    } else {
      console.warn("⚠️ Неожиданное состояние signaling:", peerConnection.signalingState);
      log("⚠️ Неожиданное состояние signaling: " + peerConnection.signalingState);
      
      log("⏳ Попытка отложенной установки answer...");
      setTimeout(async () => {
        try {
          if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("✅ Answer применён (отложенно)");
            log("✅ Answer применён (отложенно)");
          } else {
            console.error("❌ Состояние всё ещё неправильное:", peerConnection.signalingState);
            log("❌ Состояние всё ещё неправильное: " + peerConnection.signalingState);
          }
        } catch (err) {
          console.error("❌ Ошибка отложенной установки answer:", err);
          log("❌ Ошибка отложенной установки answer: " + err.message);
        }
      }, 100);
    }
  } catch (err) {
    console.error("❌ Ошибка setRemoteDescription(answer):", err);
    log("❌ Ошибка setRemoteDescription(answer): " + err.message);
  }
}

// Обработка ICE
async function handleCandidate({ candidate }) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log("✅ ICE кандидат добавлен:", candidate.candidate);
    log("✅ Добавлен ICE кандидат");
  } catch (err) {
    console.error("❌ Ошибка ICE:", err);
    log("❌ Ошибка ICE: " + err.message);
  }
}

init();
