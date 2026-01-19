# Correção dos Endpoints do Fluxo de Consultas Agendadas

## Problema Identificado

O endpoint `/medicos` estava sendo chamado diretamente com `fetch()` sem seguir o padrão do projeto. Além disso, outros endpoints do fluxo de agendamento (`/consultas/agendar` e `/consultas/agendadas`) também não existiam ou não seguiam o padrão.

## Padrão do Projeto

Todos os endpoints devem:
1. Estar em `src/app/api/[rota]/route.ts`
2. Fazer proxy para a API backend usando `NEXT_PUBLIC_API_URL`
3. Passar o token de autenticação no header
4. Ter funções correspondentes em `src/lib/axios/` que usam `axios` para chamá-los

## Alterações Realizadas

### 1. Criação de Novos Endpoints API

#### ✅ `/api/medicos/route.ts`
- **Método**: GET
- **Descrição**: Lista todos os médicos disponíveis
- **Proxy para**: `${NEXT_PUBLIC_API_URL}/medicos`
- **Autenticação**: Bearer token obrigatório

#### ✅ `/api/consultas/agendar/route.ts`
- **Método**: POST
- **Descrição**: Agenda uma nova consulta
- **Proxy para**: `${NEXT_PUBLIC_API_URL}/consultas/agendar`
- **Autenticação**: Bearer token obrigatório
- **Payload**: 
  ```typescript
  {
    medico_id: number;
    paciente_id: number;
    data_consulta: string; // DD/MM/YYYY ou YYYY-MM-DD
    hora_inicio: string; // HH:mm
  }
  ```

#### ✅ `/api/consultas/agendadas/route.ts`
- **Método**: GET
- **Descrição**: Busca consultas agendadas do usuário logado
- **Proxy para**: `${NEXT_PUBLIC_API_URL}/consultas/agendadas`
- **Autenticação**: Bearer token obrigatório

### 2. Atualização das Funções Axios

#### ✅ `src/lib/axios/medicos.ts`
Adicionada função:
```typescript
export async function listMedicos(token: string): Promise<Medico[]>
```

#### ✅ `src/lib/axios/consultas.ts`
Adicionadas funções:
```typescript
export async function agendarConsulta(
  payload: AgendarConsultaPayload, 
  token: string
): Promise<AgendarConsultaResponse>

// Corrigida URL de /proxy/consultas/agendadas para /api/consultas/agendadas
export async function getNextAppointment(token: string): Promise<NextAppointment | null>
```

### 3. Refatoração da Página de Seleção de Médico

#### ✅ `src/app/consultas/selecao-medico/page.tsx`
- **fetchDoctors()**: Agora usa `listMedicos(token)` do axios ao invés de `fetch()` direto
- **handleSelectDoctor()**: Agora usa `agendarConsulta(payload, token)` do axios ao invés de `fetch('/proxy/consultas/agendar')`
- **Validações**: Adicionadas verificações para `user.id`, `date` e `time` antes de agendar
- **Tratamento de erros**: Melhorado para capturar erros da API corretamente

## Fluxo de Agendamento Completo

1. **Página inicial de consultas** (`/consultas`)
   - Botão "Agendar Consulta" → redireciona para `/consultas/agendamento`

2. **Página de agendamento** (`/consultas/agendamento`)
   - Usuário seleciona data e horário
   - Botão "Continuar para Triagem" → redireciona para `/consultas/pre-consulta?flow=agendamento&date=...&time=...`

3. **Página de pré-consulta** (`/consultas/pre-consulta`)
   - IA Angélica realiza triagem do paciente
   - Ao finalizar → redireciona para `/consultas/selecao-medico?date=...&time=...`

4. **Página de seleção de médico** (`/consultas/selecao-medico`)
   - Lista médicos usando `GET /api/medicos`
   - Usuário seleciona médico
   - Agenda consulta usando `POST /api/consultas/agendar`
   - Redireciona para `/consultas` (página inicial de consultas)

## Endpoints Backend Necessários

Para que o fluxo funcione completamente, o backend precisa implementar:

1. **GET** `/medicos`
   - Retorna lista de médicos disponíveis
   - Resposta esperada: Array de objetos com `id`, `nome_completo`, `crm`, etc.

2. **POST** `/consultas/agendar`
   - Recebe payload com `medico_id`, `paciente_id`, `data_consulta`, `hora_inicio`
   - Cria nova consulta agendada
   - Resposta esperada: `{ message, consultaId }`

3. **GET** `/consultas/agendadas`
   - Retorna consultas agendadas do usuário autenticado
   - Resposta esperada: Objeto ou array com dados da consulta

## Testes Recomendados

1. ✅ Verificar se o endpoint `/api/medicos` retorna dados corretamente
2. ✅ Testar fluxo completo de agendamento (data → triagem → médico → confirmação)
3. ✅ Verificar se o token está sendo passado corretamente em todas as requisições
4. ✅ Testar tratamento de erros (médico não disponível, horário já ocupado, etc.)

## Arquivos Modificados

- ✅ `src/app/api/medicos/route.ts` (CRIADO)
- ✅ `src/app/api/consultas/agendar/route.ts` (CRIADO)
- ✅ `src/app/api/consultas/agendadas/route.ts` (CRIADO)
- ✅ `src/lib/axios/medicos.ts` (MODIFICADO - adicionada função listMedicos)
- ✅ `src/lib/axios/consultas.ts` (MODIFICADO - adicionada função agendarConsulta e corrigida getNextAppointment)
- ✅ `src/app/consultas/selecao-medico/page.tsx` (MODIFICADO - refatorado para usar axios)

## Status

✅ **Todos os endpoints agora seguem o padrão do projeto**
✅ **Código refatorado e pronto para testes**
