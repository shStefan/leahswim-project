#!/bin/bash

# Скрипт для создания FTP пользователя на удаленном сервере

set -e

SERVER="51.250.97.231"
USER="main"
SSH_KEY="~/.ssh/mainkey"

if [ -z "$1" ]; then
    echo "❌ Ошибка: Укажите имя пользователя"
    echo "Использование: ./create-ftp-user.sh <имя_пользователя>"
    exit 1
fi

FTP_USERNAME="$1"

echo "👤 Создаю FTP пользователя: $FTP_USERNAME..."

# Подключаемся к серверу и создаем пользователя
ssh -i $SSH_KEY -l $USER $SERVER << ENDSSH
    # Проверяем, существует ли пользователь
    if id "$FTP_USERNAME" &>/dev/null; then
        echo "⚠️  Пользователь $FTP_USERNAME уже существует"
        read -p "Хотите изменить пароль? (y/n) " -n 1 -r
        echo
        if [[ \$REPLY =~ ^[Yy]\$ ]]; then
            sudo passwd $FTP_USERNAME
        fi
    else
        echo "➕ Создаю пользователя $FTP_USERNAME..."
        sudo useradd -m -d /home/$FTP_USERNAME -s /bin/bash $FTP_USERNAME
        echo "🔑 Устанавливаю пароль для $FTP_USERNAME..."
        sudo passwd $FTP_USERNAME
        echo "📁 Настраиваю права доступа..."
        sudo chmod 755 /home/$FTP_USERNAME
        echo "✅ Пользователь $FTP_USERNAME успешно создан!"
    fi
    
    echo ""
    echo "📋 Данные для подключения:"
    echo "   Хост: 51.250.97.231"
    echo "   Порт: 21"
    echo "   Пользователь: $FTP_USERNAME"
    echo "   Режим: Пассивный (PASV)"
    echo ""
ENDSSH

echo "✅ Готово!"





