# Integração do Módulo de Recados — Escola Manager v5.6

## Arquivos entregues

```
electron/
├── database.js   ← substitui o original (recados adicionados ao final)
├── main.js       ← substitui o original (handlers + scheduler adicionados)
└── preload.js    ← substitui o original (7 métodos recados* adicionados)

src/pages/Recados/
├── Recados.jsx       ← página admin/secretaria/professor
└── RecadosAluno.jsx  ← painel aluno/responsável + hook useRecadosBadge
```

---

## Passo 1 — Substituir os 3 arquivos do Electron

Copie os 3 arquivos da pasta `electron/` para `escola-v5/electron/`.
O banco de dados vai criar as 3 novas tabelas automaticamente no próximo startup.

---

## Passo 2 — Copiar os componentes React

Crie a pasta `src/pages/Recados/` e copie os 2 arquivos JSX para lá.

---

## Passo 3 — Adicionar a rota/aba na sidebar e no roteamento

No componente principal (App.jsx ou similar), adicione o import e a rota:

```jsx
import Recados from './pages/Recados/Recados'
```

No switch de páginas (onde você renderiza Dashboard, Alunos, etc.):

```jsx
{pagina === 'recados' && <Recados usuarioAtual={usuario} />}
```

---

## Passo 4 — Adicionar o botão na sidebar

No componente da sidebar, adicione o item de navegação:

```jsx
<button
  className={`nav-btn${pagina === 'recados' ? ' active' : ''}`}
  onClick={() => setPagina('recados')}
>
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v9a2 2 0 01-2 2H7l-4 3V4z"/>
  </svg>
  Recados
  {/* Badge de não lidos (opcional — para alunos logados) */}
  {naoLidos > 0 && <span className="nav-badge">{naoLidos}</span>}
</button>
```

---

## Passo 5 — Badge de não lidos na sidebar (opcional)

Para mostrar o badge de mensagens não lidas para alunos, use o hook exportado:

```jsx
import { useRecadosBadge } from './pages/Recados/RecadosAluno'

// Dentro do componente da sidebar:
// alunoId e turmaId = IDs do localStorage do aluno atual
const naoLidos = useRecadosBadge(alunoId, turmaId)
```

---

## Passo 6 — Painel do aluno/responsável (se aplicável)

Se o sistema tiver um perfil de acesso para alunos/responsáveis:

```jsx
import RecadosAluno from './pages/Recados/RecadosAluno'

{pagina === 'meus-recados' && (
  <RecadosAluno
    alunoId={usuario.aluno_ls_id}
    turmaId={usuario.turma_ls_id}
  />
)}
```

---

## Observações importantes

### Alunos ainda no localStorage (v5)
O módulo foi adaptado para a arquitetura atual: alunos e turmas ainda vivem no
localStorage. O formulário carrega `localStorage.getItem('turmas')` e
`localStorage.getItem('alunos')` para os selects de destinatários.

A propriedade usada para identificar o aluno nos recados é o mesmo `id` que
está no objeto do aluno no localStorage — passado como `aluno_ls_id`.

### Migração para v6
Quando os alunos migrarem para o SQLite (`alunos_db`), bastará atualizar
o helper `_criarLeituras()` no `database.js` para expandir grupos (turma,
todos, etc.) buscando em `alunos_db` em vez do localStorage.

### Channels IPC registrados
| Channel               | Parâmetros                             |
|-----------------------|----------------------------------------|
| recados:listar        | filtros, req                           |
| recados:paraAluno     | { aluno_ls_id, turma_ls_id }           |
| recados:naoLidos      | { aluno_ls_id, turma_ls_id }           |
| recados:salvar        | dados, req                             |
| recados:enviar        | { id }, req                            |
| recados:marcarLido    | { recado_id, aluno_ls_id }             |
| recados:excluir       | { id }, req                            |

### Scheduler de agendamentos
O `main.js` chama `db.processarRecadosAgendados()` no startup e a cada 60s.
Recados com `agendado_para <= agora` são enviados automaticamente.

### Audit log
Todas as ações (criar, editar, enviar, excluir) geram entradas no `audit_log`
com `modulo: 'recados'` — aparecem automaticamente no Log de Auditoria.

### Permissões
O componente `Recados.jsx` detecta se o usuário é professor via
`usuarioAtual.perfil_nome` e filtra automaticamente para mostrar apenas
os próprios recados. Secretaria e Admin veem todos.
