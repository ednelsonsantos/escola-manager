# Changelog — Escola Manager

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) · [SemVer](https://semver.org/lang/pt-BR/)

---

## [5.14.0] — 2026-03

### Adicionado
- **Visão Geral de Notas** — toggle no módulo Notas para ver todas as turmas com notas lançadas em abas horizontais (ordenadas por atividade mais recente), filtros por professor e por período, busca por nome de aluno; vista somente leitura independente do tipo de avaliação (bimestral, semestral, anual etc.)
- **Seed scripts de desenvolvimento** — utilitários para popular dados de teste: `seed_financeiro.js` (pagamentos via localStorage), `seed_notas.js` (turma + 10 alunos + notas 1º Bimestre), `seed_notas_extra.js` (notas em turmas existentes), `seed_usuarios_prof.js` (3 usuários com perfil Professor vinculados a professores existentes)

### Corrigido
- **Notas — NaN na coluna Média** — `calcularMedia()` usava `!== null` (strict) que não capturava `undefined`; substituído por `!= null` (loose); células sem nota exibem `—` em vez de `NaN`
- **Notificações — badge de ícone** — contagem agora soma cada pagamento pendente individualmente (antes, todos os pendentes valiam 1); total = atrasados + pendentes + eventos
- **Notificações — badge do menu Financeiro** — incluía apenas atrasados; agora inclui pendentes + atrasados combinados

### Segurança / Privacidade
- **Alunos** — mensalidade oculta (tabela, ficha individual, histórico de pagamentos) para perfis sem `perm_financeiro`
- **Cursos → Professores** — colunas Contrato (tipo CLT/PJ, salário, valor/hora) e E-mail ocultas para perfis sem `perm_financeiro`
- **Dashboard** — card "Receita do mês", gráfico "Faturamento Mensal" e valores monetários em "Movimentações Recentes" ocultados para perfis sem `perm_financeiro`; sub do card "Inadimplentes" substitui valor R$ por contagem neutra
- **Regra geral** — qualquer perfil com `perm_financeiro = 0` não visualiza nenhum valor monetário nos módulos Alunos, Cursos e Dashboard

---

## [5.13.0] — 2026-03

### Adicionado
- **Frequência redesenhada** — chamada exibida em grid de cards horizontais (7 aulas/linha, responsivo), agrupados por dia do calendário com rótulo de data; scroll horizontal elegante
- **Substituição de professor** — seleção de professor substituto diretamente na aula com validação de conflito de horário; registro no audit_log; badge visual na lista de aulas
- **Folha de Pagamento CLT/PJ** — geração mensal por professor: CLT recebe salário fixo com desconto proporcional por horas não cumpridas em relação à carga horária mensal; PJ recebe por hora ministrada calculado automaticamente ao abrir o módulo

---

## [5.12.1] — 2026-03

### Corrigido
- **Build do instalador** — `electron-builder` agora usa `release/` como diretório de saída, eliminando conflito com `dist/` do Vite e alinhando com o workflow do GitHub Actions

---

## [5.12.0] — 2026-03

### Adicionado
- **Módulo Certificados** — emissão individual e em lote de certificados de conclusão em PDF (A4 paisagem), template estilizado com bordas duplas (navy + gold), fontes Playfair Display + Lato, campos configuráveis (texto livre, assinaturas, local/data, carga horária), pré-visualização via iframe antes de imprimir, histórico de emissões com filtro por turma e período, KPIs (total emitidos, turmas atendidas, última emissão)

### Corrigido
- **dev-runner.js** — `ELECTRON_RUN_AS_NODE` removido via `delete` do env do spawn (string vazia não funcionava no Windows)
- **electron/database.js** — operadores `?? ||` sem parênteses causavam `SyntaxError` no startup (afetava `registrarMovimento` e `criarCertificado`)
- **src/main.jsx** — arquivo restaurado após deleção acidental no commit v5.11

### Infraestrutura
- Nova tabela SQLite: `certificados` — com migration automática no startup
- Novos IPC handlers: `cert:listar`, `cert:criar`, `cert:deletar`, `cert:resumo`
- Novos métodos em `preload.js`: `certListar`, `certCriar`, `certDeletar`, `certResumo`

---

## [5.11.0] — 2026-03

### Adicionado
- **Módulo Estoque e Material Didático** — CRUD completo de itens (livros, apostilas, uniformes, equipamentos), movimentações (entrada/saída/ajuste de inventário) com histórico inline, alertas de estoque mínimo e KPIs (total de itens, itens críticos, valor em estoque)
- **Módulo Fluxo de Caixa** — lançamentos manuais de entradas e saídas por categoria, gráfico mensal de barras empilhadas (Chart.js), resumo por categoria, CRUD completo com SQLite
- **Módulo Reserva de Salas** — gestão de espaços físicos com capacidade e recursos, reservas com detecção automática de conflito de horário, calendário semanal e integração com turmas/professores
- **Módulo Notas / Ata de Resultados** — grid inline editável por turma e período letivo, cálculo automático de média e conceito (A–E), exportação de ata em PDF
- **Grade Visual de Horários** — grade semanal com cores por idioma, parsing automático de texto livre (ex: "Seg/Qua 18h"), barra de ocupação por turma
- **Carga Horária** — relatório de horas ministradas por professor com detalhamento por turma e exportação CSV
- **Inadimplentes** — listagem filtrada por dias de atraso, envio de cobrança em lote via módulo Recados e WhatsApp
- **Cancelamento/reposição de aulas** — checkbox na chamada para cancelar aula com motivo, agendamento de reposição vinculada bidirecionalmente, badges visuais na lista de aulas

### Corrigido
- **Modal.jsx** — `Modal` e `ConfirmModal` agora usam `createPortal(…, document.body)`, corrigindo posicionamento quebrado pelo zoom CSS global do app (afetava todos os modais de confirmação/deleção)
- **Notas.jsx** — removido import `createPortal` não utilizado

### Infraestrutura
- Novas tabelas SQLite: `fluxo_caixa`, `salas`, `reservas_sala`, `notas`, `estoque_itens`, `estoque_movimentos` — todas com migration automática no startup
- Novos IPC handlers em `main.js` e métodos expostos em `preload.js` para os módulos v5.8–v5.11
- `.gitignore` atualizado: adicionado `*.7z`

---

## [5.5.5] — 2025-03

### Corrigido
- **Sidebar footer invisível no `.exe`** — investigação via DevTools do Electron revelou que o `sidebar-nav` (`flex:1`, `overflow-y:auto`) criava um stacking context que cobria o footer mesmo com `margin-top:auto`. Solução definitiva: `position:fixed`, `bottom:0`, `left:0`, `width:var(--sidebar-w)`, `zIndex:9999` e `background:var(--bg-side)` no footer; `padding-bottom:82px` no nav para o último item não ficar escondido
- **Sidebar some com DPI scaling alto no Windows** — breakpoint `@media (max-width: 860px)` causava `display:none` na sidebar em monitores com DPI 125%/150% (janela 1024px físicos = ~682px CSS). Reduzido para `600px`
- **Sidebar altura inconsistente dev vs .exe** — adicionado `height:100%` e `overflow:hidden` na `.sidebar`

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
