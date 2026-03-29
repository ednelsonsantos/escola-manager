/**
 * electron/database.js — Escola Manager v5
 * SQLite via better-sqlite3 · Node 18/20/22 + Electron 29
 *
 * Tabelas ativas (v5):
 *   perfis, usuarios, identidade, configuracoes, audit_log
 *
 * Schema preparado para v6 (migração localStorage → SQLite):
 *   alunos, turmas, professores, pagamentos, eventos
 *   (tabelas criadas mas não usadas pelo frontend ainda)
 *
 * v5.6 — Módulo de Recados:
 *   recados, recados_destinatarios, recados_leituras
 */

const path    = require('path')
const fs      = require('fs')
const { app } = require('electron')

let db = null

// ── Caminho do arquivo ────────────────────────────────────────────────────────
function getDbPath() {
  const dir = app.getPath('userData')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'escola.db')
}

// ── Hash de senha (sem dependências externas) ─────────────────────────────────
function hashSenha(senha) {
  let h = 5381
  for (let i = 0; i < senha.length; i++) {
    h = ((h << 5) + h) ^ senha.charCodeAt(i)
    h = h >>> 0
  }
  return `sh_${h.toString(16).padStart(8, '0')}_${senha.length}`
}
function verificarSenha(senha, hash) { return hashSenha(senha) === hash }

// ── Inicialização ─────────────────────────────────────────────────────────────
function init() {
  let Database
  try {
    Database = require('better-sqlite3')
  } catch (e) {
    console.warn('[DB] better-sqlite3 não carregou:', e.message)
    return false
  }

  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  migrarSchema()   // migra ANTES — pode dropar tabelas antigas incompatíveis
  criarTabelas()   // recria com CREATE TABLE IF NOT EXISTS
  seedInicial()
  return true
}

// ── Guard ─────────────────────────────────────────────────────────────────────
function dbOk() { if (!db) throw new Error('Banco não inicializado') }

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA COMPLETO
// ═══════════════════════════════════════════════════════════════════════════════
function criarTabelas() {
  db.exec(`
    -- ── SISTEMA DE ACESSO ─────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS perfis (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      nome             TEXT    NOT NULL UNIQUE,
      desc             TEXT    DEFAULT '',
      cor              TEXT    DEFAULT '#63dcaa',
      perm_dashboard   INTEGER DEFAULT 1,
      perm_alunos      INTEGER DEFAULT 1,
      perm_financeiro  INTEGER DEFAULT 1,
      perm_cursos      INTEGER DEFAULT 1,
      perm_relatorios  INTEGER DEFAULT 1,
      perm_agenda      INTEGER DEFAULT 1,
      perm_config      INTEGER DEFAULT 0,
      perm_usuarios    INTEGER DEFAULT 0,
      criado_em        TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      login            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      nome             TEXT    NOT NULL,
      email            TEXT    DEFAULT '',
      senha_hash       TEXT    NOT NULL,
      perfil_id        INTEGER NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
      ativo            INTEGER DEFAULT 1,
      avatar_cor       TEXT    DEFAULT '#63dcaa',
      professor_db_id  INTEGER REFERENCES professores_db(id) ON DELETE SET NULL,
      ultimo_acesso    TEXT,
      criado_em        TEXT    DEFAULT (datetime('now'))
    );

    -- ── IDENTIDADE E CONFIGURAÇÕES ────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS identidade (
      id            INTEGER PRIMARY KEY DEFAULT 1,
      logo_base64   TEXT DEFAULT '',
      logo_nome     TEXT DEFAULT '',
      nome_escola   TEXT DEFAULT 'Escola Manager',
      slogan        TEXT DEFAULT 'Sistema de Gestão Escolar',
      atualizado_em TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    -- ── AUDIT LOG ─────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS audit_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      usuario_login TEXT    DEFAULT 'sistema',
      modulo        TEXT    NOT NULL,
      acao          TEXT    NOT NULL,
      entidade_id   INTEGER,
      entidade_nome TEXT    DEFAULT '',
      detalhe       TEXT    DEFAULT '',
      nivel         TEXT    DEFAULT 'info'
    );

    CREATE INDEX IF NOT EXISTS idx_audit_criado  ON audit_log(criado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_audit_modulo  ON audit_log(modulo);

    -- ── SCHEMA PREPARADO PARA V6 ──────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS professores_db (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      nome                  TEXT    NOT NULL,
      idioma                TEXT    DEFAULT '',
      email                 TEXT    DEFAULT '',
      telefone              TEXT    DEFAULT '',
      ativo                 INTEGER DEFAULT 1,
      -- Contrato de trabalho (v5.12)
      tipo_contrato         TEXT    DEFAULT 'CLT' CHECK(tipo_contrato IN ('CLT','PJ')),
      salario_fixo          REAL    DEFAULT 0,      -- CLT: salário mensal bruto
      carga_horaria_mensal  REAL    DEFAULT 0,      -- CLT: horas/mês contratadas
      valor_hora_pj         REAL    DEFAULT 0,      -- PJ: valor cobrado por hora
      criado_em             TEXT    DEFAULT (datetime('now','localtime'))
    );

    -- ── FOLHA DE PAGAMENTO DE PROFESSORES (v5.12) ────────────────────────────

    CREATE TABLE IF NOT EXISTS folha_pagamento (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      professor_id      INTEGER NOT NULL REFERENCES professores_db(id) ON DELETE CASCADE,
      mes               TEXT    NOT NULL,            -- formato YYYY-MM
      tipo_contrato     TEXT    NOT NULL CHECK(tipo_contrato IN ('CLT','PJ')),
      -- Horas apuradas da carga horária
      horas_normais     REAL    DEFAULT 0,
      horas_extra_50    REAL    DEFAULT 0,
      horas_extra_100   REAL    DEFAULT 0,
      -- Valores calculados
      valor_normal      REAL    DEFAULT 0,
      valor_extra_50    REAL    DEFAULT 0,
      valor_extra_100   REAL    DEFAULT 0,
      total_bruto       REAL    DEFAULT 0,
      deducoes          REAL    DEFAULT 0,           -- descontos manuais
      total_liquido     REAL    DEFAULT 0,
      -- Referência para cálculo
      salario_fixo_ref  REAL    DEFAULT 0,           -- snapshot do salário na data
      valor_hora_ref    REAL    DEFAULT 0,           -- snapshot do valor/hora na data
      obs               TEXT    DEFAULT '',
      status            TEXT    DEFAULT 'Aberta' CHECK(status IN ('Aberta','Fechada','Paga')),
      criado_em         TEXT    DEFAULT (datetime('now','localtime')),
      atualizado_em     TEXT    DEFAULT (datetime('now','localtime')),
      UNIQUE(professor_id, mes)                      -- uma folha por professor por mês
    );

    CREATE INDEX IF NOT EXISTS idx_folha_professor ON folha_pagamento(professor_id);
    CREATE INDEX IF NOT EXISTS idx_folha_mes       ON folha_pagamento(mes);
    CREATE INDEX IF NOT EXISTS idx_folha_status    ON folha_pagamento(status);

    CREATE TABLE IF NOT EXISTS turmas_db (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo       TEXT    NOT NULL UNIQUE,
      idioma       TEXT    NOT NULL,
      nivel        TEXT    DEFAULT 'Básico',
      professor_id INTEGER REFERENCES professores_db(id) ON DELETE SET NULL,
      horario      TEXT    DEFAULT '',
      vagas        INTEGER DEFAULT 15,
      ativa        INTEGER DEFAULT 1,
      criado_em    TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS alunos_db (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ls_id            INTEGER UNIQUE,          -- ID original do localStorage (para migração)
      nome             TEXT    NOT NULL,
      email            TEXT    DEFAULT '',
      telefone         TEXT    DEFAULT '',
      turma_id         INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      mensalidade      REAL    DEFAULT 0,
      dia_vencimento   INTEGER DEFAULT 10,
      status           TEXT    DEFAULT 'Ativo'
                               CHECK(status IN ('Ativo','Inativo','Trancado','Lista de Espera')),
      data_nasc        TEXT    DEFAULT '',
      data_matricula   TEXT    DEFAULT (date('now','localtime')),
      obs              TEXT    DEFAULT '',
      -- Responsável (v5.6)
      resp_nome        TEXT    DEFAULT '',
      resp_telefone    TEXT    DEFAULT '',
      resp_email       TEXT    DEFAULT '',
      resp_parentesco  TEXT    DEFAULT '',
      resp_eh_proprio  INTEGER DEFAULT 0,
      -- Lista de espera (v5.13)
      turma_espera_id   INTEGER,
      turmas_espera_json TEXT   DEFAULT '[]',
      curso_espera      TEXT    DEFAULT '',
      -- Status estendido (v5.13)
      status_motivo    TEXT    DEFAULT '',
      manter_vaga      INTEGER DEFAULT 0,
      manter_vaga_dias INTEGER DEFAULT 0,
      -- Rematrícula (v5.7) — gravados pelo EditarAluno.jsx ao salvar
      turma_anterior_id  INTEGER,                -- turmaId anterior (mudança de turma)
      data_rematricula   TEXT    DEFAULT '',      -- data YYYY-MM-DD da mudança
      data_reativacao    TEXT    DEFAULT '',      -- data YYYY-MM-DD da reativação de status
      -- Múltiplos cursos e desconto (v5.12)
      matriculas_json    TEXT    DEFAULT '[]',    -- JSON: [{turmaId, mensalidade}]
      desconto_tipo      TEXT    DEFAULT '',      -- '' | 'percentual' | 'fixo'
      desconto_valor     REAL    DEFAULT 0,       -- valor do desconto
      criado_em        TEXT    DEFAULT (datetime('now','localtime')),
      atualizado_em    TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_alunos_status  ON alunos_db(status);
    CREATE INDEX IF NOT EXISTS idx_alunos_turma   ON alunos_db(turma_id);
    CREATE INDEX IF NOT EXISTS idx_alunos_ls_id   ON alunos_db(ls_id);

    CREATE TABLE IF NOT EXISTS pagamentos_db (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id        INTEGER NOT NULL REFERENCES alunos_db(id) ON DELETE CASCADE,
      valor           REAL    NOT NULL,
      valor_original  REAL,                     -- valor antes de encargos/desconto
      valor_multa     REAL    DEFAULT 0,
      valor_juros     REAL    DEFAULT 0,
      valor_desconto  REAL    DEFAULT 0,
      dias_atraso     INTEGER DEFAULT 0,
      mes             TEXT    NOT NULL,          -- formato YYYY-MM
      vencimento      TEXT    NOT NULL,          -- formato YYYY-MM-DD
      status          TEXT    DEFAULT 'Pendente'
                              CHECK(status IN ('Pendente','Pago','Atrasado')),
      data_pgto       TEXT,
      obs             TEXT    DEFAULT '',
      criado_em       TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_pag_aluno  ON pagamentos_db(aluno_id);
    CREATE INDEX IF NOT EXISTS idx_pag_mes    ON pagamentos_db(mes);
    CREATE INDEX IF NOT EXISTS idx_pag_status ON pagamentos_db(status);

    CREATE TABLE IF NOT EXISTS eventos_db (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo    TEXT    NOT NULL,
      data      TEXT    NOT NULL,
      hora      TEXT    DEFAULT '',
      tipo      TEXT    DEFAULT 'outro'
                        CHECK(tipo IN ('reuniao','prova','feriado','atividade','financeiro','turma','outro')),
      turma_id  INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      desc      TEXT    DEFAULT '',
      criado_em TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos_db(data);

    -- ── FREQUÊNCIA ────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS aulas (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_ls_id           INTEGER NOT NULL,
      turma_codigo          TEXT    DEFAULT '',
      data                  TEXT    NOT NULL,
      titulo                TEXT    DEFAULT '',
      conteudo              TEXT    DEFAULT '',
      professor_ausente     INTEGER DEFAULT 0,
      justificativa_ausencia TEXT   DEFAULT '',
      cancelada             INTEGER DEFAULT 0,
      motivo_cancelamento   TEXT    DEFAULT '',
      aula_reposicao_id     INTEGER REFERENCES aulas(id) ON DELETE SET NULL,
      professor_id          INTEGER REFERENCES professores_db(id) ON DELETE SET NULL,
      criado_em             TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_aulas_turma ON aulas(turma_ls_id);
    CREATE INDEX IF NOT EXISTS idx_aulas_data  ON aulas(data);

    CREATE TABLE IF NOT EXISTS presencas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      aula_id     INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
      aluno_ls_id INTEGER NOT NULL,
      aluno_nome  TEXT    DEFAULT '',
      presente    INTEGER DEFAULT 1,
      obs         TEXT    DEFAULT '',
      UNIQUE(aula_id, aluno_ls_id)
    );

    -- ── MÓDULO DE RECADOS (v5.6) ──────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS recados (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo          TEXT    NOT NULL,
      mensagem        TEXT    NOT NULL,
      remetente_tipo  TEXT    NOT NULL CHECK(remetente_tipo IN ('secretaria','professor','admin')),
      remetente_id    INTEGER NOT NULL,
      remetente_nome  TEXT    NOT NULL,
      prioridade      TEXT    NOT NULL DEFAULT 'normal' CHECK(prioridade IN ('normal','importante','urgente')),
      agendado_para   TEXT,
      enviado_em      TEXT,
      status          TEXT    NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','agendado','enviado')),
      criado_em       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      atualizado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_recados_status     ON recados(status);
    CREATE INDEX IF NOT EXISTS idx_recados_remetente  ON recados(remetente_tipo, remetente_id);

    CREATE TABLE IF NOT EXISTS recados_destinatarios (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      recado_id       INTEGER NOT NULL REFERENCES recados(id) ON DELETE CASCADE,
      tipo            TEXT    NOT NULL CHECK(tipo IN ('aluno','turma','lista_espera','todos','inadimplentes')),
      referencia_id   INTEGER,
      referencia_nome TEXT,
      criado_em       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_dest_recado ON recados_destinatarios(recado_id);

    CREATE TABLE IF NOT EXISTS recados_leituras (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      recado_id   INTEGER NOT NULL REFERENCES recados(id) ON DELETE CASCADE,
      aluno_ls_id INTEGER NOT NULL,
      lido        INTEGER NOT NULL DEFAULT 0,
      lido_em     TEXT,
      criado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(recado_id, aluno_ls_id)
    );

    CREATE INDEX IF NOT EXISTS idx_leituras_aluno  ON recados_leituras(aluno_ls_id);
    CREATE INDEX IF NOT EXISTS idx_leituras_recado ON recados_leituras(recado_id);

    -- ── FLUXO DE CAIXA (v5.8) ──────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS fluxo_caixa (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT    NOT NULL CHECK(tipo IN ('entrada','saida')),
      categoria   TEXT    NOT NULL DEFAULT 'Outros',
      descricao   TEXT    NOT NULL DEFAULT '',
      valor       REAL    NOT NULL CHECK(valor > 0),
      data        TEXT    NOT NULL,
      mes         TEXT    NOT NULL,
      obs         TEXT    DEFAULT '',
      criado_por  TEXT    DEFAULT 'sistema',
      criado_em   TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_fc_mes  ON fluxo_caixa(mes);
    CREATE INDEX IF NOT EXISTS idx_fc_tipo ON fluxo_caixa(tipo);
    CREATE INDEX IF NOT EXISTS idx_fc_data ON fluxo_caixa(data);

    -- ── RESERVA DE SALAS (v5.9) ───────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS salas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL UNIQUE,
      capacidade  INTEGER DEFAULT 20,
      descricao   TEXT    DEFAULT '',
      recursos    TEXT    DEFAULT '[]',   -- JSON array de strings
      ativa       INTEGER DEFAULT 1,
      criado_em   TEXT    DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT  DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS reservas_sala (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sala_id      INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
      turma_id     INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      turma_nome   TEXT    DEFAULT '',        -- desnormalizado para resiliência
      titulo       TEXT    NOT NULL,
      responsavel  TEXT    DEFAULT '',
      descricao    TEXT    DEFAULT '',
      data         TEXT    NOT NULL,          -- YYYY-MM-DD
      hora_inicio  TEXT    NOT NULL,          -- HH:MM
      hora_fim     TEXT    NOT NULL,          -- HH:MM
      status       TEXT    NOT NULL DEFAULT 'confirmada'
                           CHECK(status IN ('confirmada','pendente','cancelada')),
      criado_por   TEXT    DEFAULT 'sistema',
      criado_em    TEXT    DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT   DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_reservas_sala_id ON reservas_sala(sala_id);
    CREATE INDEX IF NOT EXISTS idx_reservas_data    ON reservas_sala(data);
    CREATE INDEX IF NOT EXISTS idx_reservas_status  ON reservas_sala(status);

    -- ── NOTAS / ATA DE RESULTADOS (v5.10) ────────────────────────────────────

    CREATE TABLE IF NOT EXISTS notas (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_ls_id       INTEGER NOT NULL,
      aluno_nome        TEXT    DEFAULT '',
      turma_ls_id       INTEGER NOT NULL,
      turma_codigo      TEXT    DEFAULT '',
      periodo           TEXT    NOT NULL,          -- '1º Bimestre', 'Semestral', etc.
      nota_parcial      REAL,
      nota_final        REAL,
      nota_recuperacao  REAL,
      conceito          TEXT    DEFAULT '',        -- A/B/C/D/E (gerado automaticamente)
      obs               TEXT    DEFAULT '',
      criado_por        TEXT    DEFAULT 'sistema',
      criado_em         TEXT    DEFAULT (datetime('now','localtime')),
      atualizado_em     TEXT    DEFAULT (datetime('now','localtime')),
      UNIQUE(aluno_ls_id, turma_ls_id, periodo)
    );

    CREATE INDEX IF NOT EXISTS idx_notas_turma   ON notas(turma_ls_id);
    CREATE INDEX IF NOT EXISTS idx_notas_aluno   ON notas(aluno_ls_id);
    CREATE INDEX IF NOT EXISTS idx_notas_periodo ON notas(periodo);

    CREATE TABLE IF NOT EXISTS estoque_itens (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT    NOT NULL,
      categoria     TEXT    DEFAULT '',
      descricao     TEXT    DEFAULT '',
      unidade       TEXT    DEFAULT 'unid',
      quantidade    INTEGER DEFAULT 0,
      minimo        INTEGER DEFAULT 0,
      preco_custo   REAL    DEFAULT 0,
      preco_venda   REAL    DEFAULT 0,
      codigo        TEXT    DEFAULT '',
      ativo         INTEGER DEFAULT 1,
      criado_em     TEXT    DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS estoque_movimentos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id     INTEGER NOT NULL REFERENCES estoque_itens(id) ON DELETE CASCADE,
      tipo        TEXT    NOT NULL CHECK(tipo IN ('entrada','saida','ajuste')),
      quantidade  INTEGER NOT NULL,
      motivo      TEXT    DEFAULT '',
      responsavel TEXT    DEFAULT '',
      aluno_ls_id INTEGER,
      aluno_nome  TEXT    DEFAULT '',
      data        TEXT    DEFAULT (date('now','localtime')),
      criado_por  TEXT    DEFAULT 'sistema',
      criado_em   TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_estoque_item ON estoque_movimentos(item_id);
    CREATE INDEX IF NOT EXISTS idx_estoque_data ON estoque_movimentos(data);

    CREATE TABLE IF NOT EXISTS certificados (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_ls_id     INTEGER NOT NULL,
      aluno_nome      TEXT    NOT NULL,
      turma_ls_id     INTEGER NOT NULL,
      turma_codigo    TEXT    DEFAULT '',
      curso_nome      TEXT    DEFAULT '',
      data_emissao    TEXT    DEFAULT (date('now','localtime')),
      data_conclusao  TEXT    DEFAULT '',
      carga_horaria   INTEGER DEFAULT 0,
      texto_livre     TEXT    DEFAULT '',
      assinatura1     TEXT    DEFAULT '',
      assinatura2     TEXT    DEFAULT '',
      local_data      TEXT    DEFAULT '',
      emitido_por     TEXT    DEFAULT 'sistema',
      criado_em       TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_cert_aluno ON certificados(aluno_ls_id);
    CREATE INDEX IF NOT EXISTS idx_cert_turma ON certificados(turma_ls_id);
  `)

  // Trigger para atualizar atualizado_em nos recados
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_recados_updated
      AFTER UPDATE ON recados
      BEGIN
        UPDATE recados SET atualizado_em = datetime('now','localtime') WHERE id = NEW.id;
      END;
  `)

  // Trigger para atualizar atualizado_em nos alunos
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_alunos_updated
      AFTER UPDATE ON alunos_db
      BEGIN
        UPDATE alunos_db SET atualizado_em = datetime('now','localtime') WHERE id = NEW.id;
      END;
  `)
}

// ── Migração não-destrutiva de schema ─────────────────────────────────────────
function migrarSchema() {
  try {
    const tabelasExistentes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map(t => t.name)

    if (tabelasExistentes.includes('aulas')) {
      const colsAulas = db.prepare("PRAGMA table_info(aulas)").all().map(c => c.name)

      if (!colsAulas.includes('turma_ls_id')) {
        db.pragma('foreign_keys = OFF')
        db.exec('DROP TABLE IF EXISTS presencas; DROP TABLE IF EXISTS aulas;')
        db.pragma('foreign_keys = ON')
        console.log('[DB] Migração: tabelas aulas/presencas recriadas com novo schema')
      } else if (!colsAulas.includes('turma_codigo')) {
        db.exec("ALTER TABLE aulas ADD COLUMN turma_codigo TEXT DEFAULT ''")
        console.log('[DB] Migração: coluna turma_codigo adicionada')
      }
      // Adiciona conteudo se não existir (bancos criados antes da v5.6)
      if (!colsAulas.includes('conteudo')) {
        db.exec("ALTER TABLE aulas ADD COLUMN conteudo TEXT DEFAULT ''")
        console.log('[DB] Migração: coluna conteudo adicionada em aulas')
      }
      // Adiciona colunas de ausência do professor (v5.7)
      if (!colsAulas.includes('professor_ausente')) {
        db.exec("ALTER TABLE aulas ADD COLUMN professor_ausente INTEGER DEFAULT 0")
        console.log('[DB] Migração: coluna professor_ausente adicionada em aulas')
      }
      if (!colsAulas.includes('justificativa_ausencia')) {
        db.exec("ALTER TABLE aulas ADD COLUMN justificativa_ausencia TEXT DEFAULT ''")
        console.log('[DB] Migração: coluna justificativa_ausencia adicionada em aulas')
      }
      // Cancelamento e reposição (v5.8)
      if (!colsAulas.includes('cancelada')) {
        db.exec("ALTER TABLE aulas ADD COLUMN cancelada INTEGER DEFAULT 0")
        console.log('[DB] Migração: coluna cancelada adicionada em aulas')
      }
      if (!colsAulas.includes('motivo_cancelamento')) {
        db.exec("ALTER TABLE aulas ADD COLUMN motivo_cancelamento TEXT DEFAULT ''")
        console.log('[DB] Migração: coluna motivo_cancelamento adicionada em aulas')
      }
      if (!colsAulas.includes('aula_reposicao_id')) {
        db.exec("ALTER TABLE aulas ADD COLUMN aula_reposicao_id INTEGER")
        console.log('[DB] Migração: coluna aula_reposicao_id adicionada em aulas')
      }
      // Professor que ministrou a aula (v5.13) — capturado da turma na criação
      if (!colsAulas.includes('professor_id')) {
        db.exec("ALTER TABLE aulas ADD COLUMN professor_id INTEGER REFERENCES professores_db(id) ON DELETE SET NULL")
        // Retroativamente preenche professor_id para aulas existentes com base na turma
        db.exec(`
          UPDATE aulas
          SET professor_id = (
            SELECT t.professor_id FROM turmas_db t WHERE t.id = aulas.turma_ls_id
          )
          WHERE professor_id IS NULL
        `)
        console.log('[DB] Migração: coluna professor_id adicionada em aulas e preenchida retroativamente')
      }
    }
  } catch (e) {
    console.warn('[DB] migrarSchema:', e.message)
  }

  // ── Migração das tabelas v6 (schema preparatório) ─────────────────────────
  try {
    const tabelasExistentes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map(t => t.name)

    // alunos_db — campos novos da v5.6/v6
    if (tabelasExistentes.includes('alunos_db')) {
      const cols = db.prepare('PRAGMA table_info(alunos_db)').all().map(c => c.name)
      if (!cols.includes('ls_id'))           db.exec("ALTER TABLE alunos_db ADD COLUMN ls_id           INTEGER")
      if (!cols.includes('dia_vencimento'))  db.exec("ALTER TABLE alunos_db ADD COLUMN dia_vencimento  INTEGER DEFAULT 10")
      if (!cols.includes('resp_nome'))       db.exec("ALTER TABLE alunos_db ADD COLUMN resp_nome       TEXT    DEFAULT ''")
      if (!cols.includes('resp_telefone'))   db.exec("ALTER TABLE alunos_db ADD COLUMN resp_telefone   TEXT    DEFAULT ''")
      if (!cols.includes('resp_email'))      db.exec("ALTER TABLE alunos_db ADD COLUMN resp_email      TEXT    DEFAULT ''")
      if (!cols.includes('resp_parentesco')) db.exec("ALTER TABLE alunos_db ADD COLUMN resp_parentesco TEXT    DEFAULT ''")
      if (!cols.includes('resp_eh_proprio')) db.exec("ALTER TABLE alunos_db ADD COLUMN resp_eh_proprio INTEGER DEFAULT 0")
      if (!cols.includes('turma_espera_id'))    db.exec("ALTER TABLE alunos_db ADD COLUMN turma_espera_id    INTEGER")
      if (!cols.includes('turmas_espera_json')) db.exec("ALTER TABLE alunos_db ADD COLUMN turmas_espera_json TEXT DEFAULT '[]'")
      if (!cols.includes('curso_espera'))       db.exec("ALTER TABLE alunos_db ADD COLUMN curso_espera       TEXT DEFAULT ''")
      if (!cols.includes('status_motivo'))   db.exec("ALTER TABLE alunos_db ADD COLUMN status_motivo   TEXT    DEFAULT ''")
      if (!cols.includes('manter_vaga'))     db.exec("ALTER TABLE alunos_db ADD COLUMN manter_vaga     INTEGER DEFAULT 0")
      if (!cols.includes('manter_vaga_dias'))db.exec("ALTER TABLE alunos_db ADD COLUMN manter_vaga_dias INTEGER DEFAULT 0")
      // Campos de rematrícula (v5.7)
      if (!cols.includes('turma_anterior_id')) db.exec("ALTER TABLE alunos_db ADD COLUMN turma_anterior_id INTEGER")
      if (!cols.includes('data_rematricula'))  db.exec("ALTER TABLE alunos_db ADD COLUMN data_rematricula  TEXT DEFAULT ''")
      if (!cols.includes('data_reativacao'))   db.exec("ALTER TABLE alunos_db ADD COLUMN data_reativacao   TEXT DEFAULT ''")
      // Múltiplos cursos e desconto (v5.12)
      if (!cols.includes('matriculas_json'))   db.exec("ALTER TABLE alunos_db ADD COLUMN matriculas_json TEXT DEFAULT '[]'")
      if (!cols.includes('desconto_tipo'))     db.exec("ALTER TABLE alunos_db ADD COLUMN desconto_tipo   TEXT DEFAULT ''")
      if (!cols.includes('desconto_valor'))    db.exec("ALTER TABLE alunos_db ADD COLUMN desconto_valor  REAL DEFAULT 0")
      db.exec("CREATE INDEX IF NOT EXISTS idx_alunos_ls_id ON alunos_db(ls_id)")
      console.log('[DB] Migração v6: alunos_db atualizado')
    }

    // pagamentos_db — campos de encargos/desconto
    if (tabelasExistentes.includes('pagamentos_db')) {
      const cols = db.prepare('PRAGMA table_info(pagamentos_db)').all().map(c => c.name)
      if (!cols.includes('valor_original')) db.exec("ALTER TABLE pagamentos_db ADD COLUMN valor_original REAL")
      if (!cols.includes('valor_multa'))    db.exec("ALTER TABLE pagamentos_db ADD COLUMN valor_multa    REAL DEFAULT 0")
      if (!cols.includes('valor_juros'))    db.exec("ALTER TABLE pagamentos_db ADD COLUMN valor_juros    REAL DEFAULT 0")
      if (!cols.includes('valor_desconto')) db.exec("ALTER TABLE pagamentos_db ADD COLUMN valor_desconto REAL DEFAULT 0")
      if (!cols.includes('dias_atraso'))    db.exec("ALTER TABLE pagamentos_db ADD COLUMN dias_atraso    INTEGER DEFAULT 0")
      console.log('[DB] Migração v6: pagamentos_db atualizado')
    }

    // professores_db — campos de contrato (v5.12)
    if (tabelasExistentes.includes('professores_db')) {
      const cols = db.prepare('PRAGMA table_info(professores_db)').all().map(c => c.name)
      if (!cols.includes('tipo_contrato'))        db.exec("ALTER TABLE professores_db ADD COLUMN tipo_contrato        TEXT DEFAULT 'CLT'")
      if (!cols.includes('salario_fixo'))         db.exec("ALTER TABLE professores_db ADD COLUMN salario_fixo         REAL DEFAULT 0")
      if (!cols.includes('carga_horaria_mensal')) db.exec("ALTER TABLE professores_db ADD COLUMN carga_horaria_mensal REAL DEFAULT 0")
      if (!cols.includes('valor_hora_pj'))        db.exec("ALTER TABLE professores_db ADD COLUMN valor_hora_pj        REAL DEFAULT 0")
      console.log('[DB] Migração v5.12: professores_db — campos de contrato adicionados')
    }

    // usuarios — vínculo com professor (v5.13)
    if (tabelasExistentes.includes('usuarios')) {
      const cols = db.prepare('PRAGMA table_info(usuarios)').all().map(c => c.name)
      if (!cols.includes('professor_db_id')) {
        db.exec("ALTER TABLE usuarios ADD COLUMN professor_db_id INTEGER REFERENCES professores_db(id) ON DELETE SET NULL")
        console.log('[DB] Migração v5.13: usuarios — coluna professor_db_id adicionada')
      }
    }

    // turmas_db — sem campos novos, nada a migrar

    // reservas_sala — adiciona turma_id e turma_nome (v5.9.1)
    if (tabelasExistentes.includes('reservas_sala')) {
      const cols = db.prepare('PRAGMA table_info(reservas_sala)').all().map(c => c.name)
      if (!cols.includes('turma_id')) {
        db.exec("ALTER TABLE reservas_sala ADD COLUMN turma_id INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL")
        console.log('[DB] Migração v5.9.1: coluna turma_id adicionada em reservas_sala')
      }
      if (!cols.includes('turma_nome')) {
        db.exec("ALTER TABLE reservas_sala ADD COLUMN turma_nome TEXT DEFAULT ''")
        console.log('[DB] Migração v5.9.1: coluna turma_nome adicionada em reservas_sala')
      }
    }

  } catch (e) {
    console.warn('[DB] migrarSchema v6:', e.message)
  }

  // ── Corrige perfil Administrador com permissões de nível 1 → 2 (v5.13) ──────
  // A seed anterior gravava 1 (Visualizar) em vez de 2 (Editar) para o admin.
  try {
    const admin = db.prepare("SELECT * FROM perfis WHERE nome='Administrador'").get()
    if (admin && admin.perm_usuarios < 2) {
      db.prepare(`
        UPDATE perfis
        SET perm_dashboard=2, perm_alunos=2, perm_financeiro=2, perm_cursos=2,
            perm_relatorios=2, perm_agenda=2, perm_config=2, perm_usuarios=2
        WHERE nome='Administrador'
      `).run()
      console.log('[DB] Migração v5.13: permissões do Administrador corrigidas de 1 para 2')
    }
  } catch (e) {
    console.warn('[DB] migrarSchema v5.13 (admin perms):', e.message)
  }
}

// ── Seed inicial ──────────────────────────────────────────────────────────────
function seedInicial() {
  const perfilExiste = db.prepare("SELECT id FROM perfis WHERE nome='Administrador'").get()
  if (perfilExiste) return

  const perfilAdmin = db.prepare(`
    INSERT INTO perfis (nome, desc, cor, perm_dashboard, perm_alunos, perm_financeiro, perm_cursos, perm_relatorios, perm_agenda, perm_config, perm_usuarios)
    VALUES ('Administrador','Acesso total ao sistema','#63dcaa',2,2,2,2,2,2,2,2)
  `).run()

  const perfilSec = db.prepare(`
    INSERT INTO perfis (nome, desc, cor, perm_dashboard, perm_alunos, perm_financeiro, perm_cursos, perm_relatorios, perm_agenda, perm_config, perm_usuarios)
    VALUES ('Secretaria','Gestão de alunos e agenda','#5b9cf6',1,2,2,1,1,2,0,0)
  `).run()

  const perfilProf = db.prepare(`
    INSERT INTO perfis (nome, desc, cor, perm_dashboard, perm_alunos, perm_financeiro, perm_cursos, perm_relatorios, perm_agenda, perm_config, perm_usuarios)
    VALUES ('Professor','Frequência e agenda','#a78bfa',1,1,0,2,0,1,0,0)
  `).run()

  db.prepare(`
    INSERT INTO perfis (nome, desc, cor, perm_dashboard, perm_alunos, perm_financeiro, perm_cursos, perm_relatorios, perm_agenda, perm_config, perm_usuarios)
    VALUES ('Financeiro','Gestão financeira','#f5c542',1,1,2,0,2,0,0,0)
  `).run()

  db.prepare(`
    INSERT INTO perfis (nome, desc, cor, perm_dashboard, perm_alunos, perm_financeiro, perm_cursos, perm_relatorios, perm_agenda, perm_config, perm_usuarios)
    VALUES ('Visualizador','Somente leitura','#7f8ba4',1,1,1,1,1,1,0,0)
  `).run()

  db.prepare(`
    INSERT INTO usuarios (login, nome, email, senha_hash, perfil_id, avatar_cor)
    VALUES ('admin','Administrador','admin@escola.com',?,?,?)
  `).run(hashSenha('admin123'), perfilAdmin.lastInsertRowid, '#63dcaa')

  db.prepare(`
    INSERT INTO usuarios (login, nome, email, senha_hash, perfil_id, avatar_cor)
    VALUES ('secretaria','Secretaria','sec@escola.com',?,?,?)
  `).run(hashSenha('sec123'), perfilSec.lastInsertRowid, '#5b9cf6')

  db.prepare(`
    INSERT INTO usuarios (login, nome, email, senha_hash, perfil_id, avatar_cor)
    VALUES ('demo','Usuário Demo','demo@escola.com',?,?,?)
  `).run(hashSenha('demo'), perfilProf.lastInsertRowid, '#a78bfa')

  db.prepare(`
    INSERT INTO identidade (id, nome_escola, slogan) VALUES (1,'Escola Manager','Sistema de Gestão Escolar')
  `).run()

  registrarLog({ usuarioLogin:'sistema', modulo:'sistema', acao:'inicializar', detalhe:'Banco de dados inicializado com dados padrão', nivel:'info' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════
function registrarLog({ usuarioId = null, usuarioLogin = 'sistema', modulo, acao, entidadeId = null, entidadeNome = '', detalhe = '', nivel = 'info' } = {}) {
  try {
    dbOk()
    db.prepare(`
      INSERT INTO audit_log (usuario_id, usuario_login, modulo, acao, entidade_id, entidade_nome, detalhe, nivel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(usuarioId, usuarioLogin, modulo, acao, entidadeId, entidadeNome, detalhe, nivel)
  } catch {}
}

function listarLogs({ modulo = null, nivel = null, busca = null, limite = 200, pagina = 1 } = {}) {
  dbOk()
  const where = []; const params = []
  if (modulo) { where.push('modulo = ?'); params.push(modulo) }
  if (nivel)  { where.push('nivel = ?');  params.push(nivel) }
  if (busca)  { where.push('(detalhe LIKE ? OR usuario_login LIKE ? OR entidade_nome LIKE ?)'); params.push(`%${busca}%`,`%${busca}%`,`%${busca}%`) }
  const wc = where.length ? 'WHERE '+where.join(' AND ') : ''
  const off = (pagina - 1) * limite
  return db.prepare(`SELECT * FROM audit_log ${wc} ORDER BY criado_em DESC LIMIT ? OFFSET ?`).all(...params, limite, off)
}

function limparLogs(dias = 30) {
  dbOk()
  const info = db.prepare(`DELETE FROM audit_log WHERE criado_em < datetime('now','-' || ? || ' days','localtime')`).run(dias)
  registrarLog({ modulo:'sistema', acao:'limpar_logs', detalhe:`${info.changes} registros removidos (>${dias} dias)`, nivel:'aviso' })
  return { ok: true, removidos: info.changes }
}

function estatisticasLogs() {
  dbOk()
  return {
    total:    db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n,
    hoje:     db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE date(criado_em)=date('now','localtime')").get().n,
    erros:    db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE nivel='erro'").get().n,
    avisos:   db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE nivel='aviso'").get().n,
    porModulo:db.prepare('SELECT modulo, COUNT(*) AS total FROM audit_log GROUP BY modulo ORDER BY total DESC').all(),
  }
}

function registrarLogExterno(d) { registrarLog(d); return { ok: true } }

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
function login(loginStr, senha) {
  dbOk()
  const u = db.prepare(`
    SELECT u.*, p.nome AS perfil_nome, p.cor AS perfil_cor,
      p.perm_dashboard, p.perm_alunos, p.perm_financeiro, p.perm_cursos,
      p.perm_relatorios, p.perm_agenda, p.perm_config, p.perm_usuarios
    FROM usuarios u JOIN perfis p ON p.id = u.perfil_id
    WHERE u.login = ? COLLATE NOCASE AND u.ativo = 1
  `).get(loginStr)
  if (!u || !verificarSenha(senha, u.senha_hash)) {
    registrarLog({ usuarioLogin: loginStr, modulo:'auth', acao:'login_falha', detalhe:`Tentativa de login inválida: ${loginStr}`, nivel:'aviso' })
    return { ok: false, erro: 'Login ou senha incorretos' }
  }
  db.prepare("UPDATE usuarios SET ultimo_acesso=datetime('now','localtime') WHERE id=?").run(u.id)
  registrarLog({ usuarioId:u.id, usuarioLogin:u.login, modulo:'auth', acao:'login', detalhe:`Login: ${u.nome} (${u.perfil_nome})` })
  const { senha_hash, ...seguro } = u
  return { ok: true, usuario: seguro }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USUÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════
function listarUsuarios() {
  dbOk()
  return db.prepare(`
    SELECT u.id, u.login, u.nome, u.email, u.perfil_id, u.ativo, u.avatar_cor,
      u.professor_db_id, u.ultimo_acesso, u.criado_em,
      p.nome AS perfil_nome, p.cor AS perfil_cor
    FROM usuarios u JOIN perfis p ON p.id = u.perfil_id ORDER BY u.nome
  `).all()
}

function criarUsuario(d, _req = {}) {
  dbOk()
  if (!d.login || !d.nome || !d.senha || !d.perfil_id) return { ok:false, erro:'Campos obrigatórios ausentes' }
  const existe = db.prepare('SELECT id FROM usuarios WHERE login=? COLLATE NOCASE').get(d.login)
  if (existe) return { ok:false, erro:'Login já existe' }
  const info = db.prepare(`
    INSERT INTO usuarios (login,nome,email,senha_hash,perfil_id,avatar_cor,professor_db_id)
    VALUES (?,?,?,?,?,?,?)
  `).run(d.login, d.nome, d.email||'', hashSenha(d.senha), d.perfil_id, d.avatar_cor||'#63dcaa',
    d.professor_db_id ? Number(d.professor_db_id) : null)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'criar', entidadeId:info.lastInsertRowid, entidadeNome:d.nome, detalhe:`Usuário criado: ${d.login}` })
  return { ok:true, id:info.lastInsertRowid }
}

function editarUsuario(id, d, _req = {}) {
  dbOk()
  const u = db.prepare('SELECT login,nome FROM usuarios WHERE id=?').get(id)
  if (!u) return { ok:false, erro:'Usuário não encontrado' }
  if (d.login !== u.login) {
    const existe = db.prepare('SELECT id FROM usuarios WHERE login=? COLLATE NOCASE AND id!=?').get(d.login, id)
    if (existe) return { ok:false, erro:'Login já existe' }
  }
  const novaSenhaHash = d.nova_senha ? hashSenha(d.nova_senha) : db.prepare('SELECT senha_hash FROM usuarios WHERE id=?').get(id).senha_hash
  db.prepare(`
    UPDATE usuarios SET login=?,nome=?,email=?,senha_hash=?,perfil_id=?,ativo=?,avatar_cor=?,professor_db_id=? WHERE id=?
  `).run(d.login, d.nome, d.email||'', novaSenhaHash, d.perfil_id, d.ativo??1, d.avatar_cor||'#63dcaa',
    d.professor_db_id ? Number(d.professor_db_id) : null, id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'editar', entidadeId:id, entidadeNome:d.nome, detalhe:`Usuário editado: ${u.login} → ${d.login}` })
  return { ok:true }
}

function deletarUsuario(id, _req = {}) {
  dbOk()
  const u = db.prepare('SELECT login,nome,perfil_id FROM usuarios WHERE id=?').get(id)
  if (!u) return { ok:false, erro:'Usuário não encontrado' }
  const adminPerfilId = db.prepare("SELECT id FROM perfis WHERE nome='Administrador'").get()?.id
  if (adminPerfilId && u?.perfil_id === adminPerfilId) {
    const adminsAtivos = db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE perfil_id=? AND ativo=1 AND id!=?').get(adminPerfilId, id).n
    if (adminsAtivos === 0) return { ok:false, erro:'Não é possível remover o único administrador ativo.' }
  }
  db.prepare('DELETE FROM usuarios WHERE id=?').run(id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'excluir', entidadeId:id, entidadeNome:u?.nome||'', detalhe:`Usuário excluído: ${u?.login}`, nivel:'aviso' })
  return { ok:true }
}

function alterarSenhaPropria(id, senhaAtual, novaSenha) {
  dbOk()
  const u = db.prepare('SELECT login,senha_hash FROM usuarios WHERE id=?').get(id)
  if (!u || !verificarSenha(senhaAtual, u.senha_hash)) return { ok:false, erro:'Senha atual incorreta' }
  if (!novaSenha || novaSenha.length < 4) return { ok:false, erro:'Nova senha deve ter pelo menos 4 caracteres' }
  db.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').run(hashSenha(novaSenha), id)
  registrarLog({ usuarioId:id, usuarioLogin:u.login, modulo:'usuarios', acao:'alterar_senha', entidadeId:id, entidadeNome:u.login, detalhe:'Senha alterada pelo próprio usuário' })
  return { ok:true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFIS
// ═══════════════════════════════════════════════════════════════════════════════
function listarPerfis() { dbOk(); return db.prepare('SELECT * FROM perfis ORDER BY id').all() }

function criarPerfil(d, _req = {}) {
  dbOk()
  const info = db.prepare(`
    INSERT INTO perfis (nome,desc,cor,perm_dashboard,perm_alunos,perm_financeiro,perm_cursos,perm_relatorios,perm_agenda,perm_config,perm_usuarios)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(d.nome, d.desc||'', d.cor||'#63dcaa', d.perm_dashboard||1, d.perm_alunos||1, d.perm_financeiro||0, d.perm_cursos||1, d.perm_relatorios||1, d.perm_agenda||1, d.perm_config||0, d.perm_usuarios||0)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'perfis', acao:'criar', entidadeId:info.lastInsertRowid, entidadeNome:d.nome, detalhe:`Perfil criado: ${d.nome}` })
  return { ok:true, id:info.lastInsertRowid }
}

function editarPerfil(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT nome FROM perfis WHERE id=?').get(id)
  db.prepare(`
    UPDATE perfis SET nome=?,desc=?,cor=?,perm_dashboard=?,perm_alunos=?,perm_financeiro=?,perm_cursos=?,perm_relatorios=?,perm_agenda=?,perm_config=?,perm_usuarios=? WHERE id=?
  `).run(d.nome, d.desc||'', d.cor||'#63dcaa', d.perm_dashboard, d.perm_alunos, d.perm_financeiro, d.perm_cursos, d.perm_relatorios, d.perm_agenda, d.perm_config, d.perm_usuarios, id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'perfis', acao:'editar', entidadeId:id, entidadeNome:antes?.nome||'', detalhe:`Perfil editado: ${antes?.nome} → ${d.nome}` })
  return { ok:true }
}

function deletarPerfil(id, _req = {}) {
  dbOk()
  const uso = db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE perfil_id=?').get(id).n
  if (uso > 0) return { ok:false, erro:`Perfil em uso por ${uso} usuário(s).` }
  const p = db.prepare('SELECT nome FROM perfis WHERE id=?').get(id)
  db.prepare('DELETE FROM perfis WHERE id=?').run(id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'perfis', acao:'excluir', entidadeId:id, entidadeNome:p?.nome||'', detalhe:`Perfil excluído: ${p?.nome}`, nivel:'aviso' })
  return { ok:true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTIDADE VISUAL
// ═══════════════════════════════════════════════════════════════════════════════
function getIdentidade() {
  dbOk()
  return db.prepare('SELECT * FROM identidade WHERE id=1').get() || { nome_escola:'Escola Manager', slogan:'', logo_base64:'', logo_nome:'' }
}

function salvarIdentidade(d, _req = {}) {
  dbOk()
  db.prepare(`
    INSERT INTO identidade (id,logo_base64,logo_nome,nome_escola,slogan,atualizado_em)
    VALUES (1,?,?,?,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      logo_base64=excluded.logo_base64, logo_nome=excluded.logo_nome,
      nome_escola=excluded.nome_escola, slogan=excluded.slogan,
      atualizado_em=excluded.atualizado_em
  `).run(d.logo_base64||'', d.logo_nome||'', d.nome_escola||'Escola Manager', d.slogan||'')
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'identidade', acao:'configurar', detalhe:`Identidade visual atualizada: "${d.nome_escola}"` })
  return { ok:true }
}

function registrarLogExterno(d) { registrarLog(d); return { ok:true } }

// ═══════════════════════════════════════════════════════════════════════════════
// FREQUÊNCIA — Aulas e Presenças
// ═══════════════════════════════════════════════════════════════════════════════
function listarAulas({ turmaLsId = null, mes = null } = {}) {
  dbOk()
  let sql = 'SELECT * FROM aulas'
  const params = []; const where = []
  if (turmaLsId) { where.push('turma_ls_id = ?'); params.push(turmaLsId) }
  if (mes)       { where.push("strftime('%Y-%m', data) = ?"); params.push(mes) }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY data DESC'
  return db.prepare(sql).all(...params)
}

function criarAula(d, _req = {}) {
  dbOk()
  // professorId explícito (substituição) tem prioridade; senão usa o da turma
  let professorId = d.professorId ? Number(d.professorId) : null
  if (!professorId && d.turmaLsId) {
    const turmaRow = db.prepare('SELECT professor_id FROM turmas_db WHERE id = ?').get(d.turmaLsId)
    professorId = turmaRow?.professor_id || null
  }
  const info = db.prepare(`
    INSERT INTO aulas (turma_ls_id, turma_codigo, data, titulo, conteudo, cancelada, motivo_cancelamento, aula_reposicao_id, professor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.turmaLsId,
    d.turmaCodigo          || '',
    d.data,
    d.titulo               || '',
    d.conteudo             || '',
    d.cancelada            ? 1 : 0,
    d.motivo_cancelamento  || '',
    d.aula_reposicao_id    ?? null,
    professorId,
  )
  const subst = d.professorId ? ' [SUBSTITUIÇÃO]' : ''
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'criar', entidadeId:info.lastInsertRowid, entidadeNome:d.titulo||d.data, detalhe:`Aula criada: ${d.turmaCodigo} ${d.data}${d.cancelada ? ' [CANCELADA]' : ''}${subst}` })
  return { ok:true, id:info.lastInsertRowid }
}

function editarAula(id, d, _req = {}) {
  dbOk()
  // professor_id: undefined = não altera; null = limpa; número = atualiza
  if (d.professor_id !== undefined) {
    db.prepare('UPDATE aulas SET professor_id=? WHERE id=?').run(
      d.professor_id ? Number(d.professor_id) : null, id
    )
  }
  db.prepare(`
    UPDATE aulas SET
      titulo=?, data=?, conteudo=?,
      professor_ausente=?, justificativa_ausencia=?,
      cancelada=?, motivo_cancelamento=?, aula_reposicao_id=?
    WHERE id=?
  `).run(
    d.titulo               || '',
    d.data,
    d.conteudo             || '',
    d.professor_ausente    ? 1 : 0,
    d.justificativa_ausencia || '',
    d.cancelada            ? 1 : 0,
    d.motivo_cancelamento  || '',
    d.aula_reposicao_id    ?? null,
    id,
  )
  const flags = [
    d.professor_ausente ? '[PROFESSOR AUSENTE]' : '',
    d.cancelada         ? '[CANCELADA]'         : '',
    d.aula_reposicao_id ? `[REPOSIÇÃO DE #${d.aula_reposicao_id}]` : '',
    d.professor_id      ? '[SUBSTITUIÇÃO]'      : '',
  ].filter(Boolean).join(' ')
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'editar', entidadeId:id, detalhe:`Aula editada: ID ${id} ${flags}`.trim() })
  return { ok:true }
}

function deletarAula(id, _req = {}) {
  dbOk()
  db.prepare('DELETE FROM aulas WHERE id=?').run(id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'excluir', entidadeId:id, detalhe:`Aula excluída: ID ${id}`, nivel:'aviso' })
  return { ok:true }
}

function getPresencas(aulaId) { dbOk(); return db.prepare('SELECT * FROM presencas WHERE aula_id = ? ORDER BY aluno_nome').all(aulaId) }

function salvarPresencas(aulaId, lista, _req = {}) {
  dbOk()
  const upsert = db.prepare(`
    INSERT INTO presencas (aula_id, aluno_ls_id, aluno_nome, presente, obs)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(aula_id, aluno_ls_id) DO UPDATE SET
      presente=excluded.presente, aluno_nome=excluded.aluno_nome, obs=excluded.obs
  `)
  db.transaction(() => {
    lista.forEach(a => upsert.run(aulaId, a.alunoLsId, a.alunoNome, a.presente ? 1 : 0, a.obs || ''))
  })()
  const presentes = lista.filter(a => a.presente).length
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'registrar_chamada', entidadeId:aulaId, detalhe:`Chamada registrada: ${presentes}/${lista.length} presentes` })
  return { ok:true }
}

function estatisticasFrequencia(turmaLsId) {
  dbOk()
  const aulas = db.prepare('SELECT id FROM aulas WHERE turma_ls_id = ?').all(turmaLsId)
  if (!aulas.length) return { totalAulas:0, alunos:[] }
  const aulaIds = aulas.map(a => a.id)
  const placeholders = aulaIds.map(() => '?').join(',')
  const presencasPorAluno = db.prepare(`
    SELECT aluno_ls_id, aluno_nome,
      COUNT(*) AS total_aulas, SUM(presente) AS total_presentes,
      ROUND(SUM(presente)*100.0/COUNT(*),1) AS percentual
    FROM presencas WHERE aula_id IN (${placeholders})
    GROUP BY aluno_ls_id, aluno_nome ORDER BY aluno_nome
  `).all(...aulaIds)
  return { totalAulas:aulas.length, alunos:presencasPorAluno }
}

function relatorioFrequenciaAvancado({ turmaId, professorId, dataInicio, dataFim } = {}) {
  dbOk()
  const conds = ['a.cancelada = 0']
  const params = []
  if (turmaId)    { conds.push('a.turma_ls_id = ?'); params.push(Number(turmaId))    }
  if (professorId){ conds.push('a.professor_id = ?'); params.push(Number(professorId)) }
  if (dataInicio) { conds.push('a.data >= ?');         params.push(dataInicio)          }
  if (dataFim)    { conds.push('a.data <= ?');         params.push(dataFim)             }
  const wc = 'WHERE ' + conds.join(' AND ')

  const totalAulas = db.prepare(`SELECT COUNT(*) AS n FROM aulas a ${wc}`).get(...params).n
  if (!totalAulas) return { totalAulas: 0, alunos: [], professoresStats: [], aulas: [] }

  const alunos = db.prepare(`
    SELECT p.aluno_ls_id, p.aluno_nome,
      COUNT(*)                              AS total_aulas,
      SUM(p.presente)                       AS total_presentes,
      ROUND(SUM(p.presente)*100.0/COUNT(*), 1) AS percentual
    FROM presencas p JOIN aulas a ON a.id = p.aula_id
    ${wc}
    GROUP BY p.aluno_ls_id, p.aluno_nome ORDER BY p.aluno_nome
  `).all(...params)

  const professoresStats = db.prepare(`
    SELECT a.professor_id,
      COUNT(*)                AS total_aulas,
      SUM(a.professor_ausente) AS total_ausencias
    FROM aulas a ${wc}
    GROUP BY a.professor_id
  `).all(...params)

  const aulas = db.prepare(`
    SELECT a.id, a.data, a.turma_codigo, a.turma_ls_id, a.professor_id,
      a.professor_ausente, a.titulo,
      COUNT(p.id)                                      AS total_alunos,
      SUM(CASE WHEN p.presente=1 THEN 1 ELSE 0 END)   AS total_presentes
    FROM aulas a LEFT JOIN presencas p ON p.aula_id = a.id
    ${wc}
    GROUP BY a.id ORDER BY a.data DESC LIMIT 200
  `).all(...params)

  return { totalAulas, alunos, professoresStats, aulas }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO DE RECADOS (v5.6)
// ═══════════════════════════════════════════════════════════════════════════════

function listarRecados({ status = null, remetente_tipo = null, remetente_id = null, busca = null } = {}) {
  dbOk()
  const where = []; const params = []
  if (status)          { where.push('r.status = ?');                             params.push(status) }
  if (remetente_tipo)  { where.push('r.remetente_tipo = ?');                     params.push(remetente_tipo) }
  if (remetente_id)    { where.push('r.remetente_id = ?');                       params.push(remetente_id) }
  if (busca)           { where.push('(r.titulo LIKE ? OR r.mensagem LIKE ?)');   params.push(`%${busca}%`, `%${busca}%`) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const recados = db.prepare(`
    SELECT r.*,
      COUNT(DISTINCT rd.id) AS total_destinatarios,
      COUNT(DISTINCT CASE WHEN rl.lido=1 THEN rl.id END) AS total_lidos
    FROM recados r
    LEFT JOIN recados_destinatarios rd ON rd.recado_id = r.id
    LEFT JOIN recados_leituras rl      ON rl.recado_id = r.id
    ${wc}
    GROUP BY r.id
    ORDER BY r.criado_em DESC
  `).all(...params)

  const stmtDest = db.prepare('SELECT * FROM recados_destinatarios WHERE recado_id = ?')
  return recados.map(r => ({ ...r, destinatarios: stmtDest.all(r.id) }))
}

function recadosParaAluno({ aluno_ls_id, turma_ls_id = -1 }) {
  dbOk()
  return db.prepare(`
    SELECT DISTINCT r.*,
      COALESCE(rl.lido, 0) AS lido,
      rl.lido_em
    FROM recados r
    JOIN recados_destinatarios rd ON rd.recado_id = r.id
    LEFT JOIN recados_leituras rl ON rl.recado_id = r.id AND rl.aluno_ls_id = ?
    WHERE r.status = 'enviado'
      AND (
        (rd.tipo = 'aluno'        AND rd.referencia_id = ?)
        OR (rd.tipo = 'turma'     AND rd.referencia_id = ?)
        OR rd.tipo = 'todos'
      )
    ORDER BY r.enviado_em DESC
  `).all(aluno_ls_id, aluno_ls_id, turma_ls_id)
}

function contarNaoLidos({ aluno_ls_id, turma_ls_id = -1 }) {
  dbOk()
  const row = db.prepare(`
    SELECT COUNT(DISTINCT r.id) AS total
    FROM recados r
    JOIN recados_destinatarios rd ON rd.recado_id = r.id
    LEFT JOIN recados_leituras rl ON rl.recado_id = r.id AND rl.aluno_ls_id = ?
    WHERE r.status = 'enviado'
      AND COALESCE(rl.lido, 0) = 0
      AND (
        (rd.tipo = 'aluno'    AND rd.referencia_id = ?)
        OR (rd.tipo = 'turma' AND rd.referencia_id = ?)
        OR rd.tipo = 'todos'
      )
  `).get(aluno_ls_id, aluno_ls_id, turma_ls_id)
  return row?.total ?? 0
}

function salvarRecado(dados, _req = {}) {
  dbOk()
  const {
    id, titulo, mensagem, remetente_tipo, remetente_id, remetente_nome,
    prioridade = 'normal', agendado_para = null, destinatarios = [], enviar_agora = false
  } = dados

  const status    = enviar_agora ? 'enviado' : agendado_para ? 'agendado' : 'rascunho'
  const enviado_em = enviar_agora ? new Date().toISOString() : null
  let recadoId = id

  db.transaction(() => {
    if (id) {
      db.prepare(`
        UPDATE recados SET titulo=?, mensagem=?, prioridade=?, agendado_para=?, status=?, enviado_em=?
        WHERE id=?
      `).run(titulo, mensagem, prioridade, agendado_para, status, enviado_em, id)
      db.prepare('DELETE FROM recados_destinatarios WHERE recado_id=?').run(id)
    } else {
      const info = db.prepare(`
        INSERT INTO recados (titulo,mensagem,remetente_tipo,remetente_id,remetente_nome,prioridade,agendado_para,status,enviado_em)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(titulo, mensagem, remetente_tipo, remetente_id, remetente_nome, prioridade, agendado_para, status, enviado_em)
      recadoId = info.lastInsertRowid
    }

    const stmtDest = db.prepare(`
      INSERT INTO recados_destinatarios (recado_id, tipo, referencia_id, referencia_nome)
      VALUES (?, ?, ?, ?)
    `)
    for (const dest of destinatarios) {
      stmtDest.run(recadoId, dest.tipo, dest.referencia_id ?? null, dest.referencia_nome ?? null)
    }

    if (enviar_agora) _criarLeituras(recadoId, destinatarios)
  })()

  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'recados', acao: enviar_agora ? 'enviar' : (id ? 'editar' : 'criar'),
    entidadeId: recadoId, entidadeNome: titulo,
    detalhe: `Recado "${titulo}" — status: ${status}`
  })

  return { ok:true, id: recadoId }
}

function enviarRecado({ id }, _req = {}) {
  dbOk()
  const recado = db.prepare('SELECT * FROM recados WHERE id=?').get(id)
  if (!recado) return { ok:false, erro:'Recado não encontrado' }
  const destinatarios = db.prepare('SELECT * FROM recados_destinatarios WHERE recado_id=?').all(id)

  db.transaction(() => {
    db.prepare(`UPDATE recados SET status='enviado', enviado_em=datetime('now','localtime') WHERE id=?`).run(id)
    _criarLeituras(id, destinatarios)
  })()

  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'recados', acao: 'enviar', entidadeId: id, entidadeNome: recado.titulo,
    detalhe: `Recado enviado: "${recado.titulo}"`
  })

  return { ok:true }
}

function marcarRecadoLido({ recado_id, aluno_ls_id }) {
  dbOk()
  db.prepare(`
    INSERT INTO recados_leituras (recado_id, aluno_ls_id, lido, lido_em)
    VALUES (?, ?, 1, datetime('now','localtime'))
    ON CONFLICT(recado_id, aluno_ls_id)
    DO UPDATE SET lido=1, lido_em=datetime('now','localtime')
  `).run(recado_id, aluno_ls_id)
  return { ok:true }
}

function excluirRecado({ id }, _req = {}) {
  dbOk()
  const r = db.prepare('SELECT titulo, status FROM recados WHERE id=?').get(id)
  if (r?.status === 'enviado') return { ok:false, erro:'Não é possível excluir um recado já enviado.' }
  db.prepare('DELETE FROM recados WHERE id=?').run(id)
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'recados', acao: 'excluir', entidadeId: id, entidadeNome: r?.titulo || '',
    detalhe: `Recado excluído: "${r?.titulo}"`, nivel: 'aviso'
  })
  return { ok:true }
}

// Helper interno — cria entradas de leitura expandindo grupos para aluno_ls_id
// Nota: como alunos ainda estão no localStorage na v5, usamos referencia_id diretamente
// Quando migrar para v6 (alunos no SQLite), adaptar queries para alunos_db
function _criarLeituras(recadoId, destinatarios) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO recados_leituras (recado_id, aluno_ls_id) VALUES (?, ?)
  `)
  for (const dest of destinatarios) {
    if (dest.tipo === 'aluno' && dest.referencia_id) {
      stmt.run(recadoId, dest.referencia_id)
    }
    // turma, todos, lista_espera, inadimplentes: leituras criadas quando o aluno
    // abre o painel — o query de recadosParaAluno já filtra pela turma/grupo.
    // Para rastrear leitura individual, basta chamar marcarRecadoLido() ao abrir.
  }
}

// Scheduler: processar recados agendados vencidos (chamar via setInterval no main.js)
function processarRecadosAgendados() {
  if (!db) return
  try {
    const vencidos = db.prepare(`
      SELECT * FROM recados WHERE status='agendado' AND agendado_para <= datetime('now','localtime')
    `).all()

    for (const recado of vencidos) {
      const destinatarios = db.prepare('SELECT * FROM recados_destinatarios WHERE recado_id=?').all(recado.id)
      db.transaction(() => {
        db.prepare(`UPDATE recados SET status='enviado', enviado_em=datetime('now','localtime') WHERE id=?`).run(recado.id)
        _criarLeituras(recado.id, destinatarios)
      })()
      console.log(`[Recados] Agendado enviado: #${recado.id} "${recado.titulo}"`)
    }
  } catch (e) {
    console.error('[Recados] processarAgendados:', e.message)
  }
}

// ── Ausência do professor — cria recado automático para a secretaria (v5.7) ───
// ─────────────────────────────────────────────────────────────────────────────
// Relatório de carga horária por professor (v5.8)
// JOIN: aulas → turmas_db → professores_db
// Conta apenas aulas em que o professor NÃO estava ausente.
// Filtros opcionais: professorId, de (YYYY-MM-DD), ate (YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────
function cargaHorariaProfessores({ professorId = null, de = null, ate = null } = {}) {
  dbOk()

  const where = ['COALESCE(a.professor_id, t.professor_id) IS NOT NULL']
  const params = []

  if (professorId) { where.push('COALESCE(a.professor_id, t.professor_id) = ?'); params.push(professorId) }
  if (de)          { where.push('a.data >= ?'); params.push(de)  }
  if (ate)         { where.push('a.data <= ?'); params.push(ate) }

  const wc = 'WHERE ' + where.join(' AND ')

  // ── Resumo por professor ──────────────────────────────────────────────────
  const resumo = db.prepare(`
    SELECT
      p.id                                   AS professor_id,
      p.nome                                 AS professor_nome,
      p.idioma                               AS professor_idioma,
      p.email                                AS professor_email,
      p.telefone                             AS professor_telefone,
      COUNT(a.id)                            AS total_aulas,
      SUM(CASE WHEN a.professor_ausente=0 THEN 1 ELSE 0 END) AS aulas_ministradas,
      SUM(CASE WHEN a.professor_ausente=1 THEN 1 ELSE 0 END) AS aulas_ausente,
      COUNT(DISTINCT t.id)                   AS total_turmas,
      MIN(a.data)                            AS primeira_aula,
      MAX(a.data)                            AS ultima_aula
    FROM aulas a
    LEFT JOIN turmas_db t      ON t.id = a.turma_ls_id
    JOIN professores_db p ON p.id = COALESCE(a.professor_id, t.professor_id)
    ${wc}
    GROUP BY p.id, p.nome, p.idioma, p.email, p.telefone
    ORDER BY p.nome COLLATE NOCASE
  `).all(...params)

  // ── Detalhe por turma (para expandir na UI) ───────────────────────────────
  const detalhe = db.prepare(`
    SELECT
      COALESCE(a.professor_id, t.professor_id) AS professor_id,
      t.id      AS turma_id,
      t.codigo  AS turma_codigo,
      t.idioma  AS turma_idioma,
      t.nivel   AS turma_nivel,
      COUNT(a.id) AS total_aulas,
      SUM(CASE WHEN a.professor_ausente=0 THEN 1 ELSE 0 END) AS aulas_ministradas,
      SUM(CASE WHEN a.professor_ausente=1 THEN 1 ELSE 0 END) AS aulas_ausente,
      MIN(a.data) AS primeira_aula,
      MAX(a.data) AS ultima_aula
    FROM aulas a
    LEFT JOIN turmas_db t      ON t.id = a.turma_ls_id
    JOIN professores_db p ON p.id = COALESCE(a.professor_id, t.professor_id)
    ${wc}
    GROUP BY COALESCE(a.professor_id, t.professor_id), t.id, t.codigo, t.idioma, t.nivel
    ORDER BY p.nome COLLATE NOCASE, t.codigo COLLATE NOCASE
  `).all(...params)

  // Indexa detalhe por professor_id para facilitar montagem no frontend
  const detalheMap = {}
  for (const row of detalhe) {
    const pid = String(row.professor_id)
    if (!detalheMap[pid]) detalheMap[pid] = []
    detalheMap[pid].push(row)
  }

  return resumo.map(r => ({
    ...r,
    turmas: detalheMap[String(r.professor_id)] || [],
  }))
}

function registrarAusenciaProfessor({ aulaId, turmaCodigo, dataAula, professorNome, justificativa }, _req = {}) {
  dbOk()
  const titulo   = `⚠️ Professor ausente — ${turmaCodigo} · ${dataAula}`
  const mensagem = `O professor ${professorNome || _req.userLogin || 'sem nome'} registrou ausência na aula da turma ${turmaCodigo} em ${dataAula}.\n\nJustificativa: ${justificativa || '(não informada)'}`

  const info = db.prepare(`
    INSERT INTO recados (titulo, mensagem, remetente_tipo, remetente_id, remetente_nome, prioridade, status, enviado_em)
    VALUES (?, ?, 'professor', ?, ?, 'importante', 'enviado', datetime('now','localtime'))
  `).run(titulo, mensagem, _req.userId || 0, professorNome || _req.userLogin || 'Professor')

  const recadoId = info.lastInsertRowid

  // Destino: todos os usuários do perfil secretaria/admin — usamos tipo='todos' pois
  // recados de sistema para a equipe interna não têm aluno destinatário específico
  db.prepare(`
    INSERT INTO recados_destinatarios (recado_id, tipo, referencia_id, referencia_nome)
    VALUES (?, 'todos', NULL, 'Secretaria/Admin')
  `).run(recadoId)

  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'frequencia', acao: 'ausencia_professor',
    entidadeId: aulaId, entidadeNome: turmaCodigo,
    detalhe: `Professor ausente: ${turmaCodigo} ${dataAula} — ${justificativa || 'sem justificativa'}`,
    nivel: 'aviso'
  })

  return { ok: true, recadoId }
}


// ═══════════════════════════════════════════════════════════════════════════════
// PROFESSORES (v6 — SQLite)
// ═══════════════════════════════════════════════════════════════════════════════

function listarProfessores({ apenasAtivos = false } = {}) {
  dbOk()
  const where = apenasAtivos ? 'WHERE ativo = 1' : ''
  return db.prepare(`
    SELECT * FROM professores_db ${where} ORDER BY nome COLLATE NOCASE
  `).all()
}

function criarProfessor(d, _req = {}) {
  dbOk()
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome é obrigatório' }
  const tipoContrato = d.tipo_contrato === 'PJ' ? 'PJ' : 'CLT'
  const info = db.prepare(`
    INSERT INTO professores_db (nome, idioma, email, telefone, ativo,
      tipo_contrato, salario_fixo, carga_horaria_mensal, valor_hora_pj)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.nome.trim(),
    d.idioma               || '',
    d.email                || '',
    d.telefone             || '',
    d.ativo                ?? 1,
    tipoContrato,
    Number(d.salario_fixo)         || 0,
    Number(d.carga_horaria_mensal) || 0,
    Number(d.valor_hora_pj)        || 0
  )
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'professores', acao: 'criar',
    entidadeId:   info.lastInsertRowid,
    entidadeNome: d.nome,
    detalhe: `Professor criado: ${d.nome} [${tipoContrato}]`,
  })
  return { ok: true, id: info.lastInsertRowid }
}

function editarProfessor(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT nome, tipo_contrato FROM professores_db WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Professor não encontrado' }
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome é obrigatório' }
  const tipoContrato = d.tipo_contrato === 'PJ' ? 'PJ' : 'CLT'
  db.prepare(`
    UPDATE professores_db
    SET nome = ?, idioma = ?, email = ?, telefone = ?, ativo = ?,
        tipo_contrato = ?, salario_fixo = ?, carga_horaria_mensal = ?, valor_hora_pj = ?
    WHERE id = ?
  `).run(
    d.nome.trim(),
    d.idioma               || '',
    d.email                || '',
    d.telefone             || '',
    d.ativo                ?? 1,
    tipoContrato,
    Number(d.salario_fixo)         || 0,
    Number(d.carga_horaria_mensal) || 0,
    Number(d.valor_hora_pj)        || 0,
    id
  )
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'professores', acao: 'editar',
    entidadeId:   id,
    entidadeNome: d.nome,
    detalhe: `Professor editado: ${antes.nome} → ${d.nome} [${tipoContrato}]`,
  })
  return { ok: true }
}

function deletarProfessor(id, _req = {}) {
  dbOk()
  const prof = db.prepare('SELECT nome FROM professores_db WHERE id = ?').get(id)
  if (!prof) return { ok: false, erro: 'Professor não encontrado' }
  // Impede exclusão se houver turmas vinculadas
  const turmasVinculadas = db.prepare(
    'SELECT COUNT(*) AS n FROM turmas_db WHERE professor_id = ?'
  ).get(id).n
  if (turmasVinculadas > 0)
    return { ok: false, erro: `Professor está vinculado a ${turmasVinculadas} turma(s). Desvincule antes de excluir.` }
  db.prepare('DELETE FROM professores_db WHERE id = ?').run(id)
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'professores', acao: 'excluir',
    entidadeId:   id,
    entidadeNome: prof.nome,
    detalhe: `Professor excluído: ${prof.nome}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOLHA DE PAGAMENTO DE PROFESSORES (v5.12)
// Integrada com carga horária — calcula valores a partir das horas ministradas.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gera ou retorna a folha do mês para um professor.
 * Preenche horas_normais a partir da carga horária do período.
 * Horas extras (50% / 100%) são informadas manualmente via editarFolha.
 */
function gerarFolha({ professorId, mes }, _req = {}) {
  dbOk()
  if (!professorId || !mes) return { ok: false, erro: 'professorId e mes são obrigatórios' }

  const prof = db.prepare(`
    SELECT id, nome, tipo_contrato, salario_fixo, carga_horaria_mensal, valor_hora_pj
    FROM professores_db WHERE id = ?
  `).get(professorId)
  if (!prof) return { ok: false, erro: 'Professor não encontrado' }

  // Verifica se já existe folha para esse mês
  const existente = db.prepare(
    'SELECT id FROM folha_pagamento WHERE professor_id = ? AND mes = ?'
  ).get(professorId, mes)
  if (existente) return { ok: false, erro: 'Folha já existe para este mês. Use editarFolha para ajustar.', id: existente.id }

  // Apura horas ministradas no mês via carga horária
  const de  = `${mes}-01`
  const ate  = `${mes}-31`
  const ch = db.prepare(`
    SELECT SUM(CASE WHEN a.professor_ausente=0 THEN 1 ELSE 0 END) AS horas
    FROM aulas a
    LEFT JOIN turmas_db t ON t.id = a.turma_ls_id
    WHERE COALESCE(a.professor_id, t.professor_id) = ? AND a.data >= ? AND a.data <= ?
  `).get(professorId, de, ate)
  const horasNormais = ch?.horas || 0

  // Calcula valores base
  const isCLT     = prof.tipo_contrato !== 'PJ'
  const salRef    = prof.salario_fixo        || 0
  const chMensal  = prof.carga_horaria_mensal|| 0
  const valorHRef = isCLT
    ? (chMensal > 0 ? salRef / chMensal : 0)
    : (prof.valor_hora_pj || 0)

  let valorNormal, deducoes, totalBruto, totalLiq
  if (isCLT) {
    // CLT: recebe salário fixo integral; dedução automática por horas não cumpridas
    valorNormal  = salRef
    const horasFaltando = Math.max(0, chMensal - horasNormais)
    deducoes     = horasFaltando * valorHRef
    totalBruto   = valorNormal
    totalLiq     = Math.max(0, totalBruto - deducoes)
  } else {
    // PJ: recebe somente pelas horas efetivamente ministradas
    valorNormal  = valorHRef * horasNormais
    deducoes     = 0
    totalBruto   = valorNormal
    totalLiq     = totalBruto
  }

  const info = db.prepare(`
    INSERT INTO folha_pagamento
      (professor_id, mes, tipo_contrato, horas_normais, horas_extra_50, horas_extra_100,
       valor_normal, valor_extra_50, valor_extra_100, total_bruto, deducoes, total_liquido,
       salario_fixo_ref, valor_hora_ref, status)
    VALUES (?, ?, ?, ?, 0, 0, ?, 0, 0, ?, ?, ?, ?, ?, 'Aberta')
  `).run(
    professorId, mes, prof.tipo_contrato,
    horasNormais, valorNormal,
    totalBruto, deducoes, totalLiq,
    salRef, valorHRef
  )

  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'folha_pagamento', acao: 'gerar',
    entidadeId: info.lastInsertRowid, entidadeNome: `${prof.nome} — ${mes}`,
    detalhe: `Folha gerada: ${prof.nome} ${mes} | ${horasNormais}h | ${prof.tipo_contrato}`,
  })
  return { ok: true, id: info.lastInsertRowid }
}

/**
 * Edita horas extras e deduções de uma folha ainda aberta.
 * Recalcula totais automaticamente.
 */
function editarFolha(id, d, _req = {}) {
  dbOk()
  const folha = db.prepare(`
    SELECT f.*, p.nome AS professor_nome
    FROM folha_pagamento f
    JOIN professores_db p ON p.id = f.professor_id
    WHERE f.id = ?
  `).get(id)
  if (!folha)               return { ok: false, erro: 'Folha não encontrada' }
  if (folha.status === 'Paga') return { ok: false, erro: 'Folha paga não pode ser editada' }

  const horasNormais   = d.horas_normais   !== undefined ? Number(d.horas_normais)   : folha.horas_normais
  const horasExtra50   = d.horas_extra_50  !== undefined ? Number(d.horas_extra_50)  : folha.horas_extra_50
  const horasExtra100  = d.horas_extra_100 !== undefined ? Number(d.horas_extra_100) : folha.horas_extra_100
  const deducoes       = d.deducoes        !== undefined ? Number(d.deducoes)        : folha.deducoes
  const obs            = d.obs             !== undefined ? d.obs                     : folha.obs
  const status         = d.status          !== undefined ? d.status                  : folha.status

  const isCLT     = folha.tipo_contrato !== 'PJ'
  const vExtra50  = folha.valor_hora_ref * 1.5 * horasExtra50
  const vExtra100 = folha.valor_hora_ref * 2.0 * horasExtra100
  let vNormal, bruto, liquido
  if (isCLT) {
    // CLT: base = salário fixo; deduções manuais + possível ajuste de horas
    vNormal = folha.salario_fixo_ref
    bruto   = vNormal + vExtra50 + vExtra100
    liquido = Math.max(0, bruto - deducoes)
  } else {
    // PJ: base = horas realizadas × valor/hora
    vNormal = folha.valor_hora_ref * horasNormais
    bruto   = vNormal + vExtra50 + vExtra100
    liquido = Math.max(0, bruto - deducoes)
  }

  db.prepare(`
    UPDATE folha_pagamento
    SET horas_normais=?, horas_extra_50=?, horas_extra_100=?,
        valor_normal=?, valor_extra_50=?, valor_extra_100=?,
        total_bruto=?, deducoes=?, total_liquido=?,
        obs=?, status=?,
        atualizado_em=datetime('now','localtime')
    WHERE id = ?
  `).run(
    horasNormais, horasExtra50, horasExtra100,
    vNormal, vExtra50, vExtra100,
    bruto, deducoes, liquido,
    obs, status, id
  )

  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'folha_pagamento', acao: 'editar',
    entidadeId: id, entidadeNome: `${folha.professor_nome} — ${folha.mes}`,
    detalhe: `Folha editada: status=${status} bruto=${bruto.toFixed(2)}`,
  })
  return { ok: true }
}

function listarFolhas({ professorId = null, mes = null, status = null } = {}) {
  dbOk()
  const where = []
  const params = []
  if (professorId) { where.push('f.professor_id = ?'); params.push(professorId) }
  if (mes)         { where.push('f.mes = ?');          params.push(mes) }
  if (status)      { where.push('f.status = ?');       params.push(status) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const rows = db.prepare(`
    SELECT f.*,
      p.nome          AS professor_nome,
      p.idioma        AS professor_idioma,
      p.tipo_contrato AS professor_tipo_contrato
    FROM folha_pagamento f
    JOIN professores_db p ON p.id = f.professor_id
    ${wc}
    ORDER BY f.mes DESC, p.nome COLLATE NOCASE
  `).all(...params)

  // Sincroniza horas PJ "Aberta" com as aulas realmente ministradas no mês
  const syncPJ = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN a.professor_ausente=0 THEN 1 ELSE 0 END), 0) AS horas
    FROM aulas a
    LEFT JOIN turmas_db t ON t.id = a.turma_ls_id
    WHERE COALESCE(a.professor_id, t.professor_id) = ? AND a.data >= ? AND a.data <= ?
      AND a.cancelada = 0
  `)
  const updPJ = db.prepare(`
    UPDATE folha_pagamento SET
      horas_normais = ?, valor_normal = ?, total_bruto = ?, total_liquido = ?,
      atualizado_em = datetime('now','localtime')
    WHERE id = ?
  `)
  db.transaction(() => {
    for (const r of rows) {
      if (r.tipo_contrato !== 'PJ' || r.status !== 'Aberta') continue
      const de  = `${r.mes}-01`
      const ate = `${r.mes}-31`
      const { horas } = syncPJ.get(r.professor_id, de, ate)
      const vNormal   = r.valor_hora_ref * horas
      const liq       = Math.max(0, vNormal - r.deducoes)
      if (horas !== r.horas_normais) {
        updPJ.run(horas, vNormal, vNormal, liq, r.id)
        r.horas_normais  = horas
        r.valor_normal   = vNormal
        r.total_bruto    = vNormal
        r.total_liquido  = liq
      }
    }
  })()

  return rows
}

function deletarFolha(id, _req = {}) {
  dbOk()
  const folha = db.prepare(`
    SELECT f.*, p.nome AS professor_nome
    FROM folha_pagamento f JOIN professores_db p ON p.id = f.professor_id
    WHERE f.id = ?
  `).get(id)
  if (!folha)               return { ok: false, erro: 'Folha não encontrada' }
  if (folha.status === 'Paga') return { ok: false, erro: 'Folha paga não pode ser excluída' }

  db.prepare('DELETE FROM folha_pagamento WHERE id = ?').run(id)
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'folha_pagamento', acao: 'excluir',
    entidadeId: id, entidadeNome: `${folha.professor_nome} — ${folha.mes}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TURMAS (v6 — SQLite)
// ═══════════════════════════════════════════════════════════════════════════════

function listarTurmas({ apenasAtivas = false } = {}) {
  dbOk()
  const where = apenasAtivas ? 'WHERE t.ativa = 1' : ''
  // Faz LEFT JOIN com professores_db para retornar professor_nome já junto,
  // evitando N+1 no renderer
  return db.prepare(`
    SELECT t.*, p.nome AS professor_nome
    FROM turmas_db t
    LEFT JOIN professores_db p ON p.id = t.professor_id
    ${where}
    ORDER BY t.codigo COLLATE NOCASE
  `).all()
}

function criarTurma(d, _req = {}) {
  dbOk()
  if (!d.codigo?.trim()) return { ok: false, erro: 'Código é obrigatório' }
  if (!d.idioma?.trim()) return { ok: false, erro: 'Idioma é obrigatório' }
  // Código deve ser único — verifica antes de tentar inserir
  const existe = db.prepare(
    'SELECT id FROM turmas_db WHERE codigo = ? COLLATE NOCASE'
  ).get(d.codigo.trim())
  if (existe) return { ok: false, erro: `Código "${d.codigo}" já está em uso` }

  const info = db.prepare(`
    INSERT INTO turmas_db (codigo, idioma, nivel, professor_id, horario, vagas, ativa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.codigo.trim().toUpperCase(),
    d.idioma.trim(),
    d.nivel      || 'Básico',
    d.professorId || d.professor_id || null,  // aceita ambos os nomes de campo
    d.horario    || '',
    d.vagas      ?? 15,
    d.ativa      ?? 1
  )
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'turmas', acao: 'criar',
    entidadeId:   info.lastInsertRowid,
    entidadeNome: d.codigo,
    detalhe: `Turma criada: ${d.codigo} — ${d.idioma} ${d.nivel || 'Básico'}`,
  })
  return { ok: true, id: info.lastInsertRowid }
}

function editarTurma(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT codigo FROM turmas_db WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Turma não encontrada' }
  if (!d.codigo?.trim()) return { ok: false, erro: 'Código é obrigatório' }
  if (!d.idioma?.trim()) return { ok: false, erro: 'Idioma é obrigatório' }
  // Verifica unicidade do código excluindo a própria turma
  const conflito = db.prepare(
    'SELECT id FROM turmas_db WHERE codigo = ? COLLATE NOCASE AND id != ?'
  ).get(d.codigo.trim(), id)
  if (conflito) return { ok: false, erro: `Código "${d.codigo}" já está em uso por outra turma` }

  db.prepare(`
    UPDATE turmas_db
    SET codigo = ?, idioma = ?, nivel = ?, professor_id = ?,
        horario = ?, vagas = ?, ativa = ?
    WHERE id = ?
  `).run(
    d.codigo.trim().toUpperCase(),
    d.idioma.trim(),
    d.nivel      || 'Básico',
    d.professorId || d.professor_id || null,
    d.horario    || '',
    d.vagas      ?? 15,
    d.ativa      ?? 1,
    id
  )
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'turmas', acao: 'editar',
    entidadeId:   id,
    entidadeNome: d.codigo,
    detalhe: `Turma editada: ${antes.codigo} → ${d.codigo}`,
  })
  return { ok: true }
}

function deletarTurma(id, _req = {}) {
  dbOk()
  const turma = db.prepare('SELECT codigo FROM turmas_db WHERE id = ?').get(id)
  if (!turma) return { ok: false, erro: 'Turma não encontrada' }
  // Impede exclusão se houver alunos vinculados na tabela SQLite
  // (alunos ainda no localStorage não têm turma_id em alunos_db, então
  //  esse check só protege alunos já migrados — não é bloqueante por enquanto)
  const alunosVinculados = db.prepare(
    'SELECT COUNT(*) AS n FROM alunos_db WHERE turma_id = ?'
  ).get(id).n
  if (alunosVinculados > 0)
    return { ok: false, erro: `Turma possui ${alunosVinculados} aluno(s) vinculado(s). Desvincule antes de excluir.` }

  db.prepare('DELETE FROM turmas_db WHERE id = ?').run(id)
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'turmas', acao: 'excluir',
    entidadeId:   id,
    entidadeNome: turma.codigo,
    detalhe: `Turma excluída: ${turma.codigo}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALUNOS (v6 — SQLite)
// ═══════════════════════════════════════════════════════════════════════════════

// Converte snake_case do SQLite → camelCase do AppContext/renderer
// Mantém compatibilidade total com o frontend existente
function _alunoParaJS(row) {
  if (!row) return null

  // Desserializa matriculas_json; se vazio/inválido, reconstrói a partir de turma_id + mensalidade
  let matriculas = []
  try {
    const parsed = JSON.parse(row.matriculas_json || '[]')
    if (Array.isArray(parsed) && parsed.length > 0) {
      matriculas = parsed
    }
  } catch { /* ignora JSON inválido */ }

  if (matriculas.length === 0 && row.turma_id) {
    // Compatibilidade com alunos antigos (curso único)
    matriculas = [{ turmaId: row.turma_id, mensalidade: row.mensalidade ?? 0 }]
  }

  return {
    id:               row.id,
    lsId:             row.ls_id,
    nome:             row.nome             || '',
    email:            row.email            || '',
    telefone:         row.telefone         || '',
    turmaId:          row.turma_id         ?? '',
    mensalidade:      row.mensalidade      ?? 0,
    diaVencimento:    row.dia_vencimento   ?? 10,
    status:           row.status           || 'Ativo',
    dataNasc:         row.data_nasc        || '',
    dataMatricula:    row.data_matricula   || '',
    obs:              row.obs              || '',
    respNome:         row.resp_nome        || '',
    respTelefone:     row.resp_telefone    || '',
    respEmail:        row.resp_email       || '',
    respParentesco:   row.resp_parentesco  || '',
    respEhProprio:    !!row.resp_eh_proprio,
    turmaEsperaId:    row.turma_espera_id  || null,
    turmasEsperaIds:  JSON.parse(row.turmas_espera_json || '[]'),
    cursoEspera:      row.curso_espera     || '',
    statusMotivo:     row.status_motivo    || '',
    manterVaga:       !!row.manter_vaga,
    manterVagaDias:   row.manter_vaga_dias || 0,
    turmaAnteriorId:  row.turma_anterior_id ?? null,
    dataRematricula:  row.data_rematricula  || '',
    dataReativacao:   row.data_reativacao   || '',
    // Múltiplos cursos e desconto (v5.12)
    matriculas,
    descontoTipo:     row.desconto_tipo    || '',
    descontoValor:    row.desconto_valor   ?? 0,
    criadoEm:         row.criado_em,
    atualizadoEm:     row.atualizado_em,
  }
}

function listarAlunos({ status = null, turmaId = null, busca = null } = {}) {
  dbOk()
  const where = []; const params = []
  if (status)  { where.push('status = ?');                              params.push(status) }
  if (turmaId) { where.push('turma_id = ?');                           params.push(turmaId) }
  if (busca)   { where.push('(nome LIKE ? OR email LIKE ? OR telefone LIKE ?)');
                 params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const rows = db.prepare(
    `SELECT * FROM alunos_db ${wc} ORDER BY nome COLLATE NOCASE`
  ).all(...params)
  return rows.map(_alunoParaJS)
}

function getAluno(id) {
  dbOk()
  return _alunoParaJS(db.prepare('SELECT * FROM alunos_db WHERE id = ?').get(id))
}

function _resolverMatriculas(d) {
  // Normaliza o array de matrículas e devolve {turmaIdPrincipal, mensalidadeTotal, matriculasJson}
  const matriculas = Array.isArray(d.matriculas) && d.matriculas.length > 0
    ? d.matriculas.filter(m => m.turmaId)
    : []

  // Se não vier array de matrículas, usa turmaId + mensalidade individuais (legado)
  if (matriculas.length === 0) {
    const tId  = d.turmaId ?? d.turma_id ?? null
    const mens = Number(d.mensalidade || 0)
    if (tId) matriculas.push({ turmaId: tId, mensalidade: mens })
  }

  const totalBruto = matriculas.reduce((s, m) => s + Number(m.mensalidade || 0), 0)
  const descontoTipo  = d.descontoAtivo ? (d.descontoTipo || '') : ''
  const descontoValor = d.descontoAtivo ? Number(d.descontoValor || 0) : 0
  let descCalc = 0
  if (descontoTipo === 'percentual') descCalc = totalBruto * descontoValor / 100
  else if (descontoTipo === 'fixo')  descCalc = descontoValor
  const mensalidadeTotal = Math.max(0, totalBruto - descCalc)

  return {
    turmaIdPrincipal: matriculas[0]?.turmaId ?? null,
    mensalidadeTotal,
    matriculasJson:  JSON.stringify(matriculas),
    descontoTipo,
    descontoValor,
  }
}

function criarAluno(d, _req = {}) {
  dbOk()
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome é obrigatório' }

  const { turmaIdPrincipal, mensalidadeTotal, matriculasJson, descontoTipo, descontoValor }
    = _resolverMatriculas(d)

  if (mensalidadeTotal <= 0 && !d._permitirMensalidadeZero)
    return { ok: false, erro: 'Informe o valor da mensalidade' }

  const info = db.prepare(`
    INSERT INTO alunos_db (
      ls_id, nome, email, telefone,
      turma_id, mensalidade, dia_vencimento,
      status, data_nasc, data_matricula, obs,
      resp_nome, resp_telefone, resp_email, resp_parentesco, resp_eh_proprio,
      turma_espera_id, turmas_espera_json, curso_espera,
      status_motivo, manter_vaga, manter_vaga_dias,
      matriculas_json, desconto_tipo, desconto_valor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.lsId          ?? d.ls_id        ?? null,
    d.nome.trim(),
    d.email         || '',
    d.telefone      || '',
    turmaIdPrincipal,
    mensalidadeTotal,
    d.diaVencimento ?? d.dia_vencimento ?? 10,
    d.status        || 'Ativo',
    (d.dataNasc      ?? d.data_nasc)       || '',
    (d.dataMatricula ?? d.data_matricula)  || new Date().toISOString().split('T')[0],
    d.obs           || '',
    (d.respNome      ?? d.resp_nome)       || '',
    (d.respTelefone  ?? d.resp_telefone)   || '',
    (d.respEmail     ?? d.resp_email)      || '',
    (d.respParentesco ?? d.resp_parentesco) || '',
    d.respEhProprio ? 1 : 0,
    d.turmaEsperaId    ?? null,
    JSON.stringify(Array.isArray(d.turmasEsperaIds) ? d.turmasEsperaIds : []),
    d.cursoEspera      || '',
    d.statusMotivo     || '',
    d.manterVaga       ? 1 : 0,
    d.manterVagaDias   || 0,
    matriculasJson,
    descontoTipo,
    descontoValor
  )
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'alunos', acao: 'criar',
    entidadeId:   info.lastInsertRowid,
    entidadeNome: d.nome,
    detalhe: `Aluno criado: ${d.nome} — status: ${d.status || 'Ativo'}`,
  })
  return { ok: true, id: info.lastInsertRowid }
}

function editarAluno(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT nome, status, turma_id FROM alunos_db WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Aluno não encontrado' }
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome é obrigatório' }

  const { turmaIdPrincipal, mensalidadeTotal, matriculasJson, descontoTipo, descontoValor }
    = _resolverMatriculas(d)

  db.prepare(`
    UPDATE alunos_db SET
      nome = ?, email = ?, telefone = ?,
      turma_id = ?, mensalidade = ?, dia_vencimento = ?,
      status = ?, data_nasc = ?, data_matricula = ?, obs = ?,
      resp_nome = ?, resp_telefone = ?, resp_email = ?, resp_parentesco = ?, resp_eh_proprio = ?,
      turma_espera_id = ?, turmas_espera_json = ?, curso_espera = ?,
      status_motivo = ?, manter_vaga = ?, manter_vaga_dias = ?,
      turma_anterior_id = ?, data_rematricula = ?, data_reativacao = ?,
      matriculas_json = ?, desconto_tipo = ?, desconto_valor = ?
    WHERE id = ?
  `).run(
    d.nome.trim(),
    d.email         || '',
    d.telefone      || '',
    turmaIdPrincipal,
    mensalidadeTotal,
    d.diaVencimento ?? d.dia_vencimento ?? 10,
    d.status        || 'Ativo',
    (d.dataNasc      ?? d.data_nasc)        || '',
    (d.dataMatricula ?? d.data_matricula)   || '',
    d.obs           || '',
    (d.respNome      ?? d.resp_nome)        || '',
    (d.respTelefone  ?? d.resp_telefone)    || '',
    (d.respEmail     ?? d.resp_email)       || '',
    (d.respParentesco ?? d.resp_parentesco) || '',
    d.respEhProprio ? 1 : 0,
    d.turmaEsperaId    ?? null,
    JSON.stringify(Array.isArray(d.turmasEsperaIds) ? d.turmasEsperaIds : []),
    d.cursoEspera      || '',
    d.statusMotivo     || '',
    d.manterVaga       ? 1 : 0,
    d.manterVagaDias   || 0,
    d.turmaAnteriorId ?? d.turma_anterior_id ?? null,
    (d.dataRematricula ?? d.data_rematricula) || '',
    (d.dataReativacao  ?? d.data_reativacao)  || '',
    matriculasJson,
    descontoTipo,
    descontoValor,
    id
  )

  // ── Notificação: vaga liberada por mudança para Lista de Espera ───────────
  if ((d.status || 'Ativo') === 'Lista de Espera' && antes.turma_id) {
    const turmaLiberada = db.prepare('SELECT id, codigo, idioma, nivel FROM turmas WHERE id = ?').get(antes.turma_id)
    if (turmaLiberada) {
      const aguardando = db.prepare(
        `SELECT DISTINCT a.nome FROM alunos_db a WHERE a.id != ? AND (
          EXISTS (
            SELECT 1 FROM json_each(a.turmas_espera_json) je WHERE je.value = ?
          )
          OR (a.status = 'Lista de Espera' AND a.turma_espera_id = ?)
        )`
      ).all(id, turmaLiberada.id, turmaLiberada.id)
      if (aguardando.length > 0) {
        const nomes = aguardando.slice(0, 3).map(a => a.nome).join(', ')
        const mais  = aguardando.length > 3 ? ` e mais ${aguardando.length - 3}` : ''
        salvarRecado({
          titulo: `Vaga disponível — ${turmaLiberada.codigo} (${turmaLiberada.idioma})`,
          mensagem: `Uma vaga foi liberada na turma ${turmaLiberada.codigo} — ${turmaLiberada.idioma} ${turmaLiberada.nivel}.\n\nAlunos aguardando: ${nomes}${mais}.\n\nAcesse a lista de espera para realizar a matrícula.`,
          remetente_tipo: 'admin',
          remetente_id: 0,
          remetente_nome: 'Sistema',
          prioridade: 'alta',
          destinatarios: [{ tipo: 'todos' }],
          enviar_agora: true,
        }, _req)
      }
    }
  }

  // Log diferenciado para reativação e mudança de turma
  let detalhe = `Aluno editado: ${antes.nome}`
  if (d.dataRematricula)  detalhe += ` [REMATRÍCULA em ${d.dataRematricula}]`
  if (d.dataReativacao)   detalhe += ` [REATIVADO em ${d.dataReativacao}]`
  if (String(antes.turma_id) !== String(d.turmaId ?? d.turma_id))
    detalhe += ` [turma: ${antes.turma_id} → ${d.turmaId ?? d.turma_id}]`

  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'alunos', acao: 'editar',
    entidadeId:   id,
    entidadeNome: d.nome,
    detalhe,
  })
  return { ok: true }
}

function deletarAluno(id, _req = {}) {
  dbOk()
  const aluno = db.prepare('SELECT nome FROM alunos_db WHERE id = ?').get(id)
  if (!aluno) return { ok: false, erro: 'Aluno não encontrado' }
  // Pagamentos têm ON DELETE CASCADE — são removidos automaticamente
  db.prepare('DELETE FROM alunos_db WHERE id = ?').run(id)
  registrarLog({
    usuarioId:    _req.userId,
    usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'alunos', acao: 'excluir',
    entidadeId:   id,
    entidadeNome: aluno.nome,
    detalhe: `Aluno excluído: ${aluno.nome}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLUXO DE CAIXA (v5.8)
// ═══════════════════════════════════════════════════════════════════════════════

function listarFluxo({ mes = null, tipo = null, categoria = null, de = null, ate = null } = {}) {
  dbOk()
  const where = []; const params = []
  if (mes)       { where.push("mes = ?");                        params.push(mes) }
  if (tipo)      { where.push("tipo = ?");                       params.push(tipo) }
  if (categoria) { where.push("categoria = ?");                  params.push(categoria) }
  if (de)        { where.push("data >= ?");                      params.push(de) }
  if (ate)       { where.push("data <= ?");                      params.push(ate) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''
  return db.prepare(
    `SELECT * FROM fluxo_caixa ${wc} ORDER BY data DESC, id DESC`
  ).all(...params)
}

function resumoFluxoMensal({ meses = 12 } = {}) {
  dbOk()
  // Retorna os últimos N meses com total de entradas e saídas
  return db.prepare(`
    SELECT
      mes,
      SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END) AS entradas,
      SUM(CASE WHEN tipo='saida'   THEN valor ELSE 0 END) AS saidas,
      SUM(CASE WHEN tipo='entrada' THEN valor ELSE -valor END) AS saldo
    FROM fluxo_caixa
    WHERE mes >= strftime('%Y-%m', 'now', '-' || ? || ' months', 'localtime')
    GROUP BY mes
    ORDER BY mes ASC
  `).all(meses)
}

function resumoFluxoCategoria({ mes = null } = {}) {
  dbOk()
  const where = mes ? "WHERE mes = ?" : ''
  const params = mes ? [mes] : []
  return db.prepare(`
    SELECT tipo, categoria,
      COUNT(*) AS qtd,
      SUM(valor) AS total
    FROM fluxo_caixa
    ${where}
    GROUP BY tipo, categoria
    ORDER BY tipo, total DESC
  `).all(...params)
}

function criarLancamento(d, _req = {}) {
  dbOk()
  if (!d.descricao?.trim())         return { ok: false, erro: 'Descrição é obrigatória' }
  if (!d.valor || Number(d.valor) <= 0) return { ok: false, erro: 'Valor deve ser maior que zero' }
  if (!d.data)                      return { ok: false, erro: 'Data é obrigatória' }
  if (!['entrada','saida'].includes(d.tipo)) return { ok: false, erro: 'Tipo inválido' }

  const mes = d.data.slice(0, 7) // YYYY-MM
  const info = db.prepare(`
    INSERT INTO fluxo_caixa (tipo, categoria, descricao, valor, data, mes, obs, criado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.tipo,
    d.categoria   || 'Outros',
    d.descricao.trim(),
    Number(d.valor),
    d.data,
    mes,
    d.obs         || '',
    _req.userLogin || 'sistema',
  )
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'fluxo_caixa', acao: 'criar',
    entidadeId: info.lastInsertRowid, entidadeNome: d.descricao,
    detalhe: `${d.tipo === 'entrada' ? '📥' : '📤'} ${d.tipo} — ${d.categoria}: ${d.descricao} R$${Number(d.valor).toFixed(2)}`,
  })
  return { ok: true, id: info.lastInsertRowid }
}

function editarLancamento(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT descricao FROM fluxo_caixa WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Lançamento não encontrado' }
  if (!d.descricao?.trim())         return { ok: false, erro: 'Descrição é obrigatória' }
  if (!d.valor || Number(d.valor) <= 0) return { ok: false, erro: 'Valor deve ser maior que zero' }

  const mes = d.data.slice(0, 7)
  db.prepare(`
    UPDATE fluxo_caixa SET tipo=?, categoria=?, descricao=?, valor=?, data=?, mes=?, obs=? WHERE id=?
  `).run(d.tipo, d.categoria || 'Outros', d.descricao.trim(), Number(d.valor), d.data, mes, d.obs || '', id)

  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'fluxo_caixa', acao: 'editar',
    entidadeId: id, entidadeNome: d.descricao,
    detalhe: `Lançamento editado: ${antes.descricao} → ${d.descricao}`,
  })
  return { ok: true }
}

function deletarLancamento(id, _req = {}) {
  dbOk()
  const item = db.prepare('SELECT descricao, tipo, valor FROM fluxo_caixa WHERE id = ?').get(id)
  if (!item) return { ok: false, erro: 'Lançamento não encontrado' }
  db.prepare('DELETE FROM fluxo_caixa WHERE id = ?').run(id)
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'fluxo_caixa', acao: 'excluir',
    entidadeId: id, entidadeNome: item.descricao,
    detalhe: `Lançamento excluído: ${item.tipo} — ${item.descricao} R$${item.valor.toFixed(2)}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESERVA DE SALAS (v5.9)
// ═══════════════════════════════════════════════════════════════════════════════

function _parseSala(sala) {
  if (!sala) return null
  try { sala.recursos = JSON.parse(sala.recursos || '[]') } catch { sala.recursos = [] }
  return sala
}

function listarSalas({ ativa = null } = {}) {
  dbOk()
  const where  = ativa !== null ? 'WHERE ativa = ?' : ''
  const params = ativa !== null ? [ativa ? 1 : 0] : []
  return db.prepare(`SELECT * FROM salas ${where} ORDER BY nome ASC`)
    .all(...params).map(_parseSala)
}

function criarSala(d, _req = {}) {
  dbOk()
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome da sala é obrigatório' }
  const recursos = JSON.stringify(Array.isArray(d.recursos) ? d.recursos : [])
  try {
    const info = db.prepare(`
      INSERT INTO salas (nome, capacidade, descricao, recursos, ativa)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      d.nome.trim(),
      Number(d.capacidade || 20),
      d.descricao || '',
      recursos,
      d.ativa !== undefined ? (d.ativa ? 1 : 0) : 1,
    )
    registrarLog({
      usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
      modulo: 'salas', acao: 'criar',
      entidadeId: info.lastInsertRowid, entidadeNome: d.nome,
      detalhe: `Sala criada: ${d.nome} (cap. ${d.capacidade})`,
    })
    return { ok: true, id: info.lastInsertRowid }
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { ok: false, erro: 'Já existe uma sala com este nome' }
    throw e
  }
}

function editarSala(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT nome FROM salas WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Sala não encontrada' }
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome da sala é obrigatório' }
  const recursos = JSON.stringify(Array.isArray(d.recursos) ? d.recursos : [])
  try {
    db.prepare(`
      UPDATE salas SET nome=?, capacidade=?, descricao=?, recursos=?, ativa=?,
        atualizado_em=datetime('now','localtime')
      WHERE id=?
    `).run(d.nome.trim(), Number(d.capacidade || 20), d.descricao || '', recursos, d.ativa ? 1 : 0, id)
    registrarLog({
      usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
      modulo: 'salas', acao: 'editar',
      entidadeId: id, entidadeNome: d.nome,
      detalhe: `Sala editada: ${antes.nome} → ${d.nome}`,
    })
    return { ok: true }
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { ok: false, erro: 'Já existe uma sala com este nome' }
    throw e
  }
}

function deletarSala(id, _req = {}) {
  dbOk()
  const sala = db.prepare('SELECT nome FROM salas WHERE id = ?').get(id)
  if (!sala) return { ok: false, erro: 'Sala não encontrada' }
  // reservas_sala tem ON DELETE CASCADE
  db.prepare('DELETE FROM salas WHERE id = ?').run(id)
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'salas', acao: 'excluir',
    entidadeId: id, entidadeNome: sala.nome,
    detalhe: `Sala excluída: ${sala.nome}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ── Reservas ─────────────────────────────────────────────────────────────────

function listarReservas({ sala_id = null, data = null, de = null, ate = null, status = null, turma_id = null } = {}) {
  dbOk()
  const where = []; const params = []
  if (sala_id)  { where.push('sala_id = ?');  params.push(Number(sala_id)) }
  if (turma_id) { where.push('turma_id = ?'); params.push(Number(turma_id)) }
  if (data)     { where.push('data = ?');     params.push(data) }
  if (de)       { where.push('data >= ?');    params.push(de) }
  if (ate)      { where.push('data <= ?');    params.push(ate) }
  if (status)   { where.push('status = ?');   params.push(status) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''
  return db.prepare(
    `SELECT * FROM reservas_sala ${wc} ORDER BY data ASC, hora_inicio ASC`
  ).all(...params)
}

function criarReserva(d, _req = {}) {
  dbOk()
  if (!d.sala_id)          return { ok: false, erro: 'Sala é obrigatória' }
  if (!d.titulo?.trim())   return { ok: false, erro: 'Título é obrigatório' }
  if (!d.data)             return { ok: false, erro: 'Data é obrigatória' }
  if (!d.hora_inicio || !d.hora_fim) return { ok: false, erro: 'Horários são obrigatórios' }
  if (d.hora_fim <= d.hora_inicio)   return { ok: false, erro: 'Hora de fim deve ser após o início' }

  if (d.status !== 'cancelada') {
    const conflito = db.prepare(`
      SELECT id, titulo FROM reservas_sala
      WHERE sala_id=? AND data=? AND status != 'cancelada'
        AND hora_inicio < ? AND hora_fim > ?
    `).get(Number(d.sala_id), d.data, d.hora_fim, d.hora_inicio)
    if (conflito) return { ok: false, erro: `Conflito com reserva existente: "${conflito.titulo}"` }
  }

  const info = db.prepare(`
    INSERT INTO reservas_sala
      (sala_id, turma_id, turma_nome, titulo, responsavel, descricao, data, hora_inicio, hora_fim, status, criado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(d.sala_id),
    d.turma_id ? Number(d.turma_id) : null,
    d.turma_nome || '',
    d.titulo.trim(), d.responsavel || '', d.descricao || '',
    d.data, d.hora_inicio, d.hora_fim,
    d.status || 'confirmada', _req.userLogin || 'sistema',
  )
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'reservas', acao: 'criar',
    entidadeId: info.lastInsertRowid, entidadeNome: d.titulo,
    detalhe: `Reserva criada: ${d.titulo} em ${d.data} ${d.hora_inicio}–${d.hora_fim}${d.turma_nome ? ` [${d.turma_nome}]` : ''}`,
  })
  return { ok: true, id: info.lastInsertRowid }
}

function editarReserva(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT titulo FROM reservas_sala WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Reserva não encontrada' }
  if (!d.titulo?.trim())   return { ok: false, erro: 'Título é obrigatório' }
  if (!d.data)             return { ok: false, erro: 'Data é obrigatória' }
  if (!d.hora_inicio || !d.hora_fim) return { ok: false, erro: 'Horários são obrigatórios' }
  if (d.hora_fim <= d.hora_inicio)   return { ok: false, erro: 'Hora de fim deve ser após o início' }

  if (d.status !== 'cancelada') {
    const conflito = db.prepare(`
      SELECT id, titulo FROM reservas_sala
      WHERE sala_id=? AND data=? AND status != 'cancelada' AND id != ?
        AND hora_inicio < ? AND hora_fim > ?
    `).get(Number(d.sala_id), d.data, id, d.hora_fim, d.hora_inicio)
    if (conflito) return { ok: false, erro: `Conflito com reserva existente: "${conflito.titulo}"` }
  }

  db.prepare(`
    UPDATE reservas_sala
    SET sala_id=?, turma_id=?, turma_nome=?, titulo=?, responsavel=?, descricao=?,
        data=?, hora_inicio=?, hora_fim=?, status=?,
        atualizado_em=datetime('now','localtime')
    WHERE id=?
  `).run(
    Number(d.sala_id),
    d.turma_id ? Number(d.turma_id) : null,
    d.turma_nome || '',
    d.titulo.trim(), d.responsavel || '', d.descricao || '',
    d.data, d.hora_inicio, d.hora_fim,
    d.status || 'confirmada', id,
  )
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'reservas', acao: 'editar',
    entidadeId: id, entidadeNome: d.titulo,
    detalhe: `Reserva editada: ${antes.titulo} → ${d.titulo}`,
  })
  return { ok: true }
}

function deletarReserva(id, _req = {}) {
  dbOk()
  const r = db.prepare('SELECT titulo FROM reservas_sala WHERE id = ?').get(id)
  if (!r) return { ok: false, erro: 'Reserva não encontrada' }
  db.prepare('DELETE FROM reservas_sala WHERE id = ?').run(id)
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'reservas', acao: 'excluir',
    entidadeId: id, entidadeNome: r.titulo,
    detalhe: `Reserva excluída: ${r.titulo}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTAS / ATA DE RESULTADOS (v5.10)
// ═══════════════════════════════════════════════════════════════════════════════

function calcularConceitoDb(parcial, final_, recuperacao) {
  const vals = [parcial, final_].filter(v => v !== null && v !== undefined)
  if (vals.length === 0) return ''
  const media = vals.reduce((s, v) => s + v, 0) / vals.length
  const mediaFinal = recuperacao !== null && recuperacao !== undefined
    ? Math.max(media, recuperacao) : media
  if (mediaFinal >= 9) return 'A'
  if (mediaFinal >= 7) return 'B'
  if (mediaFinal >= 5) return 'C'
  if (mediaFinal >= 3) return 'D'
  return 'E'
}

function listarNotas({ turma_ls_id = null, aluno_ls_id = null, periodo = null } = {}) {
  dbOk()
  const where = []; const params = []
  if (turma_ls_id)  { where.push('turma_ls_id = ?');  params.push(Number(turma_ls_id)) }
  if (aluno_ls_id)  { where.push('aluno_ls_id = ?');  params.push(Number(aluno_ls_id)) }
  if (periodo)      { where.push('periodo = ?');       params.push(periodo) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''
  return db.prepare(`SELECT * FROM notas ${wc} ORDER BY aluno_nome ASC`).all(...params)
}

// Aceita tanto turma_id (FK de turmas_db) quanto turma_ls_id (id do localStorage / ls_id)
function listarNotasPorTurma({ turma_id = null, periodo = null } = {}) {
  dbOk()
  const where = []; const params = []
  if (turma_id) { where.push('turma_ls_id = ?'); params.push(Number(turma_id)) }
  if (periodo)  { where.push('periodo = ?');     params.push(periodo) }
  const wc = where.length ? 'WHERE ' + where.join(' AND ') : ''
  return db.prepare(`SELECT * FROM notas ${wc} ORDER BY aluno_nome ASC`).all(...params)
}

function criarNota(d, _req = {}) {
  dbOk()
  if (!d.aluno_ls_id) return { ok: false, erro: 'aluno_ls_id é obrigatório' }
  if (!d.turma_ls_id) return { ok: false, erro: 'turma_ls_id é obrigatório' }
  if (!d.periodo)     return { ok: false, erro: 'Período é obrigatório' }

  const conceito = calcularConceitoDb(d.nota_parcial, d.nota_final, d.nota_recuperacao)

  try {
    const info = db.prepare(`
      INSERT INTO notas
        (aluno_ls_id, aluno_nome, turma_ls_id, turma_codigo, periodo,
         nota_parcial, nota_final, nota_recuperacao, conceito, obs, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(d.aluno_ls_id), d.aluno_nome || '',
      Number(d.turma_ls_id), d.turma_codigo || '',
      d.periodo,
      d.nota_parcial      ?? null,
      d.nota_final        ?? null,
      d.nota_recuperacao  ?? null,
      conceito,
      d.obs || '',
      _req.userLogin || 'sistema',
    )
    registrarLog({
      usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
      modulo: 'notas', acao: 'criar',
      entidadeId: info.lastInsertRowid, entidadeNome: d.aluno_nome,
      detalhe: `Nota criada: ${d.aluno_nome} — ${d.periodo} — conceito ${conceito}`,
    })
    return { ok: true, id: info.lastInsertRowid }
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      // Já existe — atualiza em vez de inserir
      return editarNotaPorChave(d, _req)
    }
    throw e
  }
}

function editarNota(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT aluno_nome, periodo FROM notas WHERE id = ?').get(id)
  if (!antes) return { ok: false, erro: 'Nota não encontrada' }

  const conceito = calcularConceitoDb(d.nota_parcial, d.nota_final, d.nota_recuperacao)

  db.prepare(`
    UPDATE notas SET
      nota_parcial=?, nota_final=?, nota_recuperacao=?, conceito=?, obs=?,
      atualizado_em=datetime('now','localtime')
    WHERE id=?
  `).run(
    d.nota_parcial     ?? null,
    d.nota_final       ?? null,
    d.nota_recuperacao ?? null,
    conceito, d.obs || '', id,
  )
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'notas', acao: 'editar',
    entidadeId: id, entidadeNome: antes.aluno_nome,
    detalhe: `Nota editada: ${antes.aluno_nome} — ${antes.periodo} — conceito ${conceito}`,
  })
  return { ok: true }
}

// Upsert por chave natural (aluno+turma+periodo)
function editarNotaPorChave(d, _req = {}) {
  dbOk()
  const existing = db.prepare(
    'SELECT id FROM notas WHERE aluno_ls_id=? AND turma_ls_id=? AND periodo=?'
  ).get(Number(d.aluno_ls_id), Number(d.turma_ls_id), d.periodo)
  if (existing) return editarNota(existing.id, d, _req)
  return criarNota(d, _req)
}

function deletarNota(id, _req = {}) {
  dbOk()
  const nota = db.prepare('SELECT aluno_nome, periodo FROM notas WHERE id = ?').get(id)
  if (!nota) return { ok: false, erro: 'Nota não encontrada' }
  db.prepare('DELETE FROM notas WHERE id = ?').run(id)
  registrarLog({
    usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema',
    modulo: 'notas', acao: 'excluir',
    entidadeId: id, entidadeNome: nota.aluno_nome,
    detalhe: `Nota excluída: ${nota.aluno_nome} — ${nota.periodo}`,
    nivel: 'aviso',
  })
  return { ok: true }
}

// ── Estoque e Material Didático (v5.11) ──────────────────────────────────────

function listarEstoqueItens({ categoria = null, somenteAtivos = true, somenteAbaixoMinimo = false } = {}) {
  dbOk()
  let sql = 'SELECT * FROM estoque_itens'
  const params = []; const where = []
  if (somenteAtivos)        { where.push('ativo = 1') }
  if (categoria)            { where.push('categoria = ?'); params.push(categoria) }
  if (somenteAbaixoMinimo)  { where.push('quantidade <= minimo') }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY categoria, nome COLLATE NOCASE'
  return db.prepare(sql).all(...params)
}

function getEstoqueItem(id) {
  dbOk()
  return db.prepare('SELECT * FROM estoque_itens WHERE id = ?').get(id) || null
}

function criarEstoqueItem(d, _req = {}) {
  dbOk()
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome é obrigatório' }
  const info = db.prepare(`
    INSERT INTO estoque_itens (nome, categoria, descricao, unidade, quantidade, minimo, preco_custo, preco_venda, codigo, ativo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    d.nome.trim(),
    d.categoria    || '',
    d.descricao    || '',
    d.unidade      || 'unid',
    Number(d.quantidade  || 0),
    Number(d.minimo      || 0),
    Number(d.precoCusto  ?? d.preco_custo  ?? 0),
    Number(d.precoVenda  ?? d.preco_venda  ?? 0),
    d.codigo       || '',
  )
  registrarLog({ usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema', modulo: 'estoque', acao: 'criar', entidadeId: info.lastInsertRowid, entidadeNome: d.nome, detalhe: `Item criado: ${d.nome} (qtd: ${d.quantidade || 0})` })
  return { ok: true, id: info.lastInsertRowid }
}

function editarEstoqueItem(id, d, _req = {}) {
  dbOk()
  if (!d.nome?.trim()) return { ok: false, erro: 'Nome é obrigatório' }
  db.prepare(`
    UPDATE estoque_itens SET
      nome = ?, categoria = ?, descricao = ?, unidade = ?,
      quantidade = ?, minimo = ?, preco_custo = ?, preco_venda = ?,
      codigo = ?, ativo = ?,
      atualizado_em = datetime('now','localtime')
    WHERE id = ?
  `).run(
    d.nome.trim(),
    d.categoria    || '',
    d.descricao    || '',
    d.unidade      || 'unid',
    Number(d.quantidade  || 0),
    Number(d.minimo      || 0),
    Number(d.precoCusto  ?? d.preco_custo  ?? 0),
    Number(d.precoVenda  ?? d.preco_venda  ?? 0),
    d.codigo       || '',
    d.ativo === false || d.ativo === 0 ? 0 : 1,
    id,
  )
  registrarLog({ usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema', modulo: 'estoque', acao: 'editar', entidadeId: id, entidadeNome: d.nome, detalhe: `Item editado: ${d.nome}` })
  return { ok: true }
}

function deletarEstoqueItem(id, _req = {}) {
  dbOk()
  const item = db.prepare('SELECT nome FROM estoque_itens WHERE id = ?').get(id)
  if (!item) return { ok: false, erro: 'Item não encontrado' }
  db.prepare('DELETE FROM estoque_itens WHERE id = ?').run(id)
  registrarLog({ usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema', modulo: 'estoque', acao: 'excluir', entidadeId: id, entidadeNome: item.nome, detalhe: `Item excluído: ${item.nome}`, nivel: 'aviso' })
  return { ok: true }
}

function listarEstoqueMovimentos({ itemId = null, de = null, ate = null, tipo = null } = {}) {
  dbOk()
  let sql = `
    SELECT m.*, i.nome AS item_nome, i.unidade AS item_unidade
    FROM estoque_movimentos m
    JOIN estoque_itens i ON i.id = m.item_id
  `
  const params = []; const where = []
  if (itemId) { where.push('m.item_id = ?'); params.push(itemId) }
  if (tipo)   { where.push('m.tipo = ?');    params.push(tipo) }
  if (de)     { where.push('m.data >= ?');   params.push(de) }
  if (ate)    { where.push('m.data <= ?');   params.push(ate) }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY m.criado_em DESC'
  return db.prepare(sql).all(...params)
}

function registrarMovimento(d, _req = {}) {
  dbOk()
  const item = db.prepare('SELECT id, nome, quantidade FROM estoque_itens WHERE id = ?').get(d.itemId ?? d.item_id)
  if (!item) return { ok: false, erro: 'Item não encontrado' }
  const qtd = Number(d.quantidade || 0)
  if (qtd <= 0) return { ok: false, erro: 'Quantidade deve ser maior que zero' }

  // Calcula nova quantidade
  let novaQtd = item.quantidade
  if (d.tipo === 'entrada') novaQtd += qtd
  else if (d.tipo === 'saida') {
    if (item.quantidade < qtd) return { ok: false, erro: 'Quantidade insuficiente em estoque' }
    novaQtd -= qtd
  } else if (d.tipo === 'ajuste') {
    novaQtd = qtd  // ajuste define a quantidade diretamente
  }

  const info = db.prepare(`
    INSERT INTO estoque_movimentos (item_id, tipo, quantidade, motivo, responsavel, aluno_ls_id, aluno_nome, data, criado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id,
    d.tipo,
    d.tipo === 'ajuste' ? novaQtd - item.quantidade : qtd,  // grava a diferença para ajuste
    d.motivo      || '',
    d.responsavel || _req.userLogin || 'sistema',
    d.alunoLsId   ?? d.aluno_ls_id  ?? null,
    (d.alunoNome ?? d.aluno_nome) || '',
    d.data        || new Date().toISOString().split('T')[0],
    _req.userLogin || 'sistema',
  )

  db.prepare("UPDATE estoque_itens SET quantidade = ?, atualizado_em = datetime('now','localtime') WHERE id = ?").run(novaQtd, item.id)

  registrarLog({ usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema', modulo: 'estoque', acao: 'movimentar', entidadeId: item.id, entidadeNome: item.nome, detalhe: `${d.tipo.toUpperCase()} ${qtd} ${item.nome}${d.motivo ? ' — ' + d.motivo : ''}` })
  return { ok: true, id: info.lastInsertRowid, novaQuantidade: novaQtd }
}

function resumoEstoque() {
  dbOk()
  const total      = db.prepare('SELECT COUNT(*) AS n FROM estoque_itens WHERE ativo = 1').get().n
  const abaixo     = db.prepare('SELECT COUNT(*) AS n FROM estoque_itens WHERE ativo = 1 AND quantidade <= minimo').get().n
  const valorTotal = db.prepare('SELECT COALESCE(SUM(quantidade * preco_custo), 0) AS v FROM estoque_itens WHERE ativo = 1').get().v
  const categorias = db.prepare("SELECT categoria, COUNT(*) AS n, SUM(quantidade) AS qtd FROM estoque_itens WHERE ativo = 1 GROUP BY categoria ORDER BY n DESC").all()
  return { total, abaixo, valorTotal, categorias }
}

// ── Certificados (v5.12) ─────────────────────────────────────────────────────

function listarCertificados({ alunoLsId = null, turmaLsId = null, de = null, ate = null } = {}) {
  dbOk()
  let sql = 'SELECT * FROM certificados'
  const params = []; const where = []
  if (alunoLsId) { where.push('aluno_ls_id = ?'); params.push(alunoLsId) }
  if (turmaLsId) { where.push('turma_ls_id = ?'); params.push(turmaLsId) }
  if (de)        { where.push('data_emissao >= ?'); params.push(de) }
  if (ate)       { where.push('data_emissao <= ?'); params.push(ate) }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY criado_em DESC'
  return db.prepare(sql).all(...params)
}

function criarCertificado(d, _req = {}) {
  dbOk()
  if (!d.alunoNome?.trim()) return { ok: false, erro: 'Nome do aluno é obrigatório' }
  const info = db.prepare(`
    INSERT INTO certificados (
      aluno_ls_id, aluno_nome, turma_ls_id, turma_codigo, curso_nome,
      data_emissao, data_conclusao, carga_horaria,
      texto_livre, assinatura1, assinatura2, local_data, emitido_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.alunoLsId     ?? d.aluno_ls_id   ?? null,
    d.alunoNome.trim(),
    d.turmaLsId     ?? d.turma_ls_id   ?? null,
    (d.turmaCodigo   ?? d.turma_codigo)   || '',
    (d.cursoNome     ?? d.curso_nome)     || '',
    (d.dataEmissao   ?? d.data_emissao)   || new Date().toISOString().split('T')[0],
    (d.dataConclusao ?? d.data_conclusao) || '',
    Number(d.cargaHoraria ?? d.carga_horaria ?? 0),
    (d.textoLivre    ?? d.texto_livre)    || '',
    d.assinatura1   || '',
    d.assinatura2   || '',
    (d.localData     ?? d.local_data)     || '',
    _req.userLogin  || 'sistema',
  )
  registrarLog({ usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema', modulo: 'certificados', acao: 'criar', entidadeId: info.lastInsertRowid, entidadeNome: d.alunoNome, detalhe: `Certificado emitido: ${d.alunoNome} — ${d.turmaCodigo || d.cursoNome}` })
  return { ok: true, id: info.lastInsertRowid }
}

function deletarCertificado(id, _req = {}) {
  dbOk()
  const c = db.prepare('SELECT aluno_nome, turma_codigo FROM certificados WHERE id = ?').get(id)
  if (!c) return { ok: false, erro: 'Certificado não encontrado' }
  db.prepare('DELETE FROM certificados WHERE id = ?').run(id)
  registrarLog({ usuarioId: _req.userId, usuarioLogin: _req.userLogin || 'sistema', modulo: 'certificados', acao: 'excluir', entidadeId: id, entidadeNome: c.aluno_nome, detalhe: `Certificado excluído: ${c.aluno_nome} — ${c.turma_codigo}`, nivel: 'aviso' })
  return { ok: true }
}

function resumoCertificados() {
  dbOk()
  const total   = db.prepare('SELECT COUNT(*) AS n FROM certificados').get().n
  const turmas  = db.prepare('SELECT COUNT(DISTINCT turma_ls_id) AS n FROM certificados').get().n
  const recente = db.prepare('SELECT data_emissao FROM certificados ORDER BY criado_em DESC LIMIT 1').get()
  const porTurma = db.prepare('SELECT turma_codigo, curso_nome, COUNT(*) AS n FROM certificados GROUP BY turma_ls_id ORDER BY n DESC').all()
  return { total, turmas, ultimaEmissao: recente?.data_emissao || null, porTurma }
}

module.exports = {
  init, getDbPath,
  login,
  listarUsuarios, criarUsuario, editarUsuario, deletarUsuario, alterarSenhaPropria,
  listarPerfis, criarPerfil, editarPerfil, deletarPerfil,
  getIdentidade, salvarIdentidade,
  listarLogs, limparLogs, estatisticasLogs, registrarLogExterno,
  listarAulas, criarAula, editarAula, deletarAula,
  getPresencas, salvarPresencas, estatisticasFrequencia, relatorioFrequenciaAvancado,
  registrarAusenciaProfessor,
  // Recados (v5.6)
  listarRecados, recadosParaAluno, contarNaoLidos,
  salvarRecado, enviarRecado, marcarRecadoLido, excluirRecado,
  processarRecadosAgendados,
  // Professores (v6)
  listarProfessores, criarProfessor, editarProfessor, deletarProfessor,
  cargaHorariaProfessores,
  // Folha de pagamento (v5.12)
  gerarFolha, editarFolha, listarFolhas, deletarFolha,
  // Turmas (v6)
  listarTurmas, criarTurma, editarTurma, deletarTurma,
  // Alunos (v6)
  listarAlunos, getAluno, criarAluno, editarAluno, deletarAluno,
  // Fluxo de caixa (v5.8)
  listarFluxo, resumoFluxoMensal, resumoFluxoCategoria,
  criarLancamento, editarLancamento, deletarLancamento,
  // Reserva de salas (v5.9)
  listarSalas, criarSala, editarSala, deletarSala,
  listarReservas, criarReserva, editarReserva, deletarReserva,
  // Notas / Ata de Resultados (v5.10)
  listarNotas, listarNotasPorTurma,
  criarNota, editarNota, editarNotaPorChave, deletarNota,
  // Estoque e Material Didático (v5.11)
  listarEstoqueItens, getEstoqueItem, criarEstoqueItem, editarEstoqueItem, deletarEstoqueItem,
  listarEstoqueMovimentos, registrarMovimento, resumoEstoque,
  // Certificados (v5.12)
  listarCertificados, criarCertificado, deletarCertificado, resumoCertificados,
}
