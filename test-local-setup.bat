@echo off
REM Тестирование локальной настройки WebRTC-мессенджера
REM Без создания реального VPS

echo 🧪 Тестирование локальной настройки WebRTC-мессенджера
echo.

REM Проверяем Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не найден. Установите Node.js:
    echo    https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js найден
echo.

REM Проверяем зависимости
echo 📦 Проверяем зависимости...
npm install
if %errorlevel% neq 0 (
    echo ❌ Ошибка установки зависимостей
    pause
    exit /b 1
)

echo ✅ Зависимости установлены
echo.

REM Проверяем конфигурацию
echo 🔧 Проверяем конфигурацию ICE серверов...
node -e "const config = require('./config.js'); console.log('ICE серверы:', JSON.stringify(config.rtcConfiguration.iceServers, null, 2));"
if %errorlevel% neq 0 (
    echo ❌ Ошибка в конфигурации
    pause
    exit /b 1
)

echo ✅ Конфигурация корректна
echo.

REM Запускаем сервер
echo 🚀 Запускаем WebRTC-мессенджер...
echo.
echo 📋 Информация:
echo    - Локальный адрес: http://localhost:3000
echo    - TURN серверы: Metered.ca (тестовые)
echo    - STUN серверы: Google
echo.
echo ⚠️  Для тестирования с мобильного интернета нужен реальный TURN-сервер
echo    Используйте deploy-turn-server.bat для создания VPS
echo.

echo 🌐 Открываем браузер...
start http://localhost:3000

echo.
echo 🎉 WebRTC-мессенджер запущен!
echo    Нажмите Ctrl+C для остановки
echo.

npm start


