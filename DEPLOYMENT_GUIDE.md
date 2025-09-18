# 🚀 Руководство по развертыванию собственного TURN-сервера

## 📋 Обзор

Это руководство поможет вам создать собственный TURN-сервер на бесплатном VPS (Oracle Cloud Free Tier) для стабильной работы WebRTC-мессенджера через мобильный интернет.

## 🎯 Что мы создадим

- **VPS на Oracle Cloud Free Tier** (бесплатно навсегда)
- **TURN-сервер coturn** с аутентификацией
- **Автоматическая настройка** через Terraform
- **Обновление конфигурации** WebRTC-мессенджера

## 📋 Предварительные требования

1. **Аккаунт Oracle Cloud** (бесплатный)
2. **Terraform** установлен локально
3. **SSH клиент** (PuTTY, OpenSSH, или встроенный в Windows)
4. **Node.js** для обновления конфигурации

## 🔧 Шаг 1: Подготовка Oracle Cloud

### 1.1 Создание аккаунта
1. Перейдите на [Oracle Cloud](https://cloud.oracle.com/)
2. Нажмите "Start for Free"
3. Заполните форму регистрации
4. Подтвердите email

### 1.2 Получение OCID компартмента
1. Войдите в Oracle Cloud Console
2. Перейдите в **Identity & Security** → **Compartments**
3. Скопируйте OCID корневого компартмента (Root Compartment)
4. Сохраните его для Terraform

### 1.3 Настройка API ключей
1. Перейдите в **Identity & Security** → **Users**
2. Выберите вашего пользователя
3. В разделе **API Keys** нажмите **Add API Key**
4. Скачайте приватный ключ (сохраните как `~/.oci/oci_api_key.pem`)
5. Скопируйте публичный ключ в конфигурацию пользователя

## 🏗️ Шаг 2: Настройка Terraform

### 2.1 Установка Terraform
```bash
# Windows (Chocolatey)
choco install terraform

# Windows (Scoop)
scoop install terraform

# Linux/macOS
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

### 2.2 Настройка переменных
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Отредактируйте `terraform.tfvars`:
```hcl
region = "us-ashburn-1"  # Выберите ближайший регион
compartment_id = "ocid1.compartment.oc1..aaaaaaaa..."  # Ваш OCID
availability_domain = "us-ashburn-1"
```

### 2.3 Настройка OCI CLI (альтернатива)
```bash
# Установка OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Настройка
oci setup config
# Введите:
# - OCID пользователя
# - OCID региона
# - Путь к приватному ключу
# - Fingerprint ключа
```

## 🚀 Шаг 3: Создание VPS

### 3.1 Инициализация Terraform
```bash
cd terraform
terraform init
```

### 3.2 Планирование развертывания
```bash
terraform plan
```

### 3.3 Создание VPS
```bash
terraform apply
```

После выполнения вы увидите:
```
Outputs:

instance_public_ip = "123.456.789.012"
ssh_connection = "ssh -i turn-server-key.pem ubuntu@123.456.789.012"
turn_server_info = {
  "public_ip" = "123.456.789.012"
  "turn_port" = "3478"
  "tls_port" = "5349"
  "username" = "webrtc"
  "password" = "strongpassword"
  "realm" = "myturn.local"
}
```

**Сохраните IP адрес!** Он понадобится для настройки WebRTC.

## 🔧 Шаг 4: Настройка TURN-сервера

### 4.1 Подключение по SSH
```bash
# Используйте команду из вывода Terraform
ssh -i turn-server-key.pem ubuntu@YOUR_IP_ADDRESS
```

### 4.2 Загрузка скрипта установки
```bash
# На VPS
wget https://raw.githubusercontent.com/your-username/webrtc-messenger-fixed/master/setup-coturn.sh
chmod +x setup-coturn.sh
```

### 4.3 Запуск установки
```bash
sudo ./setup-coturn.sh
```

Скрипт автоматически:
- Установит coturn
- Настроит конфигурацию
- Откроет необходимые порты
- Запустит сервис

### 4.4 Проверка работы
```bash
# Проверка статуса
sudo systemctl status coturn

# Проверка портов
sudo netstat -tulpn | grep -E ":(3478|5349)"

# Тест подключения
telnet localhost 3478
telnet localhost 5349
```

## 🌐 Шаг 5: Обновление WebRTC-мессенджера

### 5.1 Обновление config.js
```bash
# В директории проекта
node update-config.js YOUR_IP_ADDRESS
```

Например:
```bash
node update-config.js 123.456.789.012
```

### 5.2 Проверка обновления
Откройте `config.js` и убедитесь, что IP адрес обновился:
```javascript
export const rtcConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:123.456.789.012:3478",
      username: "webrtc",
      credential: "strongpassword"
    }
  ],
  iceTransportPolicy: "all"
};
```

### 5.3 Развертывание обновлений
```bash
git add .
git commit -m "Update TURN server configuration"
git push origin master
```

## 🧪 Шаг 6: Тестирование

### 6.1 Локальное тестирование
```bash
# Запуск локально
npm start

# Откройте http://localhost:3000
# Проверьте консоль браузера на наличие TURN кандидатов
```

### 6.2 Тестирование с мобильного
1. Откройте ссылку на мобильном устройстве
2. Включите мобильный интернет (отключите Wi-Fi)
3. Начните видеозвонок
4. Проверьте, что соединение устанавливается

### 6.3 Проверка логов TURN-сервера
```bash
# На VPS
sudo tail -f /var/log/turn.log
```

Ищите сообщения о подключениях:
```
TURN Server ready
```

## 🔍 Диагностика проблем

### Проблема: VPS не создается
**Решение:**
- Проверьте OCID компартмента
- Убедитесь, что у вас есть квоты в регионе
- Проверьте настройки API ключей

### Проблема: Не удается подключиться по SSH
**Решение:**
- Проверьте, что файл `turn-server-key.pem` имеет права 600
- Убедитесь, что Security List разрешает SSH (порт 22)
- Проверьте, что VPS полностью загрузился

### Проблема: TURN-сервер не отвечает
**Решение:**
```bash
# Проверка статуса
sudo systemctl status coturn

# Перезапуск
sudo systemctl restart coturn

# Проверка конфигурации
sudo turnserver --config-file=/etc/turnserver.conf --check-config
```

### Проблема: WebRTC не использует TURN
**Решение:**
- Проверьте, что IP адрес правильный в config.js
- Убедитесь, что порты 3478 и 5349 открыты
- Проверьте логи браузера на ошибки ICE

## 📊 Мониторинг

### Логи TURN-сервера
```bash
# Просмотр логов в реальном времени
sudo tail -f /var/log/turn.log

# Статистика подключений
sudo turnadmin -k -u webrtc -r myturn.local -p strongpassword
```

### Проверка использования ресурсов
```bash
# CPU и память
htop

# Сетевые подключения
sudo netstat -tulpn | grep turn
```

## 💰 Стоимость

**Oracle Cloud Free Tier включает:**
- 2 VM.Standard.E2.1.Micro (1/8 OCPU, 1GB RAM)
- 100GB блок хранения
- 10TB исходящего трафика
- **Бесплатно навсегда!**

## 🔒 Безопасность

### Рекомендации:
1. **Измените пароль TURN** в production
2. **Используйте HTTPS** для WebRTC-мессенджера
3. **Настройте мониторинг** подключений
4. **Регулярно обновляйте** систему

### Смена пароля TURN:
```bash
# На VPS
sudo nano /etc/turnserver.conf
# Измените: user=webrtc:NEW_PASSWORD
sudo systemctl restart coturn
```

## 🎉 Готово!

Теперь у вас есть:
- ✅ Собственный TURN-сервер
- ✅ Стабильные видеозвонки через мобильный интернет
- ✅ Бесплатное решение навсегда
- ✅ Полный контроль над инфраструктурой

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи TURN-сервера
2. Убедитесь, что порты открыты
3. Проверьте конфигурацию WebRTC
4. Создайте issue в репозитории

**Удачного развертывания! 🚀**
