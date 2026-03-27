-- ============================================================
-- Módulo de Recados — Escola Manager
-- Rodar via db.exec() no startup do main process
-- ============================================================

-- Tabela principal de recados
CREATE TABLE IF NOT EXISTS recados (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo      TEXT    NOT NULL,
  mensagem    TEXT    NOT NULL,
  remetente_tipo  TEXT NOT NULL CHECK(remetente_tipo IN ('secretaria','professor')),
  remetente_id    INTEGER NOT NULL,   -- id do usuario/professor que enviou
  remetente_nome  TEXT NOT NULL,
  prioridade  TEXT    NOT NULL DEFAULT 'normal' CHECK(prioridade IN ('normal','importante','urgente')),
  agendado_para   TEXT,              -- ISO datetime; NULL = enviar imediatamente
  enviado_em      TEXT,              -- ISO datetime preenchido quando enviado de fato
  status      TEXT    NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','agendado','enviado')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Destinatários de cada recado (1 recado → N destinatários)
CREATE TABLE IF NOT EXISTS recados_destinatarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recado_id   INTEGER NOT NULL REFERENCES recados(id) ON DELETE CASCADE,
  tipo        TEXT    NOT NULL CHECK(tipo IN ('aluno','turma','lista_espera','todos','inadimplentes')),
  referencia_id   INTEGER,           -- id do aluno ou da turma quando tipo='aluno'/'turma'
  referencia_nome TEXT,              -- nome para exibição rápida
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Status de leitura por aluno/responsável
CREATE TABLE IF NOT EXISTS recados_leituras (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recado_id   INTEGER NOT NULL REFERENCES recados(id) ON DELETE CASCADE,
  aluno_id    INTEGER NOT NULL,
  lido        INTEGER NOT NULL DEFAULT 0,  -- 0=não lido, 1=lido
  lido_em     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(recado_id, aluno_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recados_status     ON recados(status);
CREATE INDEX IF NOT EXISTS idx_recados_remetente   ON recados(remetente_tipo, remetente_id);
CREATE INDEX IF NOT EXISTS idx_dest_recado         ON recados_destinatarios(recado_id);
CREATE INDEX IF NOT EXISTS idx_leituras_aluno      ON recados_leituras(aluno_id);
CREATE INDEX IF NOT EXISTS idx_leituras_recado     ON recados_leituras(recado_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS trg_recados_updated
  AFTER UPDATE ON recados
  BEGIN
    UPDATE recados SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;
