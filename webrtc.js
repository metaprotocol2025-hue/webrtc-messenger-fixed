// WebRTC Manager Class
class WebRTCManager {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentRoom = null;
    this.currentName = null;
    this.isInCall = false;
    
    // DOM elements
    this.localVideo = document.getElementById('localVideo');
    this.remoteVideo = document.getElementById('remoteVideo');
    this.roomInput = document.getElementById('roomInput');
    this.nameInput = document.getElementById('nameInput');
    this.joinBtn = document.getElementById('joinBtn');
    this.callBtn = document.getElementById('callBtn');
    this.endBtn = document.getElementById('endBtn');
    this.roomStatus = document.getElementById('roomStatus');
    this.messages = document.getElementById('messages');
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    
    this.init();
  }

  init() {
    this.setupVideoElements();
    this.setupSocket();
    this.setupEventListeners();
    this.testTURNServers();
  }

  async testTURNServers() {
    console.log('🔍 Тестируем TURN серверы...');
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
          }
        ]
      });

      let hasRelay = false;
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Тест ICE: ${event.candidate.type} ${event.candidate.protocol}`);
          if (event.candidate.type === 'relay') {
            hasRelay = true;
            console.log('✅ TURN сервер работает!');
            this.addMessage('system', '✅ TURN серверы доступны');
          }
        } else {
          if (!hasRelay) {
            console.log('❌ TURN серверы недоступны');
            this.addMessage('system', '❌ TURN серверы недоступны');
          }
          pc.close();
        }
      };

      // Создаем dummy offer для тестирования
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch (error) {
      console.error('Ошибка тестирования TURN:', error);
    }
  }

  setupVideoElements() {
    // Настройка для мобильных устройств
    this.localVideo.autoplay = true;
    this.localVideo.playsInline = true;
    this.localVideo.muted = true;
    
    this.remoteVideo.autoplay = true;
    this.remoteVideo.playsInline = true;
  }

  setupSocket() {
    this.socket = io('/', { transports: ['websocket'] });
    
    this.socket.on('connect', () => {
      this.addMessage('system', 'Подключен к серверу');
    });

    this.socket.on('user-connected', (data) => {
      this.addMessage('system', `${data.userName} присоединился`);
    });

    this.socket.on('user-disconnected', (data) => {
      this.addMessage('system', `${data.userName} покинул комнату`);
      if (this.isInCall) {
        this.endCall();
      }
    });

    this.socket.on('offer', (data) => this.handleOffer(data));
    this.socket.on('answer', (data) => this.handleAnswer(data));
    this.socket.on('ice-candidate', (data) => this.handleIceCandidate(data));
    this.socket.on('chat-message', (data) => {
      this.addMessage(data.userName, data.message);
    });
  }

  setupEventListeners() {
    this.joinBtn.onclick = () => this.joinRoom();
    this.callBtn.onclick = () => this.startCall();
    this.endBtn.onclick = () => this.endCall();
    this.sendBtn.onclick = () => this.sendMessage();
    
    this.messageInput.onkeypress = (e) => {
      if (e.key === 'Enter') this.sendMessage();
    };
  }

  async joinRoom() {
    const room = this.roomInput.value.trim();
    const name = this.nameInput.value.trim();
    
    if (!room || !name) {
      alert('Введите название комнаты и имя');
      return;
    }

    this.currentRoom = room;
    this.currentName = name;
    
    try {
      // Оптимизированные настройки для мобильных устройств
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
          this.localVideo.srcObject = this.localStream;
          this.localVideo.muted = true;
          this.localVideo.play().catch(err => console.warn("Автовоспроизведение локального видео заблокировано:", err));
      
      this.addMessage('system', 'Камера подключена');
    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      alert('Ошибка доступа к камере. Проверьте разрешения.');
      return;
    }

    this.socket.emit('join-room', room, name);
    this.roomStatus.textContent = `В комнате: ${room}`;
    this.joinBtn.disabled = true;
    this.callBtn.disabled = false;
    
    this.addMessage('system', `Вы вошли в комнату ${room}`);
  }

  async startCall() {
    if (!this.currentRoom || this.isInCall) return;

    // Закрываем старое соединение если есть
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    try {
      await this.createPeerConnection();
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit("offer", {
        roomId: this.currentRoom,
        offer,
        senderName: this.currentName
      });

      this.isInCall = true;
      this.callBtn.disabled = true;
      this.endBtn.disabled = false;
      this.addMessage("system", "Звонок начат");
    } catch (error) {
      console.error("Ошибка начала звонка:", error);
      this.addMessage("system", "Ошибка начала звонка");
    }
  }

  endCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.remoteStream) {
      this.remoteVideo.srcObject = null;
      this.remoteStream = null;
    }
    
    this.isInCall = false;
    this.callBtn.disabled = false;
    this.endBtn.disabled = true;
    this.addMessage('system', 'Звонок завершен');
  }

  async createPeerConnection() {
    // Режим отладки TURN - принудительно используем только TURN
    const debugMode = true; // Установите false для обычного режима
    
    const config = {
      iceServers: [
        // Google STUN серверы
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        
        // РАБОЧИЕ TURN серверы Metered.ca (бесплатные)
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
        },
        
        // Дополнительные TURN серверы (убраны placeholder креды)
        
        // Дополнительные STUN серверы
        { urls: "stun:stun.ekiga.net" },
        { urls: "stun:stun.ideasip.com" },
        { urls: "stun:stun.schlund.de" },
        { urls: "stun:stun.stunprotocol.org:3478" }
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: debugMode ? 'relay' : 'all',  // 🔥 форсируем TURN в режиме отладки
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Уведомление о режиме отладки
    if (debugMode) {
      console.log('🔥 РЕЖИМ ОТЛАДКИ TURN: принудительно используем только TURN серверы');
      this.addMessage('system', '🔥 Режим отладки TURN: только TURN серверы');
    }

    // Добавляем локальный поток один раз
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Обработка ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate;
        console.log(`ICE candidate: ${candidate.type} ${candidate.protocol} ${candidate.address}:${candidate.port}`);
        
        // Проверяем наличие TURN (relay) кандидатов
        if (candidate.type === 'relay') {
          console.log('✅ TURN сервер работает! Relay candidate получен');
          this.addMessage('system', '✅ TURN сервер подключен');
        } else if (candidate.type === 'srflx') {
          console.log('📡 STUN сервер работает, но TURN не найден');
        } else if (candidate.type === 'host') {
          console.log('🏠 Локальный кандидат');
        }
        
        this.socket.emit('ice-candidate', {
          roomId: this.currentRoom,
          candidate: event.candidate,
          senderName: this.currentName
        });
      } else {
        console.log('ICE gathering завершен');
        this.addMessage('system', 'ICE gathering завершен');
      }
    };

    // Обработка удаленного потока
    this.peerConnection.ontrack = (event) => {
      console.log('✅ Получен удаленный поток!');
      
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.remoteVideo.srcObject = this.remoteStream;
      }
      
      this.remoteStream.addTrack(event.track);
      this.remoteVideo.play().catch(err => console.warn("Автовоспроизведение удалённого видео заблокировано:", err));
      
      this.addMessage('system', 'Видео соединение установлено!');
    };

    // Обработка изменения состояния
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Состояние соединения:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        this.addMessage('system', 'Соединение установлено!');
      } else if (this.peerConnection.connectionState === 'failed') {
        this.addMessage('system', 'Ошибка соединения');
        // Попытка переподключения
        setTimeout(() => {
          if (this.isInCall) {
            this.startCall();
          }
        }, 2000);
      }
    };

    // Обработка ICE соединения
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE состояние:', this.peerConnection.iceConnectionState);
      this.addMessage('system', `ICE: ${this.peerConnection.iceConnectionState}`);
      
      if (this.peerConnection.iceConnectionState === 'connected') {
        this.addMessage('system', '✅ ICE соединение установлено!');
      } else if (this.peerConnection.iceConnectionState === 'failed') {
        this.addMessage('system', '❌ ICE соединение не удалось');
        // Попытка переподключения
        setTimeout(() => {
          if (this.isInCall) {
            this.addMessage('system', '🔄 Попытка переподключения...');
            this.startCall();
          }
        }, 3000);
      } else if (this.peerConnection.iceConnectionState === 'disconnected') {
        this.addMessage('system', '⚠️ ICE соединение разорвано');
      }
    };
  }

  async handleOffer(data) {
    try {
      // Закрываем старое соединение если есть
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      await this.createPeerConnection();

      if (!this.peerConnection.currentRemoteDescription) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit("answer", {
          roomId: this.currentRoom,
          answer,
          senderName: this.currentName
        });

        this.addMessage("system", `Ответ отправлен ${data.senderName}`);
      }
    } catch (error) {
      console.error("Ошибка обработки offer:", error);
    }
  }

  async handleAnswer(data) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        this.addMessage('system', `Ответ получен от ${data.senderName}`);
      }
    } catch (error) {
      console.error('Ошибка обработки answer:', error);
    }
  }

  async handleIceCandidate(data) {
    try {
      if (this.peerConnection && data.candidate) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    } catch (error) {
      console.error("Ошибка ICE:", error);
    }
  }

  sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || !this.currentRoom) return;
    
    this.socket.emit('chat-message', {
      roomId: this.currentRoom,
      message: message,
      userName: this.currentName
    });
    
    this.addMessage(this.currentName, message);
    this.messageInput.value = '';
  }

  addMessage(sender, message) {
    const div = document.createElement('div');
    div.className = 'message';
    if (sender === 'system') {
      div.className += ' system';
    }
    div.textContent = `${sender}: ${message}`;
    this.messages.appendChild(div);
    this.messages.scrollTop = this.messages.scrollHeight;
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  new WebRTCManager();
});