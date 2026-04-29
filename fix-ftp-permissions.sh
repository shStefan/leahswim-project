#!/bin/bash

# Дополнительная настройка прав доступа для FTP пользователя

set -e

SERVER="51.250.97.231"
USER="main"
SSH_KEY="~/.ssh/mainkey"

echo "🔧 Настраиваю права доступа для FTP пользователя..."

ssh -i $SSH_KEY -l $USER $SERVER << 'ENDSSH'
    echo "📦 Устанавливаю ACL (расширенные права доступа)..."
    sudo apt-get install -y acl
    
    echo "🔐 Настраиваю права доступа для ftpuser..."
    
    # Устанавливаем права на /var/www
    sudo chown -R www-data:www-data /var/www
    sudo chmod -R 755 /var/www
    
    # Даем ftpuser права на чтение и запись через ACL
    sudo setfacl -R -m u:ftpuser:rwx /var/www
    sudo setfacl -R -d -m u:ftpuser:rwx /var/www
    
    # Добавляем ftpuser в группу www-data для дополнительного доступа
    sudo usermod -a -G www-data ftpuser
    
    echo "✅ Права доступа настроены!"
    echo ""
    echo "📋 Проверяю конфигурацию..."
    sudo getfacl /var/www | head -10
ENDSSH

echo ""
echo "✅ Настройка прав завершена!"




