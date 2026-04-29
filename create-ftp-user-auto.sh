#!/bin/bash

# Автоматическое создание FTP пользователя с генерацией пароля

set -e

SERVER="51.250.97.231"
USER="main"
SSH_KEY="~/.ssh/mainkey"

# Имя пользователя (по умолчанию ftpuser или первый аргумент)
FTP_USERNAME="${1:-ftpuser}"

# Генерируем случайный пароль
FTP_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo "👤 Создаю FTP пользователя: $FTP_USERNAME..."

# Подключаемся к серверу и создаем пользователя
ssh -i $SSH_KEY -l $USER $SERVER bash << ENDSSH
    # Проверяем, существует ли пользователь
    if id "$FTP_USERNAME" &>/dev/null; then
        echo "⚠️  Пользователь $FTP_USERNAME уже существует!"
        exit 1
    fi
    
    echo "➕ Создаю пользователя $FTP_USERNAME..."
    sudo useradd -m -d /home/$FTP_USERNAME -s /bin/bash $FTP_USERNAME
    
    echo "🔑 Устанавливаю пароль для $FTP_USERNAME..."
    echo "$FTP_USERNAME:$FTP_PASSWORD" | sudo chpasswd
    
    echo "📁 Настраиваю права доступа..."
    sudo chmod 755 /home/$FTP_USERNAME
    
    # Создаем папку для загрузок
    sudo mkdir -p /home/$FTP_USERNAME/uploads
    sudo chown $FTP_USERNAME:$FTP_USERNAME /home/$FTP_USERNAME/uploads
    sudo chmod 755 /home/$FTP_USERNAME/uploads
    
    echo "✅ Пользователь $FTP_USERNAME успешно создан!"
ENDSSH

echo ""
echo "✅ FTP пользователь успешно создан!"
echo ""
echo "📋 Данные для подключения:"
echo "   ┌─────────────────────────────────────────┐"
echo "   │  Хост: 51.250.97.231                   │"
echo "   │  Порт: 21                              │"
echo "   │  Пользователь: $FTP_USERNAME            │"
echo "   │  Пароль: $FTP_PASSWORD                  │"
echo "   │  Режим: Пассивный (PASV)               │"
echo "   └─────────────────────────────────────────┘"
echo ""
echo "⚠️  ВАЖНО: Сохраните эти данные в безопасном месте!"
echo ""
echo "🔒 Для изменения пароля выполните:"
echo "   ssh -i ~/.ssh/mainkey main@$SERVER 'echo \"$FTP_USERNAME:новый_пароль\" | sudo chpasswd'"
echo ""




