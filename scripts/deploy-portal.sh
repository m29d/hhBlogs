#!/bin/bash
set -e

echo "=== Deploying Portal ==="
sudo mkdir -p /var/www/portal
sudo cp /opt/xhblogs-full/portal/index.html /var/www/portal/
sudo cp /opt/xhblogs-full/portal/bg.jpg /var/www/portal/ 2>/dev/null || true
echo "Portal files copied to /var/www/portal/"

echo "=== Finding SSL certificates ==="
SSL_CERT=""
SSL_KEY=""
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*; do
    if [ -f "$f" ]; then
        SSL_CERT=$(grep -oP 'ssl_certificate\s+\K[^;]+' "$f" 2>/dev/null | head -1)
        SSL_KEY=$(grep -oP 'ssl_certificate_key\s+\K[^;]+' "$f" 2>/dev/null | head -1)
        if [ -n "$SSL_CERT" ] && [ -n "$SSL_KEY" ]; then
            break
        fi
    fi
done

if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    SSL_CERT=$(find /etc/letsencrypt/live -name "fullchain.pem" 2>/dev/null | head -1)
    SSL_KEY=$(find /etc/letsencrypt/live -name "privkey.pem" 2>/dev/null | head -1)
fi

if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    echo "ERROR: Could not find SSL certificates"
    exit 1
fi

echo "SSL cert: $SSL_CERT"
echo "SSL key: $SSL_KEY"

echo "=== Cleaning up backup files in sites-enabled ==="
sudo rm -f /etc/nginx/sites-enabled/*.bak.*

echo "=== Removing conflicting Nginx configs ==="
for f in /etc/nginx/sites-enabled/*; do
    basename_f=$(basename "$f")
    if [ "$basename_f" = "hhblog-portal" ] || [ "$basename_f" = "blog-subdomain" ]; then
        continue
    fi
    if [ -f "$f" ]; then
        has_hhblog=$(grep -c "hhblog\.tech" "$f" 2>/dev/null || echo 0)
        has_blog_sub=$(grep -c "blog\.hhblog\.tech" "$f" 2>/dev/null || echo 0)
        has_proxy_3003=$(grep -c "proxy_pass.*3003" "$f" 2>/dev/null || echo 0)
        if [ "$has_hhblog" -gt 0 ] && [ "$has_blog_sub" -eq 0 ]; then
            echo "  Removing conflicting config (has hhblog.tech, no subdomain): $f"
            sudo rm -f "$f"
        elif [ "$has_proxy_3003" -gt 0 ] && [ "$has_blog_sub" -eq 0 ]; then
            echo "  Removing conflicting proxy config (proxy 3003, no subdomain): $f"
            sudo rm -f "$f"
        fi
    fi
done

echo "=== Writing Nginx configs ==="
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

echo "=== Testing Nginx config ==="
if sudo nginx -t 2>&1; then
    echo "Nginx test passed!"
    sudo systemctl reload nginx
    echo "SUCCESS: Nginx configured!"
    echo "  hhblog.tech -> Portal (static)"
    echo "  blog.hhblog.tech -> Blog (proxy to 3003)"
else
    echo "Nginx test FAILED!"
    exit 1
fi
