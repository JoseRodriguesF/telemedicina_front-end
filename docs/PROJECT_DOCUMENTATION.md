# Matriarca Telemedicina – Documentação Oficial do Projeto

---

## 1. O Grande Objetivo da Plataforma: O Propósito e Impacto a Ser Atingido

A **Matriarca Telemedicina** não é apenas um portal de agendamentos ou um sistema isolado de videoconferências. O objetivo principal da plataforma é **unificar e modernizar o ecossistema de saúde híbrido (digital e físico) no Brasil**, eliminando a fragmentação do atendimento médico e reduzindo drasticamente o tempo entre o primeiro sintoma e o tratamento seguro.

### 1.1. O Problema Resolvido: A Fragmentação da Jornada do Paciente
Tradicionalmente, a jornada do paciente é quebrada em múltiplos sistemas: a triagem é feita por telefone ou de forma manual e imprecisa, a consulta em vídeo ocorre em aplicativos genéricos de reunião (sem conformidade CFM), o prontuário é anotado em papéis ou softwares legados locais, e a receita digital é gerada em outro portal terceiro. Isso gera **ruído de dados, maior propensão a erros clínicos de digitação, falhas graves de privacidade (LGPD) e atrito no onboarding do paciente**.

A desarticulação dos fluxos de urgência faz com que casos graves demorem a ser identificados na telemedicina, sem um canal automático de resgate que acione ambulâncias ou prepare o hospital de retaguarda de forma integrada. No atendimento físico, o médico frequentemente desconhece os atendimentos digitais anteriores do mesmo paciente devido a silos tecnológicos.

### 1.2. A Visão de Futuro Ideal a Ser Atingida
A Matriarca Telemedicina consolida essa jornada de ponta a ponta em uma experiência fluida de **saúde integrada**:
1.  **Fricção Zero no Primeiro Acolhimento:** Um paciente sentindo-se mal abre o celular e inicia uma conversa natural com a IA Angélica (Enfermeira Virtual). Ela realiza uma triagem clínica adaptativa e estruturada com visão computacional para análise visual primária (ex: lesões na pele ou fotos de exames anteriores).
2.  **Acesso Instantâneo (Pronto Socorro On-Demand):** Ao finalizar a triagem, o paciente é automaticamente enfileirado em uma fila de espera virtual de Pronto Socorro. O médico de plantão captura o atendimento de forma atômica e abre a videoconferência estável P2P em segundos.
3.  **Prontuário Autopreenchido & Inteligente:** Durante o atendimento, a IA processa o áudio, transcreve e diariza (quem falou o quê), além de reescrever a triagem inicial do paciente em jargão técnico médico. O médico apenas revisa e confirma, focando 90% do seu tempo no acolhimento humano do paciente e não no preenchimento de formulários burocráticos.
4.  **Conexão Farmacêutica & Validade Legal:** O médico prescreve medicamentos cujos cadastros e bulas são validados em tempo real. A receita é assinada na nuvem usando o certificado digital ICP-Brasil do médico (via VIDaaS) e transmitida à MEVO, gerando um QR Code que permite ao paciente comprar os remédios em qualquer farmácia nacional com descontos de convênio.
5.  **Histórico Deduplicado e Cumulativo:** O prontuário não é uma pilha de papéis estáticos. O algoritmo de consolidação inteligente lê todas as consultas passadas, remove termos duplicados e negações, e cria um perfil médico centralizado e limpo, dando ao médico um raio-X instantâneo do histórico do paciente.

### 1.3. Os Impactos Clínicos e Econômicos Almejados (KPIs de Sucesso)
*   **Redução do Lead-Time de Atendimento:** O tempo entre a queixa inicial na triagem com a IA Angélica e o início da chamada de vídeo com o médico de plantão no Pronto Socorro Virtual deve ser inferior a **8 minutos**.
*   **Eficiência Médica Operacional:** O tempo médio de documentação pós-consulta (*after-call work*) do médico deve ser reduzido de 12 minutos para menos de **3 minutos**, graças ao rascunho de evolução clínica autopreenchido por IA.
*   **Acurácia e Redução de Erros de Prescrição:** Garantia de 100% de conformidade regulatória nas receitas digitais, mitigando riscos de caligrafia ilegível e interação medicamentosa adversa através da validação automática de bulas e cadastros ativos da MEVO.
*   **Continuidade Híbrida Digital-Física:** Unificação real do histórico de consultas físicas e de telemedicina em uma linha do tempo única, alimentando o algoritmo de consolidação inteligente para que o médico presencial saiba exatamente o que ocorreu no ambiente virtual e vice-versa.
*   **Mitigação de Riscos de LGPD:** Governança total sobre a trilha de auditoria e anonimização de dados pré-consulta, provando a conformidade legal perante auditorias externas sem reduzir a qualidade dos diagnósticos clínicos.

---

## 2. O Papel da Inteligência Artificial

A IA na plataforma atua como um co-piloto de suporte à decisão clínica e otimização operacional, dividindo-se em três agentes e processos centrais:

### 2.1. Enfermeira Virtual Angélica (Triagem Pré-Consulta)
*   **Modelo:** `gpt-4o-mini` (com capacidades nativas de visão computacional).
*   **Comportamento Adaptativo:** A triagem é dinâmica e orientada por fluxos específicos (sintomas agudos, renovação de receita simples, acompanhamento crônico ou check-up de rotina). O tom de voz e as perguntas ajustam-se de forma empática. Por exemplo, em fluxos de renovação de receitas, o assistente ignora perguntas demoradas sobre antecedentes familiares para acelerar a experiência administrativa.
*   **Conformidade LGPD (Privacy-First):** Antes do envio dos sintomas à API da OpenAI, os dados pessoais identificáveis (PII) passam por um processo de *scrubbing* (anonimização agressiva), reduzindo o nome do paciente a um identificador genérico e retirando sobrenomes para evitar a identificação direta do titular.
*   **Salvamento Controlado:** O prontuário gerado pela triagem não é gravado diretamente no banco. A IA fornece a resposta em texto e um JSON de dados estruturados. O paciente revisa as informações no frontend e confirma os dados por meio de uma rota protegida (`POST /chat-ia/confirmar`), assegurando que apenas informações autorizadas e corretas sejam salvas na base relacional (`HistoriaClinica` com status `completo`).
*   **Salvaguardas de Sessão:** Se o paciente tentar pular três perguntas consecutivas (`[PULAR_PERGUNTA]`), a IA ativa a flag `[FORCAR_CONCLUSAO]`, consolidando imediatamente o histórico com os dados coletados até o momento em um relatório markdown e JSON estruturado, impedindo travamento de fluxos.

### 2.2. Assistente Digital do Médico
*   **Modelo:** `gpt-4o` com suporte a **Function Calling (Tools)**.
*   **Apoio Multitela:** O assistente apoia o médico em qualquer interface do sistema, oferecendo suporte de navegação, elaboração de condutas terapêuticas ou resumos clínicos baseados no histórico médico unificado.
*   **Integrações com o Banco de Dados (Security Boundary):** Equipado com ferramentas de banco de dados (`get_patient_stats`, `get_patient_history`, `get_doctor_patients`, `get_patient_consultations`), o assistente pode analisar métricas de consultas e históricos.
*   **Zero-Trust de Privacidade:** O assistente possui uma camada rígida de controle de acesso. Antes de executar qualquer função no banco de dados, o backend valida se o paciente pesquisado pertence ao histórico de atendimento real do médico logado. Tentativas de acesso a dados de pacientes de terceiros retornam um erro de privacidade bloqueado diretamente no controller.

### 2.3. Processamento de Voz e Áudio
*   **Transcrição de Consultas:** O backend expõe uma rota robusta (`/chat-ia/transcrever`) que aceita arquivos de áudio em base64 com limite de até 50MB. O áudio é processado via **OpenAI Whisper-1** em português (`pt`).
*   **Diarização Baseada em IA:** A transcrição bruta passa por um modelo inteligente que analisa o contexto clínico do diálogo para identificar e separar os falantes, marcando explicitamente os prefixos `Médico:` e `Paciente:` sem alterar o conteúdo original.
*   **Resumos Clínicos Rápidos:** Uma ferramenta dedicada condensa o diálogo diarizado em um resumo prático, focando nas queixas do paciente, impressões do médico e plano terapêutico, pronto para ser inserido no prontuário.
*   **Geração de Evolução Clínica:** O médico pode acionar o assistente (`/chat-ia/gerar-evolucao-triagem`) para converter o vocabulário leigo fornecido pelo paciente na triagem inicial em uma evolução formal com terminologias médicas técnicas adequadas, economizando tempo no preenchimento do prontuário físico ou eletrônico.

---

## 3. Fluxos Operacionais e Jornadas

A arquitetura do sistema suporta múltiplos caminhos operacionais desenhados de ponta a ponta.

```mermaid
sequenceDiagram
    autonumber
    actor Paciente
    actor Medico
    participant API as API Fastify (Backend)
    participant IA as OpenAI (Angélica / GPT)
    participant WS as WebSocket (Signaling Server)

    Paciente->>API: Inicia Triagem com Angélica
    API->>IA: Processa sintomas com gpt-4o-mini (Scrubbing de PII)
    IA-->>Paciente: Retorna mensagens de triagem interativas
    Paciente->>API: Finaliza e Confirma os Dados de Triagem
    API->>API: Grava HistoriaClinica (Completa) e cria Consulta (Solicitada)
    API->>API: Enfileira consulta no Pronto Socorro (/ps/fila)
    Medico->>API: Monitora fila de espera (/ps/fila) e executa 'claim'
    API->>API: Valida Territorialidade (CFM), altera status para 'in_progress'
    API->>API: Instancia Sala Virtual e gera Token de Acesso
    API->>WS: Paciente e Médico conectam via WebSocket no canal (/signal?roomId=X)
    WS-->>WS: Ambos conectados (Dispara evento 'ready')
    Paciente->>Medico: Estabelecem canal de vídeo ponto a ponto (WebRTC P2P)
    Medico->>API: Finaliza consulta (Preenche CID, diagnóstico, receitas)
    API->>API: Atualiza status para 'finished' e atualiza Resumo Clínico do Paciente
```

### 3.1. Fluxo do Paciente (Triagem, Espera e Teleconsulta)
1.  **Autenticação JWT & Google Sign-In:** O paciente realiza login tradicional ou via Google SSO. O backend gera um token JWT armazenado em cookies seguros com a flag `httpOnly`, direcionando-o ao painel principal.
2.  **Triagem Interativa:** O paciente seleciona a modalidade de consulta e conversa com a IA Angélica.
3.  **Confirmação do Relatório:** O paciente visualiza e revisa os sintomas estruturados e, ao aprovar, envia a confirmação. A triagem é persistida como uma `HistoriaClinica` e a consulta é gerada com o status `solicitada`, entrando no fluxo de Pronto Socorro.
4.  **Sala de Espera e WebSocket:** O paciente aguarda em uma fila de espera virtual reativa. O frontend se conecta ao WebSocket de sinalização no caminho `/signal?roomId={id}&token={jwt}`.
5.  **Vídeo WebRTC P2P:** Assim que o médico aceita o atendimento, ambos trocam pacotes SDP e candidatos ICE pelo servidor de sinalização e abrem a transmissão direta de áudio e vídeo de alta qualidade (auxiliados pelos servidores STUN/TURN da XirSys para contornar restrições de redes e firewalls).
6.  **Visualização Pós-Consulta:** O paciente acessa anexos, exames solicitados e faz download de suas receitas digitais.

### 3.2. Fluxo Médico (Atendimento, Prontuário e Assinatura Digital)
1.  **Painel de Atendimentos:** O médico visualiza as consultas agendadas e a fila em tempo real do Pronto Socorro (`/ps/fila`).
2.  **Acolhimento da Consulta (Claim):** O médico clica em atender, disparando a chamada `/ps/fila/:consultaId/claim`. A plataforma executa validações de territorialidade do CRM e atualiza a consulta atomicamente para o status `in_progress`.
3.  **Conexão de Vídeo & Prontuário Integrado:** A chamada de vídeo é aberta na mesma tela em que o médico preenche o prontuário. Ele pode acionar a transcrição em tempo real, gerar resumos automáticos com IA e preencher dados de CID-10 integrados.
4.  **Emissão de Prescrição Digital (MEVO & VIDaaS):** O médico adiciona os medicamentos de uso comum ou controle especial. O sistema integra-se à API da **MEVO** para gerar a receita digital formatada com QR Code e direciona a assinatura digital utilizando a infraestrutura do **VIDaaS**, validando os tokens do certificado digital ICP-Brasil do médico na nuvem.
5.  **Fechamento de Consulta:** A consulta passa a constar como `finished`. A plataforma atualiza o histórico clínico cumulativo consolidado (`historiaClinicaResumo`) do paciente e armazena os logs finais.

### 3.3. Fluxo de Pronto Socorro (On-Demand / PS)
1.  **Ingresso na Fila:** Quando o paciente confirma a triagem no Pronto Socorro, uma nova consulta é persistida com `status: solicitada` e `medicoId: null`.
2.  **Consumo da Fila (`GET /ps/fila`):** Os médicos ativos na plataforma visualizam os pacientes na fila ordenados por tempo de chegada.
3.  **Captura Atômica (Claim):** Para evitar que dois médicos atendam a mesma pessoa ao mesmo tempo, o backend executa um comando SQL condicional seguro via Prisma (`updateMany` com filtros de concorrência), garantindo que apenas o primeiro médico a clicar consiga capturar o registro.

### 3.4. Fluxo de Urgência & Ambulância (Segurança Máxima)
1.  **Classificação Crítica:** Caso a triagem ou o médico identifiquem sinais de risco à vida (ex: parada cardiorrespiratória, infarto agudo, AVC), o médico clica no acionamento de emergência no painel.
2.  **Geolocalização Integrada:** O sistema aciona a **Google Maps API** para buscar, autocompletar e validar os dados geográficos e o endereço do paciente (`ambulancia_endereco`), calculando rotas e definindo o hospital de retaguarda de referência mais próximo (`destino_final`).
3.  **Envio Automático:** Os dados estruturados da triagem são compartilhados com a central de ambulâncias credenciada para otimizar o tempo de socorro.

### 3.5. Fluxo Híbrido (Integração Presencial)
1.  **Check-in na Unidade Física:** O paciente realiza o check-in na clínica através do totem ou da recepção. A consulta passa para o status de "aguardando chamada presencial".
2.  **Chamada por Painel:** O médico realiza o acolhimento presencial. As telas do consultório e a base relacional de `HistoriaClinica` são idênticas às utilizadas na telemedicina.
3.  **Prontuário Unificado:** Todo o histórico do paciente fica centralizado e deduplicado na base relacional, independentemente de o atendimento ter ocorrido por videoconferência ou no consultório físico.

---

## 4. Explicação Detalhada da Estrutura de Pastas e Código

A plataforma foi arquitetada como um monorepo para facilitar o compartilhamento de tipos de dados (TypeScript), documentação e scripts de implantação rápida. Abaixo, detalhamos a árvore completa de pastas e o fluxo de dados que rege o ecossistema.

```text
Telemedicina/
├── .github/
│   └── workflows/
│       ├── api-deploy.yml          # Pipeline de CI/CD para Google Cloud Run (Backend)
│       └── web-deploy.yml          # Pipeline de CI/CD para Google Cloud Run (Frontend)
├── docker-compose.yml              # Orquestrador local para subir a stack inteira (API + WebApp + Postgres)
├── nginx/
│   └── conf.d/
│       └── default.conf            # Proxy reverso local unificando as rotas da web e api
├── scripts/
│   ├── build-prod.sh               # Script automatizado de compilação
│   └── run-db-migration.sh         # Script utilitário para executar as migrações Prisma
├── telemedicina_api/               # BACKEND - API REST E SINALIZAÇÃO WEBSOCKET (Fastify + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma           # Modelagem de dados relacional e índices PostgreSQL
│   │   └── migrations/             # Histórico de alterações estruturais do banco de dados
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts         # Instanciação centralizada do Prisma Client (Connection Pool)
│   │   ├── constants/
│   │   │   └── regulatory.ts       # Regras fiscais e limites CFM de territorialidade
│   │   ├── controllers/            # Tratamento direto das requisições HTTP e validação Zod
│   │   │   ├── adminController.ts          # Gestão do corpo clínico e validação de diplomas
│   │   │   ├── anexosController.ts         # Upload e deleção de arquivos privados em consultas
│   │   │   ├── auditController.ts          # Recuperação e filtros de logs de trilha de auditoria
│   │   │   ├── consultasController.ts      # CRUD de teleconsultas e logs regulatórios
│   │   │   ├── googleController.ts         # Fluxo OAuth2 federado de login e cadastro
│   │   │   ├── historiaClinicaController.ts # Confirmação de triagens e recuperação de prontuários
│   │   │   ├── loginController.ts          # Autenticação tradicional e geração de tokens JWT
│   │   │   ├── openaiController.ts         # Endpoints de IA (chat, Whisper, evolução clínica)
│   │   │   ├── perfilController.ts         # Manutenção de dados civis dos pacientes e médicos
│   │   │   ├── prescricoesController.ts    # Assinatura digital (VIDaaS) e integrações MEVO
│   │   │   ├── prontoSocorroController.ts  # Gestão da fila de urgências e resgate por ambulância
│   │   │   ├── registerController.ts       # Criação de contas de usuários e médicos
│   │   │   └── vidaasController.ts         # Callbacks de autorização OAuth do VIDaaS
│   │   ├── middlewares/            # Filtros interceptadores de ciclo de vida HTTP
│   │   │   ├── auth.ts                     # Autenticação JWT e injeção do objeto req.user
│   │   │   └── errorHandler.ts             # Capturador global de erros e sanitização de dados
│   │   ├── routes/                 # Mapeamento e declaração formal dos endpoints do Fastify
│   │   │   ├── admin.ts                    # Rotas protegidas `/admin/*`
│   │   │   ├── audit.ts                    # Rotas `/audit/*`
│   │   │   ├── consultas.ts                # Rotas `/consultas/*`
│   │   │   ├── google.ts                   # Rotas `/auth/google/*`
│   │   │   ├── historiaClinica.ts          # Rotas `/historia-clinica/*`
│   │   │   ├── index.ts                    # Agrupador central de rotas da API
│   │   │   ├── login.ts                    # Rotas `/auth/login`
│   │   │   ├── openai.ts                   # Rotas `/chat-ia/*`
│   │   │   ├── perfil.ts                   # Rotas `/perfil/*`
│   │   │   ├── prescricoes.ts              # Rotas `/prescricoes/*`
│   │   │   ├── prontoSocorro.ts            # Rotas `/ps/*`
│   │   │   ├── register.ts                 # Rotas `/register/*`
│   │   │   └── vidaas.ts                   # Rotas `/vidaas/*`
│   │   ├── services/               # Lógica de Negócios (Business Logic Layer)
│   │   │   ├── consultasService.ts         # Alocação de agenda e auditoria técnica de conexão
│   │   │   ├── emailService.ts             # Disparo de notificações transacionais por e-mail
│   │   │   ├── googleAuthService.ts        # Validação de tokens de ID e SSO do Google
│   │   │   ├── historiaClinicaService.ts   # Algoritmo de deduplicação e resumo cumulativo (Jaccard)
│   │   │   ├── iceServers.ts               # Resolução de servidores TURN/STUN dinâmicos (XirSys)
│   │   │   ├── loginService.ts             # Validação de credenciais locais criptografadas
│   │   │   ├── openaiService.ts            # Orquestrador de Prompts, Whisper e Visão Computacional
│   │   │   ├── perfilService.ts            # Mutação e validação de dados civis
│   │   │   ├── registerService.ts          # Fluxo transacional de criação de usuários e perfis
│   │   │   ├── storageService.ts           # Uploads e geração de Signed URLs de 15 minutos do GCS
│   │   │   ├── verificationService.ts      # Acompanhamento do status de aprovação de médicos
│   │   │   └── vidaasService.ts            # Assinatura digital ICP-Brasil na nuvem via OAuth2
│   │   ├── types/                  # Definições de tipagem global e contratos de dados
│   │   ├── utils/
│   │   │   ├── logger.ts                   # Instância do Winston/Pino para logs estruturados
│   │   │   └── rooms.ts                    # Gerenciador em memória (in-memory map) de WebRTC Rooms
│   │   ├── server-signal.ts        # WebSocket signaling server para conexões P2P WebRTC
│   │   └── server.ts               # Entrada principal da API (Configuração do Fastify e Middlewares)
│   ├── Dockerfile                  # Empacotamento de produção Node.js do backend
│   └── package.json                # Dependências e scripts npm do backend
│
└── telemedicina_front-end/         # FRONTEND - INTERFACE DO USUÁRIO (Next.js v16 App Router)
    ├── public/                     # Imagens estáticas, logotipos e vetores visuais
    ├── public/cid10/               # Arquivos locais estáticos para autocompletar CID-10 de forma instantânea
    ├── src/
    │   ├── app/                    # Estrutura do App Router do Next.js (Roteamento baseado em arquivos)
    │   │   ├── admin/              # Telas administrativas de validação médica e auditoria
    │   │   ├── consultas/          # Módulo principal da jornada do paciente e médico
    │   │   │   ├── agendamento/            # Tela de escolha de datas e horários de consultas
    │   │   │   ├── aguardando/             # Sala de espera reativa (paciente aguardando médico)
    │   │   │   ├── atendimento/            # Sala de teleconsulta com vídeo WebRTC e prontuário integrado
    │   │   │   ├── meus-agendamentos/      # Painel de histórico de agendamentos futuros
    │   │   │   ├── pacientes/              # Visualização de fichas clínicas pelo corpo médico
    │   │   │   ├── pre-consulta/           # Tela de chat interativo da triagem com a IA Angélica
    │   │   │   └── selecao-medico/         # Listagem de médicos, filtros por RQE e média de avaliações
     │   │   ├── historico/          # Linha do tempo clínica com PDFs assinados e anotações antigas
     │   │   ├── home/               # Landing page principal pública da plataforma
     │   │   ├── inicio/             # Dashboard dinâmico pós-login (Painel do Paciente vs. Painel de Plantão do Médico)
     │   │   ├── login/              # Tela de autenticação padrão e integração Google OAuth2
     │   │   ├── register/           # Tela de auto-cadastro com seleção de tipo de usuário
     │   │   ├── perfil/             # Área de preenchimento de dados civis obrigatórios
     │   │   ├── termos/             # Documentos legais do TCLE e políticas de LGPD
     │   │   ├── layout.tsx          # Layout base com barra lateral, cabeçalho e contêineres globais
     │   │   └── page.tsx            # Redirecionador automático de rotas de acordo com a sessão ativa
     │   ├── components/             # Componentes de interface modulares e reutilizáveis
     │   │   ├── common/             # Botões, inputs de texto, modais, cards de vidro e carregadores
     │   │   ├── layout/             # Componentes estruturais (Sidebar, Navbar, Footer)
     │   │   ├── providers/          # Provedores de contexto React (SessionProvider, SWR, ThemeProvider)
     │   │   ├── appointments/       # Componentes de listagem e cartões de consultas marcadas
     │   │   ├── dashboard/          # Componentes para gráficos e estatísticas médicas
     │   │   └── AIAssistant/        # Interface flutuante do assistente médico de IA
     │   ├── hooks/                  # Hooks customizados para gestão de estado reativo complexo
     │   │   ├── useApiData.ts       # Hook utilitário para consumo e cache de dados de API via SWR
     │   │   ├── useConsultationTimer.ts # Contador reativo de tempo de consulta com alertas de limite CFM
     │   │   └── useOptimization.ts  # Hook utilitário para otimizações de renders e estados
     │   ├── lib/
     │   │   ├── auth.ts             # Controle de sessão, decodificação/recuperação de tokens JWT e localStorage
     │   │   ├── webrtc.ts           # Inicialização de sessões WebRTC, sinalização WebSocket e canais P2P
     │   │   ├── errorHandler.ts     # Manipulador global de erros e tratamento de falhas na interface
     │   │   ├── apiError.ts         # Modelo estrito de tipagem de erros retornados pela API
     │   │   ├── google.ts           # Integração e métodos utilitários para o Google Sign-In e Maps API
     │   │   ├── signal.ts           # Métodos auxiliares de sinalização WebSocket para WebRTC
     │   │   ├── upload.ts           # Lógica para envio de arquivos de exames e assinaturas
     │   │   └── axios/
     │   │       ├── config.ts       # Instância e interceptores Axios globais
     │   │       ├── consultas.ts    # Clientes de chamadas de consultas e Pronto Socorro
     │   │       └── ...             # Demais módulos dedicados de chamadas à API (login, perfil, medicos, etc.)
     │   ├── styles/
     │   │   ├── globals.css         # Definições globais de estilos CSS, variáveis do Design System e micro-animações
     │   │   └── auth-modal.css      # Estilos e transições visuais dedicados ao modal de autenticação
     │   ├── types/                  # Tipagens estruturadas da API espelhadas para o frontend
     │   └── middleware.ts           # Middleware do Next.js para controle de rotas privadas no servidor
     ├── Dockerfile                  # Empacotamento de produção do Next.js
     └── package.json                # Dependências e scripts npm do frontend
 ```

---

### 4.3. Ciclo de Vida da Requisição e Fluxo de Dados (Data Flow Architecture)

Para entender a interação integrada das camadas da plataforma, abaixo descrevemos detalhadamente como os dados trafegam pelo sistema nos dois fluxos de maior complexidade.

#### A. Fluxo de Gravação de Dados Médicos (Paciente Confirmando a Triagem com a IA Angélica)

O ciclo de gravação de um prontuário originado no chat de inteligência artificial percorre as seguintes fases:

```
[Next.js App UI]           1. Envia requisição POST com sintomas (/chat-ia/confirmar)
       │
       ▼
[Axios Client]             2. Injeta Token JWT nos headers -> Envia via HTTP
       │
       ▼
[Proxy Nginx]              3. Roteia a chamada de api.matriarcatelemed.com.br/api/* para a porta 3000
       │
       ▼
[Fastify Server]           4. Processa cabeçalhos através dos Middlewares:
       │                      - Fastify Helmet (Validação de Headers CSP)
       │                      - Fastify CORS (Validação de origem segura)
       │                      - Middleware de Auth (Extrai JWT, valida, e popula `req.user`)
       │
       ▼
[Zod Validator]            5. Valida o formato e tipos do JSON enviado no corpo da requisição (Zod Schema)
       │
       ▼
[OpenAIController]         6. Recebe o payload validado -> Invoca os serviços de backend
       │
       ▼
[HistoriaClinicaService]   7. Executa as Regras de Negócio complexas:
       │                      - Executa limpeza léxica (Scrubbing de PII do paciente)
       │                      - Invoca o algoritmo de deduplicação (Similaridade de Jaccard > 0.8)
       │                      - Filtra negações semânticas ("nega febre", "não apresenta") via Regex
       │                      - Formata a evolução clínica final formatada em Markdown técnico
       │
       ▼
[Prisma Client]            8. Abre transação ACID estável e segura com o banco relacional PostgreSQL
       │
       ▼
[Postgres Database]        9. Escreve os dados na tabela `historiaClinica` e atualiza a coluna
       │                      `historiaClinicaResumo` da tabela `pacientes`
       │
       ▼
[TrilhaAuditoria]          10. Salva log IMUTÁVEL na tabela de auditoria (Conformidade estrita LGPD)
```

1.  **Ação do Usuário no Frontend:** O paciente finaliza o chat de triagem na rota `/consultas/pre-consulta` e visualiza a condensação do relatório gerado. Ao clicar em "Confirmar Sintomas e Enfileirar", o frontend dispara uma chamada HTTP POST para `/chat-ia/confirmar` contendo o payload de estilo de vida, sintomas e antecedentes familiares.
2.  **Preparação no Axios:** A chamada HTTP é intermediada pelas rotas e instâncias configuradas em `src/lib/axios` (como `config.ts`), que interceptam a requisição e injetam de forma automática o cabeçalho `Authorization: Bearer <token_jwt>` recuperado do `localStorage` do navegador pela biblioteca `lib/auth.ts`.
3.  **Encaminhamento do Nginx:** O proxy reverso recebe a requisição de rede externa criptografada em HTTPS na porta 443, realiza o desmembramento SSL com segurança e repassa a chamada de forma local na porta 3000 para o servidor Fastify da API.
4.  **Hardening e Middleware no Fastify:** O Fastify passa a requisição pela camada de middlewares de infraestrutura de rede:
    *   **Helmet & CORS:** Verificam a integridade dos cabeçalhos da requisição de rede e bloqueiam origens não autorizadas.
    *   **Middleware de Autenticação (`auth.ts`):** Extrai o token JWT, decodifica usando a assinatura secreta `JWT_SECRET`, valida a expiração, localiza o ID de usuário no payload e popula o objeto `req.user` para propagação interna.
5.  **Entrada no Controller & Validação Zod:** O fluxo entra no `historiaClinicaController.ts`. O Fastify Zod Type Provider intercepta o corpo da requisição e valida se os campos estão de acordo com o esquema Zod esperado (evitando SQL injections e payloads corrompidos no início do ciclo). Se o payload for inválido, retorna imediatamente um erro `400 Bad Request` sem estressar a memória de banco de dados.
6.  **Delegação ao Serviço:** O controller invoca o método `confirmarTriagemEPersistir` presente no `historiaClinicaService.ts`.
7.  **Lógica de Negócios e Deduplicação:** O serviço realiza as mutações:
    *   Filtra dados sensíveis sob as diretrizes de compliance LGPD.
    *   Processa e consolida o histórico médico anterior do paciente consultando a tabela `HistoriaClinica` através do **Algoritmo de Jaccard**, removendo redundâncias clínicas.
    *   Compila os sintomas agudos e formata um prontuário Markdown estruturado.
8.  **Persistência via Prisma:** O serviço inicia uma query relacional estruturada através do cliente Prisma em `src/config/database`.
9.  **Escrita Física no Banco de Dados:** O driver do Prisma executa a transação SQL no PostgreSQL, inserindo um novo registro na tabela `historiaClinica` com `status: completo` e atualizando a coluna `historiaClinicaResumo` na tabela de `pacientes`.
10. **Trilha de Auditoria LGPD:** Antes de responder ao cliente, o serviço invoca o salvamento automático de log técnico na tabela `trilha_auditoria`, registrando: quem realizou o acesso (ID do paciente), a ação executada (`CONFIRM_TRIAGEM`), o ID do recurso modificado, a data exata e o IP/UserAgent da requisição.
11. **Retorno de Sucesso:** O controller recebe a resposta do banco de dados relacional e retorna uma resposta JSON de sucesso com status `201 Created` para o frontend.
12. **Atualização no Frontend:** O Next.js recebe o status, limpa a fila do chat, redireciona o paciente para a sala de espera `/consultas/aguardando` e inicia as conexões WebSockets para Pronto Socorro.

#### B. Fluxo de Sinalização e Transmissão de Vídeo P2P (Teleconsulta WebRTC)

O fluxo de sincronia dinâmica de áudio e vídeo entre o médico e o paciente ocorre por meio da seguinte sequência de orquestração:

```
[Paciente Frontend]             [Servidor Fastify WebSockets]             [Médico Frontend]
  (src/lib/webrtc.ts)               (src/server-signal.ts)                 (src/lib/webrtc.ts)
       │                                     │                                     │
       │ 1. Conecta via WS no caminho        │                                     │
       │    /signal?roomId=X&token=Y         │                                     │
       ├────────────────────────────────────>│                                     │
       │                                     │ 2. Valida token JWT e adiciona      │
       │                                     │    paciente à sala roomId no Map    │
       │                                     │                                     │
       │                                     │ 3. Conecta via WS no caminho        │
       │                                     │    /signal?roomId=X&token=Y         │
       │                                     │<────────────────────────────────────┤
       │                                     │                                     │
       │                                     │ 4. Valida token JWT e adiciona      │
       │                                     │    médico à sala roomId no Map      │
       │                                     │                                     │
       │                                     │ 5. Dispara evento 'ready' via WS    │
       │<────────────────────────────────────┼────────────────────────────────────>│
       │                                     │                                     │
       │ 6. Cria RTCPeerConnection local e   │                                     │
       │    gera pacote SDP Offer            │                                     │
       │ 7. Envia 'offer' via WS             │                                     │
       ├────────────────────────────────────>│                                     │
       │                                     │ 8. Repassa 'offer' para o médico    │
       │                                     │────────────────────────────────────>│
       │                                     │                                     │
       │                                     │ 9. Recebe 'offer', cria Peer        │
       │                                     │    Connection local e gera 'answer' │
       │                                     │ 10. Envia 'answer' via WS           │
       │                                     │<────────────────────────────────────┤
       │                                     │                                     │
       │ 11. Repassa 'answer' para o paciente│                                     │
       │<────────────────────────────────────│                                     │
       │                                     │                                     │
       │ 12. Trocam candidatos ICE (pacotes de rede) através do servidor de sinalização    │
       │<────────────────────────────────────┼────────────────────────────────────>│
       │                                     │                                     │
       │ 13. Estabelecem conexão de vídeo direta P2P (Peer-to-Peer)                        │
       │===================================================================================│
```

1.  **Conexão do Paciente:** O paciente, ao entrar na sala de vídeo `/consultas/atendimento`, inicializa a sessão WebRTC por meio do módulo utilitário `src/lib/webrtc.ts`. Este módulo estabelece a conexão de WebSocket no canal seguro do backend: `wss://api.matriarcatelemed.com.br/signal?roomId={consultaId}&token={jwt}`.
2.  **Autenticação do Socket (Paciente):** O servidor de sinalização do Fastify (`server-signal.ts`) intercepta a conexão do WebSocket, decodifica o token JWT presente no parâmetro da URL, valida a permissão do usuário de acesso àquela consulta específica, e o mapeia na memória volátil (`rooms.ts`) como o participante do lado do paciente da sala `roomId`.
3.  **Conexão do Médico:** O médico aceita o plantão na fila de Pronto Socorro e o Next.js o redireciona para a mesma interface de atendimento. O módulo `src/lib/webrtc.ts` do lado do médico executa o mesmo processo de conexão ao WebSocket seguro do backend.
4.  **Autenticação do Socket (Médico):** O servidor de sinalização valida o JWT del médico e adiciona o socket dele na mesma sala `roomId` no mapa interno de conexões.
5.  **Disparo do Estado "Ready":** Ao detectar que ambos os participantes obrigatórios da consulta (médico e paciente) estão conectados ativamente na sala, o servidor de sinalização dispara uma mensagem de WebSocket com o evento `ready` para ambos os clientes.
6.  **Geração do SDP Offer (Paciente):** O módulo `src/lib/webrtc.ts` no cliente do paciente captura o evento `ready`, inicia o acesso aos dispositivos de câmera e microfone do paciente por meio da API do navegador `navigator.mediaDevices.getUserMedia`, instancia a classe nativa do navegador `RTCPeerConnection`, adiciona as tracks de mídia locais na conexão, gera um pacote de configuração SDP do tipo `offer` (contendo codecs suportados e especificações de compressão) e o define como a sua configuração local de mídia (`setLocalDescription`).
7.  **Transmissão do SDP Offer:** O paciente envia o pacote `offer` formatado em JSON através do canal de WebSocket ativo para o servidor.
8.  **Encaminhamento do SDP Offer:** O servidor de sinalização recebe o pacote e o repassa imediatamente para o socket ativo do médico na mesma sala.
9.  **Geração do SDP Answer (Médico):** O módulo `src/lib/webrtc.ts` no cliente do médico recebe o pacote `offer`, o define como sua configuração de mídia remota (`setRemoteDescription`), inicializa a captura de seus próprios fluxos de microfone e câmera, adiciona suas tracks de mídia na sua conexão `RTCPeerConnection` local, gera um pacote de contraproposta SDP de tipo `answer` e o define localmente como `setLocalDescription`.
10. **Transmissão do SDP Answer:** O médico envia a resposta de configuração `answer` via WebSocket de volta ao servidor de sinalização.
11. **Encaminhamento do SDP Answer:** O servidor repassa a resposta do médico para o WebSocket ativo do paciente, que define o pacote como sua configuração remota de mídia (`setRemoteDescription`).
12. **Troca Dinâmica de ICE Candidates:** Paralelamente, ambas as instâncias da classe `RTCPeerConnection` começam a emitir eventos de *ICE Candidates* (opções de IP e portas públicas para viabilizar conexões de rede direta, solicitados e gerados dinamicamente com suporte da API do provedor **XirSys**). Esses pacotes de candidatos ICE são continuamente enviados através do WebSocket de sinalização e injetados na conexão remota de cada ponta (`addIceCandidate`).
13. **Estabelecimento de Canal de Vídeo Direto (P2P):** As duas partes localizam o melhor caminho de rede física comum e fecham a conexão criptografada direta sem interposição de servidores. O áudio e vídeo de alta performance são renderizados nos elementos HTML de player de vídeo no Next.js.

---

## 5. Stack Tecnológica

O ecossistema de software foi selecionado visando à máxima performance de resposta, segurança de tipos (type-safety) e arquitetura defensiva para dados de saúde.

### 5.1. Backend
*   **Runtime & Linguagem:** Node.js v20+ rodando com TypeScript estrito.
*   **Framework Web:** **Fastify v4+** (alta performance e validação de esquemas JSON).
*   **Banco de Dados & ORM:** **Prisma ORM** para PostgreSQL (mapeamento seguro de tipos em tempo de compilação).
*   **Comunicação em Tempo Real:** **WebSockets (biblioteca `ws`)** rodando em canal integrado de sinalização SDP (`/signal`).

### 5.2. Frontend
*   **Arquitetura:** **React v19** com **Next.js v16 (App Router)**.
*   **Estilização:** **Tailwind CSS & CSS Modules**.
*   **Gerenciamento de Requisições:** **Axios** associado a bibliotecas de cache como **SWR**.

### 5.3. Hardening e Segurança do Servidor (Fastify)
1.  **Fastify Helmet (Segurança de Cabeçalhos):** Implementa proteções rígidas contra ataques XSS, Clickjacking e Sniffing. Configura políticas de segurança de conteúdo (CSP) restritas que permitem apenas requisições HTTP e WebSockets seguros da plataforma e integrações autenticadas da OpenAI:
    ```typescript
    server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "wss:", "https://api.openai.com"]
        }
      }
    })
    ```
2.  **Fastify CORS:** Bloqueia acessos externos em produção. Permite apenas origens previamente declaradas nas variáveis de ambiente com suporte obrigatório a envio de credenciais seguras (`credentials: true`).
3.  **Fastify Rate-Limit:** Configura barreiras de proteção contra ataques de negação de serviço (DoS) e força bruta. Define o limite padrão de **100 requisições por minuto** para endpoints gerais e limites específicos de até **5 chamadas por minuto** para rotas de inteligência artificial e transcrição de áudio.
4.  **Validação de Magic Bytes:** Para impedir que hackers enviem malwares executáveis disfarçados de PDF em exames ou receitas, os controllers executam a validação dos primeiros bytes de dados do arquivo em memória (*Magic Bytes*). O upload é sumariamente rejeitado caso o cabeçalho não corresponda aos bytes estritos de um PDF (`%PDF`).

---

## 6. Infraestrutura e Serviços Externos Consumidos

A infraestrutura foi desenhada para operar na nuvem do Google Cloud Platform (GCP) com microsserviços integrados a APIs externas líderes de mercado:

*   **Google Cloud Run (Servidor de Aplicação):** Ambiente serverless que hospeda a API em Fastify e o Frontend em Next.js.
*   **PostgreSQL (Cloud SQL no GCP):** Banco de dados relacional que garante conformidade ACID para dados médicos sensíveis.
*   **Google Cloud Storage (GCS - Armazenamento de Arquivos):** Guarda de arquivos confidenciais. A autenticação é feita via **Workload Identity Federation**, eliminando chaves salvas em código. O acesso é feito apenas via **Signed URLs** que **expiram após 15 minutos** com metadados de compliance (`compliance: CFM-2314-2022` e `lgpd-classification: dado-sensivel`).
*   **OpenAI API:** Consumo dos modelos de linguagem `gpt-4o`, `gpt-4o-mini` e Whisper.
*   **MEVO:** API de receituários eletrônicos com QR Code e bulas.
*   **VIDaaS (Assinatura Eletrônica ICP-Brasil):** Assinatura de PDFs integrada na nuvem usando fluxo OAuth2 seguro.
*   **XirSys STUN/TURN:** Fornece servidores ICE dinâmicos essenciais para desviar de NATs simétricos no WebRTC.
*   **Google OAuth 2.0 & Google Maps API:** Autenticação SSO e geolocalização de ambulâncias de urgência.

---

## 7. Arquitetura do Banco de Dados (Schema Prisma)

A persistência de dados é estruturada sob fortes regras de integridade relacional. Abaixo está a definição completa de cada modelo presente na base de dados:

```
+------------------+         +--------------------+         +-----------------------+
|     Usuario      |1       1|      Paciente      |1       *|    HistoriaClinica    |
| - id (PK)        |---------| - id (PK)          |---------| - id (PK)             |
| - email          |         | - nome_completo    |         | - pacienteId (FK)     |
| - senha_hash     |         | - cpf              |         | - conteudo (MD)       |
| - tipo_usuario   |         | - historiaResumo   |         | - historicoPessoal    |
+------------------+         +--------------------+         +-----------------------+
         |1                            |1                               |0..1
         |                             |                                |
         |1                            |* (Paciente)                    |* (Historia)
+------------------+         +--------------------+                     |
|      Medico      |1       *|      Consulta      |-------------------------+
| - id (PK)        |---------| - id (PK)          |
| - nome_completo  | (Medico)| - status (Enum)    |---------+
| - crm / crm_uf   |         | - data_consulta    |         |
| - vidaas_tokens  |         +--------------------+         |
+------------------+                    |1                  |1
                                        |                   |
                                        |*                  |*
                             +--------------------+  +-----------------------+
                             |   ConsultaAnexo    |  |      Prescricao       |
                             | - id (PK)          |  | - id (PK)             |
                             | - arquivo_url      |  | - mevoId / mevoStatus |
                             +--------------------+  +-----------------------+
```

### 7.1. Algoritmo de Resumo Clínico Consolidado
Implementado na classe `HistoriaClinicaService` (`gerarResumoConsolidado`).
1.  **Deduplicação Inteligente (Coeficiente de Jaccard):** O algoritmo calcula a similaridade matemática de Jaccard entre termos (ex: "Roacutan" e "Roacutan 20mg"). Se a similaridade for superior a `0.8` ou uma string contiver a outra, mantém apenas uma delas na lista acumulada.
2.  **Mapeamento Semântico e Normalização:** Chaves de campos são unificados em cabeçalhos fixos (ex: "exercicios" e "caminhada" em "Atividade física", "bebida" em "Álcool", "cigarro" em "Tabagismo").
3.  **Filtragem de Negações:** O analisador léxico (`isNegative`) baseado em Expressões Regulares descarta termos que indiquem ausência (ex: "nega tabagismo", "não tem", "não coletado", "nao possui").
4.  **Formatação Automática de Títulos:** Nomes de remédios e diagnósticos são padronizados usando algoritmos de capitalização de texto que ignoram preposições gramaticais.
5.  **Output Markdown:** O resultado é salvo na coluna `historiaClinicaResumo` do perfil do `Paciente` contendo o prontuário permanente cumulativo do paciente em Markdown profissional.

### 7.2. Modelos Relacionais (Prisma)

#### Modelo: `Usuario` (`usuarios`)
Tabela central para fins de autenticação e controle de privilégios globais de navegação.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `email`: `String` - Endereço único de correio eletrônico do usuário (limite de 255 caracteres).
*   `senha_hash`: `String?` - Hash criptográfico de senha (opcional para usuários logados com Google SSO).
*   `google_id`: `String?` - Chave de identificação federada do Google OAuth 2.0.
*   `registroFull`: `Boolean` - Sinaliza se o cadastro cadastral obrigatório foi concluído no frontend.
*   `tipo_usuario`: `TipoUsuario` (Enum: `medico`, `paciente`, `admin`).

#### Modelo: `Paciente` (`pacientes`)
Armazena a ficha cadastral civil, informações de saúde física e histórico unificado do paciente.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `usuario_id`: `Int` - Chave Estrangeira única relacionando ao modelo `Usuario` (Deleção em cascata).
*   `nome_completo`: `String` - Nome civil completo do paciente.
*   `data_nascimento`: `DateTime` - Data de nascimento (tipo `@db.Date`).
*   `cpf`: `String` - Cadastro de Pessoa Física único (limite de 14 caracteres).
*   `sexo`: `String` - Gênero de identificação (limite de 20 caracteres).
*   `estado_civil`: `String` - Estado civil do paciente.
*   `telefone`: `String` - Número de contato telefônico móvel ou fixo.
*   `nome_mae`: `String?` - Nome completo da mãe (obrigatório para prescrição de certos controlados MEVO).
*   `telefone_responsavel`: `String?` - Telefone de contato de responsável (para menores de idade).
*   `peso`: `Decimal?` - Peso corporal registrado do paciente (limite de precisão `5, 2`).
*   `altura`: `Int?` - Altura física em centímetros.
*   `notas`: `String?` - Bloco livre de anotações administrativas de recepção.
*   `historiaClinicaResumo`: `String?` - Campo Markdown contendo a história consolidada livre de duplicatas gerada pelo algoritmo.
*   `aceitouTCLE`: `Boolean` - Controle legal de aceite do Termo de Consentimento Livre e Esclarecido (TCLE) de telessaúde.
*   `tcleData`: `DateTime?` - Data e hora exatas da assinatura digital do termo.
*   `tcleVersion`: `String?` - Versão do termo aceito (padrão: `"1.0"`).

#### Modelo: `Medico` (`medicos`)
Ficha cadastral profissional contendo chaves de conselho de classe e tokens de assinatura digital.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `usuario_id`: `Int` - Chave Estrangeira única relacionando ao modelo `Usuario` (Deleção em cascata).
*   `nome_completo`: `String` - Nome profissional do médico.
*   `data_nascimento`: `DateTime` - Data de nascimento do médico.
*   `cpf`: `String` - Registro CPF do médico.
*   `crm`: `String` - CRM de classe médica (limite de 50 caracteres).
*   `crm_uf`: `String` - Unidade Federativa de registro ativo do CRM (padrão: `"SP"`, limite de 2 caracteres).
*   `rqe`: `String?` - Registro de Qualificação de Especialidade (obrigatório para declarar especialidades no CFM).
*   `diploma_url`: `String?` - Caminho privado no bucket GCS do arquivo PDF do diploma de graduação.
*   `especializacao_url`: `String?` - Caminho privado no GCS do certificado de residência ou especialização.
*   `vidaas_external_id`: `String?` - Chave externa do médico retornada pela VIDaaS para indexar assinaturas.
*   `vidaas_refresh_token`: `String?` - Token de atualização seguro persistido para renovar chaves de assinatura do VIDaaS.
*   `seguro_responsabilidade_url`: `String?` - Caminho no GCS do documento de seguro de responsabilidade civil médico.
*   `verificacao`: `StatusVerificacao` (Enum: `pendente_documentos`, `analise`, `verificado`, `recusado`).
*   `especialidade`: `String?` - Especialidade de atendimento primário declarada.
*   `resumo_profissional`: `String?` - Pequeno texto autobiográfico de exibição na seleção de consultas.
*   `avaliacao`: `Float?` - Média aritmética de satisfação atualizada dinamicamente (de 1 a 5 estrelas).
*   `telefone_celular`: `String?` - Celular validado para autenticação de dois fatores e cadastros MEVO.

#### Modelo: `Endereco` (`enderecos`)
Tabela auxiliar de moradia. Vincula múltiplos endereços a um usuário.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `usuario_id`: `Int` - Chave Estrangeira vinculando ao modelo `Usuario`.
*   `endereco`: `String` - Logradouro e rua principal.
*   `numero`: `String?` - Número residencial.
*   `complemento`: `String?` - Apartamento, bloco ou referências.
*   `bairro`: `String?` - Bairro residencial.
*   `cep`: `String?` - Código de Endereçamento Postal.
*   `cidade`: `String?` - Cidade de residência.
*   `estado`: `String?` - Sigla do Estado (limite de 2 caracteres).

#### Modelo: `Consulta` (`consultas`)
O ponto central do banco de dados, que une médicos, pacientes, históricos e faturamentos.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `medicoId`: `Int?` - Chave Estrangeira mapeando ao `Medico` (Nulo quando na fila de Pronto Socorro).
*   `pacienteId`: `Int` - Chave Estrangeira mapeando ao `Paciente`.
*   `status`: `ConsultaStatus` (Enum: `scheduled`, `agendada`, `in_progress`, `finished`, `solicitada`, `cancelled`, `expired`).
*   `data_consulta`: `DateTime?` - Data marcada para a teleconsulta.
*   `hora_inicio`: `DateTime?` - Horário de início do atendimento ou entrada em vigor do vídeo (tipo `@db.Time`).
*   `hora_fim`: `DateTime?` - Horário de término da consulta.
*   `createdAt`: `DateTime` - Registro automático de criação da consulta.
*   `resumo`: `String?` - Anotações textuais do médico sobre a consulta.
*   `diagnostico`: `String?` - Laudo de diagnóstico clínico final.
*   `cid`: `String?` - Código CID-10 associado ao diagnóstico (limite de 10 caracteres).
*   `evolucao`: `String?` - Evolução clínica preenchida pelo médico.
*   `plano_terapeutico`: `String?` - Instruções finais de conduta, acompanhamentos e cuidados.
*   `especialidade_seguimento`: `String?` - Indicação de especialidades adicionais para consultas futuras.
*   `ambulancia_endereco`: `String?` - Endereço completo formatado para acionamento emergencial de ambulância.
*   `ambulancia_complemento`: `String?` - Complemento de endereço da ambulância.
*   `ambulancia_info`: `String?` - Informações de pontos de referência cadastrados para a tripulação de resgate.
*   `ambulancia_telefone`: `String?` - Contato de telefone do solicitante de resgate.
*   `estrelas`: `Int?` - Nota avaliativa da consulta atribuída pelo paciente ao final da sessão.
*   `avaliacao`: `String?` - Comentário escrito pelo paciente sobre o atendimento médico.
*   `canceladoPor`: `String?` - Identifica se o cancelamento foi feito por `"medico"`, `"paciente"` ou `"admin"`.
*   `canceladoPorId`: `Int?` - ID da entidade (`Medico` ou `Paciente`) que acionou a deleção/cancelamento.
*   `observacaoTecnica`: `String?` - Logs e observações técnicas automáticas de rede para compliance regulatório da telemedicina perante o CFM.

#### Modelo: `ConsultaAnexo` (`consulta_anexos`)
Arquivos vinculados à consulta.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `consultaId`: `Int` - Chave Estrangeira apontando para `Consulta`.
*   `arquivo_url`: `String` - Caminho privado do anexo persistido no bucket GCS.
*   `tipo_mime`: `String` - Mimetype do anexo (ex: `application/pdf`, `image/png`).
*   `nome`: `String?` - Nome amigável de exibição do documento.

#### Modelo: `HistoriaClinica` (`historiaClinica`)
Registra as anamneses e triagens do paciente.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `pacienteId`: `Int` - Chave Estrangeira vinculando ao `Paciente`.
*   `consultaId`: `Int?` - Chave Estrangeira opcional apontando para a `Consulta` relacionada.
*   `status`: `String` - Estado atual do documento (padrão: `"rascunho"`, alterado para `"completo"`).
*   `conteudo`: `String` - Texto markdown unificado contendo o prontuário.
*   `antecedentesFamiliares`: `Json?` - Estrutura JSON com registros patológicos da família.
*   `descricaoSintomas`: `String?` - Relato de sintomas agudos fornecido na triagem.
*   `estiloVida`: `Json?` - Estrutura JSON listando tabagismo, álcool e atividades físicas.
*   `historicoPessoal`: `Json?` - Estrutura JSON com doenças conhecidas, remédios e vacinações.
*   `queixaPrincipal`: `String?` - Queixa principal que motivou o atendimento.

#### Modelo: `Prescricao` (`prescricoes`)
Medicamentos prescritos durante o atendimento.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `consultaId`: `Int` - Chave Estrangeira relacionando à `Consulta`.
*   `mevoId`: `String?` - Identificador gerado pela API da MEVO para rastrear a receita no ecossistema farmacêutico.
*   `mevoStatus`: `String?` - Status atualizado de compra ou controle de integridade da MEVO.
*   `medicamento`: `String` - Nome comercial ou princípio ativo prescrito.
*   `marca`: `String?` - Fabricante ou marca comercial recomendada.
*   `dosagem`: `String` - Concentração ou dose prescrita (ex: "500mg").
*   `frequencia`: `String` - Intervalo de ingestão (ex: "8 em 8 horas").
*   `duracao`: `String` - Duração recomendada do tratamento (ex: "7 dias").
*   `inclusoConvenio`: `Boolean` - Sinaliza se o medicamento é passível de descontos em farmácias conveniadas.
*   `pdf_url`: `String?` - Caminho privado do PDF da prescrição no bucket do GCS.
*   `pdf_mimetype`: `String?` - Tipo mimetype do PDF salvo.
*   `assinaturaHash`: `String?` - Hash criptográfico de assinatura digital gerado pelo VIDaaS/ICP-Brasil para auditoria e validade legal.

#### Modelo: `TrilhaAuditoria` (`trilha_auditoria`)
Tabela imutável que registra acessos para fins de auditoria de conformidade com a LGPD.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `usuarioId`: `Int` - Identificador do usuário que realizou a ação.
*   `acao`: `String` - Ação realizada no sistema (ex: `"CONFIRM_TRIAGEM"`, `"DOWNLOAD_PRESCRICAO_PDF_GCS"`).
*   `recurso`: `String` - Entidade ou tabela acessada.
*   `recursoId`: `Int?` - ID específico do registro alterado ou visualizado.
*   `detalhes`: `String?` - Detalhamento textual ou payloads não sensíveis.
*   `ip`: `String?` - Endereço IP do solicitante (suporta IPv4 e IPv6, limite de 45 caracteres).
*   `userAgent`: `String?` - Identificação do navegador e sistema operacional do requisitante.
*   `createdAt`: `DateTime` - Data e hora automáticas da auditoria.

#### Modelo: `EventoTecnico` (`eventos_tecnicos`)
Registros automáticos de conexões exigidos pela legislação CFM de telessaúde.
*   `id`: `Int` - Chave Primária Auto-incrementável.
*   `consultaId`: `Int` - Chave Estrangeira relacionando à `Consulta`.
*   `usuarioId`: `Int` - Identificador do autor do evento (Paciente ou Médico).
*   `tipo`: `String` - Tipo de evento registrado (ex: `FAIL_CONNECTION`, `LOW_QUALITY`, `BITRATE_DROP`).
*   `status_info`: `Json?` - Payload técnico contendo Bitrate, Jitter, Perda de Pacotes, Latência de Áudio e ICE Candidates.
*   `observacao`: `String?` - Anotações livres sobre a instabilidade de conexão.

---

## 8. Estrutura de Branches e Fluxo de Desenvolvimento

Para garantir a integridade do código em produção, o ciclo de versionamento é dividido em três ambientes isolados mapeados no GitHub:

### 8.1. Branch `main` (Ambiente de Produção)
*   **Topologia de Infraestrutura recomendada no GCP (Suporta 60+ consultas de vídeo concorrentes):**
    *   **API / Frontend (Cloud Run):** Auto-scaling dinâmico (mínimo de 2 instâncias ativas para eliminar *cold starts* e latências de WebSocket, máximo de 10 instâncias). Alocação recomendada de **2 vCPUs e 4GB de RAM** por instância.
    *   **Banco de Dados (Cloud SQL - PostgreSQL):** Instância dedicada modelo `db-custom-2-8192` (**2 vCPUs e 8GB de RAM**). Ativação obrigatória de **Alta Disponibilidade (HA)** e backups automatizados diários.

### 8.2. Branch `dev` (Ambiente de Homologação / Staging)
*   **Topologia de Infraestrutura recomendada no GCP (Suporta até 20 consultas concorrentes):**
    *   **API / Frontend (Cloud Run):** Alocação de **1 vCPU e 2GB de RAM** por instância. O auto-scaling possui teto máximo de 3 instâncias concorrentes.
    *   **Banco de Dados (Cloud SQL):** Instância modelo `db-n1-standard-1` (**1 vCPU e 3.75GB de RAM**) rodando em zona única (sem replicação HA).

### 8.3. Branch `tests` (Ambiente de Integração Contínua e Commits Rápidos)
*   **Topologia de Infraestrutura recomendada no GCP (Suporta até 6 conexões simultâneas):**
    *   **API / Frontend (Cloud Run):** Configurado para escalar até **0 instâncias** quando inativo. Alocação mínima de **1 vCPU e 1GB de RAM**.
    *   **Banco de Dados (Cloud SQL):** Instância modelo `db-g1-small` de baixo custo.

---

## 9. Variáveis de Ambiente (Environment Variables)

### 9.1. API Backend (`telemedicina_api/.env`)

| Variável | Exemplo de Valor | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta local utilizada para o servidor HTTP e WebSockets do Fastify. |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/telemedicina?sslmode=require` | URL de conexão com a base de dados relacional PostgreSQL. |
| `JWT_SECRET` | `4f8e...7b2a` | Chave secreta de criptografia simétrica utilizada para assinar os tokens JWT de sessão. |
| `ENCRYPTION_KEY` | `3b2a...c5a7` | Chave simétrica utilizada para criptografar informações médicas confidenciais em repouso. |
| `OPENAI_API_KEY` | `sk-proj-...` | Token de segurança privado para chamadas de API da OpenAI. |
| `GCS_BUCKET_NAME` | `matriarca-documentos-medicos` | Nome único do bucket privado criado no Google Cloud Storage para documentos médicos. |
| `GOOGLE_CLOUD_PROJECT`| `matriarca-telemedicina-prod`| ID do projeto ativo registrado no console do Google Cloud Platform (GCP). |
| `GOOGLE_CLIENT_ID` | `1029...googleusercontent.com`| ID de Cliente gerado no console de credenciais do Google para o login via SSO. |
| `GOOGLE_CLIENT_SECRET`| `GOCSPX-...` | Chave de Cliente privada utilizada pelo backend no fluxo de troca de chaves SSO do Google. |
| `VIDAAS_CLIENT_ID` | `vidaas_client_prod_42` | ID do aplicativo autenticado na API da certificadora VIDaaS. |
| `VIDAAS_CLIENT_SECRET`| `vds_sec_991823` | Chave secreta de autenticação do aplicativo na VIDaaS. |
| `VIDAAS_REDIRECT_URI` | `https://api.matriarcatelemed.com.br/api/vidaas/callback`| URL de callback homologada na VIDaaS para interceptar retornos OAuth2 do médico. |
| `VIDAAS_BASE_URL` | `https://certificado.vidaas.com.br` | Endpoint base da API de assinaturas da VIDaaS. |
| `STUN_URL` | `stun:stun.l.google.com:19302` | URL do servidor STUN público padrão. |
| `XIRSYS_CHANNEL` | `telemed_webrtc_channel` | Identificador do canal configurado na conta corporativa do provedor XirSys.## 10. Análise de Gaps & Roadmap de Conclusão Técnica (O Que Falta para a Plataforma Ficar Pronta)

Para transicionar do estágio atual de desenvolvimento e consolidar o **Grande Objetivo da Plataforma** (saúde híbrida integrada de alta performance, 100% legalizada perante o CFM e altamente escalável comercialmente), a engenharia do projeto deve executar o seguinte plano de preenchimento de lacunas (Gap Analysis). 

Abaixo, detalhamos exatamente quais módulos de código, tabelas de banco de dados, rotas de API e interfaces visuais do Next.js ainda estão pendentes ou parcialmente codificados, e como implementá-los de ponta a ponta.

---

### Pilar 1: Motor de Splits de Cobrança e Gateway de Pagamento Seguro (Stripe / AbacatePay)
A plataforma exige um ecossistema financeiro automatizado em que a teleconsulta ou atendimento de Pronto Socorro só seja liberado para consumo após a transação financeira segura do paciente, distribuindo as frações devidas ao médico plantonista e ao hospital retaguarda sem bitributação de serviços.

*   **Status Atual (O Que Há Criptografado/Codificado):**
    *   Tabela `Consulta` possui status passíveis de fluxo, mas entra na fila direto como `solicitada` sem bloqueio financeiro intermediário.
    *   Inexistência de controllers de cobrança ou conexões com SDKs de pagamento em `telemedicina_api`.
*   **O Que Falta Desenvolver (Lacuna de Engenharia):**
    1.  **Novos Campos e Índices Prisma (`schema.prisma`):**
        *   Adicionar campo `pagamentoId String? @unique` na tabela `Consulta` para guardar o identificador da transação Stripe.
        *   Adicionar campo `valorPago Decimal? @db.Decimal(10, 2)` na consulta.
        *   Adicionar campo `recebedorSplitId String?` em `Medico` para indexar a conta Stripe Connect do profissional.
    2.  **Serviço Financeiro Backend (`telemedicina_api/src/services/paymentService.ts`):**
        *   Criar métodos `criarSessaoCheckout(pacienteId: number, consultaId: number)` que consome o SDK do Stripe e monta um checkout direcionado para cartão de crédito ou PIX dinâmico.
        *   Implementar método `executarSplitSeguro(transferGroup: string, valorTotal: number, crmMedico: string)` utilizando o **Stripe Connect Split Custom Accounts**.
        *   Regra matemática de Split no serviço: 70% repasse médico, 20% repasse hospital parceiro e 10% retenção de corretagem da plataforma.
    3.  **Controller e Rota do Gateway:**
        *   `telemedicina_api/src/controllers/paymentController.ts` contendo endpoints de geração de checkout e gerenciamento de cartões salvos.
        *   `telemedicina_api/src/routes/payment.ts` expondo a rota `/pagamentos/checkout` e o endpoint desprotegido `/pagamentos/webhook` para o Stripe emitir atualizações de recebimento.
    4.  **Assinatura de Webhook Segura (Anti-Fraude):**
        *   Implementar verificação com assinatura criptográfica `stripe.webhooks.constructEvent(req.body, sigHeader, endpointSecret)` para bloquear falsificação de pagamento no servidor.
        *   Ao receber o webhook `checkout.session.completed`, alterar o status da `Consulta` associada para `agendada` (se agendamento) ou `solicitada` (se Pronto Socorro), acionando o envio do paciente para a fila no banco de dados.
    5.  **Interface de Checkout no Frontend (`telemedicina_front-end`):**
        *   Criar contêiner de checkout integrado na rota `/consultas/agendamento` e na tela de confirmação da triagem de Pronto Socorro utilizando o componente **Stripe Elements** de carregamento em CSS ultra-premium para preservar a estética de vidro da plataforma.

---

### Pilar 2: Processador de Webhooks da MEVO e UX de Carteira Digital
Atualmente, as receitas geradas na MEVO são assinadas e geradas, mas a plataforma não acompanha se o medicamento foi dispensado em farmácias, limitando a capacidade do histórico clínico de manter o controle do tratamento ativo do paciente.

*   **Status Atual:**
    *   Tabela `Prescricao` possui campos passivos `mevoId` e `mevoStatus`, mas sem fluxo dinâmico de atualização síncrona.
*   **O Que Falta Desenvolver (Lacuna de Engenharia):**
    1.  **Expor Rota de Escuta de Farmácias (`telemedicina_api/src/routes/prescricoes.ts`):**
        *   Adicionar rota pública `POST /prescricoes/mevo/webhook`.
    2.  **Validação Criptográfica de Webhook (Segurança CFM/LGPD):**
        *   Escrever método de validação de assinatura HMAC-SHA256 no webhook, descriptografando o cabeçalho `X-Mevo-Signature` enviado pela MEVO utilizando a chave `MEVO_WEBHOOK_SECRET` para atestar a autenticidade da origem dos dados.
    3.  **Processamento Interno de Dispensa:**
        *   Criar lógica em `prescricoesController.ts` que escuta eventos de transição de status (ex: `"dispensado"`, `"cancelado"`, `"expirado"`) de receitas e medicamentos.
        *   Ao receber `"dispensado"` (medicamento comprado fisicamente na farmácia), atualizar o campo `mevoStatus` para `"comprado"` no banco e disparar uma notificação por e-mail via `emailService.ts` instruindo o paciente sobre horários e dosagens corretas do tratamento.
        *   Inserir o log de auditoria técnica (`TrilhaAuditoria`) registrando a compra do medicamento com a marcação de segurança CFM necessária.
    4.  **Interface de Carteira de Receitas (Mobile-First Frontend):**
        *   Criar tela dedicada no Next.js em `/historico/prescricoes/[id]` que consome o PDF assinado da MEVO com o QR Code e renderiza um layout premium com botões adaptativos "Adicionar à Carteira da Apple/Google Wallet" via geração do arquivo `.pkpass` da plataforma de carteiras móveis.

---

### Pilar 3: Autenticação Federada Gov.br SSO e Auditoria Síncrona do CRM / RQE
A plataforma depende de validações burocráticas manuais dos diplomas de médicos para liberação de acessos no sistema administrativo. Para automatizar o onboarding seguro e mitigar judicialmente a presença de médicos falsos na plataforma, é necessária a integração governamental.

*   **Status Atual:**
    *   Tabela `Medico` possui campo `verificacao` regulado por intervenção manual na rota administrativa.
*   **O Que Falta Desenvolver (Lacuna de Engenharia):**
    1.  **Nova Rota Gov.br OAuth2 no Backend:**
        *   Criar `telemedicina_api/src/routes/govbr.ts` expondo `/auth/govbr` para redirecionamento e `/auth/govbr/callback` para interceptação do código de login do servidor do governo federal brasileiro.
    2.  **Serviço de Onboarding Governamental:**
        *   Desenvolver `telemedicina_api/src/services/govBrService.ts` que captura o token de acesso obtido na autenticação Gov.br do profissional (exigindo verificação estrita nível Ouro para maior confiabilidade legal).
        *   Capturar o CPF e o nome civil autenticados no servidor federal.
    3.  **Auditoria Síncrona de Cadastro de Classe:**
        *   Consumir a API governamental de consulta de profissionais de saúde para verificar síncronamente o CRM do médico.
        *   Validar se o CRM está no status "ATIVO" no conselho federal e estadual correspondente a sua `crm_uf`.
        *   Buscar registros de RQE (Registro de Qualificação de Especialidade) associados ao CRM na base federal. Se o RQE for encontrado e validado, alterar a coluna `verificacao` para `verificado` de forma instantânea e marcar a especialidade médica correspondente na base relacional automaticamente.
    4.  **Onboarding Automatizado no Frontend (`telemedicina_front-end`):**
        *   Substituir os inputs manuais de upload de CRM na rota `/register` por um botão de layout azul Gov.br oficial com micro-animação hover que redireciona o usuário para o onboarding unificado.

---

### Pilar 4: Escalabilidade Horizontal WebSockets WebRTC baseada em barramento Redis
Atualmente, as conexões de sinalização SDP no arquivo `server-signal.ts` estão acopladas a um mapa em memória JavaScript. Se a infraestrutura crescer e utilizar duas ou mais instâncias de Cloud Run (com auto-scaling), o paciente conectará em um contêiner e o médico em outro, gerando perda silenciosa de sinalização e telas de vídeo pretas infinitas na teleconsulta.

*   **Status Atual:**
    *   `rooms.ts` armazena e lê salas usando uma instância estática de `new Map()`.
*   **O Que Falta Desenvolver (Lacuna de Engenharia):**
    1.  **Refatoração do Arquivo de Sinalização (`telemedicina_api/src/server-signal.ts`):**
        *   Instalar a biblioteca `ioredis` ou `@redis/client` e instanciar conexões pub/sub em `telemedicina_api/src/config/redis.ts`.
    2.  **Comunicação Baseada em Canais de Pub/Sub no Redis:**
        *   Substituir a emissão local de eventos do socket por chaves globais no Redis.
        *   Ao inicializar uma sala de telemedicina, cada instância de Fastify escuta (subscreve) ao canal de Redis `room:roomId`.
        *   Quando o paciente emitir um sinal SDP (`offer` ou `ice-candidate`), a instância local do Fastify que recebeu o socket publica a mensagem no barramento Redis com o payload estruturado:
            ```json
            {
              "senderId": "paciente_id",
              "roomId": "consulta_id",
              "event": "offer",
              "data": "sdp_string..."
            }
            ```
        *   Todas as instâncias do cluster Fastify recebem a mensagem via Pub/Sub e a instância que possuir o socket do médico conectado encaminha localmente o pacote para o profissional, unificando a sinalização de rede globalmente em menos de 5ms.
    3.  **Persistência de Sessões de Sala:**
        *   Armazenar metadados temporários da sala de teleconsulta (ex: data de expiração, status de presença e tokens TURN) no Redis com tempo de expiração explícito (TTL de 2 horas) para evitar vazamento de memória técnica no ecossistema de infraestrutura.

---

### Pilar 5: Triagem Estruturada sob Protocolo Manchester para Unidades Híbridas (Físicas)
O sistema deve completar a ponte da experiência híbrida física-digital unificando triagens e respeitando as ordens clínicas de gravidade clínica nas duas esferas, evitando que casos críticos percam tempo em salas de espera presenciais ou virtuais.

*   **Status Atual:**
    *   A Enfermeira Virtual Angélica gera relatórios estruturados, mas não define a classificação de gravidade formal nem atribui cores de risco.
*   **O Que Falta Desenvolver (Lacuna de Engenharia):**
    1.  **Nova Tabela no Banco de Dados (`schema.prisma`):**
        *   Criar enum `ProtocoloManchester` com os valores: `VERMELHO` (Emergência imediata), `LARANJA` (Muito urgente - 10 min), `AMARELO` (Urgente - 50 min), `VERDE` (Pouco urgente - 120 min), `AZUL` (Não urgente - 240 min).
        *   Adicionar a coluna `classificacaoRisco ProtocoloManchester?` nas tabelas `HistoriaClinica` e `Consulta`.
    2.  **Implementação de Motor IA Manchester no Backend (`openaiService.ts`):**
        *   Atualizar o prompt de sistema da Enfermeira Angélica (`gpt-4o-mini`) injetando as tabelas e regras estruturadas de triagem clínica do Protocolo Manchester oficial de risco de emergências brasileiras.
        *   Exigir que a IA Angélica preencha de forma síncrona o JSON de resposta da triagem contendo a chave estruturada `"manchester_classification"` baseada em sinais vitais informados ou queixas primárias severas.
    3.  **Automatização de Triagens Críticas de Emergência:**
        *   Se a IA sinalizar `VERMELHO` ou `LARANJA`, o Pronto Socorro Controller altera o status de claim prioritário na fila virtual e, caso o atendimento seja na rede híbrida física, dispara um alerta vermelho instantâneo nas telas das enfermeiras do pronto socorro local via WebSocket.
    4.  **Interface de Totem e Painel de Chamada Presencial (`telemedicina_front-end`):**
        *   Criar a rota de interface de autoatendimento físico no Next.js em `/consultas/totem`. A tela possui layout de vidro minimalista com teclado numérico tátil onde o paciente insere o CPF, atesta o check-in na unidade de saúde física, seleciona os sintomas primários e retira uma senha térmica impressa.
        *   Criar a interface visual de TV de painel de recepção em `/consultas/painel` que reproduz chamadas sonoras reativas contendo o nome do paciente sob a cor do Protocolo Manchester de gravidade gerada pela IA, unificando a ordenação clínica com total conformidade.

---

## 11. Recomendações de Melhorias Sistêmicas e Evolução Tecnológica

Como evolução natural do ecossistema e refinamento da engenharia de software da plataforma, recomendam-se as seguintes melhorias transversais focadas em segurança, resiliência, performance de IA e infraestrutura:

1. **Observabilidade e Tracing (OpenTelemetry + GCP Cloud Logging):**
   * *O que fazer:* Integrar telemetria ponta a ponta usando a biblioteca Pino/Winston no backend, mapeando o tempo de resposta das transações com o PostgreSQL/Prisma e chamadas da OpenAI para antecipar gargalos.
2. **Cache Semântico para IA (Redis + Embeddings):**
   * *O que fazer:* Cachear respostas estruturadas de triagens recorrentes da IA Angélica. Consultas por sintomas comuns semelhantes reduzem os custos das APIs da OpenAI e geram respostas instantâneas (<1s).
3. **Autenticação de Dois Fatores (MFA) Obrigatória para Médicos:**
   * *O que fazer:* Implementar autenticação via TOTP (ex: Google Authenticator/Authy) para profissionais de saúde e administradores, minimizando riscos de acessos indevidos e vazamento de dados (LGPD).
4. **Reconexão Resiliente e Offline-First no Teleatendimento:**
   * *O que fazer:* Refinar o handler WebRTC no frontend com um loop de reconexão automática exponencial (ICE Restart), evitando quedas definitivas na transmissão se a rede 4G/3G do paciente oscilar.
5. **Automação de Testes de Integração de Vídeo (Playwright E2E):**
   * *O que fazer:* Criar testes automatizados simulando duas sessões paralelas do navegador (Médico e Paciente) para validar se a sinalização de vídeo WebRTC P2P e fechamento de prontuário ocorrem sem quebras a cada deploy.
6. **Notificações e Alertas de Status Cadastral via E-mail para Médicos:**
   * *O que fazer:* Utilizar o `emailService.ts` para disparar e-mails transacionais automáticos mantendo o médico informado sobre cada atualização do seu status cadastral (ex: confirmação de recebimento de documentos, transição para "Em Análise", aprovação e ativação como "Verificado", ou e-mail de orientação/recusa caso falte algum documento).
