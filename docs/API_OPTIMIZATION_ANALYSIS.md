# Análise e Otimização de Consumo de API

## 📊 Resumo Executivo

Este documento detalha a análise completa do consumo de API no projeto de telemedicina, identificando problemas de performance e propondo soluções otimizadas.

---

## 🔍 Problemas Identificados

### 1. **Chamadas Duplicadas e Redundantes**

#### Problema em `app/inicio/page.tsx` (Linhas 136-209)
```typescript
// ❌ PROBLEMA: Duas chamadas simultâneas sem necessidade
useEffect(() => {
  // ...
  getConsultasAgendadas(token)  // Chamada 1
  psGetFullHistory(token)        // Chamada 2
  psListActiveRooms(token, userId) // Chamada 3 (mesmo com sessionStorage)
}, [])
```

**Impacto:**
- 3 requisições HTTP simultâneas no carregamento inicial
- `psListActiveRooms` é chamada mesmo quando há dados em cache (sessionStorage)
- Sem tratamento de erro consolidado

#### Problema em `app/historico/page.tsx` (Linhas 46-61)
```typescript
// ❌ PROBLEMA: Fetch manual quando já existe função helper
const response = await fetch('/api/usuarios/me', {
  headers: { Authorization: `Bearer ${token}` }
});
const profileData = await response.json();
setMedicoRating(profileData.medico?.avaliacao || null);
```

**Impacto:**
- Duplicação de lógica (já existe `getMyProfile`)
- Busca perfil completo apenas para pegar 1 campo
- Sem tratamento de erro padronizado

### 2. **Falta de Cache e Deduplicação**

#### Problema: Múltiplas páginas fazem a mesma chamada
- `getConsultasAgendadas` é chamada em:
  - `app/inicio/page.tsx`
  - `app/consultas/page.tsx`
  - `app/consultas/meus-agendamentos/page.tsx`

**Impacto:**
- Cada navegação = nova requisição
- Dados duplicados em memória
- UX degradada (loading desnecessário)

### 3. **Ausência de Debounce em Buscas**

#### Problema em `app/historico/page.tsx` e `app/consultas/meus-agendamentos/page.tsx`
```typescript
// ❌ PROBLEMA: Filtragem acontece a cada keystroke
<input
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

**Impacto:**
- Renderizações excessivas
- Processamento desnecessário de filtros
- Má experiência em listas grandes

### 4. **Polling Ineficiente**

#### Problema: Não há polling para dados que mudam frequentemente
- Salas ativas (`psListActiveRooms`) deveriam atualizar automaticamente
- Histórico de consultas não revalida após ações (cancelar, confirmar)

---

## ✅ Soluções Implementadas

### 1. **Hooks Otimizados com SWR** (`hooks/useApiData.ts`)

#### `useConsultasAgendadas()`
```typescript
export function useConsultasAgendadas() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/consultas/agendadas',
    fetcher,
    {
      dedupingInterval: 30000, // Cache de 30s
      revalidateOnFocus: false
    }
  );
  return { consultas: data || [], isLoading, error, refresh: mutate };
}
```

**Benefícios:**
- ✅ Cache automático entre páginas
- ✅ Deduplicação de requisições
- ✅ Revalidação inteligente
- ✅ Refresh manual quando necessário

#### `useHistoricoCompleto()`
```typescript
dedupingInterval: 60000 // 1 minuto (histórico muda menos)
```

#### `useSalasAtivas(userId)`
```typescript
refreshInterval: 10000 // Atualiza a cada 10s (dados em tempo real)
```

#### `useUserProfile()`
```typescript
dedupingInterval: 120000 // 2 minutos (perfil muda raramente)
```

### 2. **Hooks de Otimização** (`hooks/useOptimization.ts`)

#### `useDebounce(value, delay)`
```typescript
// Uso em campos de busca
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  // Só executa 500ms após o usuário parar de digitar
  filterResults(debouncedSearch);
}, [debouncedSearch]);
```

**Benefícios:**
- ✅ Reduz renderizações em 80-90%
- ✅ Melhora performance de filtros
- ✅ UX mais fluida

#### `useThrottle(callback, delay)`
```typescript
// Limita frequência de chamadas
const throttledRefresh = useThrottle(refresh, 1000);
```

#### `useLoadingState()`
```typescript
// Gerencia múltiplos loadings
const { setLoading, isAnyLoading } = useLoadingState();
```

---

## 📈 Ganhos de Performance Esperados

### Redução de Requisições HTTP

| Cenário | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Navegação Início → Histórico → Início | 6 req | 2 req | **67%** |
| Digitação em busca (10 caracteres) | 10 filtros | 1 filtro | **90%** |
| Refresh de salas ativas (1 min) | 1 req manual | 6 req auto | **Automático** |
| Cache hit em consultas agendadas | 0% | 80%+ | **∞** |

### Melhorias de UX

- ✅ **Carregamento instantâneo** ao voltar para páginas já visitadas
- ✅ **Busca fluida** sem travamentos
- ✅ **Dados sempre atualizados** (polling inteligente)
- ✅ **Menos spinners** (cache)

---

## 🚀 Plano de Migração

### Fase 1: Implementar Hooks (✅ Concluído)
- [x] Criar `useApiData.ts`
- [x] Criar `useOptimization.ts`

### Fase 2: Migrar Páginas Críticas
1. **`app/inicio/page.tsx`**
   - Substituir `useEffect` manual por `useConsultasAgendadas()`
   - Substituir `useEffect` manual por `useHistoricoCompleto()`
   - Adicionar `useSalasAtivas()` com polling

2. **`app/historico/page.tsx`**
   - Substituir `fetch` manual por `useUserProfile()`
   - Adicionar `useDebounce` no campo de busca

3. **`app/consultas/meus-agendamentos/page.tsx`**
   - Usar `useConsultasAgendadas()` compartilhado
   - Adicionar `useDebounce` no campo de busca

### Fase 3: Configurar SWR Provider
```typescript
// app/layout.tsx
import { SWRConfig } from 'swr';

export default function RootLayout({ children }) {
  return (
    <SWRConfig value={{
      refreshInterval: 0,
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }}>
      {children}
    </SWRConfig>
  );
}
```

---

## 📝 Recomendações Adicionais

### 1. **Implementar React Query** (Alternativa ao SWR)
- Mais features (mutations, optimistic updates)
- Melhor DevTools
- Maior comunidade

### 2. **Backend: Adicionar Paginação**
```typescript
// Exemplo: GET /api/ps/historico-completo?page=1&limit=20
export async function psGetFullHistory(
  token: string,
  page = 1,
  limit = 20
): Promise<{ data: PSFullHistoryItem[], total: number }>
```

### 3. **Backend: Adicionar ETags**
```typescript
// Headers de cache HTTP
res.setHeader('ETag', generateETag(data));
res.setHeader('Cache-Control', 'private, max-age=30');
```

### 4. **Frontend: Implementar Virtual Scrolling**
- Para listas grandes (histórico com 100+ itens)
- Biblioteca: `react-window` ou `react-virtuoso`

### 5. **Monitoramento**
```typescript
// Adicionar métricas
import { performance } from 'perf_hooks';

const start = performance.now();
await getConsultasAgendadas(token);
const duration = performance.now() - start;
console.log(`API call took ${duration}ms`);
```

---

## 🎯 Próximos Passos

1. ✅ **Instalar dependências**
   ```bash
   npm install swr
   ```

2. **Migrar página por página** (começar por `/inicio`)

3. **Testar performance** (Chrome DevTools → Network)

4. **Monitorar erros** (Sentry/LogRocket)

5. **Iterar e otimizar** baseado em métricas reais

---

## 📚 Referências

- [SWR Documentation](https://swr.vercel.app/)
- [React Query vs SWR](https://react-query.tanstack.com/comparison)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/)
