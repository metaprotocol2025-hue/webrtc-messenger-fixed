# 🚀 Создание TURN-сервера на Oracle Cloud Free Tier

## 📋 Пошаговая инструкция

### **Шаг 1: Создание аккаунта Oracle Cloud**

1. **Перейдите на [cloud.oracle.com](https://cloud.oracle.com)**
2. **Нажмите "Start for Free"**
3. **Заполните форму регистрации:**
   - Email
   - Пароль
   - Имя и фамилия
   - Номер телефона
   - Страна
4. **Подтвердите email**
5. **Дождитесь активации аккаунта** (может занять несколько минут)

### **Шаг 2: Получение OCID компартмента**

1. **Войдите в Oracle Cloud Console**
2. **Перейдите в Identity & Security → Compartments**
3. **Найдите "Root Compartment"**
4. **Скопируйте OCID** (начинается с `ocid1.compartment.oc1...`)

### **Шаг 3: Настройка API ключей**

1. **Перейдите в Identity & Security → Users**
2. **Выберите вашего пользователя**
3. **В разделе "API Keys" нажмите "Add API Key"**
4. **Выберите "Generate API Key Pair"**
5. **Скачайте приватный ключ** (сохраните как `~/.oci/oci_api_key.pem`)
6. **Скопируйте публичный ключ** в конфигурацию пользователя
7. **Скопируйте Fingerprint** ключа

### **Шаг 4: Настройка terraform.tfvars**

Откройте файл `terraform/terraform.tfvars` и замените:

```hcl
# Регион Oracle Cloud (выберите ближайший)
region = "us-ashburn-1"  # или другой регион

# OCID вашего компартмента (замените на ваш)
compartment_id = "ocid1.compartment.oc1..ВАШ_OCID_ЗДЕСЬ"

# Домен доступности (обычно совпадает с регионом)
availability_domain = "us-ashburn-1"
```

### **Шаг 5: Установка Terraform**

#### Windows (Chocolatey):
```cmd
choco install terraform
```

#### Windows (Scoop):
```cmd
scoop install terraform
```

#### Windows (вручную):
1. Скачайте с [terraform.io/downloads](https://terraform.io/downloads)
2. Распакуйте в папку
3. Добавьте в PATH

### **Шаг 6: Настройка OCI CLI (альтернатива)**

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

### **Шаг 7: Создание VPS**

```bash
# Перейдите в папку terraform
cd terraform

# Инициализация Terraform
terraform init

# Планирование развертывания
terraform plan

# Создание VPS
terraform apply
```

### **Шаг 8: Настройка TURN-сервера**

После создания VPS:

```bash
# Подключитесь к VPS (используйте команду из вывода terraform)
ssh -i turn-server-key.pem ubuntu@YOUR_IP_ADDRESS

# Загрузите скрипт установки
wget https://raw.githubusercontent.com/your-username/webrtc-messenger-fixed/master/setup-coturn.sh
chmod +x setup-coturn.sh

# Запустите установку
sudo ./setup-coturn.sh
```

### **Шаг 9: Обновление конфигурации WebRTC**

```bash
# Вернитесь в корневую папку проекта
cd ..

# Обновите config.js с IP адресом VPS
node update-config.js YOUR_IP_ADDRESS
```

### **Шаг 10: Тестирование**

1. **Откройте WebRTC-мессенджер**
2. **Проверьте консоль браузера** (F12)
3. **Убедитесь, что есть TURN кандидаты** с вашим IP
4. **Протестируйте с мобильного** через 4G/5G

## 🎯 **Результат:**

- ✅ **Бесплатный VPS** на Oracle Cloud (навсегда)
- ✅ **Собственный TURN-сервер** с полным контролем
- ✅ **Стабильные видеозвонки** через мобильный интернет
- ✅ **Высокая надежность** соединений

## 💰 **Стоимость:**

**Oracle Cloud Free Tier включает:**
- 2 VM.Standard.E2.1.Micro (1/8 OCPU, 1GB RAM)
- 100GB блок хранения
- 10TB исходящего трафика
- **Бесплатно навсегда!**

## 🚨 **Устранение проблем:**

### Проблема: "No available domains"
**Решение:** Измените `availability_domain` на доступный в вашем регионе

### Проблема: "Insufficient service limits"
**Решение:** Убедитесь, что у вас есть квоты в выбранном регионе

### Проблема: "Authentication failed"
**Решение:** Проверьте OCID компартмента и API ключи

## 🎉 **Готово!**

После выполнения всех шагов у вас будет собственный TURN-сервер на Oracle Cloud!
