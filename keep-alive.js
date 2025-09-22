// Внешний keep-alive скрипт для Render
// Запускается отдельно для поддержания активности приложения

const fetch = require('node-fetch');

const RENDER_URL = process.env.RENDER_URL || 'https://webrtc-messenger-fixed.onrender.com';
const PING_INTERVAL = 5 * 60 * 1000; // 5 минут

console.log('💓 Keep-alive скрипт запущен для:', RENDER_URL);

async function pingServer() {
  try {
    const response = await fetch(`${RENDER_URL}/api/ping`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Ping успешен:', data.timestamp);
    } else {
      console.log('⚠️ Ping неуспешен:', response.status);
    }
  } catch (error) {
    console.log('❌ Ошибка ping:', error.message);
  }
}

// Пинг каждые 5 минут
setInterval(pingServer, PING_INTERVAL);

// Первый пинг сразу
pingServer();

console.log(`💓 Keep-alive будет отправлять ping каждые ${PING_INTERVAL / 1000} секунд`);


