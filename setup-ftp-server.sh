#!/bin/bash

# Скрипт для настройки FTP сервера на удаленном сервере
# Автоматически устанавливает и настраивает vsftpd

set -e

SERVER="51.250.97.231"
USER="main"
SSH_KEY="~/.ssh/mainkey"

echo "🔧 Начинаю настройку FTP сервера на $SERVER..."

# Подключаемся к серверу и настраиваем FTP
ssh -i $SSH_KEY -l $USER $SERVER << 'ENDSSH'
    echo "📦 Обновляю список пакетов..."
    sudo apt-get update -y
    
    echo "📥 Устанавливаю vsftpd (FTP сервер)..."
    sudo apt-get install -y vsftpd
    
    echo "🔒 Создаю резервную копию конфигурации..."
    sudo cp /etc/vsftpd.conf /etc/vsftpd.conf.backup
    
    echo "⚙️  Настраиваю vsftpd..."
    # Создаем новую конфигурацию
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

# Безопасность
chroot_local_user=YES
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
    
    echo "📁 Создаю директорию для FTP пользователей..."
    sudo mkdir -p /var/ftp/pub
    sudo chown root:root /var/ftp
    sudo chmod 755 /var/ftp
    sudo chown $USER:$USER /var/ftp/pub
    
    echo "🔓 Настраиваю пассивные порты в firewall..."
    sudo ufw allow 21/tcp comment 'FTP Control'
    sudo ufw allow 40000:50000/tcp comment 'FTP Passive Ports'
    
    echo "🔄 Перезапускаю vsftpd..."
    sudo systemctl restart vsftpd
    sudo systemctl enable vsftpd
    
    echo "✅ Проверяю статус vsftpd..."
    sudo systemctl status vsftpd --no-pager
    
    echo ""
    echo "✅ FTP сервер успешно настроен!"
    echo "📋 Информация:"
    echo "   - Сервер: 51.250.97.231"
    echo "   - Порт: 21"
    echo "   - Пассивный режим: порты 40000-50000"
    echo ""
    echo "👤 Для создания FTP пользователя выполните:"
    echo "   sudo useradd -m -d /home/ftpuser -s /bin/bash ftpuser"
    echo "   sudo passwd ftpuser"
    echo "   sudo chmod 755 /home/ftpuser"
    echo ""
ENDSSH

echo ""
echo "🎉 Настройка FTP сервера завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Создайте FTP пользователя на сервере"
echo "   2. Убедитесь, что порты 21, 40000-50000 открыты в firewall облачного провайдера"
echo ""





