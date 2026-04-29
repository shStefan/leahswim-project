#!/bin/bash

# Финальная настройка FTP для доступа к основным директориям

set -e

SERVER="51.250.97.231"
USER="main"
SSH_KEY="~/.ssh/mainkey"

echo "🔧 Финальная настройка FTP доступа..."

ssh -i $SSH_KEY -l $USER $SERVER << 'ENDSSH'
    echo "⚙️  Обновляю конфигурацию vsftpd..."
    
    # Читаем текущую конфигурацию и убираем local_root, оставляем только chroot_list
    sudo cp /etc/vsftpd.conf /etc/vsftpd.conf.backup2
    
    # Создаем новую конфигурацию без local_root
    sudo tee /etc/vsftpd.conf > /dev/null << 'EOF'
# Базовая конфигурация
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES

# Безопасность - chroot для всех пользователей КРОМЕ указанных в chroot_list
chroot_local_user=YES
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd.chroot_list
allow_writeable_chroot=YES
secure_chroot_dir=/var/run/vsftpd/empty
pam_service_name=vsftpd
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
ssl_enable=NO

# Пассивный режим (для работы через NAT/файрвол)
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
pasv_address=51.250.97.231

# Логирование
xferlog_file=/var/log/vsftpd.log
log_ftp_protocol=YES

# Лимиты
max_clients=50
max_per_ip=5
EOF
    
    # Убеждаемся, что ftpuser в списке исключений из chroot
    echo "ftpuser" | sudo tee /etc/vsftpd.chroot_list > /dev/null
    
    # Проверяем, что home директория ftpuser - /var/www
    if id "ftpuser" &>/dev/null; then
        CURRENT_HOME=$(getent passwd ftpuser | cut -d: -f6)
        if [ "$CURRENT_HOME" != "/var/www" ]; then
            echo "🔄 Обновляю home директорию ftpuser на /var/www..."
            sudo usermod -d /var/www ftpuser
        fi
        echo "✅ Home директория ftpuser: $(getent passwd ftpuser | cut -d: -f6)"
    fi
    
    echo "🔄 Перезапускаю vsftpd..."
    sudo systemctl restart vsftpd
    
    echo "✅ Проверяю статус..."
    sudo systemctl status vsftpd --no-pager | head -5
    
    echo ""
    echo "✅ Конфигурация обновлена!"
    echo "📋 ftpuser теперь имеет доступ ко всей файловой системе"
    echo "   Начальная директория: /var/www"
ENDSSH

echo ""
echo "✅ Финальная настройка завершена!"




