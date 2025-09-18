@echo off
REM Автоматическая настройка TURN-сервера на VPS
REM Использование: setup-remote-turn.bat <IP_ADDRESS>

set VPS_IP=%1

if "%VPS_IP%"=="" (
    echo ❌ Ошибка: Укажите IP адрес VPS
    echo Использование: setup-remote-turn.bat <IP_ADDRESS>
    echo Пример: setup-remote-turn.bat 123.456.789.012
    pause
    exit /b 1
)

echo 🚀 Настройка TURN-сервера на VPS %VPS_IP%
echo.

REM Проверяем наличие SSH ключа
if not exist turn-server-key.pem (
    echo ❌ SSH ключ не найден: turn-server-key.pem
    echo Сначала запустите: deploy-oracle-turn.bat
    pause
    exit /b 1
)

echo ✅ SSH ключ найден
echo.

echo 🔧 Подключение к VPS и настройка TURN-сервера...
echo.

REM Создаем скрипт для выполнения на VPS
echo @echo off > temp_setup.bat
echo echo 🚀 Настройка TURN-сервера на VPS... >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo 📦 Обновляем систему... >> temp_setup.bat
echo sudo apt update ^&^& sudo apt upgrade -y >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo 🔧 Устанавливаем coturn... >> temp_setup.bat
echo sudo apt install -y coturn >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo ⚙️ Настраиваем coturn... >> temp_setup.bat
echo echo # TURN Server Configuration > /tmp/turnserver.conf >> temp_setup.bat
echo echo listening-port=3478 >> /tmp/turnserver.conf >> temp_setup.bat
echo echo tls-listening-port=5349 >> /tmp/turnserver.conf >> temp_setup.bat
echo echo listening-ip=0.0.0.0 >> /tmp/turnserver.conf >> temp_setup.bat
echo echo external-ip=%VPS_IP% >> /tmp/turnserver.conf >> temp_setup.bat
echo echo user=webrtc:strongpassword >> /tmp/turnserver.conf >> temp_setup.bat
echo echo realm=myturn.local >> /tmp/turnserver.conf >> temp_setup.bat
echo echo fingerprint >> /tmp/turnserver.conf >> temp_setup.bat
echo echo lt-cred-mech >> /tmp/turnserver.conf >> temp_setup.bat
echo echo log-file=/var/log/turn.log >> /tmp/turnserver.conf >> temp_setup.bat
echo echo verbose >> /tmp/turnserver.conf >> temp_setup.bat
echo echo no-multicast-peers >> /tmp/turnserver.conf >> temp_setup.bat
echo echo no-cli >> /tmp/turnserver.conf >> temp_setup.bat
echo echo no-tlsv1 >> /tmp/turnserver.conf >> temp_setup.bat
echo echo no-tlsv1_1 >> /tmp/turnserver.conf >> temp_setup.bat
echo echo no-dtls >> /tmp/turnserver.conf >> temp_setup.bat
echo echo no-tls >> /tmp/turnserver.conf >> temp_setup.bat
echo sudo cp /tmp/turnserver.conf /etc/turnserver.conf >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo 🔄 Включаем автозапуск... >> temp_setup.bat
echo sudo systemctl enable coturn >> temp_setup.bat
echo sudo systemctl start coturn >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo 🔥 Настраиваем файрвол... >> temp_setup.bat
echo sudo ufw allow 3478/udp >> temp_setup.bat
echo sudo ufw allow 5349/tcp >> temp_setup.bat
echo sudo ufw allow 443/tcp >> temp_setup.bat
echo sudo ufw --force enable >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo ✅ Проверяем статус... >> temp_setup.bat
echo sudo systemctl status coturn --no-pager >> temp_setup.bat
echo echo. >> temp_setup.bat
echo echo 🎉 TURN-сервер настроен! >> temp_setup.bat
echo echo IP: %VPS_IP% >> temp_setup.bat
echo echo Порт: 3478 ^(UDP^) >> temp_setup.bat
echo echo TLS Порт: 5349 ^(TCP^) >> temp_setup.bat
echo echo Пользователь: webrtc >> temp_setup.bat
echo echo Пароль: strongpassword >> temp_setup.bat
echo echo Realm: myturn.local >> temp_setup.bat

echo 📤 Копируем скрипт на VPS...
scp -i turn-server-key.pem temp_setup.bat ubuntu@%VPS_IP%:/home/ubuntu/

echo 🚀 Запускаем настройку на VPS...
ssh -i turn-server-key.pem ubuntu@%VPS_IP% "chmod +x temp_setup.bat && ./temp_setup.bat"

echo.
echo 🔄 Обновление конфигурации WebRTC...
node update-config.js %VPS_IP%

echo.
echo 🎉 TURN-сервер на Oracle Cloud настроен!
echo.
echo 📋 Информация:
echo    IP: %VPS_IP%
echo    Порт: 3478 (UDP)
echo    TLS Порт: 5349 (TCP)
echo    Пользователь: webrtc
echo    Пароль: strongpassword
echo    Realm: myturn.local
echo.
echo 🧪 Тестирование:
echo    1. Запустите: npm start
echo    2. Откройте http://localhost:3000
echo    3. Проверьте консоль браузера на TURN кандидаты
echo    4. Протестируйте с мобильного устройства
echo.

REM Удаляем временный файл
del temp_setup.bat

pause
