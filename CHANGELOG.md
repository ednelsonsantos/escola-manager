# Changelog — Escola Manager

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) · [SemVer](https://semver.org/lang/pt-BR/)

---

## [5.5.4-hotfix] — 2025-03

### Corrigido
- **Sidebar footer sumindo** — `.sidebar-footer` recebia `flex-shrink` do container e era comprimido para fora da área visível quando havia muitos itens no nav. Adicionado `flex-shrink:0` e `margin-top:auto` no `style.css`

---

## [5.5.4] — 2025-03

### Adicionado
- **Chave Pix e QR Code no boleto** — configure em Configurações → Financeiro → Pagamento via Pix:
  - Tipo de chave: e-mail, CPF, CNPJ, telefone ou chave aleatória
  - Campo de chave com placeholder dinâmico conforme o tipo selecionado
  - Upload de QR Code (PNG/JPG/SVG) armazenado como base64 no localStorage
  - Preview ao vivo mostrando como ficará impresso no boleto
  - Bloco verde destacado no boleto PDF com QR Code + chave + instrução de pagamento
  - Aparece apenas quando configurado — boletos sem Pix não são afetados

### Corrigido
- Versão atualizada na tela de login (rodapé do card)

---

## [5.5.3] — 2025-03

### Adicionado
- **Dashboard por perfil** — abas visíveis conforme permissões do usuário logado:
  - **Administrador** → Visão Geral + Financeiro + Pedagógico + Agenda
  - **Secretaria** → Visão Geral + Pedagógico + Agenda
  - **Professor** → Pedagógico + Agenda (entra direto no Pedagógico)
  - **Financeiro** → somente Financeiro (entra direto nos KPIs financeiros)
  - **Visualizador** → Visão Geral + Agenda
  - Compatível com perfis personalizados via `perm_*` — não depende apenas do nome
  - Aba ativa lembrada por usuário via `sessionStorage`
- **Notificações filtradas por permissão**:
  - Inadimplentes e pendentes (`perm_financeiro`) — professores e perfis sem financeiro não veem alertas de cobrança
  - Eventos de hoje (`perm_agenda`) — perfis sem agenda não recebem notificações de eventos
  - Badges de inadimplência na sidebar respeitam a mesma regra

### Corrigido
- **dev-runner.js reescrito** — lê a porta real do Vite via regex no stdout (`Local: http://localhost:XXXX`) em vez de pré-calcular uma porta e passar ao Electron. Elimina race condition que causava `NS_ERROR_CONNECTION_REFUSED` quando o Vite escolhia porta diferente da esperada

---

## [5.5.2] — 2025-03

### Adicionado
- **Encargos financeiros configuráveis**:
  - Multa fixa aplicada no 1º dia de atraso (% configurável, padrão 10%)
  - Juros diários a partir do 2º dia: `valor × (juros%/30) × (dias−1)`
  - Recálculo com data real ao confirmar pagamento retroativo
  - Desconto por antecipação: aplicado automaticamente quando `dataPgto < vencimento`
  - `calcularEncargos(valorOriginal, vencimento, dataReferencia?)` — aceita data opcional
- **Configurações → Financeiro** expandido:
  - Campos: Multa por Atraso (%), Juros por Atraso (%/mês), Desconto por Antecipação (%)
  - Preview dinâmico com simulação ao vivo (R$ 250 com 10 dias de atraso)
  - Preview de desconto por antecipação (aparece apenas se % > 0)
- **Dia de vencimento individual por aluno** — campo `diaVencimento` no cadastro (1–28, padrão 10); `gerarMensalidades()` usa o dia do próprio aluno

### Corrigido
- Frequência ausente no menu lateral — item `Frequência` adicionado ao array `NAV_ITEMS` entre Cursos e Relatórios

---

## [5.5.1] — 2025-03

### Corrigido
- **Criação/edição de Perfil de Acesso ainda usava modal** — substituído por tela dedicada `EditarPerfil.jsx` nas rotas `/perfis/novo` e `/perfis/editar/:id`

### Adicionado
- `src/pages/EditarPerfil.jsx` — tela em duas colunas com matriz de permissões e preview em tempo real

---

## [5.5.0] — 2025-03

### Corrigido
- **Tamanho de texto não funcionava** — substituído por CSS `zoom` (Compacto=88%, Normal=100%, Grande=110%)
- **Painel de notificações ficava atrás do conteúdo** — removido `overflow: hidden` do `.topbar`; z-index dos painéis elevado para 1000

---

## [5.4.8] — 2025-03

### Corrigido
- **"Reload" visual ao abrir/fechar notificações** — `Guarded` movido para fora de `App()`, `AppRoutes` extraído como `React.memo`, dois `useApp()` consolidados em um

---

## [5.4.7] — 2025-03

### Corrigido
- **Clique em item de notificação recarregava a tela** — `stopPropagation` no `NotifItem` e `onMouseDown` no painel

---

## [5.4.6] — 2025-03

### Corrigido
- **`mesAtualDinamico is not defined`** no Dashboard

---

## [5.4.5] — 2025-03

### Corrigido
- **Tela preta após login no .exe** — flags `disable-features` quebravam `contextIsolation` do Electron 29
- **ErrorBoundary adicionado** em `main.jsx`

---

## [5.4.4] — 2025-03

### Corrigido
- **Porta 5173 já em uso** — `dev-runner.js` detecta porta livre e passa URL real ao Electron

---

## [5.4.3] — 2025-03

### Corrigido
- **Build falhava** — chave duplicada `'/alunos/editar/:id'` no `PAGE_META`

---

## [5.4.2] — 2025-03

### Corrigido
- Interface não carregava no executável compilado — CSP, Google Fonts e `loadFile()` sem `.catch()`

---

## [5.4.0] — 2025-03

### Adicionado
- **PDF nativo** via `Electron.webContents.printToPDF()` — boleto, relatório financeiro, alunos, frequência
- **Cobrança via WhatsApp** — `wa.me` deeplink, sem servidor externo
- `src/utils/pdfUtils.js`

---

## [5.3.0] — 2025-03

### Adicionado
- **Módulo de Frequência** — chamada por turma/aula, SQLite, relatório PDF
- Cálculo automático de juros e multa por atraso

---

## [5.2.0] — 2025-03

### Adicionado
- **Restaurar backup** — seletor de arquivo, modal de confirmação, validação JSON

---

## [5.1.x] — 2025-01/03

### Adicionado
- Telas dedicadas para Alunos, Usuários, Cursos e Agenda
- Backup automático via `app:before-close` IPC
- Log de Auditoria completo (SQLite)
- Botões de janela estilo Windows

---

## [5.0.0] — 2024-12
- SQLite, sistema de usuários/perfis, identidade visual, controle de acesso

## [4.0.0] — 2024-11
- Relatórios, Agenda, busca global Ctrl+K, exportação CSV/JSON, recibos

## [3.0.0] — 2024-10
- Tema claro/escuro, Dashboard com gráficos, CRUD completo, configurações

## [1.0.0] — 2024-09
- Lançamento inicial
