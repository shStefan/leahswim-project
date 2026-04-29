#!/bin/bash

# Настройка FTP сервера для доступа к основным директориям сервера

set -e

SERVER="51.250.97.231"
USER="main"
SSH_KEY="~/.ssh/mainkey"

echo "🔧 Настраиваю FTP сервер для доступа к основным директориям..."

# Подключаемся к серверу и настраиваем доступ
ssh -i $SSH_KEY -l $USER $SERVER << 'ENDSSH'
    echo "⚙️  Обновляю конфигурацию vsftpd..."
    
    # Создаем файл со списком пользователей без chroot ограничений
    echo "ftpuser" | sudo tee /etc/vsftpd.chroot_list > /dev/null
    
    # Обновляем конфигурацию vsftpd
    sudo tee -a /etc/vsftpd.conf > /dev/null << 'EOF'

# Настройка доступа к основным директориям
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd.chroot_list
allow_writeable_chroot=YES

# Разрешаем доступ к корневой файловой системе
user_sub_token=$USER
local_root=/var/www
EOF
    
    # Проверяем существование пользователя ftpuser
    if id "ftpuser" &>/dev/null; then
        echo "🔄 Обновляю пользователя ftpuser для доступа к основным директориям..."
        
        # Меняем home директорию на /var/www
        sudo usermod -d /var/www ftpuser
        
        # Добавляем пользователя в группу www-data для доступа к файлам
        sudo usermod -a -G www-data ftpuser
        
        # Настраиваем права доступа
        sudo chown -R www-data:www-data /var/www
        sudo chmod -R 755 /var/www
        
        # Разрешаем ftpuser записывать в /var/www
        sudo setfacl -R -m u:ftpuser:rwx /var/www
        sudo setfacl -R -d -m u:ftpuser:rwx /var/www
        
        echo "✅ Пользователь ftpuser обновлен!"
    else
        echo "⚠️  Пользователь ftpuser не найден. Создайте его сначала."
    fi
    
    echo "🔄 Перезапускаю vsftpd..."
    sudo systemctl restart vsftpd
    
    echo "✅ Конфигурация обновлена!"
    echo ""
    echo "📋 Теперь ftpuser имеет доступ к:"
    echo "   - /var/www (все поддиректории)"
    echo "   - /var/www/leahcation"
    echo "   - /var/www/html"
ENDSSH

echo ""
echo "✅ Настройка завершена!"
echo "📝 FTP пользователь теперь имеет доступ к основным директориям сервера"




