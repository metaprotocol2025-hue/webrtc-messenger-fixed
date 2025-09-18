// Конфигурация ICE серверов для WebRTC
// Этот файл можно легко изменить для использования разных TURN серверов

const ICE_CONFIG = {
  iceServers: [
    // Google STUN серверы (бесплатные)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    
    // Metered.ca TURN серверы (бесплатные для тестов)
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
    {
      urls: "turn:openrelay.metered.ca:80?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Примеры конфигураций для других TURN серверов:

// Twilio TURN (платный, но надёжный)
const TWILIO_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:global.turn.twilio.com:3478?transport=udp",
      username: "YOUR_TWILIO_USERNAME",
      credential: "YOUR_TWILIO_CREDENTIAL"
    },
    {
      urls: "turn:global.turn.twilio.com:3478?transport=tcp",
      username: "YOUR_TWILIO_USERNAME",
      credential: "YOUR_TWILIO_CREDENTIAL"
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Xirsys TURN (платный)
const XIRSYS_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:YOUR_XIRSYS_DOMAIN:3478",
      username: "YOUR_XIRSYS_USERNAME",
      credential: "YOUR_XIRSYS_CREDENTIAL"
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Собственный coturn сервер
const COTURN_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:YOUR_COTURN_DOMAIN:3478",
      username: "YOUR_COTURN_USERNAME",
      credential: "YOUR_COTURN_PASSWORD"
    },
    {
      urls: "turn:YOUR_COTURN_DOMAIN:3478?transport=tcp",
      username: "YOUR_COTURN_USERNAME",
      credential: "YOUR_COTURN_PASSWORD"
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Экспортируем активную конфигурацию
// Измените эту строку для использования другого TURN сервера
window.ICE_CONFIG = ICE_CONFIG;

// Для использования другого сервера, раскомментируйте нужную строку:
// window.ICE_CONFIG = TWILIO_CONFIG;
// window.ICE_CONFIG = XIRSYS_CONFIG;
// window.ICE_CONFIG = COTURN_CONFIG;
