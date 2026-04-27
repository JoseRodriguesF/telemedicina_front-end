#!/bin/bash

# Atualizar o sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar dependências básicas
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release git

# Adicionar chave GPG oficial do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Configurar repositório estável do Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Instalar Docker Compose (v2)
sudo apt-get install -y docker-compose-plugin

# Adicionar usuário ao grupo docker para não precisar de sudo
sudo usermod -aG docker $USER

# Criar estrutura de pastas
mkdir -p ~/app/nginx/certs
mkdir -p ~/app/nginx/conf.d
mkdir -p ~/app/nginx/vhost.d
mkdir -p ~/app/nginx/html

echo "Setup concluído! Por favor, faça logout e login novamente para aplicar as permissões do grupo docker."
echo "Depois disso, você pode clonar o repositório e rodar 'docker compose up -d --build'."
