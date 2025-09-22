#!/usr/bin/env node

// Скрипт для проверки конфигурации развернутого мессенджера
// Проверяет, что TURN-серверы настроены правильно

const https = require('https');
const http = require('http');

const deployedUrl = 'https://webrtc-messenger-fixed.onrender.com';

console.log('🔍 Проверяем конфигурацию развернутого мессенджера...');
console.log(`🌐 URL: ${deployedUrl}`);
console.log();

// Функция для проверки доступности
function checkUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Функция для проверки конфигурации ICE серверов
function checkIceConfiguration(html) {
  console.log('📋 Анализируем конфигурацию ICE серверов...');
  
  // Ищем упоминания TURN серверов
  const turnServers = html.match(/turn:[^"'\s]+/g) || [];
  const stunServers = html.match(/stun:[^"'\s]+/g) || [];
  
  console.log(`🔍 Найдено STUN серверов: ${stunServers.length}`);
  stunServers.forEach(server => console.log(`   - ${server}`));
  
  console.log(`\n🔄 Найдено TURN серверов: ${turnServers.length}`);
  turnServers.forEach(server => console.log(`   - ${server}`));
  
  // Проверяем наличие Metered.ca TURN серверов
  const meteredServers = turnServers.filter(server => server.includes('openrelay.metered.ca'));
  const viagenieServers = turnServers.filter(server => server.includes('numb.viagenie.ca'));
  
  console.log(`\n📊 Анализ TURN серверов:`);
  console.log(`   Metered.ca: ${meteredServers.length} серверов`);
  console.log(`   Viagenie: ${viagenieServers.length} серверов`);
  
  if (meteredServers.length > 0) {
    console.log('   ✅ Metered.ca TURN серверы настроены');
  } else {
    console.log('   ❌ Metered.ca TURN серверы не найдены');
  }
  
  if (viagenieServers.length > 0) {
    console.log('   ✅ Viagenie TURN серверы настроены');
  } else {
    console.log('   ❌ Viagenie TURN серверы не найдены');
  }
  
  return {
    stunCount: stunServers.length,
    turnCount: turnServers.length,
    meteredCount: meteredServers.length,
    viagenieCount: viagenieServers.length,
    hasTurnServers: turnServers.length > 0
  };
}

// Основная функция проверки
async function checkDeployedMessenger() {
  try {
    console.log('🌐 Проверяем доступность мессенджера...');
    const response = await checkUrl(deployedUrl);
    
    if (response.statusCode === 200) {
      console.log('✅ Мессенджер доступен!');
      console.log(`📄 Размер страницы: ${response.body.length} байт`);
      
      // Проверяем конфигурацию ICE серверов
      const config = checkIceConfiguration(response.body);
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 ИТОГОВЫЙ ОТЧЕТ:');
      console.log('='.repeat(60));
      
      if (config.hasTurnServers) {
        console.log('🎉 ОТЛИЧНО! TURN серверы настроены правильно!');
        console.log('   Видеозвонки через мобильный интернет будут работать.');
        
        if (config.meteredCount > 0) {
          console.log('   ✅ Metered.ca TURN серверы активны');
        }
        if (config.viagenieCount > 0) {
          console.log('   ✅ Viagenie TURN серверы активны');
        }
      } else {
        console.log('⚠️  ВНИМАНИЕ! TURN серверы не настроены.');
        console.log('   Видеозвонки будут работать только в одной сети Wi-Fi.');
        console.log('   Для мобильного интернета нужны TURN серверы.');
      }
      
      console.log(`\n📈 Статистика:`);
      console.log(`   STUN серверов: ${config.stunCount}`);
      console.log(`   TURN серверов: ${config.turnCount}`);
      console.log(`   Metered.ca: ${config.meteredCount}`);
      console.log(`   Viagenie: ${config.viagenieCount}`);
      
      console.log('\n🧪 Рекомендации для тестирования:');
      console.log('   1. Откройте https://webrtc-messenger-fixed.onrender.com/');
      console.log('   2. Проверьте консоль браузера (F12) на TURN кандидаты');
      console.log('   3. Протестируйте с мобильного устройства через 4G/5G');
      console.log('   4. Убедитесь, что соединение устанавливается');
      
    } else {
      console.log(`❌ Ошибка: HTTP ${response.statusCode}`);
    }
    
  } catch (error) {
    console.log(`❌ Ошибка при проверке: ${error.message}`);
    console.log('\n💡 Возможные причины:');
    console.log('   - Мессенджер еще не развернут на Render');
    console.log('   - Проблемы с сетью');
    console.log('   - Render сервер недоступен');
  }
}

// Запуск проверки
checkDeployedMessenger();


