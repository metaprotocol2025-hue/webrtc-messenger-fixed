#!/bin/bash

# Скрипт быстрого развертывания TURN-сервера для Linux/macOS
# Автор: WebRTC Messenger Setup

set -e

echo "🚀 Развертывание TURN-сервера для WebRTC-мессенджера"
echo

# Проверяем наличие Terraform
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform не найден. Установите Terraform:"
    echo "   curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -"
    echo "   sudo apt-add-repository \"deb [arch=amd64] https://apt.releases.hashicorp.com \$(lsb_release -cs) main\""
    echo "   sudo apt-get update && sudo apt-get install terraform"
    exit 1
fi

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Terraform и Node.js найдены"
echo

# Переходим в директорию terraform
cd terraform

# Проверяем наличие terraform.tfvars
if [ ! -f "terraform.tfvars" ]; then
    echo "❌ Файл terraform.tfvars не найден"
    echo "📋 Создайте terraform.tfvars на основе terraform.tfvars.example"
    echo "   и заполните ваши данные Oracle Cloud"
    exit 1
fi

echo "🔧 Инициализация Terraform..."
terraform init

echo "📋 Планирование развертывания..."
terraform plan

echo
echo "⚠️  ВНИМАНИЕ: Это создаст VPS в Oracle Cloud"
echo "   Убедитесь, что у вас есть активный аккаунт Oracle Cloud"
echo
read -p "Продолжить? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Отменено пользователем"
    exit 0
fi

echo "🚀 Создание VPS..."
terraform apply -auto-approve

echo
echo "✅ VPS создан! Получаем IP адрес..."
VPS_IP=$(terraform output -raw instance_public_ip)

echo "🌐 IP адрес VPS: $VPS_IP"
echo

echo "🔧 Настройка TURN-сервера..."
echo "📋 Выполните следующие команды на VPS:"
echo
echo "   ssh -i turn-server-key.pem ubuntu@$VPS_IP"
echo "   wget https://raw.githubusercontent.com/your-username/webrtc-messenger-fixed/master/setup-coturn.sh"
echo "   chmod +x setup-coturn.sh"
echo "   sudo ./setup-coturn.sh"
echo

read -p "TURN-сервер настроен? (y/N): " setup_done
if [[ ! $setup_done =~ ^[Yy]$ ]]; then
    echo "⏳ Настройте TURN-сервер вручную, затем запустите:"
    echo "   node update-config.js $VPS_IP"
    exit 0
fi

echo "🔄 Обновление конфигурации WebRTC..."
cd ..
node update-config.js "$VPS_IP"

echo
echo "🎉 Развертывание завершено!"
echo
echo "📋 Информация о TURN-сервере:"
echo "   IP: $VPS_IP"
echo "   Порт: 3478 (UDP)"
echo "   TLS Порт: 5349 (TCP)"
echo "   Пользователь: webrtc"
echo "   Пароль: strongpassword"
echo "   Realm: myturn.local"
echo
echo "🧪 Тестирование:"
echo "   1. Запустите: npm start"
echo "   2. Откройте http://localhost:3000"
echo "   3. Проверьте консоль браузера на TURN кандидаты"
echo "   4. Протестируйте с мобильного устройства"
echo
echo "📚 Подробная документация: DEPLOYMENT_GUIDE.md"
echo
