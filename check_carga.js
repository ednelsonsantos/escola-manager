const path = require('path')
const db = require('better-sqlite3')(
  path.join(process.env.APPDATA, 'escola-manager', 'escola.db'),
  { readonly: true }
)

console.log('\n=== AULAS (primeiras 10) ===')
const aulas = db.prepare('SELECT id, turma_ls_id, turma_codigo, data, professor_id, cancelada, professor_ausente FROM aulas ORDER BY id LIMIT 10').all()
console.table(aulas)

console.log('\n=== TURMAS_DB com professor_id ===')
const turmas = db.prepare('SELECT id, codigo, professor_id FROM turmas_db ORDER BY id').all()
console.table(turmas)

console.log('\n=== PROFESSORES_DB ===')
const profs = db.prepare('SELECT id, nome FROM professores_db ORDER BY id').all()
console.table(profs)

console.log('\n=== COALESCE result (o que cargaHorariaProfessores vê) ===')
const result = db.prepare(`
  SELECT
    a.id AS aula_id,
    a.turma_ls_id,
    a.professor_id AS aula_professor_id,
    t.professor_id AS turma_professor_id,
    COALESCE(a.professor_id, t.professor_id) AS coalesce_professor_id,
    p.nome AS professor_nome
  FROM aulas a
  LEFT JOIN turmas_db t ON t.id = a.turma_ls_id
  LEFT JOIN professores_db p ON p.id = COALESCE(a.professor_id, t.professor_id)
  ORDER BY a.id
`).all()
console.table(result)

console.log('\n=== cargaHorariaProfessores result ===')
try {
  const ch = db.prepare(`
    SELECT
      p.id AS professor_id,
      p.nome AS professor_nome,
      COUNT(a.id) AS total_aulas,
      SUM(CASE WHEN a.professor_ausente=0 THEN 1 ELSE 0 END) AS aulas_ministradas
    FROM aulas a
    LEFT JOIN turmas_db t ON t.id = a.turma_ls_id
    JOIN professores_db p ON p.id = COALESCE(a.professor_id, t.professor_id)
    WHERE COALESCE(a.professor_id, t.professor_id) IS NOT NULL
    GROUP BY p.id, p.nome
    ORDER BY p.nome
  `).all()
  console.table(ch)
} catch(e) {
  console.error('ERRO:', e.message)
}

db.close()
