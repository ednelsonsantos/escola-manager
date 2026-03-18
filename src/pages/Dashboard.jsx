import React, { useMemo } from 'react'
import {
  Chart, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Filler
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { Users, DollarSign, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, BookOpen, Clock, Plus, FileText, Calendar } from 'lucide-react'
import { useApp, formatBRL, formatDate, mesAtualDinamico } from '../context/AppContext.jsx'
import { useNavigate } from 'react-router-dom'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler)

export default function Dashboard() {
  const { alunos, turmas, professores, pagamentos, settings, tema } = useApp()

  const mesAtual = mesAtualDinamico()
  const mesAnterior = '2024-12'

  const ativos = alunos.filter(a => a.status === 'Ativo')
  const inadimplentes = pagamentos.filter(p => p.mes === mesAtual && p.status === 'Atrasado')
  const pgMesAtual = pagamentos.filter(p => p.mes === mesAtual)
  const pgPago = pgMesAtual.filter(p => p.status === 'Pago')
  const receitaMes = pgPago.reduce((s,p) => s+p.valor, 0)
  const receitaAnterior = pagamentos.filter(p => p.mes === mesAnterior && p.status === 'Pago').reduce((s,p)=>s+p.valor,0)
  const varReceita = receitaAnterior ? ((receitaMes - receitaAnterior) / receitaAnterior * 100).toFixed(1) : 0

  // Faturamento últimos 7 meses
  const meses = Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-(6-i)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
  const labels = ['Jul','Ago','Set','Out','Nov','Dez','Jan']
  const receitaPorMes = meses.map(m => pagamentos.filter(p => p.mes === m && p.status === 'Pago').reduce((s,p)=>s+p.valor,0))

  // Alunos por idioma via turmas
  const idiomaCount = {}
  ativos.forEach(a => {
    const t = turmas.find(t => t.id === a.turmaId)
    if (t) idiomaCount[t.idioma] = (idiomaCount[t.idioma] || 0) + 1
  })
  const idiomas = Object.keys(idiomaCount)
  const cores = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa']
  const maxIdioma = Math.max(...Object.values(idiomaCount), 1)

  const isDark = tema === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const tickColor = isDark ? '#555d78' : '#9aa4b8'
  const tooltipBg = isDark ? '#161a22' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const tooltipTitle = isDark ? '#edf0f9' : '#1a1e2c'
  const tooltipBody = isDark ? '#7f8ba4' : '#5a647d'

  const lineData = {
    labels,
    datasets: [
      {
        label:'Receita',
        data: receitaPorMes,
        borderColor: 'var(--accent)',
        backgroundColor: isDark ? 'rgba(99,220,170,0.08)' : 'rgba(37,162,110,0.08)',
        borderWidth:2, pointRadius:3, fill:true, tension:.4,
        pointBackgroundColor:'var(--accent)',
      }
    ]
  }

  const lineOpts = {
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:tooltipBg, borderColor:tooltipBorder, borderWidth:1,
        titleColor:tooltipTitle, bodyColor:tooltipBody, padding:12,
        callbacks:{ label: ctx => ` ${formatBRL(ctx.parsed.y)}` }
      }
    },
    scales:{
      x:{ grid:{color:gridColor}, ticks:{color:tickColor,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gridColor}, ticks:{color:tickColor,font:{size:11},callback:v=>`R$${(v/1000).toFixed(0)}k`}, border:{display:false} }
    }
  }

  const donutData = {
    labels: idiomas,
    datasets:[{
      data: idiomas.map(i => idiomaCount[i]),
      backgroundColor: cores.slice(0, idiomas.length),
      borderWidth:0, hoverOffset:4,
    }]
  }
  const donutOpts = {
    responsive:true, maintainAspectRatio:false, cutout:'72%',
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:tooltipBg, borderColor:tooltipBorder, borderWidth:1,
        titleColor:tooltipTitle, bodyColor:tooltipBody, padding:10,
      }
    }
  }

  // últimos pagamentos
  const ultimosPgtos = [...pagamentos]
    .filter(p => p.mes === mesAtual)
    .sort((a,b) => (b.dataPgto||'0').localeCompare(a.dataPgto||'0'))
    .slice(0, 6)

  const getAluno = id => alunos.find(a => a.id === id)

  function iniciais(nome) {
    return nome?.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() || '??'
  }

  const avatarColors = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316']

  const nav = useNavigate()

  return (
    <div>
      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <button className="quick-btn" onClick={()=>nav('/alunos')}><Plus size={15}/> Novo Aluno</button>
        <button className="quick-btn" onClick={()=>nav('/financeiro')}><DollarSign size={15}/> Gerar Mensalidades</button>
        <button className="quick-btn" onClick={()=>nav('/relatorios')}><FileText size={15}/> Ver Relatórios</button>
        <button className="quick-btn" onClick={()=>nav('/agenda')}><Calendar size={15}/> Agenda</button>
        {inadimplentes.length>0 && (
          <button className="quick-btn" style={{borderColor:'var(--red-dim)',color:'var(--red)'}} onClick={()=>nav('/financeiro')}>
            <AlertTriangle size={15} style={{color:'var(--red)'}}/> {inadimplentes.length} Inadimplente{inadimplentes.length>1?'s':''}
          </button>
        )}
      </div>
      {/* STATS */}
      <div className="stat-grid fade-up" style={{marginBottom:16}}>
        <div className="stat-card sc-green delay-1 fade-up">
          <div className="stat-icon si-green"><Users /></div>
          <div className="stat-label">Alunos Ativos</div>
          <div className="stat-value">{ativos.length}</div>
          <div className="stat-change ch-up"><ArrowUpRight size={13}/> {alunos.filter(a=>a.status==='Ativo').length} matrículas</div>
        </div>
        <div className="stat-card sc-blue delay-2 fade-up">
          <div className="stat-icon si-blue"><DollarSign /></div>
          <div className="stat-label">Receita Jan/25</div>
          <div className="stat-value" style={{fontSize:21}}>{formatBRL(receitaMes)}</div>
          <div className={`stat-change ${Number(varReceita)>=0?'ch-up':'ch-down'}`}>
            {Number(varReceita)>=0?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {varReceita}% vs mês anterior
          </div>
        </div>
        <div className="stat-card sc-red delay-3 fade-up">
          <div className="stat-icon si-red"><AlertTriangle /></div>
          <div className="stat-label">Inadimplentes</div>
          <div className="stat-value" style={{color:'var(--red)'}}>{inadimplentes.length}</div>
          <div className="stat-change ch-down">
            {formatBRL(inadimplentes.reduce((s,p)=>s+p.valor,0))} em risco
          </div>
        </div>
        <div className="stat-card sc-purple delay-4 fade-up">
          <div className="stat-icon si-purple"><BookOpen /></div>
          <div className="stat-label">Turmas Ativas</div>
          <div className="stat-value">{turmas.filter(t=>t.ativa).length}</div>
          <div className="stat-change ch-neutral">{professores.filter(p=>p.ativo).length} professores</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:16}} className="fade-up">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Faturamento Mensal</div>
              <div className="chart-sub">Últimos 7 meses · Receitas confirmadas</div>
            </div>
          </div>
          <div style={{height:200}}>
            <Line data={lineData} options={lineOpts}/>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Alunos por Idioma</div>
              <div className="chart-sub">{ativos.length} matrículas ativas</div>
            </div>
          </div>
          <div style={{height:110,display:'flex',justifyContent:'center'}}>
            <Doughnut data={donutData} options={donutOpts}/>
          </div>
          <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:7}}>
            {idiomas.map((idioma,i) => (
              <div key={idioma} className="prog-item" style={{marginBottom:0}}>
                <div className="prog-head">
                  <div className="prog-name" style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:8,height:8,borderRadius:2,background:cores[i],display:'inline-block'}}/>
                    {idioma}
                  </div>
                  <div className="prog-val">{idiomaCount[idioma]} alunos</div>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{width:`${(idiomaCount[idioma]/maxIdioma)*100}%`,background:cores[i]}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="dash-bottom fade-up">
        {/* Últimos pagamentos */}
        <div className="tbl-wrap">
          <div className="tbl-top">
            <span className="tbl-title">Movimentações Recentes</span>
            <span className="badge bg-gray">{mesAtual.split('-').reverse().join('/')}</span>
          </div>
          {ultimosPgtos.length === 0
            ? <div className="empty"><Clock size={32}/><p>Nenhuma movimentação</p></div>
            : ultimosPgtos.map((p,i) => {
              const al = getAluno(p.alunoId)
              return (
                <div key={p.id} className="pay-row">
                  <div className="aluno-avatar" style={{background:avatarColors[i%avatarColors.length],fontSize:12,width:32,height:32}}>
                    {iniciais(al?.nome)}
                  </div>
                  <div className="pay-info">
                    <div className="pay-name">{al?.nome?.split(' ').slice(0,2).join(' ') || '—'}</div>
                    <div className="pay-meta">Venc: {formatDate(p.vencimento)}</div>
                  </div>
                  <div className="pay-val" style={{color:p.status==='Pago'?'var(--accent)':p.status==='Atrasado'?'var(--red)':'var(--yellow)'}}>
                    {formatBRL(p.valor)}
                  </div>
                  {p.status==='Pago'     && <span className="badge bg-green"><span className="bdot"/>Pago</span>}
                  {p.status==='Atrasado' && <span className="badge bg-red"><span className="bdot"/>Atrasado</span>}
                  {p.status==='Pendente' && <span className="badge bg-yellow"><span className="bdot"/>Pendente</span>}
                </div>
              )
            })
          }
        </div>

        {/* Inadimplentes */}
        <div className="tbl-wrap">
          <div className="tbl-top">
            <span className="tbl-title">Inadimplentes</span>
            <span className="badge bg-red">{inadimplentes.length} em atraso</span>
          </div>
          {inadimplentes.length === 0
            ? <div className="empty"><TrendingUp size={32}/><p>Nenhum inadimplente!</p><small>Todos os pagamentos em dia</small></div>
            : inadimplentes.map((p,i) => {
              const al = getAluno(p.alunoId)
              const t = turmas.find(t => t.id === al?.turmaId)
              return (
                <div key={p.id} className="pay-row">
                  <div className="aluno-avatar" style={{background:avatarColors[i%avatarColors.length],fontSize:12,width:32,height:32}}>
                    {iniciais(al?.nome)}
                  </div>
                  <div className="pay-info">
                    <div className="pay-name">{al?.nome?.split(' ').slice(0,2).join(' ') || '—'}</div>
                    <div className="pay-meta">{t?.idioma} · {t?.codigo}</div>
                  </div>
                  <div className="pay-val" style={{color:'var(--red)'}}>{formatBRL(p.valor)}</div>
                  <span className="badge bg-red">Atrasado</span>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}
