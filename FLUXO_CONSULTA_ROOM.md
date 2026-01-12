# Fluxo de Conexão Médico-Paciente em uma Room

Este documento explica o fluxo completo dos endpoints responsáveis por conectar um médico e um paciente em uma sala (room) para uma consulta, além de orientar como permitir que, caso um dos participantes saia da sala, ele possa retornar e continuar a consulta.

## 1. Criação e Entrada em uma Room

### a) Criação da Room
- Normalmente, a room é criada quando o médico ou paciente inicia uma consulta.
- Um endpoint (ex: `POST /consultas/criar-room`) pode ser responsável por criar uma nova room e retornar um identificador único (roomId).

### b) Entrada na Room
- Tanto o médico quanto o paciente usam o roomId para entrar na sala.
- Endpoint típico: `POST /consultas/entrar-room`
  - Parâmetros: `roomId`, `userId` (identificação do usuário), `role` (médico ou paciente).
  - O backend valida se o usuário pode entrar na room e registra sua presença.

## 2. Sinalização e Comunicação
- Após ambos entrarem na room, ocorre a troca de sinalização (signaling) para estabelecer a conexão WebRTC.
- Endpoints comuns:
  - `POST /signal/offer` — Envia a oferta SDP.
  - `POST /signal/answer` — Envia a resposta SDP.
  - `POST /signal/candidate` — Envia candidatos ICE.
- O backend repassa as mensagens entre os participantes conectados à mesma room.

## 3. Detecção de Saída e Retorno à Room

### a) Saída da Room
- Se um participante fecha o navegador ou perde a conexão, o backend pode detectar a saída via WebSocket ou timeout.
- O status do usuário na room é atualizado para "desconectado", mas a room permanece ativa enquanto a consulta não for encerrada.

### b) Retorno à Room
- O usuário pode usar o mesmo endpoint de entrada (`POST /consultas/entrar-room`) com o mesmo `roomId` e `userId`.
- O backend verifica se a consulta ainda está ativa e permite o reingresso.
- O fluxo de sinalização é reiniciado para restabelecer a conexão WebRTC.

## 4. Encerramento da Consulta
- Quando a consulta termina (por ação do médico, paciente ou timeout), a room é encerrada e não permite mais reingresso.

## Exemplo de Fluxo
1. Médico inicia consulta → Room criada → Recebe `roomId`.
2. Paciente recebe convite ou link com `roomId`.
3. Ambos usam `POST /consultas/entrar-room` para entrar.
4. Troca de sinalização via endpoints de signaling.
5. Se um participante cai, pode usar novamente `POST /consultas/entrar-room` para retornar.
6. Consulta termina → Room encerrada.

## Observações Importantes
- O controle de presença e reingresso deve ser feito no backend, associando usuários à room e permitindo múltiplas conexões enquanto a consulta estiver ativa.
- O frontend deve guardar o `roomId` e `userId` para permitir o retorno automático em caso de queda.
- O backend pode implementar um tempo limite para manter a room ativa após a saída de todos os participantes.

## Endpoint de Salas em Andamento (Fila de Consultas)

Para listar todas as salas (consultas) que estão em andamento (status `in_progress`), utilize o endpoint:

```
GET /ps/salas-em-andamento
```

### Como usar
- Apenas médicos autenticados podem acessar este endpoint.
- O retorno será uma lista de objetos contendo:
  - `consultaId`: ID da consulta
  - `pacienteId`: ID do paciente
  - `medicoId`: ID do médico
  - `roomId`: Identificador da sala
  - `createdAt`: Timestamp da criação
  - `status`: Sempre `in_progress`

#### Exemplo de resposta
```json
[
  {
    "consultaId": 123,
    "pacienteId": 456,
    "medicoId": 789,
    "roomId": "abc123xyz",
    "createdAt": 1705075200000,
    "status": "in_progress"
  }
]
```

Esse endpoint serve como fila para consultas que já estão em andamento, permitindo que o sistema ou o médico monitore e acesse rapidamente as salas ativas.

---

