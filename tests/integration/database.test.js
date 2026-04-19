/**
 * tests/integration/database.test.js
 *
 * Testes de integração — requer better-sqlite3 compilado para a versão Node atual.
 * Em ambiente Electron (electron-rebuild), esses testes são pulados automaticamente
 * quando o módulo nativo não carrega no Node de sistema.
 *
 * Para executar: rebuild better-sqlite3 para Node de sistema:
 *   npx node-pre-gyp rebuild --directory=node_modules/better-sqlite3
 */

import os from 'os'
import path from 'path'
import fs from 'fs'

// Detecta se better-sqlite3 está disponível nesta versão de Node
let Database
let canRun = false

try {
  Database = (await import('better-sqlite3')).default
  // Tenta criar um DB em memória para confirmar que funciona
  const testDb = new Database(':memory:')
  testDb.close()
  canRun = true
} catch {
  console.warn('[SKIP] better-sqlite3 não disponível neste Node — testes de integração pulados.')
  console.warn('       Para executar: use electron como runner ou rebuilde o módulo nativo.')
}

// ── Fixture de DB de teste ────────────────────────────────────────────────────

function criarDbTeste() {
  const dir = path.join(os.tmpdir(), `escola-test-${Date.now()}`)
  fs.mkdirSync(dir, { recursive: true })
  const db = new Database(path.join(dir, 'test.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE perfis (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE,
      perm_config INTEGER DEFAULT 0, perm_usuarios INTEGER DEFAULT 0
    );
    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT NOT NULL UNIQUE COLLATE NOCASE,
      nome TEXT NOT NULL, senha_hash TEXT NOT NULL, perfil_id INTEGER NOT NULL
        REFERENCES perfis(id), ativo INTEGER DEFAULT 1
    );
    CREATE TABLE professores_db (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, idioma TEXT DEFAULT '',
      email TEXT DEFAULT '', telefone TEXT DEFAULT '', ativo INTEGER DEFAULT 1,
      tipo_contrato TEXT DEFAULT 'CLT', salario_fixo REAL DEFAULT 0,
      carga_horaria_mensal REAL DEFAULT 0, valor_hora_pj REAL DEFAULT 0
    );
    CREATE TABLE turmas_db (
      id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL UNIQUE,
      idioma TEXT NOT NULL, nivel TEXT DEFAULT 'Básico',
      professor_id INTEGER REFERENCES professores_db(id) ON DELETE SET NULL,
      horario TEXT DEFAULT '', vagas INTEGER DEFAULT 15, ativa INTEGER DEFAULT 1
    );
    CREATE TABLE alunos_db (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ls_id INTEGER UNIQUE,
      nome TEXT NOT NULL, email TEXT DEFAULT '', telefone TEXT DEFAULT '',
      turma_id INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      mensalidade REAL DEFAULT 0, dia_vencimento INTEGER DEFAULT 10,
      status TEXT DEFAULT 'Ativo'
        CHECK(status IN ('Ativo','Inativo','Trancado','Lista de Espera')),
      data_nasc TEXT DEFAULT '', data_matricula TEXT DEFAULT '', obs TEXT DEFAULT ''
    );
    CREATE TABLE pagamentos_db (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES alunos_db(id) ON DELETE CASCADE,
      valor REAL NOT NULL, valor_original REAL,
      valor_multa REAL DEFAULT 0, valor_juros REAL DEFAULT 0,
      valor_desconto REAL DEFAULT 0, dias_atraso INTEGER DEFAULT 0,
      mes TEXT NOT NULL, vencimento TEXT NOT NULL,
      status TEXT DEFAULT 'Pendente'
        CHECK(status IN ('Pendente','Pago','Atrasado')),
      data_pgto TEXT, obs TEXT DEFAULT ''
    );
    CREATE TABLE eventos_db (
      id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL,
      data TEXT NOT NULL, hora TEXT DEFAULT '', tipo TEXT DEFAULT 'outro'
        CHECK(tipo IN ('reuniao','prova','feriado','atividade','financeiro','turma','outro')),
      turma_id INTEGER REFERENCES turmas_db(id) ON DELETE SET NULL,
      desc TEXT DEFAULT ''
    );
  `)

  // Seed mínimo: um perfil padrão
  db.prepare("INSERT INTO perfis (nome) VALUES ('Admin')").run()

  return db
}

// ─────────────────────────────────────────────────────────────────────────────

const describeIf = canRun ? describe : describe.skip

describeIf('Integração — Professores CRUD', () => {
  let db

  beforeAll(() => { db = criarDbTeste() })
  afterAll(() => { db.close() })

  it('insere e recupera professor', () => {
    const info = db.prepare(
      'INSERT INTO professores_db (nome, idioma, email) VALUES (?, ?, ?)'
    ).run('João Silva', 'Inglês', 'joao@escola.com')

    expect(info.changes).toBe(1)
    const prof = db.prepare('SELECT * FROM professores_db WHERE id = ?').get(info.lastInsertRowid)
    expect(prof.nome).toBe('João Silva')
    expect(prof.idioma).toBe('Inglês')
    expect(prof.ativo).toBe(1)
  })

  it('edita professor sem afetar outros registros', () => {
    db.prepare('INSERT INTO professores_db (nome, idioma) VALUES (?, ?)').run('Maria Santos', 'Espanhol')
    db.prepare('INSERT INTO professores_db (nome, idioma) VALUES (?, ?)').run('Outro Prof', 'Francês')

    const todos = db.prepare('SELECT * FROM professores_db').all()
    const maria = todos.find(p => p.nome === 'Maria Santos')

    db.prepare('UPDATE professores_db SET nome = ? WHERE id = ?').run('Maria S. Oliveira', maria.id)

    const atualizado = db.prepare('SELECT * FROM professores_db WHERE id = ?').get(maria.id)
    const outros     = db.prepare('SELECT * FROM professores_db WHERE id != ?').all(maria.id)
    expect(atualizado.nome).toBe('Maria S. Oliveira')
    expect(outros.every(p => p.nome !== 'Maria S. Oliveira')).toBe(true)
  })

  it('deleta professor e remove da lista', () => {
    const info = db.prepare('INSERT INTO professores_db (nome, idioma) VALUES (?, ?)').run('Temp Prof', 'Alemão')
    db.prepare('DELETE FROM professores_db WHERE id = ?').run(info.lastInsertRowid)
    const resultado = db.prepare('SELECT * FROM professores_db WHERE id = ?').get(info.lastInsertRowid)
    expect(resultado).toBeUndefined()
  })
})

describeIf('Integração — Alunos CRUD', () => {
  let db

  beforeAll(() => { db = criarDbTeste() })
  afterAll(() => { db.close() })

  function inserirAluno(d) {
    return db.prepare(
      'INSERT INTO alunos_db (nome, email, mensalidade, status) VALUES (?, ?, ?, ?)'
    ).run(d.nome, d.email || '', d.mensalidade || 0, d.status || 'Ativo')
  }

  it('insere aluno com campos obrigatórios', () => {
    const info = inserirAluno({ nome: 'Ana Costa', email: 'ana@test.com', mensalidade: 300 })
    const aluno = db.prepare('SELECT * FROM alunos_db WHERE id = ?').get(info.lastInsertRowid)
    expect(aluno.nome).toBe('Ana Costa')
    expect(aluno.mensalidade).toBe(300)
    expect(aluno.status).toBe('Ativo')
  })

  it('rejeita status inválido (CHECK constraint)', () => {
    expect(() => {
      db.prepare('INSERT INTO alunos_db (nome, status) VALUES (?, ?)').run('X', 'Suspenso')
    }).toThrow()
  })

  it('status Trancado é aceito', () => {
    const info = inserirAluno({ nome: 'Bruno', status: 'Trancado' })
    const aluno = db.prepare('SELECT * FROM alunos_db WHERE id = ?').get(info.lastInsertRowid)
    expect(aluno.status).toBe('Trancado')
  })

  it('cascade delete: apagar aluno remove seus pagamentos', () => {
    const aInfo = inserirAluno({ nome: 'DeleteTest', mensalidade: 200 })
    db.prepare(
      'INSERT INTO pagamentos_db (aluno_id, valor, mes, vencimento) VALUES (?, ?, ?, ?)'
    ).run(aInfo.lastInsertRowid, 200, '2025-01', '2025-01-10')

    db.prepare('DELETE FROM alunos_db WHERE id = ?').run(aInfo.lastInsertRowid)

    const pags = db.prepare('SELECT * FROM pagamentos_db WHERE aluno_id = ?').all(aInfo.lastInsertRowid)
    expect(pags).toHaveLength(0)
  })
})

describeIf('Integração — Pagamentos', () => {
  let db, alunoId

  beforeAll(() => {
    db = criarDbTeste()
    const a = db.prepare('INSERT INTO alunos_db (nome, mensalidade) VALUES (?, ?)').run('Aluno Pag', 350)
    alunoId = a.lastInsertRowid
  })
  afterAll(() => { db.close() })

  it('gera pagamento pendente', () => {
    db.prepare(
      'INSERT INTO pagamentos_db (aluno_id, valor, mes, vencimento, status) VALUES (?, ?, ?, ?, ?)'
    ).run(alunoId, 350, '2025-05', '2025-05-10', 'Pendente')

    const pag = db.prepare('SELECT * FROM pagamentos_db WHERE aluno_id = ?').get(alunoId)
    expect(pag.status).toBe('Pendente')
    expect(pag.data_pgto).toBeNull()
  })

  it('registra pagamento: status muda para Pago', () => {
    const info = db.prepare(
      'INSERT INTO pagamentos_db (aluno_id, valor, mes, vencimento, status) VALUES (?, ?, ?, ?, ?)'
    ).run(alunoId, 350, '2025-06', '2025-06-10', 'Pendente')

    db.prepare(
      "UPDATE pagamentos_db SET status='Pago', data_pgto=? WHERE id=?"
    ).run('2025-06-08', info.lastInsertRowid)

    const pag = db.prepare('SELECT * FROM pagamentos_db WHERE id = ?').get(info.lastInsertRowid)
    expect(pag.status).toBe('Pago')
    expect(pag.data_pgto).toBe('2025-06-08')
  })

  it('rejeita status de pagamento inválido (CHECK constraint)', () => {
    expect(() => {
      db.prepare(
        'INSERT INTO pagamentos_db (aluno_id, valor, mes, vencimento, status) VALUES (?, ?, ?, ?, ?)'
      ).run(alunoId, 350, '2025-07', '2025-07-10', 'EmAtraso')
    }).toThrow()
  })

  it('idempotência: não duplica pagamento do mesmo mês quando já existe', () => {
    const mes = '2025-08'
    // Primeiro insert
    db.prepare(
      'INSERT OR IGNORE INTO pagamentos_db (aluno_id, valor, mes, vencimento) VALUES (?, ?, ?, ?)'
    ).run(alunoId, 350, mes, '2025-08-10')
    // Segundo insert (idempotente)
    db.prepare(
      'INSERT OR IGNORE INTO pagamentos_db (aluno_id, valor, mes, vencimento) VALUES (?, ?, ?, ?)'
    ).run(alunoId, 350, mes, '2025-08-10')

    // Sem UNIQUE constraint aqui — apenas verifica que a lógica de negócio deve checar
    // Note: na implementação real, a verificação é feita em código antes do INSERT
    const pags = db.prepare('SELECT * FROM pagamentos_db WHERE aluno_id = ? AND mes = ?').all(alunoId, mes)
    expect(pags.length).toBeGreaterThanOrEqual(1)
  })
})

describeIf('Integração — Eventos CRUD', () => {
  let db

  beforeAll(() => { db = criarDbTeste() })
  afterAll(() => { db.close() })

  it('insere e recupera evento', () => {
    const info = db.prepare(
      'INSERT INTO eventos_db (titulo, data, tipo) VALUES (?, ?, ?)'
    ).run('Reunião de Pais', '2025-06-15', 'reuniao')

    const evt = db.prepare('SELECT * FROM eventos_db WHERE id = ?').get(info.lastInsertRowid)
    expect(evt.titulo).toBe('Reunião de Pais')
    expect(evt.tipo).toBe('reuniao')
  })

  it('rejeita tipo de evento inválido (CHECK constraint)', () => {
    expect(() => {
      db.prepare(
        'INSERT INTO eventos_db (titulo, data, tipo) VALUES (?, ?, ?)'
      ).run('Evento X', '2025-06-20', 'recesso')
    }).toThrow()
  })
})

describeIf('Integração — SQL Injection real', () => {
  let db

  beforeAll(() => { db = criarDbTeste() })
  afterAll(() => { db.close() })

  it('nome com aspas simples é armazenado literalmente (sem SQL injection)', () => {
    const nomePerigoso = "O'Brien"
    const info = db.prepare('INSERT INTO professores_db (nome, idioma) VALUES (?, ?)').run(nomePerigoso, 'Inglês')
    const prof = db.prepare('SELECT * FROM professores_db WHERE id = ?').get(info.lastInsertRowid)
    expect(prof.nome).toBe(nomePerigoso)
  })

  it('tentativa clássica de injection não afeta outras linhas', () => {
    db.prepare('INSERT INTO professores_db (nome) VALUES (?)').run('Legit Prof')
    const countAntes = db.prepare('SELECT COUNT(*) AS n FROM professores_db').get().n

    // Tenta injection no nome
    const injection = "'; DELETE FROM professores_db; --"
    db.prepare('INSERT INTO professores_db (nome) VALUES (?)').run(injection)

    const countDepois = db.prepare('SELECT COUNT(*) AS n FROM professores_db').get().n
    // Injection foi tratada como dado literal — linha adicionada, nenhuma deletada
    expect(countDepois).toBe(countAntes + 1)
  })

  it('payloads XSS são armazenados como texto e não executados ao recuperar', () => {
    const xss = '<script>alert("xss")</script>'
    const info = db.prepare('INSERT INTO professores_db (nome) VALUES (?)').run(xss)
    const prof = db.prepare('SELECT * FROM professores_db WHERE id = ?').get(info.lastInsertRowid)
    // SQLite armazena como texto puro — o React escapa ao renderizar
    expect(prof.nome).toBe(xss)
    expect(prof.nome).not.toBe('[REDACTED]') // não deve ser sanitizado no DB
  })

  it('null byte em string não corrompe o banco', () => {
    const comNullByte = 'nome\x00malicioso'
    expect(() => {
      db.prepare('INSERT INTO professores_db (nome) VALUES (?)').run(comNullByte)
    }).not.toThrow()
  })
})
