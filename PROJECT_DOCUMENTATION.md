# Matriarca Telemedicina – Documentação do Projeto

---

## 1. Proposta do Projeto & O Papel da Inteligência Artificial
A **Matriarca Telemedicina** é uma plataforma completa que unifica o atendimento médico à distância e presencial. O objetivo é oferecer uma experiência fluida para hospitais e clínicas, cobrindo todo o ciclo do paciente: desde a triagem, agendamento, até a realização da teleconsulta com vídeo, estruturação do prontuário médico e emissão de prescrições com assinatura digital válida.

**Aplicação da Inteligência Artificial (IA) e sua Importância:**
A IA (via OpenAI) desempenha o papel de um assistente clínico de suporte à decisão. Ela atua durante a triagem inicial e consulta, analisando os sintomas, queixas principais e o histórico do paciente. O propósito da IA não é substituir o médico, mas sim atuar como um "co-piloto", sugerindo hipóteses diagnósticas e ajudando a estruturar a história clínica. Isso reduz o tempo gasto com preenchimento de formulários, minimiza a chance de falhas humanas na coleta de dados e permite que o profissional foque no acolhimento e no atendimento humanizado do paciente.

---

## 2. Fluxos Completos da Plataforma

A aplicação foi desenhada para atender ponta a ponta as jornadas do paciente e do médico.

### 2.1. Fluxo do Paciente (Triagem, Agendamento e Consulta)
1. **Autenticação:** O paciente acessa o sistema, podendo realizar cadastro e login tradicionais ou utilizando a integração com o **Google Sign-In** (Single Sign-On). Ao autenticar, recebe um JWT em cookie seguro e é direcionado ao dashboard.
2. **Agendamento:** O paciente seleciona a especialidade e cria uma nova solicitação de consulta. O banco de dados registra uma `Consulta` com status `scheduled`.
3. **Sala de Espera e WebRTC:** No horário agendado, o paciente entra na sala virtual. O sistema estabelece uma conexão de sinalização em tempo real (via WebSocket).
4. **Teleconsulta:** Quando o médico entra, inicia-se a conexão par-a-par (P2P) de áudio e vídeo usando **WebRTC**, otimizada pelos servidores STUN/TURN (XirSys).
5. **Finalização e Pós-Consulta:** Ao encerrar a chamada, o paciente pode visualizar os anexos da consulta e fazer o download de suas prescrições digitais (PDF).

### 2.2. Fluxo Médico (Prontuário e Assinatura Digital)
1. **Dashboard Médico:** O médico loga e acessa a lista de pacientes com consultas agendadas (`scheduled`).
2. **Atendimento:** O médico inicia a sessão. Durante a chamada de vídeo, o médico tem acesso à interface de registro.
3. **História Clínica e IA:** O médico preenche o prontuário. A IA pode ser acionada para estruturar resumos clínicos e organizar as informações de anamnese.
4. **Emissão de Prescrição:** O médico cadastra os medicamentos. O sistema consome a API da **MEVO** para gerar a receita digital e a API **VIDaaS** para aplicar a assinatura digital com validade ICP-Brasil.
5. **Encerramento:** A consulta passa para o status `finished`. O histórico é persistido na base de forma imutável, e eventos de rede são gravados caso ocorram instabilidades.

### 2.3. Fluxo do Administrador (Gestão e Auditoria)
1. **Gestão de Cadastros:** O administrador acessa o painel para verificar médicos recém-cadastrados (status `pendente_documentos`). Ele avalia os anexos, valida o CRM e aprova o acesso à plataforma.
2. **Monitoramento e Suporte:** Acompanha dashboards com volume de consultas e visualiza logs de quedas de conexão ou qualidade de vídeo (`EventoTecnico`).
3. **Compliance (LGPD):** Consulta a `TrilhaAuditoria` para verificar quem acessou quais dados de pacientes e garantir a segurança das informações.

### 2.4. Fluxo Híbrido (Atendimento Presencial na Clínica/Hospital)
1. **Check-in Físico:** O paciente chega à unidade, e a recepção (ou totem) utiliza a plataforma para marcar a chegada e atualizar o status da consulta.
2. **Triagem e Consultório:** O paciente passa pela triagem física e é encaminhado ao médico. O médico realiza o atendimento presencial preenchendo o mesmo modelo de `HistoriaClinica` digital.
3. **Prontuário Unificado:** O histórico do paciente fica centralizado, mesclando atendimentos via telemedicina e presenciais na mesma linha do tempo.

### 2.5. Fluxo de Urgência e Acionamento de Ambulância
1. **Identificação de Risco:** Durante a triagem ou teleconsulta, identifica-se um caso grave.
2. **Registro de Resgate:** O médico preenche os dados de acionamento de ambulância na consulta. O sistema usa a integração com a **Google Maps API** para buscar e validar o `ambulancia_endereco`.
3. **Encaminhamento:** Define-se o `destino_final` (hospital de referência) e a chamada de emergência é registrada no sistema.
---

## 3. Stack Tecnológica: O Que Usamos e Por Quê

A escolha das tecnologias baseia-se em performance, tipagem segura e escalabilidade.

### Backend
- **Node.js 20 + TypeScript:** Fornece um ambiente moderno, e a tipagem do TypeScript previne bugs críticos de execução.
- **Fastify:** Escolhido no lugar do Express pela sua alta performance (consegue processar milhares de requisições a mais por segundo) e arquitetura de plugins bem definida.
- **Prisma ORM:** Escolhido pela excelente segurança de tipos (type-safety) e migrações automatizadas. Ele garante que qualquer mudança no banco reflita em erros no código TypeScript antes mesmo do build.
- **WebSockets (ws):** Usado para a sinalização (Signaling) necessária para estabelecer os canais do WebRTC.

### Frontend
- **React 19 + Next.js 16 (App Router):** O Next.js foi adotado pela sua capacidade de renderização Server-Side (SSR) e otimização automática de rotas e assets. Melhora o tempo de carregamento e o SEO da página inicial.
- **Tailwind CSS / CSS Modules:** Garantem isolamento de estilos e componentização sem colisões globais de CSS.
- **SWR / React Query:** Gerenciamento de estado remoto eficiente, aplicando cache e deduplicação de requisições HTTP.

---

## 4. Infraestrutura e Serviços Externos Consumidos

- **PostgreSQL (Cloud SQL no GCP):** Banco de dados relacional que garante conformidade ACID para dados médicos sensíveis.
- **Google Cloud Storage (GCS):** Utilizado para salvar de forma segura arquivos, imagens de exames e PDFs de receitas, sem onerar o servidor principal.
- **OpenAI API:** Usada para a inteligência artificial clínica e sumarização de prontuários.
- **MEVO:** Serviço especializado na geração, validação e envio de prescrições médicas e receituários de controle especial (com QR Code integrado a farmácias).
- **VIDaaS:** Infraestrutura de certificação digital ICP-Brasil. Permite ao médico assinar receitas e prontuários na nuvem usando seu token.
- **XirSys:** Provedor de servidores STUN e TURN. Essencial para que a chamada de vídeo WebRTC funcione mesmo quando paciente ou médico estão atrás de firewalls rígidos corporativos.
- **Google OAuth 2.0:** Usado para facilitar o registro e login (SSO) rápido de pacientes e médicos na plataforma.
- **Google Maps API:** Integrado para a busca automática e validação de endereços no momento do cadastro e gerenciamento de locais (preenchendo a tabela `Endereco`).

---

## 5. Arquitetura de Banco de Dados (Schema Prisma)

O banco de dados é a espinha dorsal da plataforma. Abaixo detalhamos a utilidade de cada modelo:

1. **`Usuario`**: Tabela base de autenticação.
   - `email`, `senha_hash`, `google_id`: Credenciais de acesso. O `google_id` é essencial para permitir o login simplificado via conta do Google.
   - `tipo_usuario`: Define as permissões (`medico`, `paciente` ou `admin`).

2. **`Paciente`**: Perfil associado a um `Usuario`.
   - `cpf`, `data_nascimento`, `nome_completo`: Dados demográficos críticos.
   - `peso`, `altura`, `historiaClinicaResumo`: Visão rápida da saúde física.
   - `aceitouTCLE`: Comprova legalmente o aceite do Termo de Consentimento para telessaúde.

3. **`Medico`**: Perfil profissional.
   - `crm`, `crm_uf`, `rqe`: Registros de classe obrigatórios.
   - `vidaas_external_id`, `vidaas_refresh_token`: Armazena a ponte com o serviço de assinatura em nuvem ICP-Brasil.
   - `verificacao`: Controla o processo de onboarding do médico (seus documentos foram validados pela administração?).

4. **`Consulta`**: O "hub" central que une pacientes, médicos e atendimentos.
   - `status`: Controla a máquina de estados (`scheduled`, `in_progress`, `finished`).
   - `resumo`, `diagnostico`, `cid`, `plano_terapeutico`: Conclusões finais preenchidas pelo médico.
   - `hora_inicio`, `hora_fim`: Controlam a minutagem do faturamento.

5. **`HistoriaClinica`**: O rascunho do prontuário durante e após a consulta.
   - `antecedentesFamiliares`, `estiloVida`, `historicoPessoal`: Campos JSON flexíveis que guardam os dados vitais.
   - `status`: Garante se o documento ainda está em "rascunho" ou se foi consolidado.

6. **`Prescricao`**: Medicamentos receitados.
   - `mevoId`, `mevoStatus`: ID retornado pela API da MEVO para rastreio da receita na farmácia.
   - `assinaturaHash`: O Hash criptográfico devolvido pelo VIDaaS, garantindo que o médico de fato assinou o documento.

7. **`ConsultaAnexo`**: Exames e laudos que o paciente faz upload, com seus respectivos links (`arquivo_url`) no Google Cloud Storage.

8. **`TrilhaAuditoria`**: Devido à LGPD e regras do CFM, toda ação (edição, deleção, acesso ao prontuário) é registrada aqui com `acao`, `ip` e `usuarioId`.

9. **`EventoTecnico`**: Essencial para diagnósticos. Registra quedas de bitrate, falha de ICE (WebRTC) ou desconexões súbitas.

---

## 6. Estrutura de Pastas e Código

O monorepo está dividido de forma clara entre frontend e backend.

```text
Telemedicina/
├─ .github/workflows/          # Rotinas de deploy automatizado e lint (CI/CD)
├─ docker-compose.yml          # Containerização para subir a stack em um clique no local
├─ telemedicina_api/           # SERVIÇO BACKEND (Node.js/Fastify)
│   ├─ prisma/                 # schema.prisma detalhado e arquivos de migrações SQL
│   ├─ src/
│   │   ├─ controllers/        # Lógica de recebimento de chamadas (REST)
│   │   ├─ middlewares/        # Interceptores de autenticação (JWT)
│   │   ├─ routes/             # Definição dos endpoints REST
│   │   └─ services/           # Lógica pesada e chamadas a APIs externas (MEVO, OpenAI, VIDaaS)
├─ telemedicina_front-end/     # APLICAÇÃO WEB (Next.js)
│   ├─ src/
│   │   ├─ app/                # Roteamento baseado no Next.js App Router (páginas principais)
│   │   ├─ components/         # Botões, modais, formulários, vídeo-player WebRTC
│   │   ├─ hooks/              # Lógica reutilizável React (ex: useWebRTC, useAuth)
│   │   └─ lib/                # Configuração do Axios e utilitários
└─ PROJECT_DOCUMENTATION.md    # Este documento
```

---

## 7. Estrutura de Branches e Fluxo de Desenvolvimento

Para garantir estabilidade e organização no versionamento do código, o repositório no GitHub está dividido em três branches principais:

1. **`main` (Produção):** 
   - Apenas código completamente testado e validado deve constar aqui. 
   - Reflete exatamente o que está rodando no ambiente real com os usuários finais.

2. **`dev` (Homologação / Staging):** 
   - Branch dedicada ao ambiente de homologação.
   - Todo o código recém-desenvolvido é unificado aqui para ser testado como um sistema completo antes de ir para produção.

3. **`tests` (Testes e Commits de Desenvolvimento):** 
   - Branch utilizada como rascunho seguro para subir commits frequentes, experimentações e wip (work in progress). 
   - O desenvolvimento diário acontece aqui ou em sub-branches derivadas daqui. Quando os testes passam, o código vai para `dev`.

---

## 8. Variáveis de Ambiente (Environment Variables)

Para que a plataforma funcione corretamente nos ambientes locais e de deploy, é necessário configurar as seguintes variáveis:

### Backend (`telemedicina_api/.env`)
| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta onde o servidor Node/Fastify rodará (ex: 3000). |
| `DATABASE_URL` | String de conexão com o banco de dados PostgreSQL. |
| `JWT_SECRET` | Chave secreta para assinar e validar os tokens JWT de autenticação. |
| `ENCRYPTION_KEY` | Chave de criptografia para dados sensíveis em repouso. |
| `OPENAI_API_KEY` | Token de acesso à API da OpenAI para análise de IA nos prontuários. |
| `GCS_BUCKET_NAME` | Nome do bucket no Google Cloud Storage para upload de anexos e PDFs. |
| `GOOGLE_CLOUD_PROJECT` | ID do projeto principal hospedado no Google Cloud (GCP). |
| `GOOGLE_CLIENT_ID` | Client ID do Google OAuth 2.0 para o login via SSO. |
| `GOOGLE_CLIENT_SECRET` | Client Secret do aplicativo OAuth do Google. |
| `STUN_URL` | URL do servidor STUN de fallback público para o WebRTC. |
| `XIRSYS_CHANNEL`, `XIRSYS_USERNAME`, `XIRSYS_SECRET` | Credenciais do XirSys para instanciar servidores TURN sob demanda e contornar firewalls nas chamadas de vídeo. |
| `ICE_SERVERS_JSON` | JSON serializado com as rotas completas dos servidores ICE providos pelo XirSys. |

### Frontend (`telemedicina_front-end/.env.local`)
| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL onde o frontend faz chamadas para o backend (ex: `http://localhost:3000`). |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID do Google OAuth para renderizar o botão de "Login com o Google". |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Chave de integração do Google Maps usada no autocompletar de endereços (pacientes e ambulâncias). |

---

## 9. O Que Falta para a Plataforma Ficar Pronta (Em Produção)?

Apesar do núcleo de agendamento e vídeo-chamada estar consolidado, alguns passos são essenciais para o lançamento final:

1. **Gateways de Pagamento:**
   - **Falta:** Integração completa do Stripe ou AbacatePay. Criar fluxos de checkout, webhook de confirmação de pagamento para liberar o link da consulta, e split de pagamento para repassar a fatia do médico.

2. **Fechamento da Integração MEVO e VIDaaS:**
   - **Falta:** O webhook da MEVO ainda não está consumido no backend. A emissão com assinatura VIDaaS gera o hash, mas falta amarrar a exibição do PDF carimbado na tela do paciente (UX final).

3. **Validações Governamentais:**
   - **Falta:** Consumir a API do `Gov.br` para garantir que o CPF e identidade do paciente, e o CRM do médico, sejam verdadeiros durante o cadastro, evitando fraudes médicas.

4. **Módulo Presencial (Fase 2):**
   - **Falta:** A plataforma hoje é "Telemedicina-first". Faltam as telas do totem ou da recepção hospitalar presencial para chamar pacientes por painel de senha.

5. **Ajustes Finais de DevOps e Infraestrutura:**
   - **Falta:** Configurar um cluster Kubernetes (GKE) real com Auto-Scaling Group no Google Cloud, configurar o banco no Cloud SQL (PostgreSQL) com backups automáticos, e configurar métricas com Prometheus e Grafana para visualizar os erros registrados em `EventoTecnico` em tempo real.
