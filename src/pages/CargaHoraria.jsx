/**
 * CargaHoraria.jsx — Relatório de carga horária por professor (v5.8)
 *
 * Fonte de dados: tabela `aulas` (SQLite) com JOIN em turmas_db e professores_db
 * Conta aulas ministradas (professor_ausente = 0) e ausências (professor_ausente = 1)
 * Cada aula = 1 hora/aula (duração padrão configurável no futuro)
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock, Users, BookOpen, ChevronDown, ChevronRight,
  Calendar, Search, RefreshCw, Download, TrendingUp,
  AlertCircle, CheckCircle, BarChart2
} from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'

const HORAS_POR_AULA = 1 // 1 hora por aula (padrão)

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtHoras(n) {
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function fmtData(d) {
  if (!d) return '—'
  return formatDate(d)
}

// ── Barra de progresso compacta ───────────────────────────────────────────────
function BarraPresenca({ valor, total, cor = 'var(--accent)' }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{
        flex:1, height:6, borderRadius:99,
        background:'var(--bg-hover)', overflow:'hidden',
      }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: cor,
          borderRadius:99, transition:'width .4s',
        }}/>
      </div>
      <span style={{ fontSize:11, color:'var(--text-3)', minWidth:32, textAlign:'right' }}>
        {pct}%
      </span>
    </div>
  )
}

// ── Card de KPI ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <div className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{
        width:42, height:42, borderRadius:10, background: iconBg,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <Icon size={20} style={{ color:'#fff' }}/>
      </div>
      <div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Syne',sans-serif", color:'var(--text-1)', lineHeight:1.1 }}>
          {value}
        </div>
        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text-4)', marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Linha de professor (expansível) ───────────────────────────────────────────
function ProfessorRow({ prof, expanded, onToggle }) {
  const pctPresenca = prof.total_aulas > 0
    ? Math.round((prof.aulas_ministradas / prof.total_aulas) * 100)
    : 0

  return (
    <>
      {/* Linha principal */}
      <tr
        onClick={onToggle}
        style={{
          cursor:'pointer',
          background: expanded ? 'var(--accent-dim)' : 'transparent',
          transition:'background .12s',
        }}
      >
        <td style={{ padding:'12px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:8, flexShrink:0,
              background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'#fff',
            }}>
              {prof.professor_nome.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text-1)' }}>
                {prof.professor_nome}
              </div>
              {prof.professor_idioma && (
                <div style={{ fontSize:11, color:'var(--text-3)' }}>{prof.professor_idioma}</div>
              )}
            </div>
          </div>
        </td>

        <td style={{ padding:'12px 16px', textAlign:'center' }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:'var(--accent)' }}>
            {fmtHoras(prof.aulas_ministradas * HORAS_POR_AULA)}
          </span>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>
            {prof.aulas_ministradas} aula{prof.aulas_ministradas !== 1 ? 's' : ''}
          </div>
        </td>

        <td style={{ padding:'12px 16px', textAlign:'center' }}>
          <span className={`badge ${prof.aulas_ausente > 0 ? 'bg-red' : 'bg-green'}`}>
            {prof.aulas_ausente}
          </span>
        </td>

        <td style={{ padding:'12px 16px', textAlign:'center' }}>
          <span style={{ fontSize:13, color:'var(--text-2)' }}>
            {prof.total_turmas}
          </span>
        </td>

        <td style={{ padding:'12px 24px' }}>
          <BarraPresenca valor={prof.aulas_ministradas} total={prof.total_aulas}/>
        </td>

        <td style={{ padding:'12px 16px', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text-3)' }}>
            {fmtData(prof.primeira_aula)}
          </div>
          <div style={{ fontSize:11, color:'var(--text-4)' }}>
            → {fmtData(prof.ultima_aula)}
          </div>
        </td>

        <td style={{ padding:'12px 16px', textAlign:'center' }}>
          {expanded
            ? <ChevronDown size={15} style={{ color:'var(--text-3)' }}/>
            : <ChevronRight size={15} style={{ color:'var(--text-3)' }}/>
          }
        </td>
      </tr>

      {/* Detalhe por turma */}
      {expanded && prof.turmas.map(t => (
        <tr key={t.turma_id} style={{ background:'var(--bg-sub, var(--bg-hover))' }}>
          <td style={{ padding:'8px 16px 8px 60px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <BookOpen size={13} style={{ color:'var(--text-4)', flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'var(--text-2)' }}>
                {t.turma_codigo}
              </span>
              {t.turma_nivel && (
                <span className="badge bg-gray" style={{ fontSize:10 }}>{t.turma_nivel}</span>
              )}
            </div>
          </td>
          <td style={{ padding:'8px 16px', textAlign:'center' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text-2)' }}>
              {fmtHoras(t.aulas_ministradas * HORAS_POR_AULA)}
            </span>
            <div style={{ fontSize:11, color:'var(--text-4)' }}>
              {t.aulas_ministradas}/{t.total_aulas} aulas
            </div>
          </td>
          <td style={{ padding:'8px 16px', textAlign:'center' }}>
            {t.aulas_ausente > 0
              ? <span className="badge bg-red" style={{ fontSize:11 }}>{t.aulas_ausente}</span>
              : <span style={{ color:'var(--text-4)', fontSize:12 }}>—</span>
            }
          </td>
          <td/>
          <td style={{ padding:'8px 24px' }}>
            <BarraPresenca valor={t.aulas_ministradas} total={t.total_aulas} cor='var(--blue)'/>
          </td>
          <td style={{ padding:'8px 16px', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'var(--text-4)' }}>
              {fmtData(t.primeira_aula)} → {fmtData(t.ultima_aula)}
            </div>
          </td>
          <td/>
        </tr>
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function CargaHoraria() {
  const { showToast } = useApp()

  const [dados,      setDados]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [expandidos, setExpandidos] = useState({})

  // Filtros
  const [busca,       setBusca]       = useState('')
  const [filtroDe,    setFiltroDe]    = useState('')
  const [filtroAte,   setFiltroAte]   = useState('')
  const [filtroProf,  setFiltroProf]  = useState('')

  // ── Carregamento ────────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true)
    try {
      const filtros = {}
      if (filtroDe)   filtros.de  = filtroDe
      if (filtroAte)  filtros.ate = filtroAte
      if (filtroProf) filtros.professorId = Number(filtroProf)

      const res = await window.electronAPI.professoresCargaHoraria(filtros)
      setDados(Array.isArray(res) ? res : [])
    } catch (e) {
      console.error('[CargaHoraria]', e)
      showToast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [filtroDe, filtroAte, filtroProf]) // eslint-disable-line

  // ── Filtragem por busca ─────────────────────────────────────────────────────
  const dadosFiltrados = useMemo(() => {
    if (!busca.trim()) return dados
    const q = busca.toLowerCase()
    return dados.filter(p =>
      p.professor_nome.toLowerCase().includes(q) ||
      p.professor_idioma?.toLowerCase().includes(q) ||
      p.turmas.some(t => t.turma_codigo.toLowerCase().includes(q))
    )
  }, [dados, busca])

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalAulas       = dados.reduce((s, p) => s + p.total_aulas,       0)
    const totalMinistradas = dados.reduce((s, p) => s + p.aulas_ministradas, 0)
    const totalAusencias   = dados.reduce((s, p) => s + p.aulas_ausente,     0)
    const totalProfessores = dados.length
    return { totalAulas, totalMinistradas, totalAusencias, totalProfessores }
  }, [dados])

  // ── Toggle expansão ─────────────────────────────────────────────────────────
  function toggleExpand(id) {
    setExpandidos(x => ({ ...x, [id]: !x[id] }))
  }

  function expandirTodos() {
    const novo = {}
    dadosFiltrados.forEach(p => { novo[p.professor_id] = true })
    setExpandidos(novo)
  }

  function recolherTodos() { setExpandidos({}) }

  // ── Exportação CSV ──────────────────────────────────────────────────────────
  function exportarCSV() {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const sep = ','
    const linhas = [
      ['Professor','Idioma','Turma','Nível','Aulas Ministradas','Horas','Ausências','Total Aulas','% Presença','Primeira Aula','Última Aula'].map(q).join(sep)
    ]
    for (const p of dadosFiltrados) {
      if (p.turmas.length === 0) {
        linhas.push([
          p.professor_nome, p.professor_idioma,'—','—',
          p.aulas_ministradas,
          (p.aulas_ministradas * HORAS_POR_AULA).toFixed(1).replace('.',','),
          p.aulas_ausente, p.total_aulas,
          p.total_aulas > 0 ? Math.round(p.aulas_ministradas/p.total_aulas*100) : 0,
          p.primeira_aula || '', p.ultima_aula || '',
        ].map(q).join(sep))
      } else {
        for (const t of p.turmas) {
          linhas.push([
            p.professor_nome, p.professor_idioma, t.turma_codigo, t.turma_nivel || '',
            t.aulas_ministradas,
            (t.aulas_ministradas * HORAS_POR_AULA).toFixed(1).replace('.',','),
            t.aulas_ausente, t.total_aulas,
            t.total_aulas > 0 ? Math.round(t.aulas_ministradas/t.total_aulas*100) : 0,
            t.primeira_aula || '', t.ultima_aula || '',
          ].map(q).join(sep))
        }
      }
    }
    const csv   = '\uFEFF' + linhas.join('\r\n')
    const blob  = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url   = URL.createObjectURL(blob)
    const link  = document.createElement('a')
    link.href   = url
    link.download = `carga_horaria_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado com sucesso', 'success')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ padding:'28px 32px', maxWidth:1100, margin:'0 auto' }}>

      {/* Título */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <Clock size={22} style={{ color:'var(--accent)' }}/>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:'var(--text-1)', margin:0 }}>
            Carga Horária por Professor
          </h2>
        </div>
        <p style={{ fontSize:13, color:'var(--text-3)', margin:0 }}>
          Baseado nas aulas registradas no módulo de Frequência · 1 aula = 1 hora/aula
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <KpiCard icon={Users}       iconBg='var(--accent)'  label='Professores ativos'    value={kpis.totalProfessores}/>
        <KpiCard icon={Clock}       iconBg='var(--blue)'    label='Horas ministradas'     value={fmtHoras(kpis.totalMinistradas * HORAS_POR_AULA)} sub={`${kpis.totalMinistradas} aulas`}/>
        <KpiCard icon={CheckCircle} iconBg='var(--green)'   label='Total de aulas'        value={kpis.totalAulas}/>
        <KpiCard icon={AlertCircle} iconBg='var(--red)'     label='Ausências registradas' value={kpis.totalAusencias}/>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>

          {/* Busca */}
          <div style={{ flex:1, minWidth:180 }}>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:4 }}>Buscar professor / turma</label>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)' }}/>
              <input
                className="input"
                style={{ paddingLeft:30 }}
                placeholder="Nome do professor ou código de turma…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>

          {/* De */}
          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:4 }}>De</label>
            <input
              className="input" type="date" style={{ width:150 }}
              value={filtroDe}
              onChange={e => setFiltroDe(e.target.value)}
            />
          </div>

          {/* Até */}
          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:4 }}>Até</label>
            <input
              className="input" type="date" style={{ width:150 }}
              value={filtroAte}
              onChange={e => setFiltroAte(e.target.value)}
            />
          </div>

          {/* Ações */}
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={carregar} title="Atualizar">
              <RefreshCw size={14}/>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportarCSV} title="Exportar CSV">
              <Download size={14}/>
              <span style={{ marginLeft:4, fontSize:12 }}>CSV</span>
            </button>
          </div>
        </div>

        {/* Controles de expansão */}
        <div style={{ display:'flex', gap:8, marginTop:10, borderTop:'1px solid var(--border)', paddingTop:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={expandirTodos} style={{ fontSize:11 }}>
            <ChevronDown size={12}/> Expandir todos
          </button>
          <button className="btn btn-ghost btn-sm" onClick={recolherTodos} style={{ fontSize:11 }}>
            <ChevronRight size={12}/> Recolher todos
          </button>
          {(filtroDe || filtroAte) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize:11, color:'var(--red)', marginLeft:'auto' }}
              onClick={() => { setFiltroDe(''); setFiltroAte('') }}
            >
              Limpar período
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
          <RefreshCw size={28} style={{ opacity:.4, animation:'spin 1s linear infinite' }}/>
          <p style={{ marginTop:10, fontSize:13 }}>Calculando carga horária…</p>
        </div>
      ) : dadosFiltrados.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <BarChart2 size={40} style={{ opacity:.2, marginBottom:12 }}/>
          <p style={{ fontSize:15, color:'var(--text-2)', margin:0 }}>
            {dados.length === 0
              ? 'Nenhuma aula registrada no período selecionado.'
              : 'Nenhum professor encontrado para os filtros aplicados.'
            }
          </p>
          {dados.length === 0 && (
            <p style={{ fontSize:12, color:'var(--text-4)', marginTop:6 }}>
              Registre aulas no módulo de Frequência para visualizar o relatório.
            </p>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                <th style={{ padding:'10px 16px', textAlign:'left',   fontSize:11, color:'var(--text-3)', fontWeight:600 }}>PROFESSOR</th>
                <th style={{ padding:'10px 16px', textAlign:'center', fontSize:11, color:'var(--text-3)', fontWeight:600 }}>HORAS</th>
                <th style={{ padding:'10px 16px', textAlign:'center', fontSize:11, color:'var(--text-3)', fontWeight:600 }}>AUSÊNCIAS</th>
                <th style={{ padding:'10px 16px', textAlign:'center', fontSize:11, color:'var(--text-3)', fontWeight:600 }}>TURMAS</th>
                <th style={{ padding:'10px 24px', textAlign:'left',   fontSize:11, color:'var(--text-3)', fontWeight:600 }}>PRESENÇA</th>
                <th style={{ padding:'10px 16px', textAlign:'center', fontSize:11, color:'var(--text-3)', fontWeight:600 }}>PERÍODO</th>
                <th style={{ width:36 }}/>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((prof, idx) => (
                <React.Fragment key={prof.professor_id}>
                  {idx > 0 && (
                    <tr><td colSpan={7} style={{ padding:0, borderTop:'1px solid var(--border)' }}/></tr>
                  )}
                  <ProfessorRow
                    prof={prof}
                    expanded={!!expandidos[prof.professor_id]}
                    onToggle={() => toggleExpand(prof.professor_id)}
                  />
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Rodapé — totais */}
          <div style={{
            padding:'12px 20px', borderTop:'1px solid var(--border)',
            background:'var(--bg-hover)',
            display:'flex', gap:24, alignItems:'center',
            fontSize:12, color:'var(--text-3)',
          }}>
            <span>
              <strong style={{ color:'var(--text-1)' }}>{dadosFiltrados.length}</strong> professor{dadosFiltrados.length !== 1 ? 'es' : ''}
            </span>
            <span>
              <strong style={{ color:'var(--accent)' }}>{fmtHoras(dadosFiltrados.reduce((s,p) => s + p.aulas_ministradas, 0) * HORAS_POR_AULA)}</strong> ministradas
            </span>
            <span>
              <strong style={{ color:'var(--red)' }}>{dadosFiltrados.reduce((s,p) => s + p.aulas_ausente, 0)}</strong> ausência{dadosFiltrados.reduce((s,p) => s + p.aulas_ausente, 0) !== 1 ? 's' : ''}
            </span>
            {(filtroDe || filtroAte) && (
              <span style={{ marginLeft:'auto', fontStyle:'italic', color:'var(--text-4)' }}>
                {filtroDe && `De ${formatDate(filtroDe)} `}
                {filtroAte && `até ${formatDate(filtroAte)}`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
