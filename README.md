# 🎓 Escola Manager v5.12

Sistema desktop completo para gestão de escolas de idiomas.
**React 18 + Electron 29 + SQLite + PizZip · GPL-3.0 · Criado por Ednelson Santos**
[github.com/ednelsonsantos](https://github.com/ednelsonsantos)

---

## 🚀 Instalação

```bash
npm install       # instala e recompila módulos nativos
npm run dev       # modo desenvolvimento
npm run build     # gera instalador .exe para Windows
```

**Requisitos:** Node.js 18 ou 20 · npm 9+ · Windows 10/11 64-bit

---

## 🔐 Login — Credenciais padrão

| Usuário | Senha | Perfil |
|---|---|---|
| `admin` | admin123 | Administrador |
| `secretaria` | sec123 | Secretaria |
| `demo` | demo | Demonstração |
| `professor` | profe123 | Professor |

---

## 🏁 Começando do zero

1. **Configurações → Dados → Limpar todos os dados**
2. **Configurações → Escola** — nome, CNPJ, endereço
3. **Configurações → Identidade Visual** — logo, slogan
4. **Cursos → Nova Turma** — crie as turmas
5. **Alunos → Novo Aluno** — cadastre os alunos (defina o dia de vencimento de cada um)
6. **Financeiro → Gerar Mensalidades** — gere as cobranças
7. **Frequência** — registre chamadas por turma

---

## 📋 Módulos

| Módulo | O que faz |
|---|---|
| **Dashboard** | KPIs em tempo real, abas personalizadas por perfil de acesso |
| **Alunos** | Cadastro, ficha individual, histórico de pagamentos, paginação, lista de espera, dados de responsável |
| **Financeiro** | Mensalidades, encargos (multa+juros), desconto antecipado, boleto PDF, WhatsApp |
| **Cursos** | Turmas com barra de ocupação, professores |
| **Frequência** | Chamada por turma/aula, conteúdo ministrado, ausência do professor com justificativa, relatório de presença com PDF |
| **Recados** | Criação, agendamento e envio de recados por secretaria/professor para alunos/turmas |
| **Fluxo de Caixa** | Lançamentos manuais de entradas/saídas, gráfico mensal de barras, resumo por categoria |
| **Grade de Horários** | Grade visual semanal das turmas por dia da semana, cores por idioma |
| **Carga Horária** | Horas ministradas por professor com detalhamento por turma e exportação CSV |
| **Notas** | Lançamento de notas por turma/período, cálculo automático de média e conceito, ata em PDF |
| **Reserva de Salas** | Gestão de espaços, reservas com detecção de conflito, calendário semanal |
| **Inadimplentes** | Lista filtrada de alunos com atraso, envio de cobrança via Recados e WhatsApp em lote |
| **Estoque** | Cadastro de materiais didáticos, movimentações com histórico, alertas de estoque mínimo |
| **Certificados** | Emissão individual e em lote de certificados de conclusão em PDF (A4 paisagem), template configurável, histórico de emissões |
| **Relatórios** | Financeiro, alunos, cursos e rematrículas — exportação CSV, PDF e XLSX |
| **Agenda** | Calendário mensal + lista de eventos |
| **Usuários** | Contas, perfis e permissões por módulo |
| **Log de Auditoria** | Histórico completo de todas as ações |
| **Configurações** | Escola, financeiro (encargos+desconto), aparência, backup |

---

## 📊 Dashboard por Perfil

Cada perfil vê apenas as abas relevantes ao seu papel:

| Perfil | Visão Geral | Financeiro | Pedagógico | Agenda |
|---|:---:|:---:|:---:|:---:|
| Administrador | ✅ | ✅ | ✅ | ✅ |
| Secretaria | ✅ | — | ✅ | ✅ |
| Professor | — | — | ✅ | ✅ |
| Financeiro | — | ✅ | — | ✅ |
| Visualizador | ✅ | — | — | ✅ |

Notificações de inadimplência e badges de cobrança só aparecem para perfis com acesso ao módulo Financeiro.

---

## 💰 Encargos Financeiros

Configure em **Configurações → Financeiro**.

| Configuração | Padrão | Comportamento |
|---|---|---|
| Multa por Atraso | 10% | Aplicada uma única vez no 1º dia de atraso |
| Juros por Atraso | 2%/mês | Proporcional por dia a partir do 2º dia |
| Desconto Antecipação | 5% | Aplicado ao confirmar pagamento antes do vencimento |

---

## 💚 Pagamento via Pix

Configure em **Configurações → Financeiro → Pagamento via Pix**.

- **Chave Pix** — e-mail, CPF, CNPJ, telefone ou chave aleatória
- **QR Code** — faça upload da imagem exportada do seu banco (PNG/JPG/SVG)
- Ambos aparecem automaticamente no boleto gerado para o aluno

---

## 📄 Geração de PDF

**Sem dependências externas** — usa `Electron.webContents.printToPDF()` nativamente.

| Local | PDF gerado |
|---|---|
| Financeiro → 📄 em cada linha | Boleto/Cobrança individual do aluno |
| Financeiro → "Relatório PDF" | Relatório mensal com KPIs e tabela |
| Relatórios → Aba Financeiro | Relatório financeiro do período |
| Relatórios → Aba Alunos | Lista completa de alunos |
| Frequência → Relatório | Frequência por aluno com progresso |

---

## 💬 Cobrança via WhatsApp

Botão 💬 em cada linha pendente/atrasada no Financeiro. Abre `wa.me` com mensagem personalizada — sem servidor externo, sem API, sem custo.

Botão de WhatsApp também disponível na ficha do aluno para contato com responsável.

---

## 📊 Relatório de Rematrículas

Aba dedicada em **Relatórios → Rematrículas**. Detecta automaticamente 3 tipos de evento:

| Tipo | Como é detectado |
|---|---|
| **Mudança de turma** | Campo `turmaAnteriorId` diferente da turma atual |
| **Reativação** | Campo `dataReativacao` presente — aluno voltou de Inativo/Trancado |
| **Renovação** | Gap de 2+ meses sem pagamento seguido de retorno |

Clique em qualquer aluno para expandir a linha do tempo de eventos e o histórico de pagamentos. Exportação disponível em **XLSX, XLS e CSV** — geração do arquivo feita no próprio renderer via `PizZip`, sem dependências adicionais. O XLSX inclui 3 abas: Resumo (KPIs), Detalhado (eventos) e Pagamentos.

---

## 🧑‍🏫 Ausência do Professor

No módulo **Frequência**, ao abrir uma aula o professor pode marcar **"Professor ausente nesta aula"**. Um textarea de justificativa é exibido. Ao salvar:

- A ausência e o motivo são gravados na aula no SQLite
- Um recado automático com prioridade **Importante** é criado e enviado para a secretaria via módulo Recados
- O audit_log registra o evento com nível `aviso`
- Na reabertura da mesma aula, um badge **"Já notificado"** evita duplicação do recado

---

## 💾 Backup e Restauração

| Ação | Onde |
|---|---|
| Backup automático ao fechar | Configurações → Sistema → toggle |
| Backup manual JSON | Configurações → Dados → Exportar |
| Restaurar backup | Configurações → Dados → Restaurar Backup |
| Abrir pasta de backups | Configurações → Sistema → "📁 Abrir pasta" |

Backups em: `%APPDATA%\Escola Manager\backups\` (últimos 10 mantidos automaticamente)

---

## 👥 Perfis de Acesso

| Perfil | Dash | Alunos | Fin. | Cursos | Relat. | Agenda | Config | Usuários |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Administrador | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ | ✏️ |
| Secretaria | 👁️ | ✏️ | ✏️ | 👁️ | 👁️ | ✏️ | ❌ | ❌ |
| Professor | 👁️ | 👁️ | ❌ | 👁️ | ❌ | 👁️ | ❌ | ❌ |
| Financeiro | 👁️ | 👁️ | ✏️ | ❌ | ✏️ | ❌ | ❌ | ❌ |
| Visualizador | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | ❌ | ❌ |

---

## 🏗️ Estrutura do Projeto

```
escola-v5/
├── electron/
│   ├── main.js          # IPC, janela, PDF, WhatsApp, backup, frequência, recados, exportação
│   ├── preload.js       # Bridge segura renderer ↔ main (contextBridge)
│   └── database.js      # SQLite: auth, auditoria, frequência, recados, schema v6
├── src/
│   ├── utils/
│   │   └── pdfUtils.js        # Gerador HTML/CSS para PDF + enviarWhatsApp
│   ├── context/
│   │   ├── AppContext.jsx     # Dados + backup + encargos + restauração
│   │   ├── AuthContext.jsx    # Sessão e identidade visual
│   │   └── UsuariosContext.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx      ├── Alunos.jsx       ├── EditarAluno.jsx
│   │   ├── Financeiro.jsx     ├── Cursos.jsx       ├── EditarTurma.jsx
│   │   ├── EditarProfessor.jsx├── Frequencia.jsx   ├── Relatorios.jsx
│   │   ├── Agenda.jsx         ├── EditarEvento.jsx ├── Usuarios.jsx
│   │   ├── EditarUsuario.jsx  ├── EditarPerfil.jsx ├── AuditLog.jsx
│   │   ├── Configuracoes.jsx  ├── Sobre.jsx
│   │   └── Recados/
│   │       ├── Recados.jsx        # Painel admin/secretaria/professor
│   │       └── RecadosAluno.jsx   # Painel aluno/responsável + hook badge
│   └── style.css              # Design system (dark + light)
├── dev-runner.js        # Inicia Vite + Electron com porta real detectada
└── package.json
```

---

## 🗄️ Banco de Dados — Tabelas SQLite

| Tabela | Descrição |
|---|---|
| `perfis` | Perfis de acesso e permissões |
| `usuarios` | Contas de usuário |
| `identidade` | Logo e nome da escola |
| `configuracoes` | Chave-valor de configurações |
| `audit_log` | Log completo de auditoria |
| `professores_db` | Professores — schema v6 completo |
| `turmas_db` | Turmas — schema v6 completo |
| `alunos_db` | Alunos — schema v6 com `ls_id`, `dia_vencimento`, dados de responsável, status Lista de Espera |
| `pagamentos_db` | Pagamentos — schema v6 com `valor_original`, `valor_multa`, `valor_juros`, `valor_desconto`, `dias_atraso` |
| `eventos_db` | Eventos de agenda — schema v6 completo |
| `aulas` | Aulas por turma — `conteudo`, `professor_ausente`, `justificativa_ausencia` |
| `presencas` | Presenças por aula e aluno |
| `recados` | Recados com título, mensagem, prioridade, status e agendamento |
| `recados_destinatarios` | Destinatários de cada recado (aluno, turma, todos, etc.) |
| `recados_leituras` | Controle de leitura por aluno |
| `fluxo_caixa` | Lançamentos de entrada/saída com categoria, valor, data e mês (v5.8) |
| `salas` | Espaços físicos com capacidade, descrição e recursos JSON (v5.9) |
| `reservas_sala` | Reservas com sala, responsável, horário, status e vínculo com turma (v5.9) |
| `notas` | Notas por aluno/turma/período — parcial, final, recuperação, conceito (v5.10) |
| `estoque_itens` | Itens do estoque com categoria, unidade, quantidade, mínimo e preços (v5.11) |
| `estoque_movimentos` | Histórico de entradas, saídas e ajustes de inventário (v5.11) |
| `certificados` | Certificados emitidos por aluno e turma, com campos de template e assinaturas (v5.12) |

> **Nota v6:** As tabelas `professores_db`, `turmas_db`, `alunos_db`, `pagamentos_db` e `eventos_db` têm schema completo e migration automática aplicada, mas ainda são alimentadas pelo localStorage. A migração de dados está planejada — veja o Roadmap.

---

## 📬 Módulo de Recados — IPC Channels

| Channel | Parâmetros | Descrição |
|---|---|---|
| `recados:listar` | `filtros, req` | Lista recados com filtros |
| `recados:paraAluno` | `{ aluno_ls_id, turma_ls_id }` | Recados recebidos por aluno |
| `recados:naoLidos` | `{ aluno_ls_id, turma_ls_id }` | Contador de não lidos |
| `recados:salvar` | `dados, req` | Criar/editar rascunho ou agendar |
| `recados:enviar` | `{ id }, req` | Enviar recado imediatamente |
| `recados:marcarLido` | `{ recado_id, aluno_ls_id }` | Marcar como lido |
| `recados:excluir` | `{ id }, req` | Excluir rascunho |

O scheduler de recados agendados roda a cada 60s via `setInterval` no `main.js`.

---

## ⚙️ Padrões Técnicos do Projeto

| Padrão | Regra |
|---|---|
| **IPC handlers** | Sempre `safe()` no main.js · `req={userId,userLogin}` para auditoria |
| **Modais** | `createPortal(jsx, document.body)` — o App tem zoom CSS que quebra `position:fixed` |
| **Chaves SQLite** | Sempre `String(id)` ao usar IDs do SQLite como chaves de objetos JS |
| **Componentes de rota** | `className="fade-up"` sem `page-scroll` — AppRoutes já gerencia o scroll |
| **Imports no renderer** | Sempre ES modules (`import`) — Vite não aceita `require()` |
| **Binários via IPC** | `Array.from(Uint8Array)` no renderer → `Buffer.from(array)` no main |
| **Scheduler** | `setInterval` no main.js após `db.init()` |

---

## 🤝 Contribuindo

- **Bugs e sugestões:** abra uma [Issue no GitHub](https://github.com/ednelsonsantos/escola-manager/issues)
- **Pull Requests:** fork → branch → PR com descrição clara
- **Contato direto:** entre em contato pelo GitHub

---

## 🔮 Roadmap

### ✅ Concluído

- [x] Dashboard com abas por perfil de acesso
- [x] Notificações filtradas por permissão
- [x] Cálculo de encargos (multa + juros) por atraso
- [x] Desconto por antecipação de pagamento
- [x] Dia de vencimento individual por aluno
- [x] Geração de PDF nativa (Electron printToPDF)
- [x] Cobrança via WhatsApp
- [x] Módulo de Frequência com SQLite
- [x] Log de Auditoria completo
- [x] Backup automático + restauração
- [x] Chave Pix e QR Code no boleto do aluno
- [x] Fix sidebar footer — visível em dev e .exe
- [x] **v5.6** — Módulo de Recados completo (secretaria, professor, aluno/responsável)
- [x] **v5.6** — Status "Lista de Espera" nos alunos com filtro e badge dedicados
- [x] **v5.6** — Dados de Responsável no cadastro do aluno (nome, telefone, e-mail, parentesco, WA)
- [x] **v5.6** — Conteúdo ministrado por aula no módulo de Frequência
- [x] **v5.6** — Correção: `position:fixed` em modais dentro de container com `zoom` CSS (portal React)
- [x] **v5.6** — Correção: chaves de presença unificadas como `String(id)` na Frequência
- [x] **v5.7** — Justificativa de ausência do professor com notificação automática para secretaria
- [x] **v5.7** — Relatório de Rematrículas com detecção automática de 3 tipos de evento
- [x] **v5.7** — Exportação de Rematrículas em XLSX, XLS e CSV via PizZip (sem dependências novas)
- [x] **v5.7** — Schema v6 completo com todos os campos mapeados e migration automática
- [x] **v5.7** — Fix: botão fechar travava em modo dev após hot reload (ipcMain.once → on + timeout)
- [x] **v5.7** — Gravar `turmaAnteriorId` e `dataReativacao` no EditarAluno (detecção automática ao salvar)
- [x] **v5.8** — Módulo Fluxo de Caixa: lançamentos de entrada/saída, gráfico mensal de barras, resumo por categoria, CRUD completo com SQLite
- [x] **v5.9** — Módulo Reserva de Salas: gestão de espaços, reservas com detecção de conflito de horário, calendário semanal, integração com turmas/professores
- [x] **v5.10** — Módulo Notas / Ata de Resultados: grid inline editável por turma/período, cálculo automático de média e conceito, exportação de ata em PDF
- [x] **v5.10** — Grade Visual de Horários: grade semanal com cores por idioma, parsing automático de horário em texto livre, barra de ocupação
- [x] **v5.10** — Carga Horária: relatório de horas ministradas por professor, detalhamento por turma, exportação CSV
- [x] **v5.10** — Inadimplentes: listagem filtrada por dias de atraso, envio de cobrança em lote via Recados e WhatsApp
- [x] **v5.10** — Controle de cancelamento/reposição de aulas: checkbox na chamada, agendamento de reposição com vínculo bidirecional, badges na lista de aulas
- [x] **v5.11** — Módulo Estoque e Material Didático: CRUD de itens com categorias, movimentações (entrada/saída/ajuste), histórico inline, alertas de estoque mínimo, KPIs
- [x] **v5.12** — Módulo Certificados: emissão individual e em lote em PDF (A4 paisagem), template configurável com campos de assinatura, pré-visualização via iframe, histórico de emissões por turma/período

### 🔄 Segunda onda — em andamento

- [ ] Biblioteca — acervo, empréstimos e carteirinha

### 🔬 Terceira onda — futuro

- [ ] Emissão de NF de serviço
- [ ] Geolocalização de alunos e equipe
- [ ] Armazenamento de documentos
- [ ] Contrato digital com aceite online
- [ ] Dashboard de gráficos avançados
- [ ] Integração com Evolution API para envio em massa via WhatsApp

### 🗄️ v6 — Migração para SQLite (preparação concluída, execução planejada)

O schema está completo e as migrations automáticas já rodam no startup. A migração de dados será feita em etapas:

- [ ] CRUD SQLite para `professores_db` + handlers IPC
- [ ] CRUD SQLite para `turmas_db` + handlers IPC
- [ ] CRUD SQLite para `alunos_db` + handlers IPC
- [ ] CRUD SQLite para `pagamentos_db` + handlers IPC + portar lógica de encargos
- [ ] CRUD SQLite para `eventos_db` + handlers IPC
- [ ] Script de migração: lê localStorage → insere no SQLite via `ls_id` → valida integridade
- [ ] Refatorar `AppContext.jsx` para consumir via IPC em vez de localStorage
- [ ] Adaptar backup para incluir dump das tabelas SQLite migradas
- [ ] Adaptar módulo Recados para usar IDs SQLite reais (substituir `aluno_ls_id`)

---

## 📜 Licença

**Criado por:** Ednelson Santos · [github.com/ednelsonsantos](https://github.com/ednelsonsantos)
**Licença:** GPL-3.0-or-later · **Copyright:** © 2025 Ednelson Santos
