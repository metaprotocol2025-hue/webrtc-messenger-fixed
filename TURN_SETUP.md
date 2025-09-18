# Настройка TURN-серверов для WebRTC

## 🎯 Зачем нужны TURN-серверы

TURN-серверы необходимы для:
- **NAT-траверсал:** Обход ограничений роутеров и файрволов
- **Мобильный интернет:** Работа между Wi-Fi и 4G/5G сетями
- **Корпоративные сети:** Обход корпоративных файрволов
- **Надёжность:** Резервный канал связи

## 🔧 Настройка в config.js

### 1. Metered.ca (бесплатно для тестов)
```javascript
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};
```

### 2. Twilio TURN (платно, но надёжно)
```javascript
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:global.turn.twilio.com:3478?transport=udp",
      username: "YOUR_TWILIO_USERNAME",
      credential: "YOUR_TWILIO_CREDENTIAL"
    },
    {
      urls: "turn:global.turn.twilio.com:3478?transport=tcp",
      username: "YOUR_TWILIO_USERNAME",
      credential: "YOUR_TWILIO_CREDENTIAL"
    }
  ]
};
```

### 3. Xirsys TURN (платно)
```javascript
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:YOUR_XIRSYS_DOMAIN:3478",
      username: "YOUR_XIRSYS_USERNAME",
      credential: "YOUR_XIRSYS_CREDENTIAL"
    }
  ]
};
```

### 4. Собственный coturn сервер
```javascript
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:YOUR_DOMAIN:3478",
      username: "YOUR_USERNAME",
      credential: "YOUR_PASSWORD"
    }
  ]
};
```

## 🚀 Установка собственного coturn сервера

### Ubuntu/Debian:
```bash
# Установка coturn
sudo apt update
sudo apt install coturn

# Настройка
sudo nano /etc/turnserver.conf
```

### Конфигурация coturn:
```ini
# Основные настройки
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=YOUR_SERVER_IP

# Аутентификация
user=username:password
realm=yourdomain.com

# Логирование
log-file=/var/log/turn.log
verbose

# Безопасность
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1
```

### Запуск:
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

## 🔍 Тестирование TURN-сервера

### 1. Проверка доступности:
```bash
# Проверка портов
telnet YOUR_TURN_SERVER 3478
telnet YOUR_TURN_SERVER 5349
```

### 2. Тест в браузере:
```javascript
const testTurn = async () => {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'turn:YOUR_TURN_SERVER:3478', username: 'USERNAME', credential: 'PASSWORD' }
    ]
  });
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE candidate:', event.candidate.candidate);
      if (event.candidate.candidate.includes('relay')) {
        console.log('✅ TURN сервер работает!');
      }
    }
  };
  
  await pc.createOffer();
  await pc.setLocalDescription(await pc.createOffer());
};

testTurn();
```

### 3. Проверка в WebRTC Inspector:
- Откройте `chrome://webrtc-internals/`
- Запустите видеозвонок
- Проверьте ICE кандидаты на наличие `relay`

## 📊 Мониторинг TURN-сервера

### Логи coturn:
```bash
# Просмотр логов
tail -f /var/log/turn.log

# Статистика
turnadmin -k -u username -r realm -p password
```

### Метрики:
- Количество подключений
- Использование полосы пропускания
- Ошибки аутентификации
- Время отклика

## 🛡️ Безопасность TURN-сервера

### 1. Аутентификация:
```javascript
// Временные учётные данные (рекомендуется)
const getTurnCredentials = async () => {
  const response = await fetch('/api/turn-credentials');
  const { username, credential } = await response.json();
  return { username, credential };
};
```

### 2. Ограничения доступа:
```ini
# В coturn.conf
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

### 3. SSL/TLS:
```ini
# Включение TLS
cert=/path/to/cert.pem
pkey=/path/to/private.key
```

## 💰 Сравнение TURN-провайдеров

| Провайдер | Цена | Надёжность | Поддержка | Рекомендация |
|-----------|------|------------|-----------|--------------|
| Metered.ca | Бесплатно | ⭐⭐⭐ | ⭐⭐ | Для тестов |
| Twilio | $0.35/GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Для продакшена |
| Xirsys | $0.50/GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Для продакшена |
| coturn | Бесплатно | ⭐⭐⭐⭐ | ⭐⭐ | Для собственного сервера |

## 🔄 Переключение TURN-серверов

### В config.js:
```javascript
// Раскомментируйте нужную конфигурацию
window.ICE_CONFIG = ICE_CONFIG;        // Metered.ca
// window.ICE_CONFIG = TWILIO_CONFIG;  // Twilio
// window.ICE_CONFIG = XIRSYS_CONFIG;  // Xirsys
// window.ICE_CONFIG = COTURN_CONFIG;  // Собственный coturn
```

### Динамическое переключение:
```javascript
// Загрузка конфигурации с сервера
const loadTurnConfig = async () => {
  const response = await fetch('/api/turn-config');
  const config = await response.json();
  return config;
};
```

## 🎯 Рекомендации

1. **Для разработки:** Используйте Metered.ca (бесплатно)
2. **Для продакшена:** Twilio или Xirsys
3. **Для корпоративного использования:** Собственный coturn
4. **Для высокой нагрузки:** Несколько TURN-серверов

## 🚨 Устранение проблем

### TURN-сервер недоступен:
- Проверьте интернет-соединение
- Убедитесь, что порты 3478 и 5349 открыты
- Проверьте учётные данные

### Медленное соединение:
- Используйте TURN-сервер ближе к пользователям
- Проверьте загрузку сервера
- Рассмотрите CDN для TURN

### Ошибки аутентификации:
- Проверьте username/password
- Убедитесь, что учётные данные не истекли
- Проверьте формат учётных данных
