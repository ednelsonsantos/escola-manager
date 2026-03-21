# 🎓 Escola Manager v5.5.4

Sistema desktop completo para gestão de escolas de idiomas.
**React 18 + Electron 29 + SQLite · GPL-3.0 · Criado por Ednelson Santos**
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
| **Alunos** | Cadastro, ficha individual, histórico de pagamentos, paginação |
| **Financeiro** | Mensalidades, encargos (multa+juros), desconto antecipado, boleto PDF, WhatsApp |
| **Cursos** | Turmas com barra de ocupação, professores |
| **Frequência** | Chamada por turma/aula, relatório de presença com PDF |
| **Relatórios** | Financeiro, alunos e cursos — com exportação CSV e PDF |
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

Ao clicar **"Marcar Vencidos como Atrasados"** no Financeiro, encargos são calculados automaticamente. Ao confirmar um pagamento, a data real é usada para recalcular com precisão.

---

## 💚 Pagamento via Pix

Configure em **Configurações → Financeiro → Pagamento via Pix**.

- **Chave Pix** — e-mail, CPF, CNPJ, telefone ou chave aleatória
- **QR Code** — faça upload da imagem exportada do seu banco (PNG/JPG/SVG)
- Ambos aparecem automaticamente no boleto gerado para o aluno
- Preview ao vivo na tela de configuração

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
│   ├── main.js          # IPC, janela, PDF, WhatsApp, backup, frequência
│   ├── preload.js       # Bridge segura renderer ↔ main (contextBridge)
│   └── database.js      # SQLite: auth, auditoria, frequência
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
│   │   ├── Configuracoes.jsx  └── Sobre.jsx
│   └── style.css              # Design system (dark + light)
├── dev-runner.js        # Inicia Vite + Electron com porta real detectada
└── package.json
```

---

## 🤝 Contribuindo

O Escola Manager é open source e aceita contribuições!

- **Bugs e sugestões:** abra uma [Issue no GitHub](https://github.com/ednelsonsantos/escola-manager/issues)
- **Pull Requests:** fork → branch → PR com descrição clara do que foi alterado
- **Contato direto:** entre em contato pelo GitHub ou e-mail

Toda contribuição é bem-vinda — desde correções de typo até novas funcionalidades.

---

## 🔮 Roadmap

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
- [ ] **v6** — Migrar alunos/turmas/pagamentos/eventos para SQLite
- [ ] Integração com Evolution API para envio em massa via WhatsApp

> 💡 Tem uma ideia? Abra uma Issue no GitHub ou entre em contato pelo e-mail/redes sociais do autor.

---

## 📜 Licença

**Criado por:** Ednelson Santos · [github.com/ednelsonsantos](https://github.com/ednelsonsantos)
**Licença:** GPL-3.0-or-later · **Copyright:** © 2025 Ednelson Santos
