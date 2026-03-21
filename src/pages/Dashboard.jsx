import React, { useMemo, useState, useEffect } from 'react'
import {
  Chart, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Filler
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Users, DollarSign, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight,
  BookOpen, Clock, Plus, FileText, Calendar, Star, GraduationCap,
  CheckCircle, XCircle, BarChart2, Gift, Activity, CreditCard,
  LayoutDashboard, Wallet, School, CalendarDays
} from 'lucide-react'
import { useApp, formatBRL, formatDate, mesAtualDinamico, mesLabel } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler)

// ── helpers ───────────────────────────────────────────────────────────────────
function iniciais(nome) {
  return nome?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || '??'
}
const AVATAR_COLORS = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316']
const IDIOMA_CORES  = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa']

// Chave de sessionStorage para lembrar aba por usuário
function abaKey(userId) { return `em_dash_aba_${userId ?? 'anon'}` }

// ── Definição das abas e quais perfis podem ver cada uma ─────────────────────
//
// Mapeamento por perfil padrão:
//   Administrador → Visão Geral + Financeiro + Pedagógico + Agenda
//   Secretaria    → Visão Geral + Pedagógico + Agenda
//   Professor     → Pedagógico + Agenda
//   Financeiro    → Financeiro (apenas)
//   Visualizador  → Visão Geral + Agenda
//
// A visibilidade é baseada em permissões (perm_*), garantindo compatibilidade
// com perfis personalizados criados pelo administrador.
//
const ABAS = [
  {
    id: 'geral',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    // Exclui Professor (vai direto para Pedagógico)
    // Exclui Financeiro puro (vai direto para aba Financeiro)
    visivel: (user) => {
      if ((user?.perm_dashboard ?? 0) < 1) return false
      const perfil = user?.perfil_nome || ''
      // Professor sem admin → somente Pedagógico/Agenda
      if (perfil.includes('Professor') && !perfil.includes('Administrador')) return false
      // Financeiro puro (sem acesso a alunos/cursos além de leitura, sem dashboard admin)
      // → vai direto para aba Financeiro
      if (
        perfil.includes('Financeiro') &&
        !perfil.includes('Administrador') &&
        (user?.perm_alunos ?? 0) <= 1 &&
        (user?.perm_cursos ?? 0) === 0
      ) return false
      return true
    },
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    // Visível para qualquer perfil com acesso ao módulo financeiro
    visivel: (user) => (user?.perm_financeiro ?? 0) >= 1,
  },
  {
    id: 'pedagogico',
    label: 'Pedagógico',
    icon: School,
    // Visível para quem tem acesso a cursos OU alunos (Professor, Secretaria, Admin)
    visivel: (user) =>
      (user?.perm_cursos ?? 0) >= 1 || (user?.perm_alunos ?? 0) >= 2,
  },
  {
    id: 'agenda',
    label: 'Agenda',
    icon: CalendarDays,
    // Visível para todos com acesso ao dashboard
    visivel: (user) => (user?.perm_dashboard ?? 0) >= 1,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { alunos, turmas, professores, pagamentos, eventos, settings, tema } = useApp()
  const { user } = useAuth()
  const nav = useNavigate()

  // ── Aba ativa lembrada por usuário via sessionStorage ─────────────────────
  const abasVisiveis = ABAS.filter(a => a.visivel(user))
  const primeiraAba  = abasVisiveis[0]?.id || 'geral'

  const [abaAtiva, setAbaAtiva] = useState(() => {
    try {
      const salva = sessionStorage.getItem(abaKey(user?.id))
      // garante que a aba salva ainda é visível para este perfil
      if (salva && abasVisiveis.some(a => a.id === salva)) return salva
    } catch {}
    return primeiraAba
  })

  function trocarAba(id) {
    setAbaAtiva(id)
    try { sessionStorage.setItem(abaKey(user?.id), id) } catch {}
  }

  // ── Dados calculados ──────────────────────────────────────────────────────
  const mesAtual    = mesAtualDinamico()
  const meses7      = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (6 - i))
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const mesAnterior = meses7[meses7.length - 2]

  const ativos        = alunos.filter(a => a.status === 'Ativo')
  const pgMesAtual    = pagamentos.filter(p => p.mes === mesAtual)
  const pgPago        = pgMesAtual.filter(p => p.status === 'Pago')
  const inadimplentes = pgMesAtual.filter(p => p.status === 'Atrasado')
  const pendentes     = pgMesAtual.filter(p => p.status === 'Pendente')
  const receitaMes    = pgPago.reduce((s, p) => s + p.valor, 0)
  const receitaAnt    = pagamentos.filter(p => p.mes === mesAnterior && p.status === 'Pago').reduce((s,p) => s+p.valor, 0)
  const varReceita    = receitaAnt ? ((receitaMes - receitaAnt) / receitaAnt * 100).toFixed(1) : 0
  const turmasAtivas  = turmas.filter(t => t.ativa)

  // Professor: filtra apenas turmas dele
  const isProfessor   = user?.perfil_nome?.includes('Professor')
  const turmasProf    = isProfessor
    ? turmasAtivas.filter(t => {
        const prof = professores.find(p => p.id === t.professorId)
        return prof?.login === user?.login || prof?.email === user?.email
      })
    : turmasAtivas

  // Idiomas
  const idiomaCount = {}
  ativos.forEach(a => {
    const t = turmas.find(t => t.id === a.turmaId)
    if (t) idiomaCount[t.idioma] = (idiomaCount[t.idioma] || 0) + 1
  })
  const idiomas    = Object.keys(idiomaCount)
  const maxIdioma  = Math.max(...Object.values(idiomaCount), 1)

  // Receita por mês (7 meses)
  const receitaPorMes = meses7.map(m =>
    pagamentos.filter(p => p.mes === m && p.status === 'Pago').reduce((s,p) => s+p.valor, 0)
  )
  const labelsGrafico = meses7.map(m => mesLabel(m))

  // Pagamentos do dia (confirmados hoje)
  const hoje          = new Date().toISOString().split('T')[0]
  const pgHoje        = pagamentos.filter(p => p.dataPgto === hoje)
  const receitaHoje   = pgHoje.reduce((s, p) => s + p.valor, 0)

  // Previsão do mês (pendentes + recebidos)
  const previsaoMes   = receitaMes + pendentes.reduce((s,p) => s+p.valor, 0)

  // Aniversariantes do mês
  const mesNumAtual   = new Date().getMonth() + 1
  const aniversariantes = alunos.filter(a => {
    if (!a.dataNasc || a.status !== 'Ativo') return false
    const m = parseInt(a.dataNasc.split('-')[1], 10)
    return m === mesNumAtual
  }).sort((a, b) => {
    const da = parseInt(a.dataNasc.split('-')[2], 10)
    const db = parseInt(b.dataNasc.split('-')[2], 10)
    return da - db
  })

  // Eventos próximos (7 dias)
  const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7)
  const eventosProximos = (eventos || [])
    .filter(e => e.data >= hoje && e.data <= em7dias.toISOString().split('T')[0])
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 6)

  // Alunos em risco de frequência (< 75%)
  // Usa dados de presencas se disponíveis, caso contrário exibe vazio
  const alunosEmRisco = [] // populado via SQLite na v6 — placeholder visual

  // Ocupação das turmas
  const ocupacaoTurmas = turmasProf.map(t => {
    const mat  = ativos.filter(a => a.turmaId === t.id).length
    const ocup = t.vagas ? Math.round(mat / t.vagas * 100) : 0
    return { ...t, matriculados: mat, ocupacao: ocup }
  }).sort((a, b) => b.ocupacao - a.ocupacao)

  // Últimas movimentações (visão geral)
  const ultimosPgtos = [...pagamentos]
    .filter(p => p.mes === mesAtual)
    .sort((a,b) => (b.dataPgto||'0').localeCompare(a.dataPgto||'0'))
    .slice(0, 6)

  // ── Chart config ──────────────────────────────────────────────────────────
  const isDark       = tema === 'dark'
  const gridColor    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const tickColor    = isDark ? '#555d78' : '#9aa4b8'
  const tooltipBg    = isDark ? '#161a22' : '#ffffff'
  const tooltipBorder= isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const tooltipTitle = isDark ? '#edf0f9' : '#1a1e2c'
  const tooltipBody  = isDark ? '#7f8ba4' : '#5a647d'

  const tooltipBase = {
    backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
    titleColor: tooltipTitle, bodyColor: tooltipBody, padding: 12,
  }

  const lineData = {
    labels: labelsGrafico,
    datasets: [{
      label: 'Receita',
      data: receitaPorMes,
      borderColor: 'var(--accent)',
      backgroundColor: isDark ? 'rgba(99,220,170,0.08)' : 'rgba(37,162,110,0.08)',
      borderWidth: 2, pointRadius: 3, fill: true, tension: .4,
      pointBackgroundColor: 'var(--accent)',
    }],
  }
  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipBase, callbacks: { label: ctx => ` ${formatBRL(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid:{color:gridColor}, ticks:{color:tickColor,font:{size:11}}, border:{display:false} },
      y: { grid:{color:gridColor}, ticks:{color:tickColor,font:{size:11},callback:v=>`R$${(v/1000).toFixed(0)}k`}, border:{display:false} },
    },
  }

  const donutData = {
    labels: idiomas,
    datasets: [{
      data: idiomas.map(i => idiomaCount[i]),
      backgroundColor: IDIOMA_CORES.slice(0, idiomas.length),
      borderWidth: 0, hoverOffset: 4,
    }],
  }
  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '72%',
    plugins: { legend:{display:false}, tooltip:{...tooltipBase} },
  }

  // Inadimplência por mês (bar)
  const inadimplPorMes = meses7.map(m =>
    pagamentos.filter(p => p.mes === m && p.status === 'Atrasado').reduce((s,p) => s+p.valor, 0)
  )
  const barData = {
    labels: labelsGrafico,
    datasets: [{
      label: 'Inadimplência',
      data: inadimplPorMes,
      backgroundColor: labelsGrafico.map((_, i) =>
        i === labelsGrafico.length - 1
          ? 'rgba(242,97,122,0.85)'
          : isDark ? 'rgba(242,97,122,0.25)' : 'rgba(242,97,122,0.2)'
      ),
      borderRadius: 6, borderSkipped: false,
    }],
  }
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend:{display:false}, tooltip:{...tooltipBase, callbacks:{label:ctx=>` ${formatBRL(ctx.parsed.y)}`}} },
    scales: {
      x: { grid:{display:false}, ticks:{color:tickColor,font:{size:11}}, border:{display:false} },
      y: { grid:{color:gridColor}, ticks:{color:tickColor,font:{size:11},callback:v=>`R$${(v/1000).toFixed(0)}k`}, border:{display:false} },
    },
  }

  // ── Tipo de evento → cor ──────────────────────────────────────────────────
  const TIPO_EVENTO = {
    reuniao:    { cor: 'var(--blue)',   emoji: '🗣️' },
    prova:      { cor: 'var(--red)',    emoji: '📝' },
    feriado:    { cor: 'var(--yellow)', emoji: '🏖️' },
    atividade:  { cor: 'var(--accent)', emoji: '🎯' },
    financeiro: { cor: 'var(--accent)', emoji: '💰' },
    turma:      { cor: 'var(--blue)',   emoji: '🎓' },
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  function AlunoRow({ p, i, showStatus = true }) {
    const al = alunos.find(a => a.id === p.alunoId)
    const t  = turmas.find(t => t.id === al?.turmaId)
    return (
      <div className="pay-row" key={p.id}>
        <div className="aluno-avatar" style={{background:AVATAR_COLORS[i%AVATAR_COLORS.length],fontSize:12,width:32,height:32}}>
          {iniciais(al?.nome)}
        </div>
        <div className="pay-info">
          <div className="pay-name">{al?.nome?.split(' ').slice(0,2).join(' ') || '—'}</div>
          <div className="pay-meta">{t ? `${t.idioma} · ${t.codigo}` : `Venc: ${formatDate(p.vencimento)}`}</div>
        </div>
        <div className="pay-val" style={{color: p.status==='Pago'?'var(--accent)':p.status==='Atrasado'?'var(--red)':'var(--yellow)'}}>
          {formatBRL(p.valor)}
        </div>
        {showStatus && (
          p.status==='Pago'     ? <span className="badge bg-green"><span className="bdot"/>Pago</span>     :
          p.status==='Atrasado' ? <span className="badge bg-red"><span className="bdot"/>Atrasado</span>   :
                                  <span className="badge bg-yellow"><span className="bdot"/>Pendente</span>
        )}
      </div>
    )
  }

  function StatCard({ color, iconColor, icon: Icon, label, value, sub, subColor }) {
    return (
      <div className={`stat-card sc-${color} fade-up`}>
        <div className={`stat-icon si-${iconColor || color}`}><Icon /></div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{fontSize:21}}>{value}</div>
        <div className="stat-change ch-neutral" style={{color: subColor}}>{sub}</div>
      </div>
    )
  }

  function SectionTitle({ children }) {
    return (
      <div style={{
        fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
        color: 'var(--text-1)', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        {children}
      </div>
    )
  }

  // ── Quick actions (comuns) ────────────────────────────────────────────────
  function QuickActions() {
    const { podeEditar: podeEditarAlunos }     = useAuth().permissao('alunos')
    const { podeEditar: podeEditarFinanceiro } = useAuth().permissao('financeiro')
    const { podeVer:    podeVerRelatorios }    = useAuth().permissao('relatorios')
    const { podeVer:    podeVerAgenda }        = useAuth().permissao('agenda')
    return (
      <div className="quick-actions">
        {podeEditarAlunos     && <button className="quick-btn" onClick={()=>nav('/alunos')}><Plus size={15}/> Novo Aluno</button>}
        {podeEditarFinanceiro && <button className="quick-btn" onClick={()=>nav('/financeiro')}><DollarSign size={15}/> Financeiro</button>}
        {podeVerRelatorios    && <button className="quick-btn" onClick={()=>nav('/relatorios')}><FileText size={15}/> Relatórios</button>}
        {podeVerAgenda        && <button className="quick-btn" onClick={()=>nav('/agenda')}><Calendar size={15}/> Agenda</button>}
        {inadimplentes.length > 0 && podeEditarFinanceiro && (
          <button className="quick-btn" style={{borderColor:'var(--red-dim)',color:'var(--red)'}} onClick={()=>nav('/financeiro')}>
            <AlertTriangle size={15} style={{color:'var(--red)'}}/> {inadimplentes.length} Inadimplente{inadimplentes.length>1?'s':''}
          </button>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA: VISÃO GERAL
  // ══════════════════════════════════════════════════════════════════════════
  function AbaGeral() {
    return (
      <div>
        <div className="stat-grid fade-up" style={{marginBottom:16}}>
          <StatCard color="green"  icon={Users}        label="Alunos Ativos"  value={ativos.length}
            sub={`${turmasAtivas.length} turmas ativas`} />
          <StatCard color="blue"   icon={DollarSign}   label={`Receita ${mesLabel(mesAtual)}`} value={formatBRL(receitaMes)}
            sub={`${Number(varReceita)>=0?'▲':'▼'} ${Math.abs(varReceita)}% vs mês anterior`}
            subColor={Number(varReceita)>=0?'var(--accent)':'var(--red)'} />
          <StatCard color="red"    icon={AlertTriangle} label="Inadimplentes"  value={inadimplentes.length}
            sub={`${formatBRL(inadimplentes.reduce((s,p)=>s+p.valor,0))} em risco`}
            subColor={inadimplentes.length>0?'var(--red)':undefined} />
          <StatCard color="purple" icon={BookOpen}      label="Turmas Ativas"  value={turmasAtivas.length}
            sub={`${professores.filter(p=>p.ativo).length} professores`} />
        </div>

        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:16}} className="fade-up">
          <div className="chart-card">
            <div className="chart-head">
              <div>
                <div className="chart-title">Faturamento Mensal</div>
                <div className="chart-sub">Últimos 7 meses · Receitas confirmadas</div>
              </div>
            </div>
            <div style={{height:200}}><Line data={lineData} options={lineOpts}/></div>
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
                      <span style={{width:8,height:8,borderRadius:2,background:IDIOMA_CORES[i],display:'inline-block'}}/>
                      {idioma}
                    </div>
                    <div className="prog-val">{idiomaCount[idioma]} alunos</div>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{width:`${(idiomaCount[idioma]/maxIdioma)*100}%`,background:IDIOMA_CORES[i]}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-bottom fade-up">
          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Movimentações Recentes</span>
              <span className="badge bg-gray">{mesLabel(mesAtual)}</span>
            </div>
            {ultimosPgtos.length === 0
              ? <div className="empty"><Clock size={32}/><p>Nenhuma movimentação</p></div>
              : ultimosPgtos.map((p,i) => <AlunoRow key={p.id} p={p} i={i}/>)
            }
          </div>

          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Inadimplentes</span>
              <span className="badge bg-red">{inadimplentes.length} em atraso</span>
            </div>
            {inadimplentes.length === 0
              ? <div className="empty"><TrendingUp size={32}/><p>Nenhum inadimplente!</p><small>Todos os pagamentos em dia</small></div>
              : inadimplentes.map((p,i) => <AlunoRow key={p.id} p={p} i={i} showStatus={false}/>)
            }
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA: FINANCEIRO
  // ══════════════════════════════════════════════════════════════════════════
  function AbaFinanceiro() {
    const txRecebimento = pgMesAtual.length
      ? Math.round(pgPago.length / pgMesAtual.length * 100)
      : 0

    return (
      <div>
        {/* KPIs financeiros */}
        <div className="stat-grid fade-up" style={{marginBottom:16}}>
          <StatCard color="green"  icon={CreditCard}   label="Recebido Hoje"
            value={formatBRL(receitaHoje)}
            sub={`${pgHoje.length} pagamento${pgHoje.length!==1?'s':''} confirmado${pgHoje.length!==1?'s':''}`} />
          <StatCard color="blue"   icon={DollarSign}   label={`Receita ${mesLabel(mesAtual)}`}
            value={formatBRL(receitaMes)}
            sub={`Taxa: ${txRecebimento}% recebido`} />
          <StatCard color="yellow" icon={Clock}         label="Pendente no Mês"
            value={formatBRL(pendentes.reduce((s,p)=>s+p.valor,0))}
            sub={`${pendentes.length} aguardando`} />
          <StatCard color="red"    icon={AlertTriangle} label="Em Atraso"
            value={formatBRL(inadimplentes.reduce((s,p)=>s+p.valor,0))}
            sub={`${inadimplentes.length} inadimplente${inadimplentes.length!==1?'s':''}`}
            subColor={inadimplentes.length>0?'var(--red)':undefined} />
        </div>

        {/* Previsão */}
        <div className="chart-card fade-up" style={{marginBottom:14, padding:'16px 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <div className="chart-title">Previsão do Mês</div>
              <div className="chart-sub">Recebido + pendentes confirmados</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:'var(--accent)'}}>
                {formatBRL(previsaoMes)}
              </div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>projeção total</div>
            </div>
          </div>
          {/* Barra de progresso receita vs previsão */}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-2)'}}>
              <span>Recebido</span>
              <span>{previsaoMes>0?Math.round(receitaMes/previsaoMes*100):0}%</span>
            </div>
            <div className="prog-track" style={{height:10}}>
              <div className="prog-fill" style={{
                width:`${previsaoMes>0?Math.min(100,receitaMes/previsaoMes*100):0}%`,
                background:'var(--accent)', borderRadius:6,
              }}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-3)'}}>
              <span>{formatBRL(receitaMes)} recebido</span>
              <span>{formatBRL(previsaoMes - receitaMes)} pendente</span>
            </div>
          </div>
        </div>

        {/* Charts: faturamento + inadimplência */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}} className="fade-up">
          <div className="chart-card">
            <div className="chart-head">
              <div>
                <div className="chart-title">Faturamento Mensal</div>
                <div className="chart-sub">Últimos 7 meses</div>
              </div>
            </div>
            <div style={{height:180}}><Line data={lineData} options={lineOpts}/></div>
          </div>
          <div className="chart-card">
            <div className="chart-head">
              <div>
                <div className="chart-title">Inadimplência Mensal</div>
                <div className="chart-sub">Valores em atraso por mês</div>
              </div>
            </div>
            <div style={{height:180}}><Bar data={barData} options={barOpts}/></div>
          </div>
        </div>

        {/* Pagamentos do dia + inadimplentes */}
        <div className="dash-bottom fade-up">
          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Pagamentos de Hoje</span>
              <span className="badge bg-green">{formatBRL(receitaHoje)}</span>
            </div>
            {pgHoje.length === 0
              ? <div className="empty"><CreditCard size={32}/><p>Nenhum pagamento hoje</p></div>
              : pgHoje.map((p,i) => <AlunoRow key={p.id} p={p} i={i} showStatus={false}/>)
            }
          </div>

          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Inadimplentes</span>
              <span className="badge bg-red">{inadimplentes.length} em atraso</span>
            </div>
            {inadimplentes.length === 0
              ? <div className="empty"><TrendingUp size={32}/><p>Nenhum inadimplente!</p></div>
              : inadimplentes.map((p,i) => <AlunoRow key={p.id} p={p} i={i} showStatus={false}/>)
            }
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA: PEDAGÓGICO
  // ══════════════════════════════════════════════════════════════════════════
  function AbaPedagogico() {
    const totalVagas = ocupacaoTurmas.reduce((s,t) => s+t.vagas, 0)
    const totalMat   = ocupacaoTurmas.reduce((s,t) => s+t.matriculados, 0)
    const ocupMedia  = totalVagas ? Math.round(totalMat/totalVagas*100) : 0

    return (
      <div>
        {/* KPIs pedagógicos */}
        <div className="stat-grid fade-up" style={{marginBottom:16}}>
          <StatCard color="green"  icon={Users}      label={isProfessor?'Meus Alunos':'Alunos Ativos'}
            value={isProfessor
              ? turmasProf.reduce((s,t)=>s+ativos.filter(a=>a.turmaId===t.id).length,0)
              : ativos.length}
            sub={isProfessor?`${turmasProf.length} turmas`:`${turmasAtivas.length} turmas`} />
          <StatCard color="blue"   icon={BookOpen}   label={isProfessor?'Minhas Turmas':'Turmas Ativas'}
            value={turmasProf.length}
            sub={`${ocupMedia}% de ocupação média`} />
          <StatCard color="yellow" icon={Activity}   label="Alunos em Risco"
            value={alunosEmRisco.length}
            sub="Frequência abaixo de 75%"
            subColor={alunosEmRisco.length>0?'var(--yellow)':undefined} />
          <StatCard color="purple" icon={GraduationCap} label="Professores Ativos"
            value={professores.filter(p=>p.ativo).length}
            sub={`${turmasAtivas.length} turmas cobertas`} />
        </div>

        {/* Ocupação das turmas */}
        <div className="chart-card fade-up" style={{marginBottom:14}}>
          <div className="chart-head">
            <div>
              <div className="chart-title">{isProfessor?'Ocupação das Minhas Turmas':'Ocupação das Turmas'}</div>
              <div className="chart-sub">{totalMat} alunos em {turmasProf.length} turmas · {ocupMedia}% de ocupação média</div>
            </div>
          </div>
          {ocupacaoTurmas.length === 0
            ? <div className="empty"><BookOpen size={32}/><p>Nenhuma turma</p></div>
            : (
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
                {ocupacaoTurmas.map(t => {
                  const prof = professores.find(p => p.id === t.professorId)
                  const cor  = t.ocupacao >= 90 ? 'var(--red)' : t.ocupacao >= 70 ? 'var(--yellow)' : 'var(--accent)'
                  return (
                    <div key={t.id} className="prog-item" style={{marginBottom:0}}>
                      <div className="prog-head">
                        <div className="prog-name" style={{display:'flex',alignItems:'center',gap:8}}>
                          <span className="badge bg-blue" style={{fontSize:10}}>{t.codigo}</span>
                          <span style={{fontSize:12,color:'var(--text-2)'}}>{t.idioma} · {t.nivel}</span>
                          {!isProfessor && <span style={{fontSize:11,color:'var(--text-3)'}}>— {prof?.nome||'—'}</span>}
                        </div>
                        <div className="prog-val" style={{color:cor,fontWeight:600}}>
                          {t.matriculados}/{t.vagas} · {t.ocupacao}%
                        </div>
                      </div>
                      <div className="prog-track">
                        <div className="prog-fill" style={{width:`${t.ocupacao}%`,background:cor,transition:'width .4s'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Alunos em risco de frequência */}
        <div className="tbl-wrap fade-up">
          <div className="tbl-top">
            <span className="tbl-title">Alunos em Risco de Frequência</span>
            <span className="badge bg-yellow">&lt; 75%</span>
          </div>
          <div className="empty" style={{padding:'24px 0'}}>
            <Activity size={32}/>
            <p>Dados de frequência disponíveis na aba Frequência</p>
            <small style={{marginTop:4,display:'block'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>nav('/frequencia')}>
                Ir para Frequência →
              </button>
            </small>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA: AGENDA
  // ══════════════════════════════════════════════════════════════════════════
  function AbaAgenda() {
    const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

    function diaDoEvento(dataStr) {
      const [y,m,d] = dataStr.split('-').map(Number)
      return new Date(y, m-1, d).getDay()
    }

    return (
      <div>
        {/* KPIs de agenda */}
        <div className="stat-grid fade-up" style={{marginBottom:16}}>
          <StatCard color="green"  icon={CalendarDays} label="Eventos Próximos"
            value={eventosProximos.length}
            sub="Nos próximos 7 dias" />
          <StatCard color="blue"   icon={Gift}         label="Aniversariantes"
            value={aniversariantes.length}
            sub={`No mês de ${new Date().toLocaleDateString('pt-BR',{month:'long'})}`} />
          <StatCard color="purple" icon={BookOpen}     label="Turmas Ativas"
            value={turmasAtivas.length}
            sub={`${ativos.length} alunos matriculados`} />
          <StatCard color="yellow" icon={Clock}        label="Vencimentos Hoje"
            value={pgMesAtual.filter(p=>p.vencimento===hoje&&p.status==='Pendente').length}
            sub="Mensalidades que vencem hoje"
            subColor={pgMesAtual.filter(p=>p.vencimento===hoje&&p.status==='Pendente').length>0?'var(--yellow)':undefined} />
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}} className="fade-up">
          {/* Eventos próximos */}
          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Próximos 7 Dias</span>
              <span className="badge bg-blue">{eventosProximos.length} evento{eventosProximos.length!==1?'s':''}</span>
            </div>
            {eventosProximos.length === 0
              ? <div className="empty"><CalendarDays size={32}/><p>Nenhum evento nos próximos 7 dias</p></div>
              : eventosProximos.map(e => {
                  const cfg  = TIPO_EVENTO[e.tipo] || { cor:'var(--text-3)', emoji:'📌' }
                  const [,mm,dd] = e.data.split('-')
                  const diaSem   = diasSemana[diaDoEvento(e.data)]
                  return (
                    <div key={e.id} className="pay-row" style={{gap:12}}>
                      <div style={{
                        width:40, height:40, borderRadius:10, flexShrink:0,
                        background: cfg.cor + '22',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      }}>
                        <span style={{fontSize:16,lineHeight:1}}>{cfg.emoji}</span>
                        <span style={{fontSize:9,color:cfg.cor,fontWeight:700,marginTop:1}}>{diaSem}</span>
                      </div>
                      <div className="pay-info">
                        <div className="pay-name" style={{fontSize:13}}>{e.titulo}</div>
                        <div className="pay-meta">
                          {dd}/{mm}{e.hora ? ` às ${e.hora}` : ''}
                          {e.desc ? ` · ${e.desc}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })
            }
            <div style={{padding:'8px 12px'}}>
              <button className="btn btn-ghost btn-sm" style={{width:'100%',justifyContent:'center',fontSize:12}} onClick={()=>nav('/agenda')}>
                Ver agenda completa →
              </button>
            </div>
          </div>

          {/* Aniversariantes do mês */}
          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Aniversariantes do Mês</span>
              <span className="badge bg-green">{aniversariantes.length}</span>
            </div>
            {aniversariantes.length === 0
              ? <div className="empty"><Gift size={32}/><p>Nenhum aniversariante este mês</p></div>
              : aniversariantes.map((a,i) => {
                  const [,, dd] = a.dataNasc.split('-')
                  const t = turmas.find(t => t.id === a.turmaId)
                  const isHoje = `${new Date().getFullYear()}-${String(mesNumAtual).padStart(2,'0')}-${dd}` === hoje
                  return (
                    <div key={a.id} className="pay-row">
                      <div className="aluno-avatar" style={{background:AVATAR_COLORS[i%AVATAR_COLORS.length],fontSize:12,width:32,height:32,position:'relative'}}>
                        {iniciais(a.nome)}
                        {isHoje && (
                          <span style={{
                            position:'absolute',top:-4,right:-4,fontSize:12,lineHeight:1,
                          }}>🎂</span>
                        )}
                      </div>
                      <div className="pay-info">
                        <div className="pay-name" style={{display:'flex',alignItems:'center',gap:6}}>
                          {a.nome.split(' ').slice(0,2).join(' ')}
                          {isHoje && <span style={{fontSize:10,color:'var(--accent)',fontWeight:700}}>Hoje!</span>}
                        </div>
                        <div className="pay-meta">
                          Dia {dd} · {t?.idioma||'—'} · {t?.codigo||'—'}
                        </div>
                      </div>
                      <span style={{fontSize:18}}>🎉</span>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>
    )
  }

  // ── Render principal ──────────────────────────────────────────────────────
  const ABA_COMPONENTES = { geral: AbaGeral, financeiro: AbaFinanceiro, pedagogico: AbaPedagogico, agenda: AbaAgenda }
  const AbaAtual = ABA_COMPONENTES[abaAtiva] || AbaGeral

  return (
    <div>
      <QuickActions />

      {/* ── TABS ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '1px solid var(--border)', paddingBottom: 0,
      }}>
        {abasVisiveis.map(aba => {
          const ativa = abaAtiva === aba.id
          return (
            <button
              key={aba.id}
              onClick={() => trocarAba(aba.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: ativa ? 600 : 400,
                color: ativa ? 'var(--accent)' : 'var(--text-3)',
                borderBottom: ativa ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'all .15s',
              }}
            >
              {React.createElement(aba.icon, {size:14})}
              {aba.label}
            </button>
          )
        })}
      </div>

      {/* ── CONTEÚDO DA ABA ── */}
      <AbaAtual />
    </div>
  )
}
