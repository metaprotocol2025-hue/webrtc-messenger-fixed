@echo off
REM Скрипт быстрого развертывания TURN-сервера для Windows
REM Автор: WebRTC Messenger Setup

echo 🚀 Развертывание TURN-сервера для WebRTC-мессенджера
echo.

REM Проверяем наличие Terraform
where terraform >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Terraform не найден. Установите Terraform:
    echo    choco install terraform
    echo    или скачайте с https://terraform.io/downloads
    pause
    exit /b 1
)

REM Проверяем наличие Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не найден. Установите Node.js:
    echo    https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Terraform и Node.js найдены
echo.

REM Переходим в директорию terraform
cd terraform

REM Проверяем наличие terraform.tfvars
if not exist terraform.tfvars (
    echo ❌ Файл terraform.tfvars не найден
    echo 📋 Создайте terraform.tfvars на основе terraform.tfvars.example
    echo    и заполните ваши данные Oracle Cloud
    pause
    exit /b 1
)

echo 🔧 Инициализация Terraform...
terraform init
if %errorlevel% neq 0 (
    echo ❌ Ошибка инициализации Terraform
    pause
    exit /b 1
)

echo 📋 Планирование развертывания...
terraform plan
if %errorlevel% neq 0 (
    echo ❌ Ошибка планирования Terraform
    pause
    exit /b 1
)

echo.
echo ⚠️  ВНИМАНИЕ: Это создаст VPS в Oracle Cloud
echo    Убедитесь, что у вас есть активный аккаунт Oracle Cloud
echo.
set /p confirm="Продолжить? (y/N): "
if /i not "%confirm%"=="y" (
    echo Отменено пользователем
    pause
    exit /b 0
)

echo 🚀 Создание VPS...
terraform apply -auto-approve
if %errorlevel% neq 0 (
    echo ❌ Ошибка создания VPS
    pause
    exit /b 1
)

echo.
echo ✅ VPS создан! Получаем IP адрес...
for /f "tokens=2" %%i in ('terraform output -raw instance_public_ip') do set VPS_IP=%%i

echo 🌐 IP адрес VPS: %VPS_IP%
echo.

echo 🔧 Настройка TURN-сервера...
echo 📋 Выполните следующие команды на VPS:
echo.
echo    ssh -i turn-server-key.pem ubuntu@%VPS_IP%
echo    wget https://raw.githubusercontent.com/your-username/webrtc-messenger-fixed/master/setup-coturn.sh
echo    chmod +x setup-coturn.sh
echo    sudo ./setup-coturn.sh
echo.

set /p setup_done="TURN-сервер настроен? (y/N): "
if /i not "%setup_done%"=="y" (
    echo ⏳ Настройте TURN-сервер вручную, затем запустите:
    echo    node update-config.js %VPS_IP%
    pause
    exit /b 0
)

echo 🔄 Обновление конфигурации WebRTC...
cd ..
node update-config.js %VPS_IP%
if %errorlevel% neq 0 (
    echo ❌ Ошибка обновления конфигурации
    pause
    exit /b 1
)

echo.
echo 🎉 Развертывание завершено!
echo.
echo 📋 Информация о TURN-сервере:
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
echo 📚 Подробная документация: DEPLOYMENT_GUIDE.md
echo.

pause


