#!/usr/bin/env node

// Скрипт для тестирования TURN-серверов
// Проверяет доступность и работоспособность ICE серверов

const { rtcConfiguration } = require('./config.js');

console.log('🧪 Тестирование TURN-серверов...\n');

// Функция для тестирования TURN-сервера
async function testTurnServer(iceServer) {
  return new Promise((resolve) => {
    console.log(`🔍 Тестируем: ${iceServer.urls}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [iceServer]
    });
    
    let hasRelayCandidate = false;
    let hasHostCandidate = false;
    let hasSrflxCandidate = false;
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate;
        console.log(`   📡 Кандидат: ${candidate}`);
        
        if (candidate.includes('typ relay')) {
          hasRelayCandidate = true;
          console.log(`   ✅ TURN сервер работает! (relay)`);
        } else if (candidate.includes('typ host')) {
          hasHostCandidate = true;
          console.log(`   ✅ Прямое соединение (host)`);
        } else if (candidate.includes('typ srflx')) {
          hasSrflxCandidate = true;
          console.log(`   ✅ STUN работает! (srflx)`);
        }
      } else {
        console.log(`   🏁 ICE gathering завершен`);
        
        if (hasRelayCandidate) {
          console.log(`   🎉 TURN сервер ${iceServer.urls} работает отлично!`);
        } else if (hasSrflxCandidate) {
          console.log(`   ✅ STUN сервер ${iceServer.urls} работает`);
        } else if (hasHostCandidate) {
          console.log(`   ⚠️  Только прямое соединение для ${iceServer.urls}`);
        } else {
          console.log(`   ❌ Сервер ${iceServer.urls} не отвечает`);
        }
        
        pc.close();
        resolve({
          urls: iceServer.urls,
          hasRelay: hasRelayCandidate,
          hasSrflx: hasSrflxCandidate,
          hasHost: hasHostCandidate
        });
      }
    };
    
    pc.onicegatheringstatechange = () => {
      console.log(`   🔄 ICE gathering state: ${pc.iceGatheringState}`);
    };
    
    // Создаем offer для запуска ICE gathering
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
    }).catch(err => {
      console.log(`   ❌ Ошибка создания offer: ${err.message}`);
      pc.close();
      resolve({
        urls: iceServer.urls,
        hasRelay: false,
        hasSrflx: false,
        hasHost: false,
        error: err.message
      });
    });
    
    // Таймаут для тестирования
    setTimeout(() => {
      if (!hasRelayCandidate && !hasSrflxCandidate && !hasHostCandidate) {
        console.log(`   ⏰ Таймаут для ${iceServer.urls}`);
        pc.close();
        resolve({
          urls: iceServer.urls,
          hasRelay: false,
          hasSrflx: false,
          hasHost: false,
          timeout: true
        });
      }
    }, 10000);
  });
}

// Основная функция тестирования
async function testAllServers() {
  console.log('📋 Конфигурация ICE серверов:');
  console.log(JSON.stringify(rtcConfiguration, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');
  
  const results = [];
  
  for (const iceServer of rtcConfiguration.iceServers) {
    const result = await testTurnServer(iceServer);
    results.push(result);
    console.log('\n' + '-'.repeat(40) + '\n');
  }
  
  // Итоговый отчет
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ:');
  console.log('='.repeat(60));
  
  const workingTurnServers = results.filter(r => r.hasRelay);
  const workingStunServers = results.filter(r => r.hasSrflx && !r.hasRelay);
  const workingHostServers = results.filter(r => r.hasHost && !r.hasSrflx && !r.hasRelay);
  const failedServers = results.filter(r => !r.hasRelay && !r.hasSrflx && !r.hasHost);
  
  console.log(`✅ Рабочих TURN серверов: ${workingTurnServers.length}`);
  workingTurnServers.forEach(r => console.log(`   - ${r.urls}`));
  
  console.log(`\n✅ Рабочих STUN серверов: ${workingStunServers.length}`);
  workingStunServers.forEach(r => console.log(`   - ${r.urls}`));
  
  console.log(`\n⚠️  Только прямые соединения: ${workingHostServers.length}`);
  workingHostServers.forEach(r => console.log(`   - ${r.urls}`));
  
  console.log(`\n❌ Недоступных серверов: ${failedServers.length}`);
  failedServers.forEach(r => console.log(`   - ${r.urls}`));
  
  console.log('\n' + '='.repeat(60));
  
  if (workingTurnServers.length > 0) {
    console.log('🎉 ОТЛИЧНО! У вас есть рабочие TURN серверы!');
    console.log('   Видеозвонки через мобильный интернет будут работать.');
  } else if (workingStunServers.length > 0) {
    console.log('⚠️  ВНИМАНИЕ! TURN серверы не работают.');
    console.log('   Видеозвонки будут работать только в одной сети Wi-Fi.');
    console.log('   Для мобильного интернета нужен TURN сервер.');
  } else {
    console.log('❌ КРИТИЧНО! Ни один ICE сервер не работает!');
    console.log('   Проверьте интернет-соединение и настройки файрвола.');
  }
  
  console.log('\n💡 Рекомендации:');
  if (workingTurnServers.length === 0) {
    console.log('   1. Создайте собственный TURN сервер: deploy-turn-server.bat');
    console.log('   2. Или используйте коммерческие TURN серверы (Twilio, Xirsys)');
  }
  console.log('   3. Протестируйте видеозвонки между разными устройствами');
  console.log('   4. Проверьте работу через мобильный интернет');
}

// Запуск тестирования
if (typeof window === 'undefined') {
  // Node.js окружение
  testAllServers().catch(console.error);
} else {
  // Браузерное окружение
  console.log('Запустите этот скрипт в Node.js: node test-turn-servers.js');
}
