#!/usr/bin/env node

// Скрипт для обновления config.js с IP адресом TURN-сервера
// Использование: node update-config.js <IP-ADDRESS>

const fs = require('fs');
const path = require('path');

const turnServerIP = process.argv[2];

if (!turnServerIP) {
  console.error('❌ Ошибка: Укажите IP адрес TURN-сервера');
  console.log('Использование: node update-config.js <IP-ADDRESS>');
  console.log('Пример: node update-config.js 123.456.789.012');
  process.exit(1);
}

// Проверяем формат IP адреса
const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
if (!ipRegex.test(turnServerIP)) {
  console.error('❌ Ошибка: Неверный формат IP адреса');
  process.exit(1);
}

const configPath = path.join(__dirname, 'config.js');

// Читаем текущий config.js
let configContent;
try {
  configContent = fs.readFileSync(configPath, 'utf8');
} catch (error) {
  console.error('❌ Ошибка: Не удалось прочитать config.js');
  process.exit(1);
}

// Обновляем IP адрес в конфигурации
const updatedConfig = configContent.replace(
  /urls: "turn:.*?:3478"/g,
  `urls: "turn:${turnServerIP}:3478"`
);

// Создаем резервную копию
const backupPath = configPath + '.backup';
fs.writeFileSync(backupPath, configContent);
console.log(`📋 Создана резервная копия: ${backupPath}`);

// Записываем обновленную конфигурацию
fs.writeFileSync(configPath, updatedConfig);

console.log('✅ config.js успешно обновлен!');
console.log(`🌐 TURN-сервер: turn:${turnServerIP}:3478`);
console.log('👤 Пользователь: webrtc');
console.log('🔑 Пароль: strongpassword');
console.log('🏠 Realm: myturn.local');

// Показываем обновленную конфигурацию
console.log('\n📄 Обновленная конфигурация:');
const lines = updatedConfig.split('\n');
const startLine = lines.findIndex(line => line.includes('iceServers:'));
const endLine = lines.findIndex((line, index) => index > startLine && line.includes('];'));

if (startLine !== -1 && endLine !== -1) {
  console.log(lines.slice(startLine, endLine + 1).join('\n'));
}
