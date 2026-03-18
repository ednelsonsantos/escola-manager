# Changelog — Escola Manager

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) · [SemVer](https://semver.org/lang/pt-BR/)

---

## [5.5.2] — 2025-03

### Corrigido
- **Frequência ausente no menu lateral** — `Frequencia.jsx` existia e a rota `/frequencia` funcionava, mas o item nunca havia sido adicionado ao array `NAV_ITEMS` do sidebar. Adicionado entre Cursos e Relatórios com ícone `ClipboardList`
- **GitHub Actions 403 ao criar Release** — `GITHUB_TOKEN` tem permissão de leitura por padrão; criação de Release exige escrita. Adicionado `permissions: contents: write` no `build.yml`. Também adicionado `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` como variável global para suprimir aviso de depreciação do Node.js 20 no Actions (obrigatório a partir de Jun/2026)

---

## [5.5.1] — 2025-03

### Corrigido
- **Criação/edição de Perfil de Acesso ainda usava modal** — a mesma correção aplicada à tela de Usuários (v5.1.x) não havia sido aplicada aos Perfis. Substituído o modal `<Modal size="modal-lg">` por tela dedicada `EditarPerfil.jsx` nas rotas `/perfis/novo` e `/perfis/editar/:id`

### Adicionado
- `src/pages/EditarPerfil.jsx` — tela em duas colunas:
  - **Coluna esquerda**: nome, cor de identificação, descrição e matriz completa de permissões por módulo (❌ Sem acesso · 👁️ Visualizar · ✏️ Editar)
  - **Coluna direita (sticky)**: preview em tempo real do perfil com chips dos módulos liberados, resumo de totais (editar/visualizar/bloqueado) e lista de usuários vinculados ao perfil
- Ao salvar, retorna automaticamente para `/usuarios?tab=perfis` abrindo direto na aba Perfis

---

## [5.5.0] — 2025-03 (versão atual)

### Corrigido
- **Tamanho de texto não funcionava** — a implementação anterior usava `font-size` no elemento raiz, que não tem efeito sobre filhos com valores `px` explícitos (64 regras CSS hardcoded em px). Substituído por `zoom` do Chromium, que escala proporcionalmente **tudo**: fontes, espaçamentos, ícones, bordas. Valores: Compacto=88%, Normal=100%, Grande=110%
- **Painel de notificações ficava atrás do conteúdo da página** — `.topbar` tinha `overflow: hidden` que recortava filhos `position: absolute`. Removido; adicionados `position: relative` e `z-index: 50` no topbar. Z-index dos painéis (notificações e busca) elevado para 1000

---

## [5.4.8] — 2025-03

### Corrigido
- **"Reload" visual ao abrir/fechar notificações** — `Guarded` era uma função definida dentro de `App()`, criando nova referência de tipo a cada render. O React interpretava como componente diferente e **desmontava + remontava** os filhos de Route, disparando a animação `fade-up`. Três fixes:
  1. `Guarded` movido para fora de `App()` como função de módulo (referência estável)
  2. `AppRoutes` extraído como `React.memo` sem props — só re-renderiza quando a rota muda, nunca quando `notifOpen`/`searchOpen`/`toast` mudam
  3. Dois `useApp()` em `App.jsx` consolidados em uma única chamada

---

## [5.4.7] — 2025-03

### Corrigido
- **Clique em item de notificação recarregava a tela** — `NotifItem` não chamava `e.stopPropagation()`, então o click borbulhava até o listener global e fechava o painel antes da navegação. Corrigido com `stopPropagation` no `NotifItem`, `onMouseDown` no painel e no botão sino, e guarda `if (loc.pathname !== destino)` para evitar navegação redundante

---

## [5.4.6] — 2025-03 (hotfix)

### Corrigido
- **`mesAtualDinamico is not defined`** — `Dashboard.jsx` usava a função mas não a importava do `AppContext`. O `ErrorBoundary` exibia o erro em vez de tela preta

---

## [5.4.5] — 2025-03 (hotfix crítico)

### Corrigido
- **Tela preta após login na versão compilada** — `app.commandLine.appendSwitch('disable-features','OutOfBlinkCors')` adicionado em versão anterior quebrava o `contextIsolation` do Electron 29: `window.electronAPI` ficava `undefined`, `UsuariosContext.carregar()` lançava exceção não tratada no mount, React abortava silenciosamente
  - Removidos os flags `disable-features` e `disable-site-isolation-trials`
  - Removido `session.webRequest.onBeforeRequest` que também interferia
- **ErrorBoundary adicionado** em `main.jsx` — erros de render agora exibem mensagem legível com botão "Tentar novamente"

---

## [5.4.4] — 2025-03

### Corrigido
- **Porta 5173 já em uso ao iniciar dev server** — `strictPort: true` no Vite impedia uso de porta alternativa. Substituído `concurrently + wait-on` por `dev-runner.js`: detecta primeira porta livre, inicia Vite, aguarda stdout confirmar "ready", passa URL real ao Electron via `VITE_DEV_URL`. Adicionados scripts `dev:5173` e `dev:5174` como atalhos

---

## [5.4.3] — 2025-03 (hotfix)

### Corrigido
- **Build falhava: chave duplicada `'/alunos/editar/:id'`** no objeto `PAGE_META` em `App.jsx` — a chave foi inserida duas vezes por scripts de atualização em sessões diferentes. Objeto reorganizado e deduplicado

---

## [5.4.2] — 2025-03 (hotfix)

### Corrigido
- **Interface não carregava no executável compilado** — três causas:
  1. `<link>` Google Fonts bloqueava HTML parsing sem internet — substituído por `@import` com `font-display: swap` + fallback CSS imediato
  2. CSP ausente — Electron bloqueava módulos ES em `file://` — adicionado meta `Content-Security-Policy`
  3. `loadFile()` sem `.catch()` — falhas silenciosas — adicionado `did-fail-load` handler
- Spinner nativo no HTML (sem React) para feedback visual durante carregamento do bundle

---

## [5.4.1] — 2025-03 (hotfix)

### Corrigido
- **`no such column: turma_ls_id`** — `migrarSchema()` rodava *após* `criarTabelas()`. Tabela antiga com schema incompatível não era recriada na mesma sessão. Ordem invertida: migração antes da criação
- **Notificações e badges zerados na versão compilada** — `mesAtual` hardcoded como `'2025-01'` em 5 arquivos. Em produção não havia pagamentos nesse mês. Substituído por `mesAtualDinamico()` em todos os arquivos
- **Dados demo desatualizados** — `gerarPagamentos()` e `SEED_EVENTOS` com datas fixas de 2024/2025 → agora relativas ao mês/dia atual

---

## [5.4.0] — 2025-03

### Adicionado
- **PDF nativo** via `Electron.webContents.printToPDF()` — sem dependências externas:
  - Boleto/cobrança individual por aluno (Financeiro → ícone 📄)
  - Relatório financeiro mensal com KPIs (Financeiro + Relatórios)
  - Relatório de alunos com situação financeira (Relatórios)
  - Relatório de frequência com barra de progresso (Frequência)
- **Cobrança via WhatsApp** — botão 💬 em lançamentos pendentes/atrasados; gera mensagem personalizada e abre `wa.me` deeplink; zero dependências, zero servidor
- `src/utils/pdfUtils.js` — utilitários de geração de HTML/PDF e envio WhatsApp

---

## [5.3.0] — 2025-03

### Adicionado
- **Módulo de Frequência** (`/frequencia`) — chamada por turma/aula gravada em SQLite; relatório com percentual por aluno e status Regular/Atenção/Crítico; exportação PDF
- **Cálculo automático de juros e multa** — `calcularEncargos()` aplica multa única + juros proporcional ao marcar vencidos; breakdown visível na tabela do Financeiro

---

## [5.2.0] — 2025-03

### Adicionado
- **Restaurar backup** — seletor de arquivo, modal de confirmação com resumo do conteúdo, validação JSON, restauração completa

### Corrigido
- Toggle "Notificações de inadimplência" agora realmente suprime badges e painel
- `accentColor` agora aplicada como CSS `--accent` em todo o sistema
- Tamanho de fonte, cor de destaque e notificações auditados e corrigidos

---

## [5.1.x] — 2025-01/03

### Adicionado
- Telas dedicadas para Alunos, Usuários, Cursos (Turmas/Professores) e Agenda (Eventos) — fim dos modais com barra de rolagem
- Backup automático real via `app:before-close` IPC — JSON em `%APPDATA%\backups\`
- Log de Auditoria completo com SQLite, filtros e exportação CSV
- Botões de janela estilo Windows (minimizar/maximizar/fechar) na topbar e login
- Cálculo de juros e multa por atraso configurável

### Corrigido
- `localStorage` isolado entre dev e prod no Electron — flag `em_inicializado`
- Modal centralizado em tela cheia — pseudo-elementos `::before/::after`
- `mesAtual` hardcoded substituído por função dinâmica

---

## [5.0.0] — 2024-12
- SQLite via `better-sqlite3`, sistema de usuários/perfis, identidade visual, guard de rotas

## [4.0.0] — 2024-11
- Relatórios, Agenda, busca global Ctrl+K, exportação CSV/JSON, recibos

## [3.0.0] — 2024-10
- Tema claro/escuro, Dashboard com gráficos, CRUD completo, configurações

## [1.0.0] — 2024-09
- Lançamento inicial
