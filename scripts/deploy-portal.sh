#!/bin/bash
set -e

echo "=== Reverting Portal Configuration ==="
echo "Restoring hhblog.tech to original blog proxy (port 3003)"

# Find SSL certificate paths
SSL_CERT=""
SSL_KEY=""

# Check existing portal/subdomain configs for SSL paths
for f in /etc/nginx/sites-enabled/hhblog-portal /etc/nginx/sites-enabled/blog-subdomain; do
    if [ -f "$f" ]; then
        SSL_CERT=$(grep -oP 'ssl_certificate\s+\K[^;]+' "$f" | head -1)
        SSL_KEY=$(grep -oP 'ssl_certificate_key\s+\K[^;]+' "$f" | head -1)
        if [ -n "$SSL_CERT" ] && [ -n "$SSL_KEY" ]; then
            break
        fi
    fi
done

# Try backup configs
if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    for f in /etc/nginx/sites-enabled/*.bak.* /etc/nginx/conf.d/*.bak.*; do
        if [ -f "$f" ]; then
            SSL_CERT=$(grep -oP 'ssl_certificate\s+\K[^;]+' "$f" | head -1)
            SSL_KEY=$(grep -oP 'ssl_certificate_key\s+\K[^;]+' "$f" | head -1)
            if [ -n "$SSL_CERT" ] && [ -n "$SSL_KEY" ]; then
                break
            fi
        fi
    done
fi

# Try common Let's Encrypt paths
if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    echo "Trying common cert paths..."
    SSL_CERT=$(find /etc/letsencrypt/live -name "fullchain.pem" 2>/dev/null | head -1)
    SSL_KEY=$(find /etc/letsencrypt/live -name "privkey.pem" 2>/dev/null | head -1)
fi

if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    echo "ERROR: Could not find SSL certificates"
    exit 1
fi

echo "SSL cert: $SSL_CERT"
echo "SSL key: $SSL_KEY"

# Try to find and restore backup of original Nginx config
RESTORED=0
for f in /etc/nginx/sites-enabled/*.bak.* /etc/nginx/conf.d/*.bak.*; do
    if [ -f "$f" ]; then
        HAS_PROXY=$(grep -c "proxy_pass.*3003" "$f" 2>/dev/null || echo 0)
        HAS_HHBLOG=$(grep -c "hhblog\.tech" "$f" 2>/dev/null || echo 0)
        if [ "$HAS_PROXY" -gt 0 ] || [ "$HAS_HHBLOG" -gt 0 ]; then
            echo "Found backup config with blog proxy: $f"
            sudo cp "$f" /etc/nginx/sites-enabled/hhblog
            RESTORED=1
            break
        fi
    fi
done

# If no backup found, create a fresh config
if [ "$RESTORED" -eq 0 ]; then
    echo "No backup found. Creating fresh Nginx config for blog proxy..."
    cat > /tmp/hhblog-blog.conf << 'ENDBLOG'
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

    sed -i "s|__SSL_CERT__|$SSL_CERT|g" /tmp/hhblog-blog.conf
    sed -i "s|__SSL_KEY__|$SSL_KEY|g" /tmp/hhblog-blog.conf
    sudo cp /tmp/hhblog-blog.conf /etc/nginx/sites-enabled/hhblog
    rm -f /tmp/hhblog-blog.conf
fi

# Remove portal and subdomain configs
echo "Removing portal and subdomain configs..."
sudo rm -f /etc/nginx/sites-enabled/hhblog-portal
sudo rm -f /etc/nginx/sites-enabled/blog-subdomain
sudo rm -f /etc/nginx/conf.d/hhblog-portal.conf
sudo rm -f /etc/nginx/conf.d/blog-subdomain.conf

# Also remove portal static files (no longer needed)
sudo rm -rf /var/www/portal

echo "Testing Nginx config..."
if sudo nginx -t 2>&1; then
    echo "Nginx test passed!"
    sudo systemctl reload nginx
    echo "SUCCESS: Reverted to original blog configuration!"
    echo "  hhblog.tech -> Blog (proxy to 3003)"
else
    echo "Nginx test FAILED! Attempting to restore..."
    sudo rm -f /etc/nginx/sites-enabled/hhblog
    # Re-create portal config as fallback
    cat > /tmp/hhblog-portal-fallback.conf << 'ENDFALLBACK'
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
ENDFALLBACK
    sed -i "s|__SSL_CERT__|$SSL_CERT|g" /tmp/hhblog-portal-fallback.conf
    sed -i "s|__SSL_KEY__|$SSL_KEY|g" /tmp/hhblog-portal-fallback.conf
    sudo cp /tmp/hhblog-portal-fallback.conf /etc/nginx/sites-enabled/hhblog-portal
    rm -f /tmp/hhblog-portal-fallback.conf
    sudo systemctl reload nginx
    echo "Fallback config applied."
fi
