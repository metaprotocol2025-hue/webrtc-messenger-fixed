@echo off
REM Быстрый тест WebRTC-мессенджера

echo 🚀 Быстрый тест WebRTC-мессенджера
echo.

REM Проверяем конфигурацию
echo 📋 Проверяем конфигурацию ICE серверов...
node -e "const config = require('./config-commonjs.js'); console.log('✅ Конфигурация загружена'); console.log('📡 STUN серверов:', config.rtcConfiguration.iceServers.filter(s => s.urls.includes('stun')).length); console.log('🔄 TURN серверов:', config.rtcConfiguration.iceServers.filter(s => s.urls.includes('turn')).length);"

echo.
echo 🌐 Запускаем WebRTC-мессенджер...
echo    Адрес: http://localhost:3000
echo.

REM Запускаем сервер
npm start
