import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import {
  Search, Plus, CheckCircle, X, DollarSign, AlertTriangle,
  Clock, TrendingUp, Download, Pencil, Trash2, RotateCcw,
  FileText, ChevronDown, Info, MessageCircle, FileDown
} from 'lucide-react'
import { useApp, formatBRL, formatDate, today, newId, mesAtualDinamico } from '../context/AppContext.jsx'
import Modal, { ConfirmModal } from '../components/Modal.jsx'
import Recibo from '../components/Recibo.jsx'
import { gerarHTMLBoleto, gerarHTMLRelatorioFinanceiro, gerarPDF, enviarWhatsApp } from '../utils/pdfUtils.js'

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip)

// Gera dinamicamente os últimos 7 meses a partir do mês atual
function gerarMeses() {
  const NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return Array.from({length: 7}, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const val   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = `${NOMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`
    return { val, label }
  })
}
const MESES = gerarMeses()

const STATUS_CONFIG = {
  Pago:     { badge: 'bg-green',  label: 'Pago',     icon: CheckCircle },
  Pendente: { badge: 'bg-yellow', label: 'Pendente', icon: Clock       },
  Atrasado: { badge: 'bg-red',    label: 'Atrasado', icon: AlertTriangle},
}

// ── Modal de edição / troca de status ────────────────────────────────────────
function ModalEditarPagamento({ pagamento, alunos, turmas, meses, onSalvar, onClose }) {
  const aluno = alunos.find(a => a.id === pagamento.alunoId)
  const turma = turmas.find(t => t.id === aluno?.turmaId)

  const [form, setForm] = useState({
    status:    pagamento.status,
    valor:     pagamento.valor,
    vencimento:pagamento.vencimento,
    dataPgto:  pagamento.dataPgto || '',
    mes:       pagamento.mes,
    obs:       pagamento.obs || '',
  })
  const [erro, setErro] = useState('')

  function f(k, v) { setForm(x => ({ ...x, [k]: v })); setErro('') }

  function handleSalvar() {
    if (!form.valor || Number(form.valor) <= 0) { setErro('Valor inválido'); return }
    if (!form.vencimento) { setErro('Informe o vencimento'); return }
    if (form.status === 'Pago' && !form.dataPgto) {
      setErro('Informe a data do pagamento quando status for Pago'); return
    }
    onSalvar({
      ...form,
      valor:    Number(form.valor),
      dataPgto: form.status === 'Pago' ? (form.dataPgto || today()) : null,
    })
  }

  return (
    <Modal
      title="Editar Pagamento"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSalvar}>Salvar alterações</button>
        </>
      }
    >
      {/* Info aluno */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', background: 'var(--bg-hover)',
        borderRadius: 9, marginBottom: 18,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent)', color: 'var(--bg-app)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {aluno?.nome?.split(' ').slice(0,2).map(p=>p[0]).join('') || '?'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{aluno?.nome || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {turma ? `${turma.codigo} · ${turma.idioma}` : 'Sem turma'} · Lançamento #{pagamento.id}
          </div>
        </div>
      </div>

      {erro && (
        <div className="alert alert-danger" style={{ marginBottom: 14 }}>
          <AlertTriangle size={14}/>{erro}
        </div>
      )}

      <div className="form-grid">
        {/* Status — destaque visual */}
        <div className="field form-full">
          <label>Status do Pagamento</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
              <button
                key={s}
                onClick={() => f('status', s)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 9, border: '2px solid',
                  cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                  fontSize: 13, fontWeight: 600, transition: 'all .15s',
                  borderColor: form.status === s ? `var(--${s === 'Pago' ? 'accent' : s === 'Pendente' ? 'yellow' : 'red'})` : 'var(--border)',
                  background:  form.status === s ? `var(--${s === 'Pago' ? 'accent-dim' : s === 'Pendente' ? 'yel-dim' : 'red-dim'})` : 'var(--bg-input)',
                  color:       form.status === s ? `var(--${s === 'Pago' ? 'accent' : s === 'Pendente' ? 'yellow' : 'red'})` : 'var(--text-2)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="input-hint">
            Atenção: alterar de "Pago" para outro status não desfaz a baixa contábil automaticamente.
          </span>
        </div>

        <div className="field">
          <label>Valor (R$)</label>
          <input className="input" type="number" step="0.01" value={form.valor}
            onChange={e => f('valor', e.target.value)}/>
        </div>

        <div className="field">
          <label>Mês de referência</label>
          <select className="select" value={form.mes} onChange={e => f('mes', e.target.value)}>
            {meses.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Vencimento</label>
          <input className="input" type="date" value={form.vencimento}
            onChange={e => f('vencimento', e.target.value)}/>
        </div>

        <div className="field">
          <label>
            Data do pagamento
            {form.status !== 'Pago' && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (opcional)</span>}
          </label>
          <input className="input" type="date" value={form.dataPgto}
            onChange={e => f('dataPgto', e.target.value)}
            disabled={form.status !== 'Pago'}
            style={{ opacity: form.status !== 'Pago' ? 0.5 : 1 }}/>
        </div>

        <div className="field form-full">
          <label>Observação interna</label>
          <input className="input" placeholder="Ex: cheque devolvido, desconto negociado..."
            value={form.obs} onChange={e => f('obs', e.target.value)}/>
        </div>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Financeiro() {
  const nav = useNavigate()
  const {
    alunos, pagamentos, turmas, settings, tema,
    registrarPagamento, updatePagamento, deletePagamento,
    addPagamento, gerarMensalidades, marcarAtrasados,
    exportCSV, calcularEncargos,
  } = useApp()

  const [mesSel,       setMesSel]       = useState(() => mesAtualDinamico())
  const [filtro,       setFiltro]       = useState('Todos')
  const [search,       setSearch]       = useState('')
  const [modalGen,     setModalGen]     = useState(false)
  const [modalAdd,     setModalAdd]     = useState(false)
  const [modalEditar,  setModalEditar]  = useState(null)  // pagamento a editar
  const [confirmPagar, setConfirmPagar] = useState(null)  // {id, nome}
  const [confirmDel,   setConfirmDel]   = useState(null)  // {id, nome}
  const [reciboId,     setReciboId]     = useState(null)
  const [dataPgtoConf, setDataPgtoConf] = useState(today())
  const [formAdd, setFormAdd] = useState({
    alunoId: '', valor: '', vencimento: today(), mes: mesAtualDinamico(), status: 'Pago',
  })

  const pgMes = pagamentos.filter(p => p.mes === mesSel)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return pgMes.filter(p => {
      const a = alunos.find(a => a.id === p.alunoId)
      const matchQ = !q || a?.nome?.toLowerCase().includes(q) || p.obs?.toLowerCase().includes(q)
      const matchF = filtro === 'Todos' || p.status === filtro
      return matchQ && matchF
    }).sort((a, b) => {
      // Atrasados primeiro, depois Pendentes, depois Pagos
      const order = { Atrasado: 0, Pendente: 1, Pago: 2 }
      return (order[a.status] ?? 3) - (order[b.status] ?? 3)
    })
  }, [pgMes, filtro, search, alunos])

  const totalPago     = pgMes.filter(p => p.status === 'Pago').reduce((s, p) => s + p.valor, 0)
  const totalAtrasado = pgMes.filter(p => p.status === 'Atrasado').reduce((s, p) => s + p.valor, 0)
  const totalPendente = pgMes.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0)
  const txRecebimento = pgMes.length ? Math.round(pgMes.filter(p => p.status === 'Pago').length / pgMes.length * 100) : 0

  // Quantos serão marcados como atrasados
  const vencidosPendentes = pgMes.filter(p => p.status === 'Pendente' && p.vencimento < today()).length

  // Chart
  const isDark       = tema === 'dark'
  const chartLabels  = MESES.slice().reverse().map(m => m.label)
  const chartReceita = MESES.slice().reverse().map(m =>
    pagamentos.filter(p => p.mes === m.val && p.status === 'Pago').reduce((s, p) => s + p.valor, 0)
  )
  const barData = {
    labels: chartLabels,
    datasets: [{
      label: 'Receita',
      data: chartReceita,
      backgroundColor: chartLabels.map((_, i) =>
        i === chartLabels.length - 1
          ? 'rgba(99,220,170,0.9)'
          : isDark ? 'rgba(99,220,170,0.28)' : 'rgba(37,162,110,0.25)'
      ),
      borderRadius: 6, borderSkipped: false,
    }],
  }
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#13161f' : '#f8f9fc',
        borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)',
        borderWidth: 1, titleColor: isDark ? '#edf0f9' : '#111827',
        bodyColor: isDark ? '#b0bcd4' : '#374151', padding: 12,
        callbacks: { label: ctx => ` ${formatBRL(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: isDark ? '#b0bcd4' : '#374151', font: { size: 11 } }, border: { display: false } },
      y: { grid: { color: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: isDark ? '#b0bcd4' : '#374151', font: { size: 11 }, callback: v => `R$${(v / 1000).toFixed(0)}k` }, border: { display: false } },
    },
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleConfirmarPagamento() {
    registrarPagamento(confirmPagar.id, dataPgtoConf)
    setConfirmPagar(null)
    setDataPgtoConf(today())
  }

  function handleSalvarEdicao(dados) {
    updatePagamento(modalEditar.id, dados)
    setModalEditar(null)
  }

  function handleDeletar() {
    deletePagamento(confirmDel.id)
    setConfirmDel(null)
  }

  function handleAddPgto() {
    if (!formAdd.alunoId || !formAdd.valor) return
    addPagamento({
      ...formAdd,
      alunoId:  Number(formAdd.alunoId),
      valor:    Number(formAdd.valor),
      dataPgto: formAdd.status === 'Pago' ? today() : null,
    })
    setModalAdd(false)
    setFormAdd({ alunoId: '', valor: '', vencimento: today(), mes: mesSel, status: 'Pago' })
  }

  const diaVenc = settings?.financeiro?.diaVencimento || 10
  const mesLabel = MESES.find(m => m.val === mesSel)?.label || mesSel
  const nomeEscola = settings?.escola?.nome || 'Escola Manager'

  async function handleGerarPDFRelatorio() {
    const html = gerarHTMLRelatorioFinanceiro({ mes: mesSel, mesLabel, pagamentos, alunos, turmas, settings })
    const res  = await gerarPDF({ html, nomeArquivo: `relatorio-${mesSel}.pdf`, titulo: `Relatório Financeiro ${mesLabel}` })
    if (res?.ok && !res?.fallback) showToast('PDF salvo com sucesso!')
  }

  async function handleBoletoPDF(p) {
    const a   = alunos.find(al => al.id === p.alunoId)
    const t   = turmas.find(t  => t.id  === a?.turmaId)
    const html = gerarHTMLBoleto({ pagamento:p, aluno:a, turma:t, escola:nomeEscola, settings })
    const nome = `cobranca-${a?.nome?.replace(/\s+/g,'-')}-${p.mes}.pdf`
    const res  = await gerarPDF({ html, nomeArquivo: nome, titulo: `Cobrança ${a?.nome}` })
    if (res?.ok && !res?.fallback) showToast('Boleto PDF salvo!')
  }

  async function handleWhatsApp(p) {
    const a   = alunos.find(al => al.id === p.alunoId)
    const res = await enviarWhatsApp({ telefone: a?.telefone, aluno: a, pagamento: p, nomeEscola })
    if (!res?.ok) showToast(res?.erro || 'Telefone não cadastrado.', 'warning')
    else showToast('WhatsApp aberto!')
  }

  return (
    <div className="fade-up">
      {/* ── KPI CARDS ── */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card sc-green">
          <div className="stat-icon si-green"><CheckCircle/></div>
          <div className="stat-label">Recebido</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatBRL(totalPago)}</div>
          <div className="stat-change ch-neutral">
            {pgMes.filter(p => p.status === 'Pago').length} pgtos · {txRecebimento}% taxa
          </div>
        </div>
        <div className="stat-card sc-red">
          <div className="stat-icon si-red"><AlertTriangle/></div>
          <div className="stat-label">Em Atraso</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--red)' }}>{formatBRL(totalAtrasado)}</div>
          <div className="stat-change ch-down">
            {pgMes.filter(p => p.status === 'Atrasado').length} inadimplentes
          </div>
        </div>
        <div className="stat-card sc-yellow">
          <div className="stat-icon si-yellow"><Clock/></div>
          <div className="stat-label">Pendente</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--yellow)' }}>{formatBRL(totalPendente)}</div>
          <div className="stat-change ch-neutral">
            {pgMes.filter(p => p.status === 'Pendente').length} aguardando
          </div>
        </div>
        <div className="stat-card sc-blue">
          <div className="stat-icon si-blue"><TrendingUp/></div>
          <div className="stat-label">Potencial Total</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatBRL(totalPago + totalAtrasado + totalPendente)}</div>
          <div className="stat-change ch-neutral">{pgMes.length} cobranças · {mesLabel}</div>
        </div>
      </div>

      {/* ── CHART + AÇÕES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-head">
            <div><div className="chart-title">Receita por Mês</div><div className="chart-sub">Últimos 7 meses — pagamentos confirmados</div></div>
          </div>
          <div style={{ height: 200 }}><Bar data={barData} options={barOpts}/></div>
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
            Ações do Mês
          </div>

          <div className="field">
            <label>Mês de referência</label>
            <select className="select" value={mesSel} onChange={e => setMesSel(e.target.value)}>
              {MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
          </div>

          {/* Gerar mensalidades */}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setModalGen(true)}>
            <DollarSign size={14}/> Gerar Mensalidades
          </button>

          {/* Lançar avulso */}
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setModalAdd(true)}>
            <Plus size={14}/> Lançar Pagamento Avulso
          </button>

          {/* Marcar atrasados — mostra badge com quantidade */}
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', position: 'relative' }}
            onClick={() => marcarAtrasados(mesSel)}
          >
            <AlertTriangle size={14}/>
            Marcar Vencidos como Atrasados
            {vencidosPendentes > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--red)', color: '#fff',
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
              }}>{vencidosPendentes}</span>
            )}
          </button>

          {/* Ver inadimplentes — atalho para a página dedicada */}
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => nav('/financeiro/inadimplentes')}>
            <AlertTriangle size={14} style={{color:'var(--red)'}}/> Ver Inadimplentes
          </button>

          {/* Fluxo de caixa */}
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => nav('/financeiro/fluxo-caixa')}>
            <TrendingUp size={14} style={{color:'var(--accent)'}}/> Fluxo de Caixa
          </button>

          {/* Exportar */}
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleGerarPDFRelatorio}>
            <FileDown size={14}/> Relatório PDF
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => exportCSV('pagamentos')}>
            <Download size={14}/> Exportar CSV
          </button>

          {/* Resumo rápido */}
          <div style={{
            marginTop: 'auto', padding: '10px 12px',
            background: 'var(--bg-hover)', borderRadius: 8,
            fontSize: 12, color: 'var(--text-3)',
          }}>
            <strong style={{ color: 'var(--text-1)', display: 'block', marginBottom: 4 }}>
              Resumo — {mesLabel}
            </strong>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vencimento:</span><strong style={{ color: 'var(--text-2)' }}>dia {diaVenc}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Recebidos:</span>
              <strong style={{ color: 'var(--accent)' }}>
                {pgMes.filter(p => p.status === 'Pago').length}/{pgMes.length}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxa:</span><strong style={{ color: 'var(--text-2)' }}>{txRecebimento}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABELA DE COBRANÇAS ── */}
      <div className="tbl-wrap">
        <div className="tbl-top" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="tbl-title">Cobranças — {mesLabel}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ width: 220 }}>
              <Search/>
              <input placeholder="Buscar aluno..." value={search}
                onChange={e => setSearch(e.target.value)}/>
              {search && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                  onClick={() => setSearch('')}><X size={12}/></button>
              )}
            </div>
            {['Todos', 'Pago', 'Atrasado', 'Pendente'].map(f => (
              <button key={f}
                className={`btn btn-xs ${filtro === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltro(f)}>
                {f}
                {f !== 'Todos' && (
                  <span style={{ marginLeft: 4, opacity: .7 }}>
                    ({pgMes.filter(p => p.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0
          ? <div className="empty"><DollarSign size={40}/><p>Nenhum resultado para este filtro.</p></div>
          : (
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const a = alunos.find(al => al.id === p.alunoId)
                  const t = turmas.find(t => t.id === a?.turmaId)
                  const cfg = STATUS_CONFIG[p.status]
                  const atrasadoReal = p.status === 'Pendente' && p.vencimento < today()

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 450, color: 'var(--text-1)' }}>{a?.nome || '—'}</div>
                        {p.obs && (
                          <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 1 }}>
                            {p.obs}
                          </div>
                        )}
                      </td>
                      <td>{t ? <span className="badge bg-blue">{t.codigo}</span> : '—'}</td>
                      <td>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: p.status === 'Atrasado' ? 'var(--red)' : 'var(--text-1)' }}>
                          {formatBRL(p.valor)}
                        </span>
                        {/* Breakdown de encargos para pagamentos atrasados */}
                        {p.status === 'Atrasado' && p.valorOriginal && p.valorOriginal !== p.valor && (
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>
                            <span>Original: {formatBRL(p.valorOriginal)}</span>
                            {p.valorMulta > 0  && <span> · Multa: +{formatBRL(p.valorMulta)}</span>}
                            {p.valorJuros > 0  && <span> · Juros: +{formatBRL(p.valorJuros)}</span>}
                            {p.diasAtraso > 0  && <span style={{color:'var(--red)'}}> ({p.diasAtraso}d)</span>}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ color: atrasadoReal ? 'var(--red)' : 'var(--text-2)', fontWeight: atrasadoReal ? 600 : 400 }}>
                          {formatDate(p.vencimento)}
                        </span>
                        {atrasadoReal && (
                          <div style={{ fontSize: 10, color: 'var(--red)' }}>vencido</div>
                        )}
                      </td>
                      <td style={{ color: p.dataPgto ? 'var(--text-2)' : 'var(--text-3)' }}>
                        {formatDate(p.dataPgto)}
                      </td>
                      <td>
                        <span className={`badge ${cfg?.badge || 'bg-gray'}`}>
                          <span className="bdot"/>{p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {/* Receber — só para não pagos */}
                          {p.status !== 'Pago' && (
                            <button
                              className="btn btn-primary btn-xs"
                              title="Confirmar recebimento"
                              onClick={() => {
                                setDataPgtoConf(today())
                                setConfirmPagar({ id: p.id, nome: a?.nome || '—', valor: p.valor })
                              }}
                            >
                              <CheckCircle size={12}/> Receber
                            </button>
                          )}

                          {/* Recibo — só para pagos */}
                          {p.status === 'Pago' && (
                            <button
                              className="btn btn-secondary btn-xs"
                              title="Emitir recibo"
                              onClick={() => setReciboId(p.id)}
                            >
                              <FileText size={12}/>
                            </button>
                          )}

                          {/* Boleto PDF */}
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Gerar boleto/cobrança PDF"
                            onClick={() => handleBoletoPDF(p)}
                          >
                            <FileDown size={12}/>
                          </button>

                          {/* WhatsApp — só se tiver telefone */}
                          {p.status !== 'Pago' && (
                            <button
                              className="btn btn-ghost btn-xs"
                              title={a?.telefone ? 'Enviar cobrança via WhatsApp' : 'Aluno sem telefone cadastrado'}
                              style={{ color: a?.telefone ? '#25d366' : 'var(--text-3)' }}
                              onClick={() => handleWhatsApp(p)}
                            >
                              <MessageCircle size={12}/>
                            </button>
                          )}

                          {/* Editar — sempre disponível */}
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Editar / alterar status"
                            onClick={() => setModalEditar(p)}
                          >
                            <Pencil size={12}/>
                          </button>

                          {/* Excluir — sempre disponível */}
                          <button
                            className="btn btn-danger btn-xs"
                            title="Excluir lançamento"
                            onClick={() => setConfirmDel({ id: p.id, nome: a?.nome || '—' })}
                          >
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        }
      </div>

      {/* ══ MODAIS ══════════════════════════════════════════════════════════════ */}

      {/* Confirmar recebimento — com data customizável */}
      {confirmPagar && (
        <Modal
          title="Confirmar Recebimento"
          onClose={() => setConfirmPagar(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmPagar(null)}>Cancelar</button>
              <button className="btn btn-primary"   onClick={handleConfirmarPagamento}>
                <CheckCircle size={14}/> Confirmar
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 6 }}>
              Confirmar pagamento de <strong style={{ color: 'var(--text-1)' }}>{confirmPagar.nome}</strong>:
            </div>
            <div style={{
              padding: '12px 16px', background: 'var(--accent-dim)',
              borderRadius: 9, textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                {formatBRL(confirmPagar.valor)}
              </div>
            </div>
          </div>
          <div className="field">
            <label>Data do recebimento</label>
            <input className="input" type="date" value={dataPgtoConf}
              onChange={e => setDataPgtoConf(e.target.value)}/>
            <span className="input-hint">Padrão: hoje. Altere se o pagamento ocorreu em outra data.</span>
          </div>
        </Modal>
      )}

      {/* Editar / trocar status */}
      {modalEditar && (
        <ModalEditarPagamento
          pagamento={modalEditar}
          alunos={alunos}
          turmas={turmas}
          meses={MESES}
          onSalvar={handleSalvarEdicao}
          onClose={() => setModalEditar(null)}
        />
      )}

      {/* Excluir lançamento */}
      {confirmDel && (
        <ConfirmModal
          title="Excluir Lançamento"
          msg={`Excluir o lançamento de "${confirmDel.nome}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDeletar}
          onClose={() => setConfirmDel(null)}
          danger
        />
      )}

      {/* Gerar mensalidades */}
      {modalGen && (
        <Modal
          title="Gerar Mensalidades"
          onClose={() => setModalGen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalGen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { gerarMensalidades(mesSel); setModalGen(false) }}>
                <DollarSign size={14}/> Gerar
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 16 }}>
            Serão geradas mensalidades para todos os alunos ativos em{' '}
            <strong style={{ color: 'var(--text-1)' }}>{mesLabel}</strong>.
          </p>
          <div style={{ background: 'var(--bg-hover)', padding: 14, borderRadius: 9, fontSize: 13, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>Alunos ativos: <strong style={{ color: 'var(--text-1)' }}>{alunos.filter(a => a.status === 'Ativo').length}</strong></div>
            <div>Dia de vencimento: <strong style={{ color: 'var(--text-1)' }}>dia {diaVenc}</strong></div>
            <div>Mensalidades já existentes <strong>serão ignoradas</strong> (sem duplicatas).</div>
          </div>
          {pgMes.length > 0 && (
            <div className="alert alert-warning" style={{ marginTop: 14 }}>
              <Info size={14}/>
              Já existem {pgMes.length} cobranças em {mesLabel}. Só serão criadas as que faltam.
            </div>
          )}
        </Modal>
      )}

      {/* Lançar pagamento avulso */}
      {modalAdd && createPortal(
        <Modal
          title="Lançar Pagamento Avulso"
          onClose={() => setModalAdd(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModalAdd(false)}>Cancelar</button>
              <button className="btn btn-primary"   onClick={handleAddPgto}>Lançar</button>
            </>
          }
        >
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <Info size={14}/>
            Use para lançar cobranças extras: matrícula, material, reposição de aula, etc.
          </div>
          <div className="form-grid">
            <div className="field form-full">
              <label>Aluno *</label>
              <select className="select" value={formAdd.alunoId}
                onChange={e => setFormAdd(f => ({ ...f, alunoId: e.target.value }))}>
                <option value="">Selecionar aluno</option>
                {alunos.filter(a => a.status === 'Ativo').map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Valor (R$) *</label>
              <input className="input" type="number" step="0.01" placeholder="0,00"
                value={formAdd.valor}
                onChange={e => setFormAdd(f => ({ ...f, valor: e.target.value }))}/>
            </div>
            <div className="field">
              <label>Status inicial</label>
              <select className="select" value={formAdd.status}
                onChange={e => setFormAdd(f => ({ ...f, status: e.target.value }))}>
                <option value="Pago">Pago (já recebido)</option>
                <option value="Pendente">Pendente (aguardando)</option>
                <option value="Atrasado">Atrasado</option>
              </select>
            </div>
            <div className="field">
              <label>Vencimento</label>
              <input className="input" type="date" value={formAdd.vencimento}
                onChange={e => setFormAdd(f => ({ ...f, vencimento: e.target.value }))}/>
            </div>
            <div className="field form-full">
              <label>Mês de referência</label>
              <select className="select" value={formAdd.mes}
                onChange={e => setFormAdd(f => ({ ...f, mes: e.target.value }))}>
                {MESES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </Modal>,
        document.body
      )}

      {/* Recibo */}
      {reciboId && (() => {
        const p = pagamentos.find(pg => pg.id === reciboId)
        const a = alunos.find(al => al.id === p?.alunoId)
        const t = turmas.find(t  => t.id  === a?.turmaId)
        return (
          <Recibo
            pagamento={p} aluno={a} turma={t}
            escola={settings?.escola?.nome}
            onClose={() => setReciboId(null)}
          />
        )
      })()}
    </div>
  )
}
