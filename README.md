# Matriarca Telemedicina – Plataforma Integrada de Saúde Híbrida

A **Matriarca Telemedicina** é uma plataforma inovadora que unifica e moderniza o ecossistema de saúde híbrido (físico e digital) no Brasil. Eliminando a fragmentação do atendimento de saúde de ponta a ponta, a plataforma integra triagens avançadas por IA (Enfermeira Virtual Angélica), salas de teleconsulta médica P2P via WebRTC de alta performance, prontuário unificado deduplicado e receita digital criptografada integrada à MEVO com validade legal via VIDaaS (ICP-Brasil).

---

## 🗺️ Mapa da Documentação (Single Source of Truth)

Para facilitar a navegação pelas especificidades técnicas e de negócios do projeto, a documentação está dividida de forma modular:

*   **📘 [Documentação Oficial do Projeto (PROJECT_DOCUMENTATION.md)](docs/PROJECT_DOCUMENTATION.md):** 
    Contém as regras de negócios de saúde híbrida, o detalhamento do papel de IA (Angélica, Assistente Médico, Whisper), os fluxos de trabalho operacionais (Pronto Socorro, Urgência e Ambulância), a arquitetura do banco de dados (Prisma PostgreSQL) e os gaps técnicos a serem implementados no Roadmap.
*   **🎨 [Design System Premium (DESIGN.md)](DESIGN.md):**
    Apresenta as definições do norte criativo do projeto ("The Clinical Ethereal"), a paleta de cores HSL, tipografia (Manrope + Inter), diretrizes de espaçamento e regras de glassmorphism/micro-animações de alta fidelidade.
*   **⚙️ [Guia Técnico de Instalação e Ambientes (docs/SETUP_GUIDE.md)](docs/SETUP_GUIDE.md):**
    O manual técnico passo a passo detalhado cobrindo pré-requisitos, variáveis de ambiente `.env`, banco de dados, execução local (Bare Metal), Docker com Proxy Reverso Nginx, automação de VMs via scripts Shell e tópicos de CI/CD para deploy em produção.

---

## ⚡ Quickstart Rápido (Ambiente de Desenvolvimento via Docker)

Se você deseja rodar a aplicação completa localmente em apenas 2 minutos utilizando o **Docker Compose**, siga o fluxo simplificado abaixo:

### 1. Configurar Domínios Locais (`hosts`)
Adicione estas regras no arquivo `hosts` do seu sistema operacional (`C:\Windows\System32\drivers\etc\hosts` no Windows ou `/etc/hosts` no Linux/macOS) para emular a rota de rede:
```text
127.0.0.1 matriarcatelemed.com.br
127.0.0.1 api.matriarcatelemed.com.br
```

### 2. Configurar Variáveis e Certificados
Certifique-se de que os arquivos `.env` em `telemedicina_api/` e `.env.local` em `telemedicina_front-end/` estejam preenchidos conforme as diretrizes do [Guia de Configuração](docs/SETUP_GUIDE.md#2-configuracao-das-variaveis-de-ambiente-env).

### 3. Executar o Orquestrador
Na raiz do projeto (`/Telemedicina`), suba toda a infraestrutura:
```bash
docker compose up -d --build
```
Acesse o frontend em seu navegador em `http://matriarcatelemed.com.br` e verifique a API em `http://api.matriarcatelemed.com.br`.

---

## 📁 Estrutura Simplificada do Repositório

O projeto é mantido sob uma estrutura monorepo limpa e organizada:

```text
Telemedicina/
├── .github/workflows/      # Pipelines CI/CD automatizados para o Google Cloud Run
├── docs/
│   └── SETUP_GUIDE.md      # Guia detalhado passo a passo de setup técnico [NOVO]
├── nginx/conf.d/           # Configuração de Proxy Reverso Nginx local
├── scripts/                # Scripts utilitários de VM e geração de certificados SSL
├── telemedicina_api/       # Backend REST e sinalização WebSocket (Fastify + Prisma)
│   ├── prisma/             # Modelos de tabelas e migrações do PostgreSQL
│   └── src/                # Controllers, Middlewares, Serviços e Websockets
├── telemedicina_front-end/ # Frontend em Next.js App Router (React 19)
│   ├── public/             # Arquivos e imagens públicas, incluindo CID-10 offline
│   └── src/                # Componentes React, utilitários WebRTC (lib) e páginas
├── README.md               # Este arquivo de portal de entrada [NOVO]
├── DESIGN.md               # Documentação do Design System
└── docs/PROJECT_DOCUMENTATION.md# Documentação conceitual e técnica da plataforma
```

Para mais detalhes sobre as dependências e o processo de instalação local avançado (sem Docker), leia o [Guia de Setup](docs/SETUP_GUIDE.md).
