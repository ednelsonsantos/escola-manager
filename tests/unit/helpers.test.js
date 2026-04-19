/**
 * tests/unit/helpers.test.js
 * Testa funções puras do AppContext — sem dependência de DOM, Electron ou SQLite.
 */

// ── Funções extraídas do AppContext para teste standalone ──────────────────────

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function newId(list) {
  return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1
}

function mesRelativo(mesesAtras) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - mesesAtras)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function mesAtualDinamico() { return mesRelativo(0) }

function calcularIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc + 'T00:00:00')  // força horário local (evita off-by-one UTC)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function mesLabel(mes) {
  if (!mes) return ''
  const [y, m] = mes.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[parseInt(m, 10) - 1]}/${y.slice(2)}`
}

// ── calcularEncargos (lógica idêntica ao AppContext) ───────────────────────────

function calcularEncargos(valorOriginal, vencimento, dataReferencia = null, settings = {}) {
  const multa = settings.multaAtraso ?? 10
  const juros = settings.jurosAtraso ?? 2
  const ref  = dataReferencia
    ? new Date(dataReferencia + 'T00:00:00')
    : new Date()
  const venc = new Date(vencimento + 'T00:00:00')
  const dias = Math.max(0, Math.floor((ref - venc) / (1000 * 60 * 60 * 24)))
  if (dias <= 0) return { valorTotal: valorOriginal, valorMulta: 0, valorJuros: 0, dias: 0 }
  const valorMulta = Math.round(valorOriginal * (multa / 100) * 100) / 100
  const diasJuros  = Math.max(0, dias - 1)
  const valorJuros = Math.round(valorOriginal * (juros / 100) * (diasJuros / 30) * 100) / 100
  const valorTotal = Math.round((valorOriginal + valorMulta + valorJuros) * 100) / 100
  return { valorTotal, valorMulta, valorJuros, dias }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('formatBRL', () => {
  it('formata valor positivo em BRL', () => {
    expect(formatBRL(1500)).toMatch(/1\.500,00/)
  })
  it('formata zero', () => {
    expect(formatBRL(0)).toMatch(/0,00/)
  })
  it('formata null/undefined como zero', () => {
    expect(formatBRL(null)).toMatch(/0,00/)
    expect(formatBRL(undefined)).toMatch(/0,00/)
  })
  it('formata valor negativo', () => {
    expect(formatBRL(-250)).toMatch(/-/)
  })
  it('formata valor decimal com centavos', () => {
    expect(formatBRL(280.50)).toMatch(/280,50/)
  })
})

describe('formatDate', () => {
  it('converte ISO para DD/MM/YYYY', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024')
  })
  it('retorna — para null/undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
  it('não inverte dia e mês', () => {
    const result = formatDate('2024-01-20')
    expect(result).toBe('20/01/2024')
    expect(result).not.toBe('01/20/2024')
  })
})

describe('today', () => {
  it('retorna string no formato YYYY-MM-DD', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('retorna a data de hoje', () => {
    const d = new Date().toISOString().split('T')[0]
    expect(today()).toBe(d)
  })
})

describe('newId', () => {
  it('retorna 1 para lista vazia', () => {
    expect(newId([])).toBe(1)
  })
  it('retorna max + 1', () => {
    expect(newId([{ id: 1 }, { id: 5 }, { id: 3 }])).toBe(6)
  })
  it('funciona com id único', () => {
    expect(newId([{ id: 42 }])).toBe(43)
  })
  it('não gera IDs duplicados em sequência', () => {
    const list = [{ id: 1 }, { id: 2 }]
    const id1 = newId(list)
    list.push({ id: id1 })
    const id2 = newId(list)
    expect(id2).toBeGreaterThan(id1)
  })
})

describe('mesAtualDinamico / mesRelativo', () => {
  it('retorna formato YYYY-MM', () => {
    expect(mesAtualDinamico()).toMatch(/^\d{4}-\d{2}$/)
  })
  it('mês 0 é o mês atual', () => {
    const d = new Date()
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    expect(mesAtualDinamico()).toBe(esperado)
  })
  it('mês relativo -1 é o mês anterior', () => {
    const atual = mesAtualDinamico()
    const anterior = mesRelativo(1)
    expect(anterior < atual).toBe(true)
  })
  it('mês relativo tem exatamente 7 caracteres (YYYY-MM, sem dia)', () => {
    expect(mesRelativo(2)).toHaveLength(7)
    expect(mesRelativo(2)).toMatch(/^\d{4}-\d{2}$/)
  })
})

describe('mesLabel', () => {
  it('formata mês corretamente', () => {
    expect(mesLabel('2024-03')).toBe('Mar/24')
    expect(mesLabel('2025-12')).toBe('Dez/25')
    expect(mesLabel('2023-01')).toBe('Jan/23')
  })
  it('retorna string vazia para entrada vazia/null', () => {
    expect(mesLabel('')).toBe('')
    expect(mesLabel(null)).toBe('')
    expect(mesLabel(undefined)).toBe('')
  })
  it('índices de mês corretos (nenhum off-by-one)', () => {
    expect(mesLabel('2024-01')).toBe('Jan/24')
    expect(mesLabel('2024-06')).toBe('Jun/24')
    expect(mesLabel('2024-12')).toBe('Dez/24')
  })
})

describe('calcularIdade', () => {
  it('retorna null para dataNasc ausente', () => {
    expect(calcularIdade(null)).toBeNull()
    expect(calcularIdade(undefined)).toBeNull()
    expect(calcularIdade('')).toBeNull()
  })
  it('calcula idade corretamente', () => {
    const hoje = new Date()
    const anoNasc = hoje.getFullYear() - 25
    const dataNasc = `${anoNasc}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    expect(calcularIdade(dataNasc)).toBe(25)
  })
  it('subtrai 1 ano se aniversário ainda não chegou', () => {
    const hoje = new Date()
    const anoNasc = hoje.getFullYear() - 30
    // Usa 'T00:00:00' para evitar off-by-one UTC: new Date('YYYY-MM-DD') é UTC
    // e a função corrigida também usa 'T00:00:00' — ambos em horário local
    const amanha = new Date(hoje.getTime() + 86400000)
    const dataNasc = `${anoNasc}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`
    expect(calcularIdade(dataNasc)).toBe(29)
  })
})

describe('calcularEncargos', () => {
  const FIN_PADRAO = { multaAtraso: 10, jurosAtraso: 2 }

  it('sem atraso: retorna valor original sem encargos', () => {
    const r = calcularEncargos(300, '2025-12-31', '2025-12-31', FIN_PADRAO)
    expect(r.valorTotal).toBe(300)
    expect(r.valorMulta).toBe(0)
    expect(r.valorJuros).toBe(0)
    expect(r.dias).toBe(0)
  })

  it('vencimento futuro: não cobra encargos', () => {
    const r = calcularEncargos(300, '2099-01-01', '2025-01-01', FIN_PADRAO)
    expect(r.valorTotal).toBe(300)
    expect(r.valorMulta).toBe(0)
  })

  it('1 dia de atraso: aplica multa fixa, sem juros', () => {
    const r = calcularEncargos(300, '2025-01-01', '2025-01-02', FIN_PADRAO)
    expect(r.valorMulta).toBe(30)   // 10% de 300
    expect(r.valorJuros).toBe(0)    // juros só a partir do 2º dia
    expect(r.dias).toBe(1)
    expect(r.valorTotal).toBe(330)
  })

  it('2 dias de atraso: multa + 1 dia de juros', () => {
    const r = calcularEncargos(300, '2025-01-01', '2025-01-03', FIN_PADRAO)
    expect(r.valorMulta).toBe(30)
    expect(r.diasJuros).toBeUndefined() // campo não retornado
    // juros: 300 * (2/100) * (1/30) = 0.20
    expect(r.valorJuros).toBe(0.20)
    expect(r.dias).toBe(2)
    expect(r.valorTotal).toBe(330.20)
  })

  it('31 dias de atraso: multa + 30 dias de juros = 1 mês completo', () => {
    const r = calcularEncargos(300, '2025-01-01', '2025-02-01', FIN_PADRAO)
    expect(r.valorMulta).toBe(30)   // 10%
    // juros: 300 * (2/100) * (30/30) = 6.00
    expect(r.valorJuros).toBe(6)
    expect(r.valorTotal).toBe(336)
  })

  it('valor zero: encargos são zero', () => {
    const r = calcularEncargos(0, '2025-01-01', '2025-02-01', FIN_PADRAO)
    expect(r.valorMulta).toBe(0)
    expect(r.valorJuros).toBe(0)
    expect(r.valorTotal).toBe(0)
  })

  it('configurações customizadas: multaAtraso 5%, jurosAtraso 1%', () => {
    const fin = { multaAtraso: 5, jurosAtraso: 1 }
    const r = calcularEncargos(200, '2025-01-01', '2025-01-02', fin)
    expect(r.valorMulta).toBe(10)  // 5% de 200
    expect(r.valorJuros).toBe(0)
    expect(r.valorTotal).toBe(210)
  })

  it('usa defaults quando settings estiver vazio', () => {
    const r = calcularEncargos(100, '2025-01-01', '2025-01-02', {})
    expect(r.valorMulta).toBe(10)  // default 10%
  })

  it('arredondamento correto em centavos', () => {
    // 250 * 10% = 25.00 (exato)
    const r = calcularEncargos(250, '2025-01-01', '2025-01-02', FIN_PADRAO)
    expect(r.valorMulta).toBe(25)
    expect(Number.isInteger(r.valorMulta * 100)).toBe(true)
  })

  it('valor grande: sem overflow de ponto flutuante', () => {
    const r = calcularEncargos(99999.99, '2025-01-01', '2025-02-01', FIN_PADRAO)
    expect(isFinite(r.valorTotal)).toBe(true)
    expect(r.valorTotal).toBeGreaterThan(99999.99)
  })
})
