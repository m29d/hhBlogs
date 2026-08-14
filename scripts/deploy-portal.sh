#!/bin/bash
set -e

echo "=== Deploying Portal ==="
sudo mkdir -p /var/www/portal
cp /opt/xhblogs-full/portal/index.html /var/www/portal/
cp /opt/xhblogs-full/portal/bg.jpg /var/www/portal/ 2>/dev/null || true
echo "Portal files copied to /var/www/portal/"

echo "=== Configuring Nginx ==="
NGINX_CONF=""
if [ -f /etc/nginx/sites-enabled/default ]; then
    NGINX_CONF="/etc/nginx/sites-enabled/default"
elif [ -f /etc/nginx/conf.d/default.conf ]; then
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
fi

if [ -z "$NGINX_CONF" ]; then
    echo "ERROR: Could not find Nginx config"
    exit 1
fi

echo "Current Nginx config: $NGINX_CONF"

if [ -f /etc/nginx/sites-enabled/hhblog-portal ]; then
    echo "Portal config already exists. Reloading Nginx."
    sudo systemctl reload nginx
    exit 0
fi

sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)"

SSL_CERT=$(grep -oP 'ssl_certificate\s+\K[^;]+' "$NGINX_CONF" | head -1)
SSL_KEY=$(grep -oP 'ssl_certificate_key\s+\K[^;]+' "$NGINX_CONF" | head -1)

echo "SSL cert: $SSL_CERT"
echo "SSL key: $SSL_KEY"

if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    echo "Trying common cert paths..."
    SSL_CERT=$(find /etc/letsencrypt/live -name "fullchain.pem" 2>/dev/null | head -1)
    SSL_KEY=$(find /etc/letsencrypt/live -name "privkey.pem" 2>/dev/null | head -1)
fi

if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    echo "ERROR: Could not find SSL certificates"
    exit 1
fi

cat > /tmp/hhblog-portal.conf << 'ENDPORTAL'
server {
    listen 80;
    server_name hhblog.tech www.hhblog.tech;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name hhblog.tech www.hhblog.tech;

    ssl_certificate __SSL_CERT__;
    ssl_certificate_key __SSL_KEY__;

    root /var/www/portal;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
ENDPORTAL

cat > /tmp/blog-subdomain.conf << 'ENDBLOG'
server {
    listen 80;
    server_name blog.hhblog.tech;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name blog.hhblog.tech;

    ssl_certificate __SSL_CERT__;
    ssl_certificate_key __SSL_KEY__;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
ENDBLOG

sed -i "s|__SSL_CERT__|$SSL_CERT|g" /tmp/hhblog-portal.conf
sed -i "s|__SSL_KEY__|$SSL_KEY|g" /tmp/hhblog-portal.conf
sed -i "s|__SSL_CERT__|$SSL_CERT|g" /tmp/blog-subdomain.conf
sed -i "s|__SSL_KEY__|$SSL_KEY|g" /tmp/blog-subdomain.conf

sudo cp /tmp/hhblog-portal.conf /etc/nginx/sites-enabled/hhblog-portal
sudo cp /tmp/blog-subdomain.conf /etc/nginx/sites-enabled/blog-subdomain

echo "Testing Nginx config..."
if sudo nginx -t 2>&1; then
    echo "Nginx test passed!"
    sudo rm -f "$NGINX_CONF"
    sudo systemctl reload nginx
    echo "SUCCESS: Nginx configured!"
    echo "  hhblog.tech -> Portal (static)"
    echo "  blog.hhblog.tech -> Blog (proxy to 3003)"
else
    echo "Nginx test FAILED! Restoring backup..."
    sudo rm -f /etc/nginx/sites-enabled/hhblog-portal /etc/nginx/sites-enabled/blog-subdomain
    sudo cp "${NGINX_CONF}.bak."* "$NGINX_CONF" 2>/dev/null || true
    sudo systemctl reload nginx
    echo "Backup restored."
fi
