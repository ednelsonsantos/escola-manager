/**
 * seed_aulas_teste.js
 * Cria 1 aula por turma (1 semana atrás) para cada professor titular,
 * atribui presença a todos os alunos ativos da turma.
 * Uso: ./node_modules/.bin/electron seed_aulas_teste.js
 */
const path = require('path')
const db = require('better-sqlite3')(
  path.join(process.env.APPDATA, 'escola-manager', 'escola.db')
)

// Data de 1 semana atrás em YYYY-MM-DD
const dataAula = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
})()
console.log(`\nData das aulas de teste: ${dataAula}`)

// Turmas com professor titular
const turmas = db.prepare(`
  SELECT t.id, t.codigo, t.professor_id, p.nome AS professor_nome
  FROM turmas_db t
  JOIN professores_db p ON p.id = t.professor_id
  WHERE t.professor_id IS NOT NULL
  ORDER BY p.nome, t.codigo
`).all()

console.log(`\nTurmas encontradas: ${turmas.length}`)
console.table(turmas)

if (turmas.length === 0) {
  console.log('Nenhuma turma com professor titular. Encerrando.')
  db.close(); process.exit(0)
}

const inserirAula = db.prepare(`
  INSERT INTO aulas (turma_ls_id, turma_codigo, data, titulo, conteudo, cancelada, professor_id)
  VALUES (?, ?, ?, ?, ?, 0, ?)
`)

const inserirPresenca = db.prepare(`
  INSERT OR REPLACE INTO presencas (aula_id, aluno_ls_id, aluno_nome, presente, obs)
  VALUES (?, ?, ?, 1, '')
`)

const listarAlunos = db.prepare(`
  SELECT id, nome FROM alunos_db
  WHERE turma_id = ? AND status = 'Ativo'
`)

let totalAulas = 0
let totalPresencas = 0

db.transaction(() => {
  for (const t of turmas) {
    // Cria a aula
    const info = inserirAula.run(
      t.id,
      t.codigo,
      dataAula,
      `Aula de teste — ${t.codigo}`,
      'Aula criada automaticamente para teste de carga horária.',
      t.professor_id
    )
    const aulaId = info.lastInsertRowid
    totalAulas++

    // Busca alunos ativos da turma
    const alunos = listarAlunos.all(t.id)

    for (const a of alunos) {
      inserirPresenca.run(aulaId, a.id, a.nome)
      totalPresencas++
    }

    console.log(`  ✓ Aula #${aulaId} — ${t.codigo} (prof: ${t.professor_nome}) — ${alunos.length} aluno(s)`)
  }
})()

console.log(`\n=== Resultado ===`)
console.log(`Aulas criadas:   ${totalAulas}`)
console.log(`Presenças salvas: ${totalPresencas}`)

// Verifica carga horária resultante
console.log(`\n=== Carga Horária por Professor (após seed) ===`)
const carga = db.prepare(`
  SELECT
    p.nome AS professor,
    COUNT(a.id) AS total_aulas,
    SUM(CASE WHEN a.professor_ausente = 0 THEN 1 ELSE 0 END) AS aulas_ministradas
  FROM aulas a
  LEFT JOIN turmas_db t ON t.id = a.turma_ls_id
  JOIN professores_db p ON p.id = COALESCE(a.professor_id, t.professor_id)
  WHERE a.cancelada = 0
    AND COALESCE(a.professor_id, t.professor_id) IS NOT NULL
  GROUP BY p.id, p.nome
  ORDER BY p.nome
`).all()
console.table(carga)

db.close()
console.log('\nConcluído. Reabra o módulo Carga Horária no app para verificar.\n')
