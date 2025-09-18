// Импорт конфигурации ICE серверов
import { rtcConfiguration } from './config.js';

let localStream;
let remoteStream;
let peerConnection;
let socket;
let currentRoom;
let currentName;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Используем конфигурацию из config.js
const ICE_CONFIG = rtcConfiguration;

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
    
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteStream = null;
    }
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
  const messages = document.getElementById("messages");
  if (messages) {
    const div = document.createElement("div");
    div.className = "message system";
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight; // Scroll to bottom
  }
}

async function createPeerConnection() {
  console.log("🔧 Создание RTCPeerConnection с конфигурацией:", ICE_CONFIG);
  
  peerConnection = new RTCPeerConnection(ICE_CONFIG);

  // Поток для удалённых треков
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  // Треки добавляются только в startCall и handleOffer

  // Пришёл удалённый трек
  peerConnection.ontrack = (event) => {
    console.log("📡 Пришёл трек:", event.track.kind);

    if (event.track.kind === "video") {
      // Видео кидаем в remoteVideo
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        console.log("✅ Установлено удалённое ВИДЕО");
        log("✅ Удаленное видео установлено");
      }
    }

    if (event.track.kind === "audio") {
      // Для аудио создаём отдельный элемент
      let audioElem = document.createElement("audio");
      audioElem.srcObject = event.streams[0];
      audioElem.autoplay = true;
      audioElem.controls = false; // чтобы не показывался UI
      audioElem.style.display = "none"; // скрываем
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
  
  // 1. Добавляем ВСЕ треки в RTCPeerConnection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ (Caller) добавил локальный трек:", track.kind);
    });
  }
  
  // 2. Только теперь создаём offer
  const offer = await peerConnection.createOffer();
  console.log("📄 SDP Offer:", offer.sdp);
  log("📞 SDP содержит медиа: " + (offer.sdp.includes('m=audio') ? 'аудио' : 'нет аудио') + 
      ", " + (offer.sdp.includes('m=video') ? 'видео' : 'нет видео'));
  
  // 3. Устанавливаем локальное описание
  await peerConnection.setLocalDescription(offer);
  console.log("✅ Local description установлен");
  
  // 4. Отправляем offer через сигнальный сервер
  socket.emit("offer", { offer, roomId: currentRoom, senderName: currentName });
  log("📞 Отправлен offer");
}

// Обработка offer
async function handleOffer({ offer, senderName }) {
  log("📥 Получен offer от " + senderName);
  console.log("📥 Получен offer от", senderName);
  await createPeerConnection();
  
  // 1. Добавляем ВСЕ треки в RTCPeerConnection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
      console.log("▶️ (Answerer) добавил локальный трек:", track.kind);
    });
  }
  
  // 2. Устанавливаем удаленное описание
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  console.log("✅ Remote description установлен");
  
  // 3. Только теперь создаём answer
  const answer = await peerConnection.createAnswer();
  console.log("📄 SDP Answer:", answer.sdp);
  log("📤 SDP содержит медиа: " + (answer.sdp.includes('m=audio') ? 'аудио' : 'нет аудио') + 
      ", " + (answer.sdp.includes('m=video') ? 'видео' : 'нет видео'));
  
  // 4. Устанавливаем локальное описание
  await peerConnection.setLocalDescription(answer);
  console.log("✅ Local description (answer) установлен");
  
  // 5. Отправляем answer через сигнальный сервер
  socket.emit("answer", { answer, roomId: currentRoom, senderName: currentName });
  log("📤 Отправлен answer");
}

// Обработка answer
async function handleAnswer({ answer }) {
  log("📥 Получен answer");
  console.log("📥 Получен answer");
  
  try {
    // Проверяем состояние соединения перед установкой answer
    if (peerConnection.signalingState === 'have-local-offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("✅ Answer применён");
      log("✅ Answer применён");
    } else {
      console.warn("⚠️ Неожиданное состояние signaling:", peerConnection.signalingState);
      log("⚠️ Неожиданное состояние signaling: " + peerConnection.signalingState);
      
      // Отложенная установка answer через небольшую задержку
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