/**
 * FluxoCaixa.jsx — Módulo de Fluxo de Caixa (v5.8)
 *
 * Entradas e saídas manuais por categoria.
 * Gráfico mensal de barras empilhadas + tabela filtrada + modal de lançamento.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Pencil, Trash2,
  RefreshCw, Download, Search, X, ChevronDown, ChevronUp,
  ArrowUpCircle, ArrowDownCircle, BarChart2, Filter
} from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, BarElement,
  Tooltip, Legend
} from 'chart.js'
import { formatBRL, formatDate } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

// Resolve uma variável CSS do documento (necessário pois Chart.js não entende var(--x))
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// ── Categorias por tipo ───────────────────────────────────────────────────────
export const CATEGORIAS = {
  entrada: [
    'Mensalidade', 'Matrícula', 'Material didático',
    'Evento', 'Patrocínio', 'Doação', 'Outros',
  ],
  saida: [
    'Salário / Honorários', 'Aluguel', 'Água / Luz / Internet',
    'Material de escritório', 'Marketing', 'Manutenção',
    'Impostos / Taxas', 'Software / Assinaturas', 'Outros',
  ],
}

const COR_ENTRADA = '#63dcaa'
const COR_SAIDA   = '#f2617a'

function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

function hoje() { return new Date().toISOString().split('T')[0] }

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function gerarUltimosMeses(n = 7) {
  const NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const val   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`
    return { val, label }
  }).reverse()
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, label, value, sub, destaque }) {
  return (
    <div className="card" style={{
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
      border: destaque ? `1px solid ${destaque}40` : undefined,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11, background: iconBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={21} style={{ color: '#fff' }}/>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 22, fontWeight: 700, fontFamily: "'Syne',sans-serif",
          color: destaque || 'var(--text-1)', lineHeight: 1.1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Modal de lançamento ───────────────────────────────────────────────────────
function ModalLancamento({ item, onSalvar, onClose }) {
  const editando = !!item?.id
  const [form, setForm] = useState({
    tipo:       item?.tipo       || 'entrada',
    categoria:  item?.categoria  || CATEGORIAS.entrada[0],
    descricao:  item?.descricao  || '',
    valor:      item?.valor      || '',
    data:       item?.data       || hoje(),
    obs:        item?.obs        || '',
  })
  const [erro, setErro] = useState('')

  function f(k, v) {
    setForm(x => {
      const next = { ...x, [k]: v }
      // reset categoria ao trocar tipo
      if (k === 'tipo') next.categoria = CATEGORIAS[v][0]
      return next
    })
    setErro('')
  }

  function handleSalvar() {
    if (!form.descricao.trim()) { setErro('Descrição é obrigatória'); return }
    if (!form.valor || Number(form.valor) <= 0) { setErro('Valor deve ser maior que zero'); return }
    if (!form.data) { setErro('Data é obrigatória'); return }
    onSalvar({ ...form, valor: Number(form.valor) })
  }

  const isEntrada = form.tipo === 'entrada'
  const corTipo   = isEntrada ? COR_ENTRADA : COR_SAIDA

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', borderRadius: 14, width: 460, maxWidth: '95vw',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
          animation: 'fadeUp .18s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEntrada
              ? <ArrowUpCircle size={18} style={{ color: COR_ENTRADA }}/>
              : <ArrowDownCircle size={18} style={{ color: COR_SAIDA }}/>
            }
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
              {editando ? 'Editar Lançamento' : 'Novo Lançamento'}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14}/></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>

          {/* Tipo — toggle visual */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['entrada', 'saida'].map(t => (
              <button
                key={t}
                onClick={() => f('tipo', t)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: '2px solid',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                  borderColor: form.tipo === t ? (t === 'entrada' ? COR_ENTRADA : COR_SAIDA) : 'var(--border)',
                  background:  form.tipo === t
                    ? (t === 'entrada' ? 'rgba(99,220,170,.12)' : 'rgba(242,97,122,.12)')
                    : 'var(--bg-input)',
                  color: form.tipo === t ? (t === 'entrada' ? COR_ENTRADA : COR_SAIDA) : 'var(--text-3)',
                }}
              >
                {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
              </button>
            ))}
          </div>

          {erro && (
            <div className="alert alert-danger" style={{ marginBottom: 14, fontSize: 13 }}>
              {erro}
            </div>
          )}

          <div className="form-grid">
            <div className="field form-full">
              <label>Descrição *</label>
              <input className="input" placeholder="Ex: Mensalidade Janeiro — Ana Lima"
                value={form.descricao} onChange={e => f('descricao', e.target.value)}/>
            </div>

            <div className="field">
              <label>Categoria</label>
              <select className="select" value={form.categoria} onChange={e => f('categoria', e.target.value)}>
                {CATEGORIAS[form.tipo].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Valor (R$) *</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0,00"
                value={form.valor} onChange={e => f('valor', e.target.value)}/>
            </div>

            <div className="field form-full">
              <label>Data *</label>
              <input className="input" type="date" value={form.data} onChange={e => f('data', e.target.value)}/>
            </div>

            <div className="field form-full">
              <label>Observação</label>
              <textarea className="textarea" placeholder="Informações adicionais (opcional)..."
                value={form.obs} onChange={e => f('obs', e.target.value)}
                style={{ minHeight: 60, fontSize: 13 }}/>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSalvar}
            style={{ background: corTipo, borderColor: corTipo }}
          >
            {editando ? 'Salvar alterações' : `Lançar ${form.tipo === 'entrada' ? 'entrada' : 'saída'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function FluxoCaixa() {
  const api = window.electronAPI

  const MESES_OPCOES = useMemo(() => gerarUltimosMeses(13), [])

  const [lancamentos,  setLancamentos]  = useState([])
  const [resumoMensal, setResumoMensal] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modalItem,    setModalItem]    = useState(null)   // null = fechado | {} = novo | {id,...} = editar
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [toastMsg,     setToastMsg]     = useState('')

  // Filtros
  const [mesSel,      setMesSel]      = useState(mesAtual())
  const [tipoFiltro,  setTipoFiltro]  = useState('')       // '' | 'entrada' | 'saida'
  const [catFiltro,   setCatFiltro]   = useState('')
  const [busca,       setBusca]       = useState('')
  const [graficoMeses, setGraficoMeses] = useState(6)

  function showToast(msg, tipo = 'success') {
    setToastMsg({ msg, tipo })
    setTimeout(() => setToastMsg(''), 2800)
  }

  // ── Carregamento ────────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!api?.fcListar) return
    setLoading(true)
    try {
      const [lista, mensal] = await Promise.all([
        api.fcListar({ mes: mesSel }),
        api.fcResumoMensal({ meses: graficoMeses }),
      ])
      setLancamentos(Array.isArray(lista)  ? lista  : [])
      setResumoMensal(Array.isArray(mensal) ? mensal : [])
    } finally {
      setLoading(false)
    }
  }, [mesSel, graficoMeses]) // eslint-disable-line

  useEffect(() => { carregar() }, [carregar])

  // ── KPIs do mês selecionado ─────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
    const saidas   = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
    const saldo    = entradas - saidas
    const qtd      = lancamentos.length
    return { entradas, saidas, saldo, qtd }
  }, [lancamentos])

  // ── Filtro da tabela ────────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (tipoFiltro && l.tipo !== tipoFiltro) return false
      if (catFiltro  && l.categoria !== catFiltro) return false
      if (busca.trim()) {
        const q = busca.toLowerCase()
        if (!l.descricao.toLowerCase().includes(q) &&
            !l.categoria.toLowerCase().includes(q) &&
            !(l.obs || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [lancamentos, tipoFiltro, catFiltro, busca])

  // ── Gráfico ─────────────────────────────────────────────────────────────────

  // Detecta mudança de tema observando o atributo data-theme no <html>
  const [temaKey, setTemaKey] = useState(0)
  useEffect(() => {
    const obs = new MutationObserver(() => setTemaKey(k => k + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const chartData = useMemo(() => {
    const mesesGrafico = gerarUltimosMeses(graficoMeses)
    const mapaResumo   = {}
    resumoMensal.forEach(r => { mapaResumo[r.mes] = r })

    return {
      labels: mesesGrafico.map(m => m.label),
      datasets: [
        {
          label: 'Entradas',
          data: mesesGrafico.map(m => mapaResumo[m.val]?.entradas || 0),
          backgroundColor: `${COR_ENTRADA}cc`,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Saídas',
          data: mesesGrafico.map(m => mapaResumo[m.val]?.saidas || 0),
          backgroundColor: `${COR_SAIDA}cc`,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    }
  }, [resumoMensal, graficoMeses])

  const chartOptions = useMemo(() => {
    const text2  = getCSSVar('--text-2')  || '#b0bcd4'
    const text3  = getCSSVar('--text-3')  || '#6e7d9a'
    const border = getCSSVar('--border')  || 'rgba(255,255,255,0.07)'
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: text2, font: { size: 12 }, padding: 16 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatBRL(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: text3, font: { size: 11 } }, grid: { display: false } },
        y: {
          ticks: { color: text3, font: { size: 11 }, callback: v => formatBRL(v) },
          grid: { color: border },
        },
      },
    }
  }, [temaKey]) // eslint-disable-line

  // ── CRUD handlers ───────────────────────────────────────────────────────────
  async function handleSalvar(dados) {
    const req = getReq()
    let res
    if (modalItem?.id) {
      res = await api.fcEditar(modalItem.id, dados, req)
    } else {
      res = await api.fcCriar(dados, req)
    }
    if (res?.ok) {
      setModalItem(null)
      showToast(modalItem?.id ? 'Lançamento atualizado!' : 'Lançamento registrado!')
      carregar()
    } else {
      showToast(res?.erro || 'Erro ao salvar', 'error')
    }
  }

  async function handleDeletar() {
    const res = await api.fcDeletar(confirmDel.id, getReq())
    setConfirmDel(null)
    if (res?.ok) { showToast('Lançamento excluído!'); carregar() }
    else showToast(res?.erro || 'Erro ao excluir', 'error')
  }

  // ── Exportar CSV ────────────────────────────────────────────────────────────
  function exportarCSV() {
    const q   = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const sep = ','
    const linhas = [
      ['Tipo','Categoria','Descrição','Valor (R$)','Data','Mês','Observação'].map(q).join(sep)
    ]
    filtrados.forEach(l => {
      linhas.push([
        l.tipo, l.categoria, l.descricao,
        l.valor.toFixed(2).replace('.', ','),
        l.data, l.mes, l.obs || '',
      ].map(q).join(sep))
    })
    const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `fluxo_caixa_${mesSel}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado!')
  }

  // ── Sem Electron ────────────────────────────────────────────────────────────
  if (!api?.fcListar) {
    return (
      <div className="fade-up">
        <div className="empty" style={{ paddingTop: 60 }}>
          <TrendingUp size={48} style={{ opacity: .3 }}/>
          <p>Módulo disponível apenas no app Electron.</p>
        </div>
      </div>
    )
  }

  const mesLabel = MESES_OPCOES.find(m => m.val === mesSel)?.label || mesSel

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Título + ação principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <TrendingUp size={22} style={{ color: 'var(--accent)' }}/>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              Fluxo de Caixa
            </h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Entradas e saídas financeiras · {mesLabel}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalItem({})}>
          <Plus size={14}/> Novo lançamento
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          icon={ArrowUpCircle} iconBg={COR_ENTRADA}
          label="Entradas" value={formatBRL(kpis.entradas)}
          sub={`${lancamentos.filter(l=>l.tipo==='entrada').length} lançamentos`}
          destaque={COR_ENTRADA}
        />
        <KpiCard
          icon={ArrowDownCircle} iconBg={COR_SAIDA}
          label="Saídas" value={formatBRL(kpis.saidas)}
          sub={`${lancamentos.filter(l=>l.tipo==='saida').length} lançamentos`}
          destaque={COR_SAIDA}
        />
        <KpiCard
          icon={DollarSign}
          iconBg={kpis.saldo >= 0 ? COR_ENTRADA : COR_SAIDA}
          label="Saldo do mês" value={formatBRL(kpis.saldo)}
          sub={kpis.saldo >= 0 ? 'Positivo ✓' : 'Negativo ⚠'}
          destaque={kpis.saldo >= 0 ? COR_ENTRADA : COR_SAIDA}
        />
        <KpiCard
          icon={BarChart2} iconBg='var(--blue)'
          label="Lançamentos" value={kpis.qtd}
          sub={mesLabel}
        />
      </div>

      {/* Gráfico */}
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
            Evolução mensal
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 6, 12].map(n => (
              <button
                key={n}
                className={`btn btn-xs ${graficoMeses === n ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setGraficoMeses(n)}
              >
                {n}m
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 220 }}>
          <Bar data={chartData} options={chartOptions}/>
        </div>
      </div>

      {/* Filtros da tabela */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Mês */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Mês</label>
            <select className="select" style={{ width: 130 }}
              value={mesSel} onChange={e => { setMesSel(e.target.value); setTipoFiltro(''); setCatFiltro('') }}>
              {MESES_OPCOES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Tipo</label>
            <select className="select" style={{ width: 130 }}
              value={tipoFiltro} onChange={e => { setTipoFiltro(e.target.value); setCatFiltro('') }}>
              <option value="">Todos</option>
              <option value="entrada">↑ Entrada</option>
              <option value="saida">↓ Saída</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Categoria</label>
            <select className="select" style={{ width: 180 }}
              value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
              <option value="">Todas</option>
              {(tipoFiltro
                ? CATEGORIAS[tipoFiltro]
                : [...CATEGORIAS.entrada, ...CATEGORIAS.saida]
              ).filter((v, i, a) => a.indexOf(v) === i).map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Busca */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}/>
              <input className="input" style={{ paddingLeft: 30 }} placeholder="Descrição, categoria..."
                value={busca} onChange={e => setBusca(e.target.value)}/>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={carregar} title="Atualizar">
              <RefreshCw size={13}/>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportarCSV} title="Exportar CSV">
              <Download size={13}/> <span style={{ fontSize: 12, marginLeft: 3 }}>CSV</span>
            </button>
          </div>

          {/* Limpar filtros */}
          {(tipoFiltro || catFiltro || busca) && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }}
              onClick={() => { setTipoFiltro(''); setCatFiltro(''); setBusca('') }}>
              <X size={11}/> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          <RefreshCw size={26} style={{ opacity: .4, animation: 'spin 1s linear infinite' }}/>
          <p style={{ marginTop: 10, fontSize: 13 }}>Carregando lançamentos…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <DollarSign size={40} style={{ opacity: .2, marginBottom: 12 }}/>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
            {lancamentos.length === 0
              ? 'Nenhum lançamento neste mês.'
              : 'Nenhum resultado para os filtros aplicados.'
            }
          </p>
          {lancamentos.length === 0 && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }}
              onClick={() => setModalItem({})}>
              <Plus size={13}/> Novo lançamento
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left',   fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>TIPO</th>
                <th style={{ padding: '10px 16px', textAlign: 'left',   fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>DESCRIÇÃO</th>
                <th style={{ padding: '10px 16px', textAlign: 'left',   fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>CATEGORIA</th>
                <th style={{ padding: '10px 16px', textAlign: 'right',  fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>VALOR</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>DATA</th>
                <th style={{ padding: '10px 16px', width: 90 }}/>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l, idx) => (
                <tr key={l.id} style={{
                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: l.tipo === 'entrada' ? 'rgba(99,220,170,.12)' : 'rgba(242,97,122,.12)',
                      color: l.tipo === 'entrada' ? COR_ENTRADA : COR_SAIDA,
                      border: `1px solid ${l.tipo === 'entrada' ? COR_ENTRADA : COR_SAIDA}40`,
                    }}>
                      {l.tipo === 'entrada' ? '↑' : '↓'} {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                      {l.descricao}
                    </div>
                    {l.obs && (
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2, fontStyle: 'italic' }}>
                        {l.obs}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className="badge bg-gray" style={{ fontSize: 11 }}>{l.categoria}</span>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                    <span style={{
                      fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
                      color: l.tipo === 'entrada' ? COR_ENTRADA : COR_SAIDA,
                    }}>
                      {l.tipo === 'entrada' ? '+' : '−'}{formatBRL(l.valor)}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                    {formatDate(l.data)}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-xs" title="Editar"
                        onClick={() => setModalItem(l)}>
                        <Pencil size={12}/>
                      </button>
                      <button className="btn btn-danger btn-xs" title="Excluir"
                        onClick={() => setConfirmDel(l)}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rodapé com totais dos filtrados */}
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-hover)',
            display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text-3)',
          }}>
            <span>
              <strong style={{ color: 'var(--text-1)' }}>{filtrados.length}</strong> lançamento{filtrados.length !== 1 ? 's' : ''}
            </span>
            <span>
              Entradas: <strong style={{ color: COR_ENTRADA }}>
                {formatBRL(filtrados.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0))}
              </strong>
            </span>
            <span>
              Saídas: <strong style={{ color: COR_SAIDA }}>
                {formatBRL(filtrados.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0))}
              </strong>
            </span>
            <span style={{ marginLeft: 'auto' }}>
              Saldo: <strong style={{
                color: (filtrados.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
                      - filtrados.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)) >= 0
                  ? COR_ENTRADA : COR_SAIDA,
              }}>
                {formatBRL(
                  filtrados.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+l.valor,0)
                - filtrados.filter(l=>l.tipo==='saida').reduce((s,l)=>s+l.valor,0)
                )}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Modal de lançamento */}
      {modalItem !== null && (
        <ModalLancamento
          item={modalItem}
          onSalvar={handleSalvar}
          onClose={() => setModalItem(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <ConfirmModal
          title="Excluir Lançamento"
          msg={`Excluir "${confirmDel.descricao}" (${formatBRL(confirmDel.valor)})? Esta ação não pode ser desfeita.`}
          onConfirm={handleDeletar}
          onClose={() => setConfirmDel(null)}
          danger
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className={`toast ${toastMsg.tipo === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toastMsg.msg}
        </div>
      )}
    </div>
  )
}
