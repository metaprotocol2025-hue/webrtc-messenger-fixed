// Конфигурация ICE серверов для WebRTC (CommonJS версия)
// Для тестирования без ES6 модулей

const rtcConfiguration = {
  iceServers: [
    // Google STUN серверы (бесплатные)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    
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
    
    // Пример для будущего coturn сервера (раскомментируйте и настройте):
    // {
    //   urls: "turn:my-vps-ip:3478",
    //   username: "webrtc",
    //   credential: "strongpassword"
    // }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "balanced",
  iceTransportPolicy: "all"
};

// Примеры конфигураций для других TURN серверов:

// Twilio TURN (платный, но надёжный)
const twilioConfig = {
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
  bundlePolicy: "balanced",
  iceTransportPolicy: "all"
};

// Xirsys TURN (платный)
const xirsysConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:YOUR_XIRSYS_DOMAIN:3478",
      username: "YOUR_XIRSYS_USERNAME",
      credential: "YOUR_XIRSYS_CREDENTIAL"
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "balanced",
  iceTransportPolicy: "all"
};

// Собственный coturn сервер
const coturnConfig = {
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
  bundlePolicy: "balanced",
  iceTransportPolicy: "all"
};

// Экспорт для CommonJS
module.exports = {
  rtcConfiguration,
  twilioConfig,
  xirsysConfig,
  coturnConfig
};

// Экспорт для ES6 модулей (если поддерживается)
if (typeof module !== 'undefined' && module.exports) {
  module.exports.rtcConfiguration = rtcConfiguration;
  module.exports.twilioConfig = twilioConfig;
  module.exports.xirsysConfig = xirsysConfig;
  module.exports.coturnConfig = coturnConfig;
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
  window.ICE_CONFIG = rtcConfiguration;
  window.TWILIO_CONFIG = twilioConfig;
  window.XIRSYS_CONFIG = xirsysConfig;
  window.COTURN_CONFIG = coturnConfig;
}
