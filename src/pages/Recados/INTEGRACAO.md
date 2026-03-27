# Módulo de Recados — Escola Manager
## Guia de Integração

---

## Arquivos entregues

```
src/recados/
├── recados.migration.sql   ← Rodar no startup do banco
├── recados.handlers.js     ← Main process (Electron IPC)
├── useRecados.js           ← Hook React (comunicação IPC)
├── RecadosPage.jsx         ← Aba principal (admin/secretaria/professor)
├── RecadoCard.jsx          ← Card individual na listagem
├── RecadoForm.jsx          ← Modal criar/editar recado
├── RecadosAluno.jsx        ← Painel do aluno/responsável
└── Recados.module.css      ← Estilos (CSS Modules)
```

---

## 1. Banco de dados (main process — startup)

No seu `main.js` ou onde você inicializa o `better-sqlite3`, adicione:

```js
const fs = require('fs');
const path = require('path');

// Rodar migration de recados
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'src/recados/recados.migration.sql'),
  'utf-8'
);
db.exec(migrationSQL);
```

---

## 2. Registrar handlers IPC (main process)

```js
const { registerRecadosHandlers } = require('./src/recados/recados.handlers');

// Registrar handlers e obter scheduler
const { processarAgendados } = registerRecadosHandlers(ipcMain, db);

// Verificar recados agendados a cada 60 segundos
setInterval(processarAgendados, 60 * 1000);
processarAgendados(); // Verificar imediatamente no startup
```

---

## 3. Expor via preload (contextBridge)

Se você usa `contextBridge`, certifique-se de que `ipcRenderer.invoke` está exposto.
Padrão típico do projeto:

```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
});
```

O hook `useRecados.js` já lida com `window.electron?.ipcRenderer ?? window.ipcRenderer`.

---

## 4. Adicionar a aba no Router/Menu principal

```jsx
// Exemplo com React Router ou sistema de abas do Escola Manager
import RecadosPage from './recados/RecadosPage';
import RecadosAluno from './recados/RecadosAluno';

// Para admin/secretaria/professor:
<Route path="/recados" element={
  <RecadosPage usuarioAtual={usuarioLogado} />
} />

// Para aluno/responsável:
<Route path="/meus-recados" element={
  <RecadosAluno
    aluno_id={usuarioLogado.aluno_id}
    turma_id={usuarioLogado.turma_id}
  />
} />
```

---

## 5. Badge de não lidos no menu lateral

```jsx
import { useRecadosAluno } from './recados/useRecados';

function MenuLateral({ alunoId, turmaId }) {
  const { naoLidos } = useRecadosAluno(alunoId, turmaId);

  return (
    <nav>
      <a href="/meus-recados">
        Recados
        {naoLidos > 0 && <span className="badge">{naoLidos}</span>}
      </a>
    </nav>
  );
}
```

---

## 6. IPC channels registrados

| Channel | Parâmetros | Retorno |
|---|---|---|
| `recados:listar` | `{ status?, remetente_tipo?, remetente_id?, search? }` | `Recado[]` |
| `recados:para-aluno` | `{ aluno_id, turma_id }` | `Recado[]` |
| `recados:salvar` | `{ titulo, mensagem, prioridade, agendado_para?, destinatarios[], enviar_agora, ... }` | `{ ok, id }` |
| `recados:enviar` | `{ id }` | `{ ok }` |
| `recados:marcar-lido` | `{ recado_id, aluno_id }` | `{ ok }` |
| `recados:excluir` | `{ id }` | `{ ok }` |
| `recados:nao-lidos-count` | `{ aluno_id, turma_id }` | `number` |

---

## 7. Dependências dos handlers no banco

O `recados.handlers.js` assume que existem as seguintes tabelas no seu banco:

| Tabela | Colunas usadas |
|---|---|
| `alunos` | `id`, `turma_id`, `status` (`'ativo'`, `'lista_espera'`) |
| `turmas` | `id`, `nome` |
| `financeiro` | `aluno_id`, `status` (`'inadimplente'`) |

Adapte os queries em `_criarLeituras()` se a estrutura for diferente.

---

## 8. Funcionalidades implementadas

### Secretaria / Admin
- [x] Criar recado com título, mensagem e prioridade (normal/importante/urgente)
- [x] Escolher destinatários: aluno específico, turma, todos, lista de espera, inadimplentes
- [x] Múltiplos grupos de destinatários por recado
- [x] Salvar como rascunho
- [x] Agendar envio (data/hora futura — processado pelo scheduler)
- [x] Enviar imediatamente
- [x] Ver taxa de leitura por recado
- [x] Editar rascunhos
- [x] Excluir rascunhos
- [x] Busca e filtro por status

### Professor
- [x] Criar e enviar recados para alunos/turmas (visão filtrada pelos próprios recados)
- [x] Todas as features acima com escopo restrito

### Aluno / Responsável
- [x] Ver todos os recados recebidos (secretaria + professores)
- [x] Indicador visual de não lido (ponto azul)
- [x] Marcar como lido ao abrir (automático)
- [x] Filtrar por não lidos
- [x] Badge de contagem no menu

---

## Próximas melhorias sugeridas
- Notificação push (Electron Notification API) ao receber novo recado
- Busca de aluno por nome no formulário (autocomplete) em vez de `<select>`
- Histórico de auditoria com log de quem leu e quando
- Resposta de aluno para recado (thread)
