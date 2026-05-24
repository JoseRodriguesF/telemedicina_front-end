# Matriarca Telemedicina – Guia de Configuração e Instalação de Ambientes

Este documento apresenta o guia passo a passo para a instalação, configuração e execução de todo o ecossistema da plataforma **Matriarca Telemedicina** (Frontend Next.js, Backend Fastify, Banco de Dados Prisma/PostgreSQL, Proxy Reverso Nginx e Serviços de IA/WebRTC).

---

## 1. Pré-requisitos do Sistema

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas no seu sistema:

*   **Node.js**: Versão **v20.x ou superior** (LTS recomendada).
*   **NPM**: Versão **10.x ou superior** (instalado automaticamente com o Node.js).
*   **Docker & Docker Compose**: Requerido para a execução da stack local via containers.
*   **Git**: Para clonagem de repositório e versionamento de código.
*   **PostgreSQL**: Caso queira rodar um banco de dados local diretamente no seu sistema (Bare Metal) em vez de utilizar o Docker ou o banco em nuvem (Aiven).

---

## 2. Configuração das Variáveis de Ambiente (.env)

A stack utiliza arquivos de configuração `.env` isolados por componente para proteger as credenciais técnicas e configurar dinamicamente os comportamentos de banco de dados e APIs.

### 2.1. Backend (`telemedicina_api/.env`)

Crie o arquivo `.env` na raiz do diretório `telemedicina_api`. Preencha-o com as chaves apropriadas de acordo com o modelo abaixo:

```ini
# --- CONFIGURAÇÕES DE REDE E SERVIDOR ---
PORT=3000
JWT_SECRET="sua_chave_secreta_jwt_longa_e_segura"
ENCRYPTION_KEY="sua_chave_de_criptografia_hexadecimal_de_32_bytes_para_dados_de_saude"

# --- BANCO DE DADOS (POSTGRESQL) ---
# Caso use Aiven Cloud: certifique-se de configurar o arquivo ca.pem no diretório correspondente
DATABASE_URL="postgresql://usuario:senha@host:porta/nome_banco?sslmode=require&sslrootcert=./ca.pem"

# --- INTELIGÊNCIA ARTIFICIAL (OPENAI) ---
OPENAI_API_KEY="sk-proj-..."

# --- GOOGLE CLOUD STORAGE & GCP CONFIGS ---
GOOGLE_CLOUD_PROJECT="seu-projeto-gcp-id"
GCS_BUCKET_NAME="seu-bucket-privado-gcs-documentos"

# --- GOOGLE SIGN-IN SSO ---
GOOGLE_CLIENT_ID="seu-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-seu-client-secret"

# --- ASSINATURA DIGITAL CERTIFICADORA (VIDAAS) ---
VIDAAS_CLIENT_ID="seu-vidaas-client-id"
VIDAAS_CLIENT_SECRET="vds_sec_seu-secret"
VIDAAS_REDIRECT_URI="https://api.matriarcatelemed.com.br/api/vidaas/callback"
VIDAAS_BASE_URL="https://certificado.vidaas.com.br"

# --- WEBRTC TELECONSULTA (STUN/TURN XIRSYS) ---
STUN_URL="stun:stun.l.google.com:19302"
XIRSYS_CHANNEL="SeuCanalWebrtc"
XIRSYS_USERNAME="SeuUsuarioXirSys"
XIRSYS_SECRET="seu-secret-xirsys-guid"

# Servidores ICE fallback em formato JSON string (opcional)
ICE_SERVERS_JSON='[{"urls":["stun:sp-turn1.xirsys.com"]},{"username":"...","credential":"...","urls":["turn:..."]}]'
```

> [!IMPORTANT]
> A chave `ENCRYPTION_KEY` deve conter exatamente 64 caracteres hexadecimais (representando 32 bytes) e serve para criptografar informações médicas sensíveis em repouso. Uma falha na configuração desta chave invalidará a leitura dos prontuários existentes.

### 2.2. Frontend (`telemedicina_front-end/.env.local`)

Crie o arquivo `.env.local` na raiz do diretório `telemedicina_front-end`:

```ini
# URL de consumo da API (No ambiente Bare Metal local sem proxy, configure a porta correspondente da API)
NEXT_PUBLIC_API_URL="http://localhost:3000"

# ID do aplicativo de autenticação Google SSO (Deve bater com o ID do Backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="seu-google-client-id.apps.googleusercontent.com"

# Chave de API do Google Maps para busca e geolocalização de rotas de ambulância (Urgências)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSy..."
```

---

## 3. Configuração do Banco de Dados (Prisma & SSL)

A aplicação utiliza o **Prisma ORM** com conexões PostgreSQL e exige comunicação criptografada SSL para bancos em nuvem (ex: Aiven Cloud).

### 3.1. Certificado de Segurança SSL (`ca.pem`)

Se estiver consumindo uma instância Cloud SQL ou Aiven:
1. Baixe o certificado da autoridade certificadora (normalmente fornecido no painel do banco de dados).
2. Salve o arquivo com o nome **`ca.pem`** exatamente dentro da pasta `/telemedicina_api/`.
3. Certifique-se de que a variável `DATABASE_URL` no `.env` do backend inclui os parâmetros `&sslmode=require&sslrootcert=./ca.pem` no final da string.

### 3.2. Geração do Cliente e Migrações

Com o terminal aberto na pasta `telemedicina_api`, execute os comandos abaixo para gerar o cliente de tipagem estrita do Prisma e sincronizar as tabelas do banco de dados:

```bash
# 1. Instalar as dependências do backend
npm install

# 2. Gerar as classes de tipos estritos do Prisma Client
npm run prisma:generate

# 3. Aplicar as migrações no banco de dados
# Em ambiente de desenvolvimento:
npm run migrate

# Em ambiente de produção:
npm run prisma:migrate
```

### 3.3. Inicialização de Dados Mock (Seed)

Para popular o seu banco de dados local com dados fictícios administrativos, médicos e consultas de teste, execute qualquer um dos comandos utilitários a partir da pasta `telemedicina_api/`:

```bash
# Executa todos os seeds sequencialmente (Recomendado para novos setups)
npm run seed

# Executa apenas o seed de usuários administrativos e fluxo básico
npm run seed:admin

# Executa apenas o seed de dados médicos, pacientes e consultas de teste
npm run seed:dashboard

# Executa apenas o seed de novos médicos aguardando aprovação
npm run seed:medicos
```

---

## 4. Execução Local (Bare Metal / Sem Docker)

Caso queira rodar o ambiente local de desenvolvimento diretamente em sua máquina sem isolamento de containers, execute as portas e aplicações de forma paralela.

### 4.1. Resolvendo Colisão de Portas

Como o Next.js e o Fastify utilizam por padrão a porta `3000` em ambientes locais, configure portas distintas para evitar falhas de inicialização:

1. No backend (`telemedicina_api/.env`), ajuste a porta para:
   ```ini
   PORT=3001
   ```
2. No frontend (`telemedicina_front-end/.env.local`), atualize o endpoint da API para apontar para a porta do backend configurada:
   ```ini
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```

### 4.2. Passo a Passo de Inicialização

1.  **Iniciar o Backend (API e WebSocket de Sinalização):**
    ```bash
    cd telemedicina_api
    npm install
    npm run dev
    ```
    O console exibirá que o Fastify e o servidor WebSocket de sinalização estão rodando com sucesso na porta `3001`.

2.  **Iniciar o Frontend (Next.js):**
    ```bash
    cd telemedicina_front-end
    npm install
    npm run dev
    ```
    O Next.js inicializará o servidor de desenvolvimento na porta padrão `3000` (acesse `http://localhost:3000` no seu navegador).

---

## 5. Execução Completa Local com Docker e Nginx Proxy

A melhor experiência de reprodução do ambiente de produção local ocorre através do Docker Compose, unificando as portas da web e api sob o proxy reverso do Nginx e simulando o domínio de produção com segurança de rotas.

### 5.1. Configuração de DNS Local (Hosts do Sistema)

Para que a rede local compreenda os domínios mapeados no proxy reverso do Nginx (`matriarcatelemed.com.br`), adicione as regras no arquivo `hosts` do seu sistema operacional.

#### No Windows:
1. Abra o **Prompt de Comando (CMD)** ou **PowerShell** como **Administrador**.
2. Execute o comando para abrir o arquivo hosts no bloco de notas:
   ```powershell
   notepad C:\Windows\System32\drivers\etc\hosts
   ```
3. Insira as seguintes linhas no final do arquivo e salve:
   ```text
   127.0.0.1 matriarcatelemed.com.br
   127.0.0.1 api.matriarcatelemed.com.br
   ```

#### No Linux / macOS:
1. Abra o terminal e execute:
   ```bash
   sudo nano /etc/hosts
   ```
2. Adicione as mesmas linhas e salve o arquivo (`Ctrl+O` e `Ctrl+X` no nano):
   ```text
   127.0.0.1 matriarcatelemed.com.br
   127.0.0.1 api.matriarcatelemed.com.br
   ```

### 5.2. Inicialização da Stack Docker

Com os hosts e variáveis devidamente mapeados, vá para a raiz do repositório (`/Telemedicina`) e inicie toda a infraestrutura local em segundo plano:

```bash
# Executa e compila as imagens locais do backend e frontend sob a rede do Docker Compose
docker compose up -d --build
```

A stack iniciará quatro containers interconectados na rede interna `telemedicina-network`:
*   `telemedicina-api`: Fastify na porta interna `3000`.
*   `telemedicina-frontend`: Next.js na porta interna `3000`.
*   `nginx-proxy`: Servidor Nginx que escuta as portas públicas `80` e `443` e roteia as chamadas HTTP/WS de acordo com o subdomínio.
*   `certbot`: Mapeia e atualiza automaticamente os certificados digitais SSL.

---

## 6. Utilização de Scripts e Automação de Infraestrutura

O repositório disponibiliza na pasta `/scripts/` ferramentas em shell script para facilitar a automação e configuração de novos ambientes de servidores.

### 6.1. Script de Preparação de Servidor VM (`scripts/setup-vm.sh`)

Se você acabou de instanciar uma máquina virtual limpa em nuvem (ex: Ubuntu 22.04 LTS no Google Cloud Engine), utilize este script para instalar automaticamente todas as dependências requeridas e preparar as pastas do proxy Nginx:

```bash
# 1. Torne o script executável
chmod +x scripts/setup-vm.sh

# 2. Rode o script (solicitará senha sudo)
./scripts/setup-vm.sh
```

**O que este script faz:**
1. Atualiza todos os pacotes do sistema de forma segura (`apt-get update`).
2. Instala utilitários básicos obrigatórios (`curl`, `git`, `gnupg`, etc.).
3. Instala e configura a versão mais recente do **Docker Engine** e **Docker Compose (v2)**.
4. Adiciona o usuário do shell atual ao grupo do Docker (eliminando a necessidade de usar `sudo` para comandos do Docker).
5. Cria toda a estrutura física de pastas necessária para o proxy e Let's Encrypt (`~/app/nginx/certs`, `~/app/nginx/conf.d`, etc.).

### 6.2. Script de Certificados SSL de Produção (`scripts/generate-certs.sh`)

Para gerar certificados válidos de produção da Let's Encrypt associados ao seu domínio no servidor VM de forma síncrona:

```bash
# 1. Torne o script executável
chmod +x scripts/generate-certs.sh

# 2. Execute passando o seu domínio de produção homologado como argumento
./scripts/generate-certs.sh seu-dominio.com
```

**O que este script faz:**
1. Cria a pasta temporária de validação de rotas ACME do Let's Encrypt.
2. Faz o download automático das configurações oficiais SSL de hardening recomendadas para o Nginx.
3. Executa o Certbot dentro do container Docker no modo `--webroot`, mapeando e verificando a integridade do domínio em conjunto com o Nginx rodando temporariamente.
4. Gera e armazena os arquivos de chave privada e certificado público em volumes estáveis do container do Nginx.

---

## 7. Pipeline de Deploy Contínuo (CI/CD)

O deploy da plataforma é automatizado e estruturado por meio de **GitHub Actions** realizando deploy síncrono na Máquina Virtual de produção via conexões SSH seguras e reconstrução dos containers Docker. O arquivo de fluxo está localizado em `.github/workflows/deploy.yml`.

*   **Deploy Unificado (`deploy.yml`)**: Ao realizar um push ou merge na branch `main`, o fluxo se conecta à VM de produção via SSH, faz o pull do repositório atualizado no diretório `~/app`, reconstrói as imagens locais com o `docker compose up -d --build` e reinicia o proxy reverso do Nginx para aplicar as novas configurações.

### 7.1. Variáveis de Deploy Exigidas nas Secrets do GitHub

Para viabilizar o deploy contínuo seguro, configure as seguintes secrets no painel do repositório no GitHub (`Settings > Secrets and variables > Actions`):

*   `VM_HOST`: Endereço IP público ou domínio DNS da Máquina Virtual de produção.
*   `VM_USERNAME`: Nome do usuário para login SSH no servidor (ex: `ubuntu`).
*   `VM_SSH_KEY`: Chave privada SSH (formato PEM ou OpenSSH) correspondente à chave pública cadastrada na VM em `~/.ssh/authorized_keys` para autenticação sem senha.

