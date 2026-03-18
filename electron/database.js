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
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      login          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      nome           TEXT    NOT NULL,
      email          TEXT    DEFAULT '',
      senha_hash     TEXT    NOT NULL,
      perfil_id      INTEGER NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
      ativo          INTEGER DEFAULT 1,
      avatar_cor     TEXT    DEFAULT '#63dcaa',
      ultimo_acesso  TEXT,
      criado_em      TEXT    DEFAULT (datetime('now'))
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
    -- Registra todas as ações relevantes: logins, CRUDs, alterações de config.
    -- usuario_login: quem fez (null = sistema)
    -- modulo: alunos | financeiro | usuarios | perfis | identidade | sistema
    -- acao: login | logout | criar | editar | excluir | exportar | configurar
    -- entidade_id: ID do registro afetado (quando aplicável)
    -- detalhe: descrição legível da ação
    -- ip é sempre 'localhost' para app desktop

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

    -- ── SCHEMA PREPARADO PARA V6 (migração localStorage → SQLite) ────────────
    -- Estas tabelas são criadas agora para facilitar a migração futura.
    -- O frontend ainda usa localStorage na v5; na v6 passará a usar IPC + SQLite.

    CREATE TABLE IF NOT EXISTS professores_db (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT    NOT NULL,
      idioma    TEXT    DEFAULT '',
      email     TEXT    DEFAULT '',
      telefone  TEXT    DEFAULT '',
      ativo     INTEGER DEFAULT 1,
      criado_em TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS turmas_db (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo        TEXT    NOT NULL UNIQUE,
      idioma        TEXT    NOT NULL,
      nivel         TEXT    DEFAULT 'Básico',
      professor_id  INTEGER REFERENCES professores_db(id) ON DELETE SET NULL,
      horario       TEXT    DEFAULT '',
      vagas         INTEGER DEFAULT 15,
      ativa         INTEGER DEFAULT 1,
      criado_em     TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alunos_db (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nome            TEXT    NOT NULL,
      email           TEXT    DEFAULT '',
      telefone        TEXT    DEFAULT '',
      turma_id        INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      mensalidade     REAL    DEFAULT 0,
      status          TEXT    DEFAULT 'Ativo',
      data_nasc       TEXT    DEFAULT '',
      data_matricula  TEXT    DEFAULT (date('now')),
      obs             TEXT    DEFAULT '',
      criado_em       TEXT    DEFAULT (datetime('now')),
      atualizado_em   TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_alunos_status  ON alunos_db(status);
    CREATE INDEX IF NOT EXISTS idx_alunos_turma   ON alunos_db(turma_id);

    CREATE TABLE IF NOT EXISTS pagamentos_db (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id    INTEGER NOT NULL REFERENCES alunos_db(id) ON DELETE CASCADE,
      valor       REAL    NOT NULL,
      mes         TEXT    NOT NULL,
      vencimento  TEXT    NOT NULL,
      status      TEXT    DEFAULT 'Pendente',
      data_pgto   TEXT,
      obs         TEXT    DEFAULT '',
      criado_em   TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pag_aluno  ON pagamentos_db(aluno_id);
    CREATE INDEX IF NOT EXISTS idx_pag_mes    ON pagamentos_db(mes);
    CREATE INDEX IF NOT EXISTS idx_pag_status ON pagamentos_db(status);

    CREATE TABLE IF NOT EXISTS eventos_db (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo    TEXT    NOT NULL,
      data      TEXT    NOT NULL,
      hora      TEXT    DEFAULT '',
      tipo      TEXT    DEFAULT 'outro',
      turma_id  INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      desc      TEXT    DEFAULT '',
      criado_em TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos_db(data);

    -- ── FREQUÊNCIA ────────────────────────────────────────────────────────────
    -- Módulo de chamada: registra presença/ausência por aula e aluno.
    -- turma_ls_id: ID da turma no localStorage (não FK — dados migram na v6)
    -- aluno_ls_id: ID do aluno no localStorage

    CREATE TABLE IF NOT EXISTS aulas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      turma_ls_id INTEGER NOT NULL,
      turma_codigo TEXT   DEFAULT '',
      data        TEXT    NOT NULL,
      titulo      TEXT    DEFAULT '',
      criado_em   TEXT    DEFAULT (datetime('now','localtime'))
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
  `)
}

// ── Migração não-destrutiva de schema ─────────────────────────────────────────
// Chamada ANTES de criarTabelas() para limpar tabelas incompatíveis.
function migrarSchema() {
  // Verifica se tabela 'aulas' existe e tem o schema antigo (turma_id em vez de turma_ls_id)
  try {
    const tabelasExistentes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map(t => t.name)

    if (tabelasExistentes.includes('aulas')) {
      const colsAulas = db.prepare("PRAGMA table_info(aulas)").all().map(c => c.name)

      if (!colsAulas.includes('turma_ls_id')) {
        // Schema antigo com turma_id (FK para turmas_db) — incompatível
        // Dropa ambas as tabelas para que criarTabelas() as recrie corretamente
        db.pragma('foreign_keys = OFF')
        db.exec('DROP TABLE IF EXISTS presencas; DROP TABLE IF EXISTS aulas;')
        db.pragma('foreign_keys = ON')
        console.log('[DB] Migração: tabelas aulas/presencas recriadas com novo schema')
      } else if (!colsAulas.includes('turma_codigo')) {
        // Schema intermediário sem turma_codigo — adiciona a coluna
        db.exec("ALTER TABLE aulas ADD COLUMN turma_codigo TEXT DEFAULT ''")
        console.log('[DB] Migração: coluna turma_codigo adicionada')
      }
    }
  } catch (e) {
    console.error('[DB] Erro na migração de schema:', e.message)
  }
}

// ── Seed inicial ──────────────────────────────────────────────────────────────
function seedInicial() {
  const jaTemPerfis = db.prepare('SELECT COUNT(*) AS n FROM perfis').get().n
  if (jaTemPerfis > 0) return

  const insertPerfil = db.prepare(`
    INSERT INTO perfis
      (nome,desc,cor,perm_dashboard,perm_alunos,perm_financeiro,
       perm_cursos,perm_relatorios,perm_agenda,perm_config,perm_usuarios)
    VALUES
      (@nome,@desc,@cor,@pd,@pa,@pf,@pc,@pr,@pag,@pcfg,@pu)
  `)

  const seed = db.transaction(() => {
    const perfis = [
      { nome:'Administrador', desc:'Acesso total',            cor:'#63dcaa', pd:2,pa:2,pf:2,pc:2,pr:2,pag:2,pcfg:2,pu:2 },
      { nome:'Secretaria',    desc:'Cadastros e financeiro',  cor:'#5b9cf6', pd:1,pa:2,pf:2,pc:1,pr:1,pag:2,pcfg:0,pu:0 },
      { nome:'Professor',     desc:'Leitura de alunos/agenda',cor:'#f5c542', pd:1,pa:1,pf:0,pc:1,pr:0,pag:1,pcfg:0,pu:0 },
      { nome:'Financeiro',    desc:'Foco financeiro',         cor:'#a78bfa', pd:1,pa:1,pf:2,pc:0,pr:2,pag:0,pcfg:0,pu:0 },
      { nome:'Visualizador',  desc:'Somente leitura',         cor:'#8b949e', pd:1,pa:1,pf:1,pc:1,pr:1,pag:1,pcfg:0,pu:0 },
    ]
    perfis.forEach(p => insertPerfil.run(p))

    const adminId = db.prepare("SELECT id FROM perfis WHERE nome='Administrador'").get().id
    const secId   = db.prepare("SELECT id FROM perfis WHERE nome='Secretaria'").get().id

    const insertUser = db.prepare(`
      INSERT INTO usuarios (login,nome,email,senha_hash,perfil_id,ativo,avatar_cor)
      VALUES (@login,@nome,@email,@senha_hash,@perfil_id,1,@avatar_cor)
    `)
    ;[
      { login:'admin',       nome:'Administrador', email:'admin@escola.com', senha_hash:hashSenha('admin123'), perfil_id:adminId, avatar_cor:'#63dcaa' },
      { login:'secretaria',  nome:'Secretaria',    email:'sec@escola.com',   senha_hash:hashSenha('sec123'),   perfil_id:secId,   avatar_cor:'#5b9cf6' },
      { login:'demo',        nome:'Demonstração',  email:'demo@escola.com',  senha_hash:hashSenha('demo'),     perfil_id:adminId, avatar_cor:'#f5c542' },
    ].forEach(u => insertUser.run(u))

    db.prepare(`
      INSERT OR IGNORE INTO identidade (id,nome_escola,slogan)
      VALUES (1,'Escola Manager','Sistema de Gestão Escolar')
    `).run()

    // Log de seed
    db.prepare(`
      INSERT INTO audit_log (usuario_login,modulo,acao,detalhe,nivel)
      VALUES ('sistema','sistema','inicializar','Banco de dados criado e seed aplicado.','info')
    `).run()
  })
  seed()
  console.log('[DB] Seed concluído')
}

// ── Guard ─────────────────────────────────────────────────────────────────────
function dbOk() { if (!db) throw new Error('Banco não inicializado') }

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registra uma ação no log de auditoria.
 * Chamado internamente por todas as funções de escrita.
 */
function registrarLog({ usuarioId = null, usuarioLogin = 'sistema', modulo, acao, entidadeId = null, entidadeNome = '', detalhe = '', nivel = 'info' }) {
  if (!db) return
  try {
    db.prepare(`
      INSERT INTO audit_log
        (usuario_id, usuario_login, modulo, acao, entidade_id, entidade_nome, detalhe, nivel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(usuarioId, usuarioLogin, modulo, acao, entidadeId, entidadeNome, detalhe, nivel)
  } catch (e) {
    console.error('[AuditLog] Erro ao gravar:', e.message)
  }
}

/**
 * Busca registros do audit_log com filtros opcionais.
 * Retorna os mais recentes primeiro.
 */
function listarLogs({ limite = 200, modulo = null, acao = null, usuarioId = null, nivel = null, busca = '' } = {}) {
  dbOk()
  let where = []
  let params = []

  if (modulo)     { where.push('a.modulo = ?');        params.push(modulo) }
  if (acao)       { where.push('a.acao = ?');          params.push(acao) }
  if (usuarioId)  { where.push('a.usuario_id = ?');    params.push(usuarioId) }
  if (nivel)      { where.push('a.nivel = ?');         params.push(nivel) }
  if (busca)      { where.push('(a.detalhe LIKE ? OR a.entidade_nome LIKE ? OR a.usuario_login LIKE ?)'); params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`) }

  const sql = `
    SELECT a.*, u.nome AS usuario_nome, u.avatar_cor
    FROM audit_log a
    LEFT JOIN usuarios u ON a.usuario_id = u.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.criado_em DESC
    LIMIT ?
  `
  params.push(limite)
  return db.prepare(sql).all(...params)
}

function limparLogs(diasAntes = 90) {
  dbOk()
  const info = db.prepare(`
    DELETE FROM audit_log WHERE criado_em < datetime('now', '-' || ? || ' days')
  `).run(diasAntes)
  registrarLog({ modulo:'sistema', acao:'limpar_logs', detalhe:`${info.changes} registros removidos (>${diasAntes} dias)`, nivel:'aviso' })
  return { ok: true, removidos: info.changes }
}

function estatisticasLogs() {
  dbOk()
  return {
    total:       db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n,
    hoje:        db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE date(criado_em)=date('now','localtime')").get().n,
    semana:      db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE criado_em >= datetime('now','-7 days')").get().n,
    porModulo:   db.prepare('SELECT modulo, COUNT(*) AS n FROM audit_log GROUP BY modulo ORDER BY n DESC').all(),
    porAcao:     db.prepare('SELECT acao,    COUNT(*) AS n FROM audit_log GROUP BY acao    ORDER BY n DESC').all(),
    porUsuario:  db.prepare('SELECT usuario_login, COUNT(*) AS n FROM audit_log GROUP BY usuario_login ORDER BY n DESC LIMIT 10').all(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
function login(loginInput, senha) {
  dbOk()
  const u = db.prepare(`
    SELECT u.*, p.nome AS perfil_nome, p.cor AS perfil_cor,
      p.perm_dashboard, p.perm_alunos, p.perm_financeiro, p.perm_cursos,
      p.perm_relatorios, p.perm_agenda, p.perm_config, p.perm_usuarios
    FROM usuarios u
    JOIN perfis p ON u.perfil_id = p.id
    WHERE u.login = ? COLLATE NOCASE AND u.ativo = 1
  `).get(loginInput.trim())

  if (!u)                                   { registrarLog({ usuarioLogin: loginInput, modulo:'sistema', acao:'login_falha', detalhe:'Usuário não encontrado ou inativo', nivel:'aviso' }); return { ok: false, erro: 'Usuário não encontrado ou inativo' } }
  if (!verificarSenha(senha, u.senha_hash)) { registrarLog({ usuarioLogin: loginInput, modulo:'sistema', acao:'login_falha', detalhe:'Senha incorreta', nivel:'aviso' }); return { ok: false, erro: 'Senha incorreta' } }

  db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?").run(u.id)
  registrarLog({ usuarioId: u.id, usuarioLogin: u.login, modulo:'sistema', acao:'login', detalhe:`Login bem-sucedido — perfil: ${u.perfil_nome}`, nivel:'info' })

  const { senha_hash, ...userSafe } = u
  return { ok: true, usuario: userSafe }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USUÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════
function listarUsuarios() {
  dbOk()
  return db.prepare(`
    SELECT u.id, u.login, u.nome, u.email, u.ativo, u.avatar_cor,
           u.perfil_id, u.ultimo_acesso, u.criado_em,
           p.nome AS perfil_nome, p.cor AS perfil_cor
    FROM usuarios u JOIN perfis p ON u.perfil_id = p.id
    ORDER BY u.nome
  `).all()
}

function criarUsuario(d, _req = {}) {
  dbOk()
  const existe = db.prepare('SELECT id FROM usuarios WHERE login = ? COLLATE NOCASE').get(d.login)
  if (existe) return { ok: false, erro: 'Login já está em uso' }

  const info = db.prepare(`
    INSERT INTO usuarios (login,nome,email,senha_hash,perfil_id,ativo,avatar_cor)
    VALUES (?,?,?,?,?,1,?)
  `).run(d.login.toLowerCase().trim(), d.nome.trim(), d.email||'', hashSenha(d.senha), d.perfilId, d.avatarCor||'#63dcaa')

  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'criar', entidadeId:info.lastInsertRowid, entidadeNome:d.nome, detalhe:`Usuário criado: ${d.login} (perfil ID ${d.perfilId})` })
  return { ok: true, id: info.lastInsertRowid }
}

function editarUsuario(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT login,nome FROM usuarios WHERE id=?').get(id)
  if (d.senha && d.senha.length >= 4) {
    db.prepare(`UPDATE usuarios SET nome=?,email=?,perfil_id=?,ativo=?,avatar_cor=?,senha_hash=? WHERE id=?`)
      .run(d.nome, d.email||'', d.perfilId, d.ativo?1:0, d.avatarCor||'#63dcaa', hashSenha(d.senha), id)
    registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'editar', entidadeId:id, entidadeNome:antes?.nome||'', detalhe:`Usuário editado (com troca de senha): ${antes?.login}` })
  } else {
    db.prepare(`UPDATE usuarios SET nome=?,email=?,perfil_id=?,ativo=?,avatar_cor=? WHERE id=?`)
      .run(d.nome, d.email||'', d.perfilId, d.ativo?1:0, d.avatarCor||'#63dcaa', id)
    registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'editar', entidadeId:id, entidadeNome:antes?.nome||'', detalhe:`Usuário editado: ${antes?.login} → ativo=${d.ativo}` })
  }
  return { ok: true }
}

function deletarUsuario(id, _req = {}) {
  dbOk()
  const u = db.prepare('SELECT login,nome,perfil_id FROM usuarios WHERE id=?').get(id)
  const adminPerfilId = db.prepare("SELECT id FROM perfis WHERE nome='Administrador'").get()?.id
  if (adminPerfilId && u?.perfil_id === adminPerfilId) {
    const adminsAtivos = db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE perfil_id=? AND ativo=1 AND id!=?').get(adminPerfilId, id).n
    if (adminsAtivos === 0) return { ok: false, erro: 'Não é possível remover o único administrador ativo.' }
  }
  db.prepare('DELETE FROM usuarios WHERE id=?').run(id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'usuarios', acao:'excluir', entidadeId:id, entidadeNome:u?.nome||'', detalhe:`Usuário excluído: ${u?.login}`, nivel:'aviso' })
  return { ok: true }
}

function alterarSenhaPropria(id, senhaAtual, novaSenha) {
  dbOk()
  const u = db.prepare('SELECT login,senha_hash FROM usuarios WHERE id=?').get(id)
  if (!u || !verificarSenha(senhaAtual, u.senha_hash)) return { ok: false, erro: 'Senha atual incorreta' }
  if (!novaSenha || novaSenha.length < 4)              return { ok: false, erro: 'Nova senha deve ter pelo menos 4 caracteres' }
  db.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').run(hashSenha(novaSenha), id)
  registrarLog({ usuarioId:id, usuarioLogin:u.login, modulo:'usuarios', acao:'alterar_senha', entidadeId:id, entidadeNome:u.login, detalhe:'Senha alterada pelo próprio usuário' })
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFIS
// ═══════════════════════════════════════════════════════════════════════════════
function listarPerfis() {
  dbOk()
  return db.prepare('SELECT * FROM perfis ORDER BY id').all()
}

function criarPerfil(d, _req = {}) {
  dbOk()
  const info = db.prepare(`
    INSERT INTO perfis (nome,desc,cor,perm_dashboard,perm_alunos,perm_financeiro,perm_cursos,perm_relatorios,perm_agenda,perm_config,perm_usuarios)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(d.nome, d.desc||'', d.cor||'#63dcaa', d.perm_dashboard||1, d.perm_alunos||1, d.perm_financeiro||0, d.perm_cursos||1, d.perm_relatorios||1, d.perm_agenda||1, d.perm_config||0, d.perm_usuarios||0)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'perfis', acao:'criar', entidadeId:info.lastInsertRowid, entidadeNome:d.nome, detalhe:`Perfil criado: ${d.nome}` })
  return { ok: true, id: info.lastInsertRowid }
}

function editarPerfil(id, d, _req = {}) {
  dbOk()
  const antes = db.prepare('SELECT nome FROM perfis WHERE id=?').get(id)
  db.prepare(`
    UPDATE perfis SET nome=?,desc=?,cor=?,perm_dashboard=?,perm_alunos=?,perm_financeiro=?,perm_cursos=?,perm_relatorios=?,perm_agenda=?,perm_config=?,perm_usuarios=? WHERE id=?
  `).run(d.nome, d.desc||'', d.cor||'#63dcaa', d.perm_dashboard, d.perm_alunos, d.perm_financeiro, d.perm_cursos, d.perm_relatorios, d.perm_agenda, d.perm_config, d.perm_usuarios, id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'perfis', acao:'editar', entidadeId:id, entidadeNome:antes?.nome||'', detalhe:`Perfil editado: ${antes?.nome} → ${d.nome}` })
  return { ok: true }
}

function deletarPerfil(id, _req = {}) {
  dbOk()
  const uso = db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE perfil_id=?').get(id).n
  if (uso > 0) return { ok: false, erro: `Perfil em uso por ${uso} usuário(s).` }
  const p = db.prepare('SELECT nome FROM perfis WHERE id=?').get(id)
  db.prepare('DELETE FROM perfis WHERE id=?').run(id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'perfis', acao:'excluir', entidadeId:id, entidadeNome:p?.nome||'', detalhe:`Perfil excluído: ${p?.nome}`, nivel:'aviso' })
  return { ok: true }
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
  return { ok: true }
}

// ── Log de ação do frontend (AppContext) ──────────────────────────────────────
function registrarLogExterno(d) {
  registrarLog(d)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREQUÊNCIA — Aulas e Presenças
// ═══════════════════════════════════════════════════════════════════════════════

function listarAulas({ turmaLsId = null, mes = null } = {}) {
  dbOk()
  let sql = 'SELECT * FROM aulas'
  const params = []
  const where = []
  if (turmaLsId) { where.push('turma_ls_id = ?'); params.push(turmaLsId) }
  if (mes)       { where.push("strftime('%Y-%m', data) = ?"); params.push(mes) }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY data DESC'
  return db.prepare(sql).all(...params)
}

function criarAula(d, _req = {}) {
  dbOk()
  const info = db.prepare(`
    INSERT INTO aulas (turma_ls_id, turma_codigo, data, titulo)
    VALUES (?, ?, ?, ?)
  `).run(d.turmaLsId, d.turmaCodigo || '', d.data, d.titulo || '')
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'criar', entidadeId:info.lastInsertRowid, entidadeNome:d.titulo||d.data, detalhe:`Aula criada: ${d.turmaCodigo} ${d.data}` })
  return { ok: true, id: info.lastInsertRowid }
}

function editarAula(id, d, _req = {}) {
  dbOk()
  db.prepare(`UPDATE aulas SET titulo=?, data=? WHERE id=?`).run(d.titulo||'', d.data, id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'editar', entidadeId:id, detalhe:`Aula editada: ID ${id}` })
  return { ok: true }
}

function deletarAula(id, _req = {}) {
  dbOk()
  db.prepare('DELETE FROM aulas WHERE id=?').run(id)
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'excluir', entidadeId:id, detalhe:`Aula excluída: ID ${id}`, nivel:'aviso' })
  return { ok: true }
}

function getPresencas(aulaId) {
  dbOk()
  return db.prepare('SELECT * FROM presencas WHERE aula_id = ? ORDER BY aluno_nome').all(aulaId)
}

function salvarPresencas(aulaId, lista, _req = {}) {
  // lista = [{ alunoLsId, alunoNome, presente, obs }]
  dbOk()
  const upsert = db.prepare(`
    INSERT INTO presencas (aula_id, aluno_ls_id, aluno_nome, presente, obs)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(aula_id, aluno_ls_id) DO UPDATE SET
      presente   = excluded.presente,
      aluno_nome = excluded.aluno_nome,
      obs        = excluded.obs
  `)
  const tx = db.transaction(() => {
    lista.forEach(a => upsert.run(aulaId, a.alunoLsId, a.alunoNome, a.presente ? 1 : 0, a.obs || ''))
  })
  tx()
  const presentes = lista.filter(a => a.presente).length
  registrarLog({ usuarioId:_req.userId, usuarioLogin:_req.userLogin||'sistema', modulo:'frequencia', acao:'registrar_chamada', entidadeId:aulaId, detalhe:`Chamada registrada: ${presentes}/${lista.length} presentes` })
  return { ok: true }
}

function estatisticasFrequencia(turmaLsId) {
  dbOk()
  // Frequência geral da turma
  const aulas = db.prepare('SELECT id FROM aulas WHERE turma_ls_id = ?').all(turmaLsId)
  if (!aulas.length) return { totalAulas: 0, alunos: [] }
  const aulaIds = aulas.map(a => a.id)
  const placeholders = aulaIds.map(() => '?').join(',')
  const presencasPorAluno = db.prepare(`
    SELECT aluno_ls_id, aluno_nome,
      COUNT(*) AS total_aulas,
      SUM(presente) AS total_presentes,
      ROUND(SUM(presente) * 100.0 / COUNT(*), 1) AS percentual
    FROM presencas
    WHERE aula_id IN (${placeholders})
    GROUP BY aluno_ls_id, aluno_nome
    ORDER BY aluno_nome
  `).all(...aulaIds)
  return { totalAulas: aulas.length, alunos: presencasPorAluno }
}

module.exports = {
  init, getDbPath,
  login,
  listarUsuarios, criarUsuario, editarUsuario, deletarUsuario, alterarSenhaPropria,
  listarPerfis, criarPerfil, editarPerfil, deletarPerfil,
  getIdentidade, salvarIdentidade,
  // Audit log
  listarLogs, limparLogs, estatisticasLogs, registrarLogExterno,
  // Frequência
  listarAulas, criarAula, editarAula, deletarAula,
  getPresencas, salvarPresencas, estatisticasFrequencia,
}
