/**
 * seed_folha_teste.js
 * 1. Define salários (CLT ou PJ) para cada professor
 * 2. Apaga folhas existentes de março/2026 (para recriar limpo)
 * 3. Gera folha de março/2026 para cada professor via gerarFolha()
 * 4. Exibe resultado detalhado comparando CLT x PJ
 *
 * Uso: ./node_modules/.bin/electron seed_folha_teste.js
 */
const path = require('path')
const db = require('better-sqlite3')(
  path.join(process.env.APPDATA, 'escola-manager', 'escola.db')
)

const MES = '2026-03'

// ── Configuração de salários por professor ─────────────────────────────────
// James Wilson:      CLT  R$4.000/mês, 80h/mês contratadas
// Carmen López:      PJ   R$90/hora
// Klaus Fischer:     PJ   R$95/hora
// Marco Rossi:       CLT  R$3.500/mês, 80h/mês contratadas
// Marie Dupont:      PJ   R$85/hora
// EDNELSON SANTOS:   CLT  R$6.000/mês, 80h/mês
// COLO TERRORISTA:   PJ   R$70/hora
const CONFIG_SALARIOS = {
  'James Wilson':    { tipo: 'CLT', salario_fixo: 4000, carga_mensal: 80, valor_hora_pj: 0 },
  'Carmen López':    { tipo: 'PJ',  salario_fixo: 0,    carga_mensal: 0,  valor_hora_pj: 90 },
  'Klaus Fischer':   { tipo: 'PJ',  salario_fixo: 0,    carga_mensal: 0,  valor_hora_pj: 95 },
  'Marco Rossi':     { tipo: 'CLT', salario_fixo: 3500, carga_mensal: 80, valor_hora_pj: 0 },
  'Marie Dupont':    { tipo: 'PJ',  salario_fixo: 0,    carga_mensal: 0,  valor_hora_pj: 85 },
  'EDNELSON SANTOS': { tipo: 'CLT', salario_fixo: 6000, carga_mensal: 80, valor_hora_pj: 0 },
  'COLO TERRORISTA': { tipo: 'PJ',  salario_fixo: 0,    carga_mensal: 0,  valor_hora_pj: 70 },
}

// ── 1. Aplica salários no banco ────────────────────────────────────────────
const profs = db.prepare('SELECT id, nome FROM professores_db ORDER BY nome').all()
console.log('\n=== Aplicando salários ===')
const updSal = db.prepare(`
  UPDATE professores_db
  SET tipo_contrato=?, salario_fixo=?, carga_horaria_mensal=?, valor_hora_pj=?
  WHERE id=?
`)
db.transaction(() => {
  for (const p of profs) {
    const cfg = CONFIG_SALARIOS[p.nome]
    if (!cfg) { console.log(`  ⚠ ${p.nome} — sem config, pulando`); continue }
    updSal.run(cfg.tipo, cfg.salario_fixo, cfg.carga_mensal, cfg.valor_hora_pj, p.id)
    console.log(`  ✓ ${p.nome.padEnd(20)} ${cfg.tipo}  salário=${cfg.salario_fixo}  ch=${cfg.carga_mensal}h  vHora=${cfg.valor_hora_pj}`)
  }
})()

// ── 2. Remove folhas existentes de março/2026 ──────────────────────────────
const del = db.prepare("DELETE FROM folha_pagamento WHERE mes = ?").run(MES)
console.log(`\n=== Limpou ${del.changes} folha(s) de ${MES} ===`)

// ── 3. Usa as funções internas do database.js para gerar folhas ───────────
// (replicamos a lógica aqui para rodar sem Electron IPC)
const queryHoras = db.prepare(`
  SELECT COALESCE(SUM(CASE WHEN a.professor_ausente=0 THEN 1 ELSE 0 END),0) AS horas
  FROM aulas a
  LEFT JOIN turmas_db t ON t.id = a.turma_ls_id
  WHERE COALESCE(a.professor_id, t.professor_id) = ?
    AND a.data >= ? AND a.data <= ? AND a.cancelada = 0
`)
const insFolha = db.prepare(`
  INSERT INTO folha_pagamento
    (professor_id, mes, tipo_contrato, horas_normais, horas_extra_50, horas_extra_100,
     valor_normal, valor_extra_50, valor_extra_100, total_bruto, deducoes, total_liquido,
     salario_fixo_ref, valor_hora_ref, status)
  VALUES (?, ?, ?, ?, 0, 0, ?, 0, 0, ?, ?, ?, ?, ?, 'Aberta')
`)

const profsAtt = db.prepare(`
  SELECT id, nome, tipo_contrato, salario_fixo, carga_horaria_mensal, valor_hora_pj
  FROM professores_db ORDER BY nome
`).all()

console.log('\n=== Gerando Folhas de Março/2026 ===')
const resultados = []

db.transaction(() => {
  for (const p of profsAtt) {
    const de  = `${MES}-01`
    const ate = `${MES}-31`
    const { horas } = queryHoras.get(p.id, de, ate)

    const isCLT    = p.tipo_contrato !== 'PJ'
    const salRef   = p.salario_fixo         || 0
    const chMensal = p.carga_horaria_mensal  || 0
    const vHRef    = isCLT
      ? (chMensal > 0 ? salRef / chMensal : 0)
      : (p.valor_hora_pj || 0)

    let vNormal, deducoes, totalBruto, totalLiq
    if (isCLT) {
      vNormal         = salRef
      const faltando  = Math.max(0, chMensal - horas)
      deducoes        = faltando * vHRef
      totalBruto      = vNormal
      totalLiq        = Math.max(0, totalBruto - deducoes)
    } else {
      vNormal    = vHRef * horas
      deducoes   = 0
      totalBruto = vNormal
      totalLiq   = totalBruto
    }

    insFolha.run(p.id, MES, p.tipo_contrato, horas, vNormal, totalBruto, deducoes, totalLiq, salRef, vHRef)

    resultados.push({
      professor:      p.nome,
      contrato:       p.tipo_contrato,
      horas_apuradas: horas,
      horas_contrat:  isCLT ? chMensal : '—',
      salario_base:   isCLT ? `R$${salRef.toFixed(2)}` : `R$${vHRef.toFixed(2)}/h`,
      total_bruto:    `R$${totalBruto.toFixed(2)}`,
      deducoes:       `R$${deducoes.toFixed(2)}`,
      total_liquido:  `R$${totalLiq.toFixed(2)}`,
    })
  }
})()

console.table(resultados)

// ── 4. Verifica resultado no banco ─────────────────────────────────────────
console.log('\n=== Folhas no banco (resumo) ===')
const folhas = db.prepare(`
  SELECT p.nome, f.tipo_contrato, f.horas_normais,
    f.salario_fixo_ref, f.valor_hora_ref,
    f.total_bruto, f.deducoes, f.total_liquido, f.status
  FROM folha_pagamento f
  JOIN professores_db p ON p.id = f.professor_id
  WHERE f.mes = ?
  ORDER BY p.nome
`).all(MES)
console.table(folhas)

console.log('\n✓ Seed concluído. Abra Folha de Pagamento e selecione Março/2026.\n')
db.close()
