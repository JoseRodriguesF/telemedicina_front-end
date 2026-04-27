#!/bin/bash

# Verifique se o domínio foi passado como argumento
if [ -z "$1" ]; then
    echo "Uso: ./generate-certs.sh seu-dominio.com"
    exit 1
fi

DOMAIN=$1

echo "Gerando certificados para $DOMAIN e api.$DOMAIN..."

# 1. Baixar parâmetros SSL recomendados (se não existirem)
mkdir -p ./certbot/conf
if [ ! -e "./certbot/conf/options-ssl-nginx.conf" ]; then
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "./certbot/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "./certbot/conf/ssl-dhparams.pem"
fi

# 2. Rodar o Certbot para gerar os certificados
# Nota: O Nginx deve estar rodando e configurado para servir a pasta /var/www/certbot na porta 80
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot \
    --email jose.antonio.220507@gmail.com --agree-tos --no-eff-email \
    -d $DOMAIN -d api.$DOMAIN

echo "Certificados gerados! Agora você pode reiniciar o Nginx com: docker compose restart nginx"
