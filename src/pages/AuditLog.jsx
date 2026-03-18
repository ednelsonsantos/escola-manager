import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, RefreshCw, Search, X, Download, Trash2,
  AlertTriangle, Info, CheckCircle, Clock, Filter,
  BarChart2, User, ChevronDown, ChevronUp
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

// ── Configurações visuais por módulo e ação ────────────────────────────────────
const MODULO_CONFIG = {
  alunos:      { label: 'Alunos',      color: '#63dcaa', bg: 'var(--accent-dim)' },
  financeiro:  { label: 'Financeiro',  color: '#5b9cf6', bg: 'var(--blu-dim)'   },
  usuarios:    { label: 'Usuários',    color: '#a78bfa', bg: 'var(--pur-dim)'   },
  perfis:      { label: 'Perfis',      color: '#f5c542', bg: 'var(--yel-dim)'   },
  identidade:  { label: 'Identidade',  color: '#f97316', bg: 'rgba(249,115,22,.12)' },
  sistema:     { label: 'Sistema',     color: '#8b949e', bg: 'rgba(139,148,158,.12)' },
  cursos:      { label: 'Cursos',      color: '#14b8a6', bg: 'rgba(20,184,166,.12)' },
  agenda:      { label: 'Agenda',      color: '#f2617a', bg: 'var(--red-dim)'   },
}

const ACAO_CONFIG = {
  login:                { label: 'Login',            icon: CheckCircle,    nivel: 'info'  },
  login_falha:          { label: 'Login falhou',      icon: AlertTriangle,  nivel: 'aviso' },
  logout:               { label: 'Logout',            icon: CheckCircle,    nivel: 'info'  },
  criar:                { label: 'Criou',             icon: CheckCircle,    nivel: 'info'  },
  editar:               { label: 'Editou',            icon: Info,           nivel: 'info'  },
  excluir:              { label: 'Excluiu',           icon: Trash2,         nivel: 'aviso' },
  exportar:             { label: 'Exportou',          icon: Download,       nivel: 'info'  },
  configurar:           { label: 'Configurou',        icon: Info,           nivel: 'info'  },
  alterar_senha:        { label: 'Trocou senha',      icon: Shield,         nivel: 'aviso' },
  inicializar:          { label: 'Inicializou',       icon: CheckCircle,    nivel: 'info'  },
  gerar_mensalidades:   { label: 'Gerou mensalidades',icon: CheckCircle,    nivel: 'info'  },
  registrar_pagamento:  { label: 'Confirmou pgto',    icon: CheckCircle,    nivel: 'info'  },
  editar_pagamento:     { label: 'Editou pgto',       icon: Info,           nivel: 'info'  },
  excluir_pagamento:    { label: 'Excluiu pgto',      icon: Trash2,         nivel: 'aviso' },
  limpar_logs:          { label: 'Limpou logs',       icon: Trash2,         nivel: 'aviso' },
}

const NIVEL_CONFIG = {
  info:   { label: 'Info',   badge: 'bg-blue',   icon: Info         },
  aviso:  { label: 'Aviso',  badge: 'bg-yellow', icon: AlertTriangle },
  erro:   { label: 'Erro',   badge: 'bg-red',    icon: AlertTriangle },
}

function formatTS(ts) {
  if (!ts) return '—'
  const d = new Date(ts.replace(' ', 'T'))
  if (isNaN(d)) return ts
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

function iniciais(nome) {
  return (nome || '?').split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase()
}

// ── Componente: Card de estatística ───────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ padding: '14px 18px' }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 22, color }}>{value}</div>
      {sub && <div className="stat-change ch-neutral">{sub}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AuditLog() {
  const { showToast } = useApp()
  const hasElectron = !!window.electronAPI?.listarLogs

  const [logs,    setLogs]    = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [confirmLimpar, setConfirmLimpar] = useState(false)

  // Filtros
  const [busca,   setBusca]   = useState('')
  const [modulo,  setModulo]  = useState('')
  const [nivel,   setNivel]   = useState('')
  const [limite,  setLimite]  = useState(200)

  const carregar = useCallback(async () => {
    setLoading(true)
    if (hasElectron) {
      const [ls, st] = await Promise.all([
        window.electronAPI.listarLogs({ limite, modulo: modulo||null, nivel: nivel||null, busca }),
        window.electronAPI.estatisticasLogs(),
      ])
      setLogs(ls || [])
      setStats(st || null)
    } else {
      // Fallback sem Electron — dados demo
      setLogs(LOGS_DEMO)
      setStats(STATS_DEMO)
    }
    setLoading(false)
  }, [limite, modulo, nivel, busca, hasElectron])

  useEffect(() => { carregar() }, [carregar])

  async function handleLimpar() {
    if (hasElectron) {
      const res = await window.electronAPI.limparLogs(90)
      if (res.ok) { showToast(`${res.removidos} registros removidos.`, 'info'); carregar() }
    }
    setConfirmLimpar(false)
  }

  function exportarCSV() {
    const rows = [['Data/Hora', 'Usuário', 'Módulo', 'Ação', 'Entidade', 'Detalhe', 'Nível']]
    logs.forEach(l => rows.push([
      formatTS(l.criado_em), l.usuario_login || '—',
      l.modulo, l.acao, l.entidade_nome || '—', l.detalhe || '—', l.nivel
    ]))
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Log exportado!')
  }

  const modulosDisponiveis = [...new Set(logs.map(l => l.modulo))].sort()
  const totalFiltrado = logs.length

  return (
    <div className="fade-up">

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'var(--text-1)', display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={17} style={{ color:'var(--accent)' }}/> Log de Auditoria
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            Registro completo de todas as ações realizadas no sistema
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowStats(v => !v)}>
            <BarChart2 size={13}/> {showStats ? 'Ocultar' : 'Ver'} estatísticas
          </button>
          <button className="btn btn-secondary btn-sm" onClick={carregar} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }}/>
            Atualizar
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportarCSV} disabled={logs.length === 0}>
            <Download size={13}/> CSV
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmLimpar(true)}>
            <Trash2 size={13}/> Limpar antigos
          </button>
        </div>
      </div>

      {/* ── ESTATÍSTICAS ── */}
      {showStats && stats && (
        <div style={{ marginBottom: 16 }}>
          <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:12 }}>
            <StatCard label="Total de registros" value={stats.total?.toLocaleString('pt-BR')} sub="desde o início" color="var(--text-1)"/>
            <StatCard label="Hoje"   value={stats.hoje}  sub="ações hoje"            color="var(--accent)"/>
            <StatCard label="7 dias" value={stats.semana} sub="última semana"         color="var(--blue)"/>
            <StatCard label="Exibindo" value={totalFiltrado} sub={`de ${stats.total} registros`} color="var(--text-2)"/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* Por módulo */}
            <div className="chart-card" style={{ padding:'14px 18px' }}>
              <div className="chart-title" style={{ marginBottom:12 }}>Por módulo</div>
              {(stats.porModulo || []).slice(0,6).map(m => {
                const cfg = MODULO_CONFIG[m.modulo] || {}
                const max = stats.porModulo?.[0]?.n || 1
                return (
                  <div key={m.modulo} className="prog-item" style={{ marginBottom: 8 }}>
                    <div className="prog-head">
                      <span className="prog-name" style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:cfg.color||'var(--text-3)', display:'inline-block' }}/>
                        {cfg.label || m.modulo}
                      </span>
                      <span className="prog-val">{m.n}</span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width:`${(m.n/max)*100}%`, background:cfg.color||'var(--text-3)' }}/>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Por usuário */}
            <div className="chart-card" style={{ padding:'14px 18px' }}>
              <div className="chart-title" style={{ marginBottom:12 }}>Por usuário</div>
              {(stats.porUsuario || []).slice(0,6).map((u, i) => {
                const cores = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316']
                const max   = stats.porUsuario?.[0]?.n || 1
                return (
                  <div key={u.usuario_login} className="prog-item" style={{ marginBottom: 8 }}>
                    <div className="prog-head">
                      <span className="prog-name" style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{
                          width:20, height:20, borderRadius:'50%', background:cores[i%cores.length],
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          fontSize:9, fontWeight:700, color:'#fff', fontFamily:"'Syne',sans-serif",
                        }}>
                          {iniciais(u.usuario_login)}
                        </span>
                        {u.usuario_login}
                      </span>
                      <span className="prog-val">{u.n}</span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width:`${(u.n/max)*100}%`, background:cores[i%cores.length] }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="search-wrap" style={{ flex:1, maxWidth:300 }}>
          <Search/>
          <input
            placeholder="Buscar usuário, detalhe, entidade..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)' }} onClick={() => setBusca('')}><X size={12}/></button>}
        </div>

        <select className="select" style={{ width:140 }} value={modulo} onChange={e => setModulo(e.target.value)}>
          <option value="">Todos módulos</option>
          {Object.entries(MODULO_CONFIG).map(([k,v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="select" style={{ width:130 }} value={nivel} onChange={e => setNivel(e.target.value)}>
          <option value="">Todos níveis</option>
          {Object.entries(NIVEL_CONFIG).map(([k,v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="select" style={{ width:110 }} value={limite} onChange={e => setLimite(Number(e.target.value))}>
          <option value={100}>100 registros</option>
          <option value={200}>200 registros</option>
          <option value={500}>500 registros</option>
          <option value={1000}>1000 registros</option>
        </select>

        {(busca||modulo||nivel) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setModulo(''); setNivel('') }}>
            <X size={12}/> Limpar filtros
          </button>
        )}
      </div>

      {/* ── TABELA ── */}
      <div className="tbl-wrap">
        <div className="tbl-top">
          <span className="tbl-title">Registros de Auditoria</span>
          <span style={{ fontSize:12, color:'var(--text-3)' }}>
            {totalFiltrado} entrada{totalFiltrado !== 1 ? 's' : ''}
          </span>
        </div>

        {loading
          ? <div className="empty">
              <RefreshCw size={32} style={{ animation:'spin .7s linear infinite' }}/>
              <p>Carregando registros...</p>
            </div>
          : logs.length === 0
            ? <div className="empty">
                <Shield size={40}/>
                <p>Nenhum registro encontrado.</p>
                <small>As ações realizadas no sistema aparecerão aqui.</small>
              </div>
            : <table>
                <thead>
                  <tr>
                    <th style={{ width:135 }}>Data / Hora</th>
                    <th style={{ width:120 }}>Usuário</th>
                    <th style={{ width:110 }}>Módulo</th>
                    <th style={{ width:140 }}>Ação</th>
                    <th>Detalhe</th>
                    <th style={{ width:80 }}>Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const mCfg  = MODULO_CONFIG[log.modulo] || { label: log.modulo, color:'var(--text-3)', bg:'var(--bg-hover)' }
                    const aCfg  = ACAO_CONFIG[log.acao]     || { label: log.acao, icon: Info }
                    const nCfg  = NIVEL_CONFIG[log.nivel]   || NIVEL_CONFIG.info
                    const AIcon = aCfg.icon || Info
                    const isAviso = log.nivel === 'aviso' || log.nivel === 'erro'

                    return (
                      <tr key={log.id} style={{ opacity: isAviso ? 1 : .85 }}>
                        <td style={{ fontSize:11.5, color:'var(--text-3)', fontFamily:"'DM Mono','Fira Mono',monospace" }}>
                          {formatTS(log.criado_em)}
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{
                              width:24, height:24, borderRadius:'50%', flexShrink:0,
                              background: log.avatar_cor || 'var(--bg-hover)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:9, fontWeight:700, color:'#fff',
                              fontFamily:"'Syne',sans-serif",
                            }}>
                              {iniciais(log.usuario_login)}
                            </div>
                            <span style={{ fontSize:13, color:'var(--text-1)' }}>{log.usuario_login || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: mCfg.bg, color: mCfg.color, fontSize:11 }}>
                            {mCfg.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <AIcon size={13} style={{ color: isAviso ? 'var(--yellow)' : 'var(--text-3)', flexShrink:0 }}/>
                            <span style={{ fontSize:13, color:'var(--text-2)' }}>{aCfg.label}</span>
                          </div>
                          {log.entidade_nome && (
                            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{log.entidade_nome}</div>
                          )}
                        </td>
                        <td style={{ fontSize:12.5, color:'var(--text-2)', maxWidth:280 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={log.detalhe}>
                            {log.detalhe || '—'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${nCfg.badge}`} style={{ fontSize:10 }}>
                            {nCfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
        }
      </div>

      {/* ── CONFIRM LIMPAR ── */}
      {confirmLimpar && (
        <ConfirmModal
          title="Limpar registros antigos"
          msg="Serão removidos todos os registros com mais de 90 dias. Esta ação não pode ser desfeita."
          onConfirm={handleLimpar}
          onClose={() => setConfirmLimpar(false)}
          danger
        />
      )}
    </div>
  )
}

// ── Dados demo para quando Electron não está disponível ───────────────────────
const LOGS_DEMO = [
  { id:7, criado_em:'2025-01-14 10:32:15', usuario_login:'admin',      usuario_nome:'Administrador', avatar_cor:'#63dcaa', modulo:'alunos',     acao:'criar',               entidade_nome:'Ana Carolina Silva',  detalhe:'Aluno cadastrado: Ana Carolina Silva',          nivel:'info' },
  { id:6, criado_em:'2025-01-14 10:28:03', usuario_login:'secretaria', usuario_nome:'Secretaria',    avatar_cor:'#5b9cf6', modulo:'financeiro',  acao:'registrar_pagamento', entidade_nome:'',                    detalhe:'Pagamento confirmado: ID 42',                   nivel:'info' },
  { id:5, criado_em:'2025-01-14 09:15:44', usuario_login:'admin',      usuario_nome:'Administrador', avatar_cor:'#63dcaa', modulo:'usuarios',    acao:'criar',               entidade_nome:'Prof. João',          detalhe:'Usuário criado: prof.joao (perfil ID 3)',       nivel:'info' },
  { id:4, criado_em:'2025-01-14 09:10:00', usuario_login:'admin',      usuario_nome:'Administrador', avatar_cor:'#63dcaa', modulo:'sistema',     acao:'login',               entidade_nome:'',                    detalhe:'Login bem-sucedido — perfil: Administrador',    nivel:'info' },
  { id:3, criado_em:'2025-01-13 17:45:22', usuario_login:'secretaria', usuario_nome:'Secretaria',    avatar_cor:'#5b9cf6', modulo:'alunos',      acao:'editar',              entidade_nome:'Bruno Ferreira Costa',detalhe:'Aluno editado: ID 2',                           nivel:'info' },
  { id:2, criado_em:'2025-01-13 16:30:11', usuario_login:'admin',      usuario_nome:'Administrador', avatar_cor:'#63dcaa', modulo:'perfis',      acao:'criar',               entidade_nome:'Professor',           detalhe:'Perfil criado: Professor',                      nivel:'info' },
  { id:1, criado_em:'2025-01-13 09:00:00', usuario_login:'sistema',    usuario_nome:'Sistema',       avatar_cor:'#8b949e', modulo:'sistema',     acao:'inicializar',         entidade_nome:'',                    detalhe:'Banco de dados criado e seed aplicado.',        nivel:'info' },
]

const STATS_DEMO = {
  total: 7, hoje: 4, semana: 7,
  porModulo:  [{ modulo:'alunos',n:2 },{ modulo:'financeiro',n:1 },{ modulo:'usuarios',n:1 },{ modulo:'sistema',n:2 },{ modulo:'perfis',n:1 }],
  porAcao:    [{ acao:'criar',n:3 },{ acao:'login',n:2 },{ acao:'editar',n:1 },{ acao:'inicializar',n:1 }],
  porUsuario: [{ usuario_login:'admin',n:4 },{ usuario_login:'secretaria',n:2 },{ usuario_login:'sistema',n:1 }],
}
