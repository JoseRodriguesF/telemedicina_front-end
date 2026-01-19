# 🏥 Sistema de Consultas Agendadas - Status da Implementação

## ✅ Fase 1 - CONCLUÍDA

### Estrutura de Dados
- ✅ Criado tipo `ConsultaAgendada` com todos os campos do backend
- ✅ Função `getConsultasAgendadas(token)` para buscar consultas
- ✅ Removido tipo antigo `Next Appointment` que era mock

### Página `/inicio` - Card Próxima Consulta
- ✅ Integração com API real
- ✅ Filtragem por status "agendada"
- ✅ Ordenação por data/hora mais próxima
- ✅ Exibição diferenciada:
  - **Médico**: Vê nome do paciente
  - **Paciente**: Vê nome do médico
- ✅ Formatação de data em português (DD/MM/AAAA)
- ✅ Formatação de hora (HH:mm)

---

## 🔄 Fase 2 - PENDENTE

### Página `/consultas` - Cards de Próximas Consultas

**Objetivo**: Substituir dados simulados por dados reais

**Arquivo**: `src/app/consultas/page.tsx`

**Implementar**:
1. Buscar `getConsultasAgendadas(token)`
2. Filtrar por status "agendada"
3. Ordernar por data/hora
4. Exibir **máximo 3 cards**
5. Para cada card mostrar:
   - Data (DD/MM)
   - Horário (HH:mm)
   - Nome do médico (paciente) ou paciente (médico)
   - Status "Confirmado"

**Código Exemplo**:
```typescript
const [consultas, setConsultas] = useState<ConsultaAgendada[]>([]);

useEffect(() => {
  const token = getToken();
  if (token) {
    getConsultasAgendadas(token)
      .then(data => {
        const agendadas = data
          .filter(c => c.status === 'agendada')
          .sort((a, b) => {
            const dateA = new Date(`${a.data_consulta}T${a.hora_inicio}`).getTime();
            const dateB = new Date(`${b.data_consulta}T${b.hora_inicio}`).getTime();
            return dateA - dateB;
          })
          .slice(0, 3); // Máximo 3
        setConsultas(agendadas);
      });
  }
}, []);
```

---

## 🔄 Fase 3 - PENDENTE

### Fluxo Diferenciado: Botão "Agendar Consulta"

**Objetivo**: Diferentes ações para médico vs paciente

#### Para PACIENTE (mantém o fluxo atual):
```typescript
// Botão redireciona para /consultas/agendamento
onClick={() => router.push('/consultas/agendamento')}
```

#### Para MÉDICO (novo fluxo):
```typescript
// Botão redireciona para /consultas/meus-agendamentos
onClick={() => router.push(
  isMedico ? '/consultas/meus-agendamentos' : '/consultas/agendamento'
)}
```

---

## 🔄 Fase 4 - PENDENTE

### Nova Página `/consultas/meus-agendamentos` (para médicos)

**Objetivo**: Médico vê lista de suas consultas agendadas

**Arquivo a criar**: `src/app/consultas/meus-agendamentos/page.tsx`

**Funcionalidades**:
1. Lista todas consultas do médico (filtro: `medicoId === userId`)
2. Exibe:
   - Data e hora
   - Nome do paciente
   - Status da consulta
3. Permite filtrar por:
   - Todas / Hoje / Esta Semana / Este Mês
4. Ordenação por data mais próxima primeiro

**Layout Sugerido**:
```
┌─────────────────────────────────────┐
│ Meus Agendamentos                   │
├─────────────────────────────────────┤
│ [Todas] [Hoje] [Semana] [Mês]      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 23/01/2026 - 14:00              │ │
│ │ Paciente: Maria Santos          │ │
│ │ Status: Agendada                │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 25/01/2026 - 10:00              │ │
│ │ Paciente: João Silva            │ │
│ │ Status: Agendada                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📊 Formato de Dados da API

### GET /api/consultas/agendadas

**Resposta**:
```json
[
  {
    "id": 123,
    "medicoId": 5,
    "pacienteId": 10,
    "status": "agendada",
    "data_consulta": "2026-01-20",
    "hora_inicio": "14:00:00",
    "hora_fim": "15:00:00",
    "createdAt": "2026-01-19T03:00:00.000Z",
    "updatedAt": "2026-01-19T03:00:00.000Z",
    "medico": {
      "id": 5,
      "nome_completo": "Dr. João Silva"
    },
    "paciente": {
      "id": 10,
      "nome_completo": "Maria Santos"
    }
  }
]
```

---

## 🎯 Próximos Passos

1. ✅ **Testar build** - Verificar se Fase 1 funciona
2. ⏳ Implementar Fase 2 (cards em /consultas)
3. ⏳ Implementar Fase 3 (botão diferenciado)
4. ⏳ Implementar Fase 4 (página meus-agendamentos)
5. ⏳ Testes end-to-end do fluxo completo

---

## 📝 Notas Técnicas

- **Token**: Sempre usar `getToken()` do `@/lib/auth`
- **User ID**: Usar `getUser().id` para filtros
- **Tipo Usuário**: Verificar `isMedico` com `getUser().tipo_usuario === 'medico'`
- **Ordenação**: Sempre `new Date(data + T + hora).getTime()`
- **Limite**: Máximo 3 cards na página principal

---

**Status Geral**: 25% Concluído ✅
**Próxima Ação**: Aguardar build e implementar Fase 2
