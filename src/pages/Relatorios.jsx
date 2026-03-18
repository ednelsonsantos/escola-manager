import React, { useState, useRef, useEffect } from 'react'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip, Filler, Legend
} from 'chart.js'
import {
  FileText, Download, TrendingUp, TrendingDown, Users,
  DollarSign, BookOpen, BarChart2, ChevronDown, FileSpreadsheet, FileJson, FileDown
} from 'lucide-react'
import { useApp, formatBRL, mesLabel, mesAtualDinamico } from '../context/AppContext.jsx'
import { gerarHTMLRelatorioFinanceiro, gerarHTMLRelatorioAlunos, gerarPDF } from '../utils/pdfUtils.js'

Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Filler, Legend)

// ── Componente de menu de exportação ─────────────────────────────────────────
function ExportMenu({ itens }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClick(action) {
    action()
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ gap: 6 }}
      >
        <Download size={13}/>
        Exportar
        <ChevronDown size={12} style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 280, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: 'var(--shadow-lg)', zIndex: 100,
          overflow: 'hidden', animation: 'fadeUp .15s ease',
        }}>
          <div style={{ padding: '8px 12px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text-3)' }}>
            Exportar esta aba
          </div>
          {itens.map((item, i) => (
            <button
              key={i}
              onClick={() => handleClick(item.action)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '9px 12px', background: 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: item.label.includes('JSON') ? 'var(--pur-dim)' : 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.label.includes('JSON')
                  ? <FileJson size={13} style={{ color: 'var(--purple)' }}/>
                  : <FileSpreadsheet size={13} style={{ color: 'var(--accent)' }}/>
                }
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const MESES_7 = Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-(6-i)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
const CORES   = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316','#14b8a6']

export default function Relatorios() {
  const { alunos, turmas, professores, pagamentos, tema, exportJSON, exportCSV } = useApp()
  const [tab, setTab] = useState('financeiro')

  const isDark = tema === 'dark'
  const gc     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const tc     = isDark ? '#555d78' : '#9aa4b8'
  const tbg    = isDark ? '#161a22' : '#ffffff'
  const tbrd   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const ttit   = isDark ? '#edf0f9' : '#1a1e2c'
  const tbody  = isDark ? '#7f8ba4' : '#5a647d'

  const baseTooltip = { backgroundColor:tbg, borderColor:tbrd, borderWidth:1, titleColor:ttit, bodyColor:tbody, padding:12 }

  // ── FINANCEIRO ──
  const receitaMensal = MESES_7.map(m =>
    pagamentos.filter(p=>p.mes===m&&p.status==='Pago').reduce((s,p)=>s+p.valor,0)
  )
  const inadMensal = MESES_7.map(m =>
    pagamentos.filter(p=>p.mes===m&&p.status==='Atrasado').length
  )
  const totalRecebido = receitaMensal.reduce((s,v)=>s+v,0)
  const mediaRecebido = Math.round(totalRecebido / MESES_7.length)
  const melhorMes     = MESES_7[receitaMensal.indexOf(Math.max(...receitaMensal))]

  const receitaBarData = {
    labels: MESES_7.map(mesLabel),
    datasets:[
      {
        label:'Receita',
        data: receitaMensal,
        backgroundColor: receitaMensal.map((_,i)=> i===receitaMensal.length-1 ? 'rgba(99,220,170,0.85)':'rgba(99,220,170,0.3)'),
        borderRadius:6, borderSkipped:false,
      }
    ]
  }
  const receitaBarOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip, callbacks:{label:ctx=>` ${formatBRL(ctx.parsed.y)}`}} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11},callback:v=>`R$${(v/1000).toFixed(0)}k`}, border:{display:false} }
    }
  }

  const inadLineData = {
    labels: MESES_7.map(mesLabel),
    datasets:[{
      label:'Inadimplentes',
      data: inadMensal,
      borderColor:'#f2617a', backgroundColor:'rgba(242,97,122,0.08)',
      borderWidth:2, pointRadius:4, fill:true, tension:.4,
      pointBackgroundColor:'#f2617a',
    }]
  }
  const inadLineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11},stepSize:1}, border:{display:false}, min:0 }
    }
  }

  // Ticket médio por mês
  const ticketMedio = MESES_7.map(m => {
    const pg = pagamentos.filter(p=>p.mes===m&&p.status==='Pago')
    return pg.length ? Math.round(pg.reduce((s,p)=>s+p.valor,0)/pg.length) : 0
  })
  const ticketLineData = {
    labels: MESES_7.map(mesLabel),
    datasets:[{
      label:'Ticket médio',
      data: ticketMedio,
      borderColor:'#5b9cf6', backgroundColor:'rgba(91,156,246,0.08)',
      borderWidth:2, pointRadius:3, fill:true, tension:.4,
      pointBackgroundColor:'#5b9cf6',
    }]
  }

  // ── ALUNOS ──
  const ativosMes = MESES_7.map(m => {
    // todos que matricularam antes ou durante o mês e ainda ativos
    return alunos.filter(a => a.dataMatricula <= m+'-31').length
  })
  const alunosLineData = {
    labels: MESES_7.map(mesLabel),
    datasets:[{
      label:'Alunos',
      data: ativosMes,
      borderColor:'#63dcaa', backgroundColor:'rgba(99,220,170,0.08)',
      borderWidth:2, pointRadius:3, fill:true, tension:.4,
      pointBackgroundColor:'#63dcaa',
    }]
  }
  const alunosLineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11}}, border:{display:false}, min:0 }
    }
  }

  // Status alunos
  const statusCount = {
    Ativo:   alunos.filter(a=>a.status==='Ativo').length,
    Inativo: alunos.filter(a=>a.status==='Inativo').length,
    Trancado:alunos.filter(a=>a.status==='Trancado').length,
  }
  const statusDonut = {
    labels:['Ativo','Inativo','Trancado'],
    datasets:[{ data:[statusCount.Ativo,statusCount.Inativo,statusCount.Trancado], backgroundColor:['#63dcaa','#f2617a','#f5c542'], borderWidth:0, hoverOffset:4 }]
  }
  const donutOpts = {
    responsive:true, maintainAspectRatio:false, cutout:'70%',
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} }
  }

  // Por idioma
  const idiomaMap = {}
  alunos.filter(a=>a.status==='Ativo').forEach(a => {
    const t = turmas.find(t=>t.id===a.turmaId)
    if (t) idiomaMap[t.idioma] = (idiomaMap[t.idioma]||0)+1
  })
  const idiomaLabels = Object.keys(idiomaMap)
  const idiomaDonut = {
    labels: idiomaLabels,
    datasets:[{ data:idiomaLabels.map(i=>idiomaMap[i]), backgroundColor:CORES.slice(0,idiomaLabels.length), borderWidth:0, hoverOffset:4 }]
  }

  // ── CURSOS ──
  const cursosStats = turmas.filter(t=>t.ativa).map(t => {
    const matriculados = alunos.filter(a=>a.turmaId===t.id&&a.status==='Ativo').length
    const receita      = matriculados * (alunos.find(a=>a.turmaId===t.id)?.mensalidade||0)
    const ocup         = Math.round(matriculados/t.vagas*100)
    return { ...t, matriculados, receita, ocup }
  }).sort((a,b)=>b.matriculados-a.matriculados)

  const cursoBarData = {
    labels: cursosStats.map(c=>c.codigo),
    datasets:[{
      label:'Alunos',
      data: cursosStats.map(c=>c.matriculados),
      backgroundColor: CORES.slice(0,cursosStats.length),
      borderRadius:6, borderSkipped:false,
    }]
  }
  const cursoBarOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11},stepSize:1}, border:{display:false}, min:0 }
    }
  }

  const profStats = professores.filter(p=>p.ativo).map(p => {
    const tProf = turmas.filter(t=>t.professorId===p.id&&t.ativa)
    const aProf = tProf.reduce((s,t)=>s+alunos.filter(a=>a.turmaId===t.id&&a.status==='Ativo').length,0)
    return { ...p, turmasCount:tProf.length, alunosCount:aProf }
  }).sort((a,b)=>b.alunosCount-a.alunosCount)

  // Configuração dos exports por aba
  async function handlePDFFinanceiro() {
    const mesS   = mesAtualDinamico()
    const mesL   = mesLabel(mesS)
    const html   = gerarHTMLRelatorioFinanceiro({ mes:mesS, mesLabel:mesL, pagamentos, alunos, turmas, settings:{}  })
    const res    = await gerarPDF({ html, nomeArquivo:`relatorio-financeiro-${mesS}.pdf`, titulo:`Relatório Financeiro ${mesL}` })
    if (res?.ok && !res?.fallback) exportJSON && showToast?.('PDF salvo!')
  }
  async function handlePDFAlunos() {
    const html = gerarHTMLRelatorioAlunos({ alunos, turmas, pagamentos })
    await gerarPDF({ html, nomeArquivo:'relatorio-alunos.pdf', titulo:'Relatório de Alunos' })
  }

  const EXPORT_CONFIG = {
    financeiro: [
      { label: 'Relatório Financeiro (PDF)',   action: handlePDFFinanceiro,            desc: 'PDF com KPIs e tabela detalhada' },
      { label: 'Relatório Financeiro (CSV)',  action: () => exportCSV('financeiro'),  desc: 'Resumo mensal de receitas' },
      { label: 'Pagamentos detalhados (CSV)', action: () => exportCSV('pagamentos'),  desc: 'Todas as cobranças' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),   desc: 'Todos os dados do sistema' },
    ],
    alunos: [
      { label: 'Relatório de Alunos (PDF)',    action: handlePDFAlunos,                desc: 'PDF com lista e situação financeira' },
      { label: 'Lista de alunos (CSV)',        action: () => exportCSV('alunos'),      desc: 'Cadastro completo com situação financeira' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),   desc: 'Todos os dados do sistema' },
    ],
    cursos: [
      { label: 'Turmas (CSV)',                 action: () => exportCSV('turmas'),      desc: 'Turmas, ocupação e professores' },
      { label: 'Professores (CSV)',            action: () => exportCSV('professores'), desc: 'Lista de professores e turmas' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),   desc: 'Todos os dados do sistema' },
    ],
  }

  return (
    <div className="fade-up">
      {/* TABS + EXPORT */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div className="tabs" style={{margin:0}}>
          <button className={`tab${tab==='financeiro'?' active':''}`} onClick={()=>setTab('financeiro')}><DollarSign size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Financeiro</button>
          <button className={`tab${tab==='alunos'?' active':''}`} onClick={()=>setTab('alunos')}><Users size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Alunos</button>
          <button className={`tab${tab==='cursos'?' active':''}`} onClick={()=>setTab('cursos')}><BookOpen size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Cursos</button>
        </div>

        {/* Export dropdown */}
        <ExportMenu itens={EXPORT_CONFIG[tab]}/>
      </div>

      {/* ── FINANCEIRO ── */}
      {tab==='financeiro' && (
        <div>
          {/* KPIs */}
          <div className="stat-grid" style={{marginBottom:16}}>
            <div className="stat-card sc-green">
              <div className="stat-icon si-green"><TrendingUp/></div>
              <div className="stat-label">Total 7 meses</div>
              <div className="stat-value" style={{fontSize:20}}>{formatBRL(totalRecebido)}</div>
              <div className="stat-change ch-neutral">Receita acumulada</div>
            </div>
            <div className="stat-card sc-blue">
              <div className="stat-icon si-blue"><DollarSign/></div>
              <div className="stat-label">Média mensal</div>
              <div className="stat-value" style={{fontSize:20}}>{formatBRL(mediaRecebido)}</div>
              <div className="stat-change ch-neutral">Média dos últimos 7 meses</div>
            </div>
            <div className="stat-card sc-yellow">
              <div className="stat-icon si-yellow"><BarChart2/></div>
              <div className="stat-label">Melhor mês</div>
              <div className="stat-value" style={{fontSize:20}}>{mesLabel(melhorMes)}</div>
              <div className="stat-change ch-up">{formatBRL(Math.max(...receitaMensal))}</div>
            </div>
            <div className="stat-card sc-red">
              <div className="stat-icon si-red"><TrendingDown/></div>
              <div className="stat-label">Inadimplência média</div>
              <div className="stat-value" style={{fontSize:20}}>{(inadMensal.reduce((s,v)=>s+v,0)/MESES_7.length).toFixed(1)}</div>
              <div className="stat-change ch-neutral">alunos/mês em atraso</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Receita Mensal</div><div className="chart-sub">Últimos 7 meses</div></div></div>
              <div style={{height:200}}><Bar data={receitaBarData} options={receitaBarOpts}/></div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Inadimplência</div><div className="chart-sub">Alunos em atraso por mês</div></div></div>
              <div style={{height:200}}><Line data={inadLineData} options={inadLineOpts}/></div>
            </div>
          </div>

          <div className="chart-card" style={{marginBottom:14}}>
            <div className="chart-head"><div><div className="chart-title">Ticket Médio por Mês</div><div className="chart-sub">Valor médio pago por aluno</div></div></div>
            <div style={{height:160}}><Line data={ticketLineData} options={{...receitaBarOpts, plugins:{...receitaBarOpts.plugins,tooltip:{...baseTooltip,callbacks:{label:ctx=>` ${formatBRL(ctx.parsed.y)}`}}}}}/></div>
          </div>

          {/* Tabela resumo por mês */}
          <div className="tbl-wrap">
            <div className="tbl-top"><span className="tbl-title">Resumo por Mês</span></div>
            <table>
              <thead><tr>
                <th>Mês</th><th>Receita</th><th>Qtd Pagos</th><th>Qtd Atrasados</th><th>Ticket Médio</th><th>Taxa Receb.</th>
              </tr></thead>
              <tbody>
                {MESES_7.map((m,i)=>{
                  const pagos    = pagamentos.filter(p=>p.mes===m&&p.status==='Pago')
                  const atrasados= pagamentos.filter(p=>p.mes===m&&p.status==='Atrasado').length
                  const total    = pagamentos.filter(p=>p.mes===m).length
                  const taxa     = total ? Math.round(pagos.length/total*100) : 0
                  return (
                    <tr key={m}>
                      <td className="td-name">{mesLabel(m)}</td>
                      <td className="td-mono" style={{color:'var(--accent)'}}>{formatBRL(receitaMensal[i])}</td>
                      <td>{pagos.length}</td>
                      <td style={{color:atrasados>0?'var(--red)':'var(--text-2)'}}>{atrasados}</td>
                      <td>{formatBRL(ticketMedio[i])}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:5,background:'var(--bg-hover)',borderRadius:99,overflow:'hidden',minWidth:60}}>
                            <div style={{height:'100%',width:`${taxa}%`,background:taxa>80?'var(--accent)':taxa>50?'var(--yellow)':'var(--red)',borderRadius:99}}/>
                          </div>
                          <span style={{fontSize:12,color:'var(--text-2)',minWidth:32}}>{taxa}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ALUNOS ── */}
      {tab==='alunos' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Evolução de Matrículas</div><div className="chart-sub">Total de alunos por mês</div></div></div>
              <div style={{height:200}}><Line data={alunosLineData} options={alunosLineOpts}/></div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Status</div><div className="chart-sub">Distribuição atual</div></div></div>
              <div style={{height:120,display:'flex',justifyContent:'center'}}><Doughnut data={statusDonut} options={donutOpts}/></div>
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:5}}>
                {[['Ativo','#63dcaa'],['Inativo','#f2617a'],['Trancado','#f5c542']].map(([s,c])=>(
                  <div key={s} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-2)',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:2,background:c,display:'inline-block'}}/>{s}</div>
                    <strong style={{color:'var(--text-1)'}}>{statusCount[s]||0}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Por Idioma</div><div className="chart-sub">Alunos ativos</div></div></div>
              <div style={{height:120,display:'flex',justifyContent:'center'}}><Doughnut data={idiomaDonut} options={donutOpts}/></div>
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:5}}>
                {idiomaLabels.map((id,i)=>(
                  <div key={id} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-2)',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:2,background:CORES[i],display:'inline-block'}}/>{id}</div>
                    <strong style={{color:'var(--text-1)'}}>{idiomaMap[id]}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela de alunos com métricas */}
          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Lista de Alunos com Métricas</span>
              <button className="btn btn-secondary btn-sm" onClick={()=>exportCSV('alunos')}><Download size={13}/> CSV</button>
            </div>
            <table>
              <thead><tr><th>Aluno</th><th>Turma</th><th>Mensalidade</th><th>Total Pago</th><th>Meses Atraso</th><th>Status</th></tr></thead>
              <tbody>
                {alunos.map(a=>{
                  const t     = turmas.find(t=>t.id===a.turmaId)
                  const pgA   = pagamentos.filter(p=>p.alunoId===a.id)
                  const pago  = pgA.filter(p=>p.status==='Pago').reduce((s,p)=>s+p.valor,0)
                  const atras = pgA.filter(p=>p.status==='Atrasado').length
                  return (
                    <tr key={a.id}>
                      <td className="td-name">{a.nome}</td>
                      <td>{t?<span className="badge bg-blue">{t.codigo}</span>:'—'}</td>
                      <td className="td-mono">{formatBRL(a.mensalidade)}</td>
                      <td className="td-mono" style={{color:'var(--accent)'}}>{formatBRL(pago)}</td>
                      <td style={{color:atras>0?'var(--red)':'var(--text-2)'}}>{atras>0?`${atras} mês/meses`:'—'}</td>
                      <td>{a.status==='Ativo'?<span className="badge bg-green">Ativo</span>:<span className="badge bg-gray">{a.status}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CURSOS ── */}
      {tab==='cursos' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Alunos por Turma</div><div className="chart-sub">Matrículas ativas</div></div></div>
              <div style={{height:220}}><Bar data={cursoBarData} options={cursoBarOpts}/></div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Desempenho por Professor</div><div className="chart-sub">Turmas e alunos atribuídos</div></div></div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
                {profStats.map((p,i)=>(
                  <div key={p.id} className="prog-item" style={{marginBottom:0}}>
                    <div className="prog-head">
                      <div className="prog-name" style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:CORES[i%CORES.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>
                          {p.nome.split(' ').map(x=>x[0]).slice(0,2).join('')}
                        </div>
                        {p.nome}
                      </div>
                      <div className="prog-val">{p.alunosCount} alunos · {p.turmasCount} turmas</div>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{width:`${(p.alunosCount/Math.max(...profStats.map(x=>x.alunosCount),1))*100}%`,background:CORES[i%CORES.length]}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tbl-wrap">
            <div className="tbl-top"><span className="tbl-title">Resumo por Turma</span></div>
            <table>
              <thead><tr><th>Turma</th><th>Idioma</th><th>Nível</th><th>Professor</th><th>Horário</th><th>Alunos</th><th>Vagas</th><th>Ocupação</th><th>Receita/mês</th></tr></thead>
              <tbody>
                {cursosStats.map(c=>{
                  const prof = professores.find(p=>p.id===c.professorId)
                  const receitaT = alunos.filter(a=>a.turmaId===c.id&&a.status==='Ativo').reduce((s,a)=>s+a.mensalidade,0)
                  return (
                    <tr key={c.id}>
                      <td><span className="badge bg-blue">{c.codigo}</span></td>
                      <td className="td-name">{c.idioma}</td>
                      <td><span className="badge bg-gray">{c.nivel}</span></td>
                      <td>{prof?.nome||'—'}</td>
                      <td className="td-muted">{c.horario}</td>
                      <td><strong style={{color:'var(--text-1)'}}>{c.matriculados}</strong></td>
                      <td>{c.vagas}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:5,background:'var(--bg-hover)',borderRadius:99,overflow:'hidden',minWidth:50}}>
                            <div style={{height:'100%',width:`${c.ocup}%`,background:c.ocup>80?'var(--red)':c.ocup>50?'var(--yellow)':'var(--accent)',borderRadius:99}}/>
                          </div>
                          <span style={{fontSize:12,color:'var(--text-2)',minWidth:32}}>{c.ocup}%</span>
                        </div>
                      </td>
                      <td className="td-mono" style={{color:'var(--accent)'}}>{formatBRL(receitaT)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
