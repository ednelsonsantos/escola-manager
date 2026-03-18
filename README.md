# 🎓 Escola Manager v5.5.2

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
5. **Alunos → Novo Aluno** — cadastre os alunos
6. **Financeiro → Gerar Mensalidades** — gere as cobranças
7. **Frequência** — registre chamadas por turma

---

## 📋 Módulos

| Módulo | O que faz |
|---|---|
| **Dashboard** | KPIs em tempo real, gráficos de faturamento e inadimplência |
| **Alunos** | Cadastro, ficha individual, histórico de pagamentos, paginação |
| **Financeiro** | Mensalidades, confirmação, encargos, boleto PDF, cobrança WhatsApp |
| **Cursos** | Turmas com barra de ocupação, professores |
| **Frequência** | Chamada por turma/aula, relatório de presença com PDF |
| **Relatórios** | Financeiro, alunos e cursos — com exportação CSV e **PDF** |
| **Agenda** | Calendário mensal + lista de eventos |
| **Usuários** | Contas, perfis e permissões por módulo |
| **Log de Auditoria** | Histórico completo de todas as ações |
| **Configurações** | Escola, financeiro, aparência, backup, restauração |

---

## 📄 Geração de PDF

**Sem dependências externas** — usa `Electron.webContents.printToPDF()` nativamente.

### Onde gerar PDF:
| Local | PDF gerado |
|---|---|
| Financeiro → 📄 em cada linha | Boleto/Cobrança individual do aluno |
| Financeiro → "Relatório PDF" | Relatório mensal com KPIs e tabela |
| Relatórios → Aba Financeiro → Exportar | Relatório financeiro do período |
| Relatórios → Aba Alunos → Exportar | Lista completa de alunos |
| Frequência → Relatório → Exportar PDF | Frequência por aluno com progresso |

Todos os PDFs têm layout profissional com cabeçalho, logo da escola, cores e rodapé.

---

## 💬 Cobrança via WhatsApp

Botão 💬 verde em cada linha pendente/atrasada no Financeiro.

- Gera mensagem personalizada com nome, valor, vencimento e status
- Abre o WhatsApp com a mensagem pré-preenchida via `wa.me`
- Funciona com WhatsApp Web e WhatsApp Desktop
- **Sem servidor externo, sem API, sem custo adicional**
- Requer número de telefone cadastrado no aluno

---

## 🎓 Módulo de Frequência

**Cursos → Frequência** no menu lateral (fica logo abaixo de Cursos na barra lateral).

### Fazer chamada:
1. Selecione a turma
2. Clique em **"+ Nova aula"** com a data
3. Clique em cada aluno para alternar Presente ✅ / Falta ❌
4. Use "Todos presentes" para marcar todos de uma vez
5. Clique **"Salvar chamada"**

### Relatório:
- Percentual de frequência por aluno
- Status: ✅ Regular (≥75%) · ⚠️ Atenção (50-74%) · ❌ Crítico (<50%)
- Exportar como PDF

---

## 💰 Juros e Multa por Atraso

Configure em **Configurações → Financeiro**.

Ao clicar em **"Marcar Vencidos como Atrasados"** no Financeiro:
- Aplica **multa única** (% configurada) no 1º dia
- Aplica **juros proporcional** (% ao mês × dias/30)
- Atualiza o valor do lançamento
- Mostra breakdown na tabela: `Original · Multa · Juros · Dias`

---

## 💾 Backup e Restauração

| Ação | Onde |
|---|---|
| Backup automático ao fechar | Configurações → Sistema → toggle |
| Backup manual JSON | Configurações → Dados → Exportar |
| Restaurar backup | Configurações → Dados → Restaurar Backup |
| Abrir pasta de backups | Configurações → Sistema → "📁 Abrir pasta" |

Backups ficam em: `%APPDATA%\Escola Manager\backups\` (últimos 10 mantidos automaticamente)

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

## ⚙️ Configurações — status real

| Configuração | Status | Detalhe |
|---|---|---|
| Dia de vencimento | ✅ | Usado em "Gerar Mensalidades" |
| Juros e multa por atraso | ✅ | Calculados ao marcar pagamentos como atrasados |
| Cor de destaque | ✅ | CSS custom property `--accent` aplicada globalmente |
| Tema claro/escuro | ✅ | Persiste entre sessões |
| Tamanho de texto | ✅ | CSS `zoom`: Compacto=88%, Normal=100%, Grande=110% |
| Notificações de inadimplência | ✅ | Toggle suprime badges, painel e contador |
| Backup automático | ✅ | JSON em `%APPDATA%\Escola Manager\backups\` ao fechar |
| Restaurar backup | ✅ | Seletor de arquivo com resumo e validação |

---

## 🗄️ Banco de Dados

**Localização:** `C:\Users\<usuario>\AppData\Roaming\Escola Manager\escola.db`

**Tabelas SQLite ativas:**
```
perfis, usuarios, identidade, configuracoes, audit_log
aulas, presencas  ← Frequência
```

**Dados no localStorage** (alunos, turmas, pagamentos, eventos) — migração para SQLite prevista para v6.

---

## 🏗️ Estrutura do Projeto

```
escola-v5/
├── electron/
│   ├── main.js        # IPC, janela, PDF, WhatsApp, backup, frequência
│   ├── preload.js     # Bridge segura renderer ↔ main (contextBridge)
│   └── database.js    # SQLite: auth, auditoria, frequência, schema v6
├── src/
│   ├── utils/
│   │   └── pdfUtils.js       # Gerador HTML/CSS para PDF + enviarWhatsApp
│   ├── context/
│   │   ├── AppContext.jsx    # Dados + backup + juros + restauração
│   │   ├── AuthContext.jsx   # Sessão e identidade visual
│   │   └── UsuariosContext.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx      ├── Alunos.jsx       ├── EditarAluno.jsx
│   │   ├── Financeiro.jsx     ├── Cursos.jsx       ├── EditarTurma.jsx
│   │   ├── EditarProfessor.jsx├── Frequencia.jsx   ├── Relatorios.jsx
│   │   ├── Agenda.jsx         ├── EditarEvento.jsx ├── Usuarios.jsx
│   │   ├── EditarUsuario.jsx  ├── EditarPerfil.jsx ├── AuditLog.jsx
│   │   ├── Configuracoes.jsx  └── Sobre.jsx
│   └── style.css      # Design system completo (dark + light)
```

---

## 📜 Licença

**Criado por:** Ednelson Santos · [github.com/ednelsonsantos](https://github.com/ednelsonsantos)
**Licença:** GPL-3.0-or-later · **Copyright:** © 2025 Ednelson Santos

---

## ⚡ GitHub Actions

O workflow `.github/workflows/build.yml` compila e publica o `.exe` automaticamente ao criar uma tag `v*`.

**Permissão necessária** — já configurada no `build.yml`:
```yaml
permissions:
  contents: write
```

Caso veja erro 403 ao criar Release, verifique também:
**Settings → Actions → General → Workflow permissions → Read and write permissions**

---

## 🔮 Roadmap

- [ ] **v6** — Migrar alunos/turmas/pagamentos/eventos para SQLite (schema já criado)
- [ ] **v6** — Cálculo de desconto para pagamento antecipado
- [ ] Módulo de matrículas com contrato PDF assinável
- [ ] Integração com Evolution API para envio em massa via WhatsApp
