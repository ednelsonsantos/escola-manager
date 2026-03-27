import React, { useEffect, useState, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, DollarSign, BookOpen, Settings,
  Bell, Sun, Moon, ChevronRight,
  BarChart2, Calendar, Search, X, CheckCircle, AlertCircle, Info,
  AlertTriangle, Clock, TrendingUp, LogOut, UserCog, Shield, ClipboardList, MessageSquare, LayoutGrid, DoorOpen, Package
} from 'lucide-react'
import { useApp, formatBRL, mesAtualDinamico } from './context/AppContext.jsx'
import { useAuth }  from './context/AuthContext.jsx'
import Dashboard    from './pages/Dashboard.jsx'
import Alunos       from './pages/Alunos.jsx'
import Financeiro   from './pages/Financeiro.jsx'
import Cursos       from './pages/Cursos.jsx'
import Relatorios   from './pages/Relatorios.jsx'
import Agenda       from './pages/Agenda.jsx'
import Configuracoes from './pages/Configuracoes.jsx'
import Usuarios     from './pages/Usuarios.jsx'
import Sobre        from './pages/Sobre.jsx'
import AuditLog     from './pages/AuditLog.jsx'
import EditarUsuario from './pages/EditarUsuario.jsx'
import EditarPerfil  from './pages/EditarPerfil.jsx'
import EditarAluno      from './pages/EditarAluno.jsx'
import EditarTurma      from './pages/EditarTurma.jsx'
import EditarProfessor  from './pages/EditarProfessor.jsx'
import EditarEvento     from './pages/EditarEvento.jsx'
import Frequencia      from './pages/Frequencia.jsx'
import Recados        from './pages/Recados/Recados.jsx'
import GradeHorarios  from './pages/GradeHorarios.jsx'
import Inadimplentes  from './pages/Inadimplentes.jsx'
import CargaHoraria   from './pages/CargaHoraria.jsx'
import FluxoCaixa     from './pages/FluxoCaixa.jsx'
import ReservaSalas  from './pages/ReservaSalas.jsx'
import Notas         from './pages/Notas.jsx'
import Estoque       from './pages/Estoque.jsx'
import TitleBar     from './components/TitleBar.jsx'

const NAV_ITEMS = [
  { label:'Dashboard',  icon:LayoutDashboard, path:'/',             perm:'dashboard'  },
  { label:'Alunos',     icon:Users,           path:'/alunos',       perm:'alunos'     },
  { label:'Financeiro',    icon:DollarSign,      path:'/financeiro',            perm:'financeiro' },
  { label:'Fluxo de Caixa', icon:TrendingUp,      path:'/financeiro/fluxo-caixa', perm:'financeiro' },
  { label:'Cursos',     icon:BookOpen,        path:'/cursos',       perm:'cursos'     },
  { label:'Grade',         icon:LayoutGrid,      path:'/cursos/grade',          perm:'cursos'     },
  { label:'Carga Horária', icon:Clock,           path:'/cursos/carga-horaria',  perm:'cursos'     },
  { label:'Frequência',    icon:ClipboardList,   path:'/frequencia',            perm:'cursos'     },
  { label:'Notas',         icon:BookOpen,        path:'/cursos/notas',          perm:'cursos'     },
  { label:'Reserva de Salas', icon:DoorOpen,    path:'/agenda/salas',          perm:'agenda'     },
  { label:'Estoque',          icon:Package,     path:'/estoque',               perm:'config'     },
  { label:'Recados',    icon:MessageSquare,   path:'/recados',      perm:'dashboard'  },
  { label:'Relatórios', icon:BarChart2,       path:'/relatorios',   perm:'relatorios' },
  { label:'Agenda',     icon:Calendar,        path:'/agenda',       perm:'agenda'     },
]

const PAGE_META = {
  '/':             { title:'Dashboard',    sub:'Visão geral' },
  '/alunos':       { title:'Alunos',       sub:'Gestão de matrículas' },
  '/financeiro':   { title:'Financeiro',   sub:'Pagamentos e receitas' },
  '/financeiro/inadimplentes': { title:'Inadimplentes', sub:'Alunos com pagamentos em atraso' },
  '/financeiro/fluxo-caixa':  { title:'Fluxo de Caixa', sub:'Entradas e saídas financeiras' },
  '/cursos':       { title:'Cursos',       sub:'Turmas e professores' },
  '/cursos/grade': { title:'Grade de Horários', sub:'Visualização semanal das turmas' },
  '/cursos/carga-horaria': { title:'Carga Horária', sub:'Horas ministradas por professor' },
  '/cursos/notas':         { title:'Notas e Resultados', sub:'Lançamento de notas e ata de resultados' },
  '/relatorios':   { title:'Relatórios',   sub:'Análise de dados' },
  '/agenda':       { title:'Agenda',       sub:'Eventos e calendário' },
  '/agenda/salas': { title:'Reserva de Salas', sub:'Agenda e gestão de espaços' },
  '/estoque':      { title:'Estoque',          sub:'Material didático e recursos' },
  '/configuracoes':{ title:'Configurações',sub:'Preferências do sistema' },
  '/usuarios':     { title:'Usuários',     sub:'Contas e permissões' },
  '/sobre':        { title:'Sobre',        sub:'Informações do sistema e licença' },
  '/auditlog':     { title:'Log de Auditoria', sub:'Histórico de ações do sistema' },
  '/frequencia':   { title:'Frequência',   sub:'Chamada e controle de presença' },
  '/recados':      { title:'Recados',      sub:'Comunicados e mensagens' },
  '/alunos/novo':                  { title:'Novo Aluno',        sub:'Cadastrar novo aluno' },
  '/alunos/editar/:id':            { title:'Editar Aluno',      sub:'Alterar dados do aluno' },
  '/cursos/turmas/nova':           { title:'Nova Turma',        sub:'Criar nova turma' },
  '/cursos/turmas/editar/:id':     { title:'Editar Turma',      sub:'Alterar dados da turma' },
  '/cursos/professores/novo':      { title:'Novo Professor',    sub:'Cadastrar professor' },
  '/cursos/professores/editar/:id':{ title:'Editar Professor',  sub:'Alterar dados do professor' },
  '/agenda/novo':                  { title:'Novo Evento',       sub:'Adicionar evento ao calendário' },
  '/agenda/editar/:id':            { title:'Editar Evento',     sub:'Alterar evento' },
  '/usuarios/novo':                { title:'Novo Usuário',      sub:'Cadastrar nova conta de acesso' },
  '/usuarios/editar/:id':          { title:'Editar Usuário',    sub:'Alterar dados e perfil de acesso' },
  '/perfis/novo':                  { title:'Novo Perfil',        sub:'Criar perfil de acesso' },
  '/perfis/editar/:id':            { title:'Editar Perfil',      sub:'Alterar permissões do perfil' },
}

function SemAcesso() {
  return (
    <div className="empty" style={{paddingTop:80}}>
      <Shield size={52} style={{opacity:.3}}/>
      <p style={{fontSize:17,marginBottom:4}}>Acesso não permitido</p>
      <small>Você não tem permissão para visualizar este módulo.</small>
    </div>
  )
}

// ── NotifItem — item clicável do painel de notificações ──────────────────────
function NotifItem({ icon, iconBg, title, sub, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', gap:10, alignItems:'center',
        padding:'12px 16px', borderBottom:'1px solid var(--border)',
        cursor:'pointer',
        background: hover ? 'var(--bg-hover)' : 'transparent',
        transition:'background .12s',
      }}
    >
      <div style={{
        width:32, height:32, borderRadius:8, flexShrink:0,
        background:iconBg,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {icon}
      </div>
      <div>
        <div style={{fontSize:13, fontWeight:500, color:'var(--text-1)'}}>{title}</div>
        <div style={{fontSize:11, color:'var(--text-3)', marginTop:1}}>{sub}</div>
      </div>
    </div>
  )
}

// ── Guarded — lê permissões direto do AuthContext, definido FORA de App() ────
// Sendo definido fora, é uma referência estável — React não re-cria o tipo do
// componente a cada render de App, então Route children nunca desmontam por
// causa de toggles de estado do shell (notifOpen, searchOpen, etc.)
function Guarded({ perm: permKey, children }) {
  const { permissao } = useAuth()
  return permissao(permKey).podeVer ? children : <SemAcesso/>
}

// ── RecadosComUser — injeta o usuário do AuthContext no componente Recados ────
// Necessário pois AppRoutes é React.memo e não recebe props do App()
function RecadosComUser() {
  const { user } = useAuth()
  return <Recados usuarioAtual={user}/>
}

// ── AppRoutes — memoizado, só re-renderiza quando a rota muda ────────────────
// React.memo sem props: re-renderiza apenas quando useLocation muda internamente
// via react-router. Qualquer estado local de App (notifOpen, searchOpen, etc.)
// NÃO provoca re-render aqui — elimina o "flash" visual ao abrir notificações.
const AppRoutes = React.memo(function AppRoutes() {
  return (
    <div className="page-scroll">
      <Routes>
        <Route path="/"              element={<Guarded perm="dashboard"><Dashboard/></Guarded>}/>
        <Route path="/alunos"        element={<Guarded perm="alunos"><Alunos/></Guarded>}/>
        <Route path="/financeiro"    element={<Guarded perm="financeiro"><Financeiro/></Guarded>}/>
        <Route path="/cursos"        element={<Guarded perm="cursos"><Cursos/></Guarded>}/>
        <Route path="/relatorios"    element={<Guarded perm="relatorios"><Relatorios/></Guarded>}/>
        <Route path="/agenda"        element={<Guarded perm="agenda"><Agenda/></Guarded>}/>
        <Route path="/configuracoes" element={<Guarded perm="config"><Configuracoes/></Guarded>}/>
        <Route path="/usuarios"      element={<Guarded perm="usuarios"><Usuarios/></Guarded>}/>
        <Route path="/sobre"         element={<Sobre/>}/>
        <Route path="/alunos/novo"                    element={<Guarded perm="alunos"><EditarAluno/></Guarded>}/>
        <Route path="/alunos/editar/:id"              element={<Guarded perm="alunos"><EditarAluno/></Guarded>}/>
        <Route path="/cursos/turmas/nova"             element={<Guarded perm="cursos"><EditarTurma/></Guarded>}/>
        <Route path="/cursos/turmas/editar/:id"       element={<Guarded perm="cursos"><EditarTurma/></Guarded>}/>
        <Route path="/cursos/professores/novo"        element={<Guarded perm="cursos"><EditarProfessor/></Guarded>}/>
        <Route path="/cursos/professores/editar/:id"  element={<Guarded perm="cursos"><EditarProfessor/></Guarded>}/>
        <Route path="/frequencia"                     element={<Guarded perm="cursos"><Frequencia/></Guarded>}/>
        <Route path="/agenda/salas"                   element={<Guarded perm="agenda"><ReservaSalas/></Guarded>}/>
        <Route path="/cursos/grade"                   element={<Guarded perm="cursos"><GradeHorarios/></Guarded>}/>
        <Route path="/cursos/carga-horaria"           element={<Guarded perm="cursos"><CargaHoraria/></Guarded>}/>
        <Route path="/cursos/notas"                   element={<Guarded perm="cursos"><Notas/></Guarded>}/>
        <Route path="/financeiro/inadimplentes"       element={<Guarded perm="financeiro"><Inadimplentes/></Guarded>}/>
        <Route path="/financeiro/fluxo-caixa"         element={<Guarded perm="financeiro"><FluxoCaixa/></Guarded>}/>
        <Route path="/recados"                        element={<Guarded perm="dashboard"><RecadosComUser/></Guarded>}/>
        <Route path="/agenda/novo"                    element={<Guarded perm="agenda"><EditarEvento/></Guarded>}/>
        <Route path="/agenda/editar/:id"              element={<Guarded perm="agenda"><EditarEvento/></Guarded>}/>
        <Route path="/usuarios/novo"                  element={<Guarded perm="usuarios"><EditarUsuario/></Guarded>}/>
        <Route path="/usuarios/editar/:id"            element={<Guarded perm="usuarios"><EditarUsuario/></Guarded>}/>
        <Route path="/perfis/novo"                    element={<Guarded perm="usuarios"><EditarPerfil/></Guarded>}/>
        <Route path="/perfis/editar/:id"              element={<Guarded perm="usuarios"><EditarPerfil/></Guarded>}/>
        <Route path="/auditlog"                       element={<Guarded perm="usuarios"><AuditLog/></Guarded>}/>
        <Route path="/estoque"                        element={<Guarded perm="config"><Estoque/></Guarded>}/>
      </Routes>
    </div>
  )
})

export default function App() {
  const nav = useNavigate()
  const loc = useLocation()
  // ── Uma única chamada useApp — evita double-subscription que causa re-renders duplos ──
  const { tema, settings, updateSettings, toast, pagamentos, eventos, alunos } = useApp()
  const { user, logout, permissao, identidade } = useAuth()

  const [notifOpen,  setNotifOpen]  = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ,    setSearchQ]    = useState('')
  const notifRef  = useRef(null)
  const searchRef = useRef(null)

  const meta = PAGE_META[loc.pathname]
    || (loc.pathname.startsWith('/alunos/editar/')               ? PAGE_META['/alunos/editar/:id']              : null)
    || (loc.pathname.startsWith('/alunos/novo')                  ? PAGE_META['/alunos/novo']                    : null)
    || (loc.pathname.startsWith('/cursos/turmas/editar/')        ? PAGE_META['/cursos/turmas/editar/:id']       : null)
    || (loc.pathname.startsWith('/cursos/turmas/nova')           ? PAGE_META['/cursos/turmas/nova']             : null)
    || (loc.pathname.startsWith('/cursos/professores/editar/')   ? PAGE_META['/cursos/professores/editar/:id']  : null)
    || (loc.pathname.startsWith('/cursos/professores/novo')      ? PAGE_META['/cursos/professores/novo']        : null)
    || (loc.pathname.startsWith('/cursos/grade')                 ? PAGE_META['/cursos/grade']                  : null)
    || (loc.pathname.startsWith('/financeiro/inadimplentes')     ? PAGE_META['/financeiro/inadimplentes']      : null)
    || (loc.pathname.startsWith('/agenda/editar/')               ? PAGE_META['/agenda/editar/:id']              : null)
    || (loc.pathname.startsWith('/agenda/novo')                  ? PAGE_META['/agenda/novo']                    : null)
    || (loc.pathname.startsWith('/usuarios/editar/')             ? PAGE_META['/usuarios/editar/:id']            : null)
    || (loc.pathname.startsWith('/usuarios/novo')                ? PAGE_META['/usuarios/novo']                  : null)
    || (loc.pathname.startsWith('/perfis/editar/')               ? PAGE_META['/perfis/editar/:id']              : null)
    || (loc.pathname.startsWith('/perfis/novo')                  ? PAGE_META['/perfis/novo']                    : null)
    || { title:'Escola Manager', sub:'' }
  const nomeEscola = identidade?.nome_escola || settings?.escola?.nome || 'Escola Manager'
  const logoBase64 = identidade?.logo_base64 || ''

  useEffect(() => { document.documentElement.setAttribute('data-theme', tema) }, [tema])

  useEffect(() => {
    function h(e) {
      if (notifRef.current  && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); setSearchQ('') }
    }
    // mousedown sem capture: fecha ao clicar fora, mas não interfere com
    // o onClick dos itens internos (que já pararam propagação com stopPropagation)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const fn = e => { if ((e.ctrlKey||e.metaKey)&&e.key==='k') { e.preventDefault(); setSearchOpen(o=>!o); setSearchQ('') } }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  const toggleTema = () => updateSettings('aparencia', { tema: tema==='dark'?'light':'dark' })

  const mesAtual      = mesAtualDinamico()
  const notifAtiva    = settings?.sistema?.notificacoes ?? true
  // Notificações financeiras apenas para quem tem acesso ao módulo financeiro
  const podeVerFinanceiro = permissao('financeiro').podeVer
  const podeVerAgenda     = permissao('agenda').podeVer
  const inadimplentes = notifAtiva && podeVerFinanceiro ? pagamentos.filter(p=>p.mes===mesAtual&&p.status==='Atrasado') : []
  const pendentes     = notifAtiva && podeVerFinanceiro ? pagamentos.filter(p=>p.mes===mesAtual&&p.status==='Pendente') : []
  const todayStr      = new Date().toISOString().split('T')[0]
  const eventosHoje   = notifAtiva && podeVerAgenda ? eventos.filter(e=>e.data===todayStr) : []
  const notifCount    = inadimplentes.length + (pendentes.length>0?1:0) + (eventosHoje.length>0?1:0)

  const searchResults = searchQ.length>1 ? [
    ...alunos.filter(a=>a.nome.toLowerCase().includes(searchQ.toLowerCase())).slice(0,4).map(a=>({ type:'aluno', label:a.nome, sub:a.email||'', action:()=>{nav('/alunos');setSearchOpen(false);setSearchQ('')} })),
    ...eventos.filter(e=>e.titulo.toLowerCase().includes(searchQ.toLowerCase())).slice(0,3).map(e=>({ type:'evento', label:e.titulo, sub:e.data, action:()=>{nav('/agenda');setSearchOpen(false);setSearchQ('')} })),
    ...NAV_ITEMS.filter(n=>n.label.toLowerCase().includes(searchQ.toLowerCase())).map(n=>({ type:'page', label:n.label, sub:'Ir para página', action:()=>{nav(n.path);setSearchOpen(false);setSearchQ('')} })),
  ] : []

  function wClose()    { window.electronAPI?.closeWindow() }
  function wMinimize() { window.electronAPI?.minimizeWindow() }
  function wMaximize() { window.electronAPI?.maximizeWindow() }

  // Permissões
  const permConfig   = permissao('config')
  const permUsuarios = permissao('usuarios')

  // Filtered nav based on permissions
  const navVisivel = NAV_ITEMS.filter(item => permissao(item.perm).podeVer)

  const zoomAtual = settings?.aparencia?.fontSize === 'compacto' ? 0.88
                  : settings?.aparencia?.fontSize === 'grande'   ? 1.10
                  : 1

  return (
    <div className="app-shell" data-theme={tema} style={{
      ...(settings?.aparencia?.accentColor && settings.aparencia.accentColor !== '#63dcaa' ? {
        '--accent':      settings.aparencia.accentColor,
        '--accent-dim':  settings.aparencia.accentColor + '22',
        '--accent-glow': settings.aparencia.accentColor + '44',
      } : {}),
    }}>
      {/* SIDEBAR — zoom compensado: sidebar não escala com o app-shell,
           mas precisa da height corrigida para preencher a viewport visível */}
      <aside className="sidebar" style={{
        zoom: 1 / zoomAtual,
        height: `calc(100vh * ${zoomAtual})`,
      }}>
        <div className="sidebar-logo">
          {logoBase64
            ? <img src={logoBase64} alt="Logo" style={{height:32,maxWidth:80,objectFit:'contain'}}/>
            : <div className="logo-mark">🎓</div>
          }
          <div className="logo-words">
            <div className="logo-main" style={{maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nomeEscola.split(' ')[0]}</div>
            <div className="logo-sub">Manager v5</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Principal</div>
          {navVisivel.map(item=>(
            <button key={item.path} className={`nav-btn${loc.pathname===item.path?' active':''}`} onClick={()=>nav(item.path)}>
              <item.icon/>
              {item.label}
              {item.label==='Financeiro' && inadimplentes.length>0 && <span className="nav-badge">{inadimplentes.length}</span>}
              {item.label==='Agenda'     && eventosHoje.length>0   && <span className="nav-badge" style={{background:'var(--blue)'}}>{eventosHoje.length}</span>}
            </button>
          ))}

          <div className="nav-label" style={{marginTop:8}}>Administração</div>
          {permUsuarios.podeVer && (
            <button className={`nav-btn${loc.pathname==='/usuarios'?' active':''}`} onClick={()=>nav('/usuarios')}>
              <UserCog/> Usuários
            </button>
          )}
          {permUsuarios.podeVer && (
            <button className={`nav-btn${loc.pathname==='/auditlog'?' active':''}`} onClick={()=>nav('/auditlog')}>
              <Shield size={16}/> Log de Auditoria
            </button>
          )}
          {permConfig.podeVer && (
            <button className={`nav-btn${loc.pathname==='/configuracoes'?' active':''}`} onClick={()=>nav('/configuracoes')}>
              <Settings/> Configurações
            </button>
          )}
          <button className={`nav-btn${loc.pathname==='/sobre'?' active':''}`} onClick={()=>nav('/sobre')}>
            <Info size={16}/> Sobre
          </button>
        </nav>

        {/* Rodapé do usuário */}
        <div className="sidebar-footer">
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'8px 10px', borderRadius:10,
            background:'var(--bg-hover)',
          }}>
            {/* Avatar */}
            <div style={{
              width:32, height:32, borderRadius:8, flexShrink:0,
              background:user?.avatar_cor||'var(--accent)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, color:'#fff',
            }}>
              {(user?.nome||'AD').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
            </div>
            {/* Info */}
            <div style={{flex:1, minWidth:0}}>
              <div style={{
                fontSize:13, fontWeight:600, color:'var(--text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>
                {user?.nome||'Usuário'}
              </div>
              <div style={{
                fontSize:11, color:user?.perfil_cor||'var(--text-3)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>
                {user?.perfil_nome||'—'}
              </div>
            </div>
            {/* Botão Sair */}
            <button
              title="Sair"
              onClick={logout}
              style={{
                background:'none', border:'none', cursor:'pointer',
                color:'var(--text-3)', padding:4, borderRadius:6,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, transition:'color .15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text-3)'}
            >
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      {/* MAIN — zoom aplicado aqui, não na sidebar */}
      <div className="main-area" style={{ zoom: zoomAtual }}>
        <header className="topbar">
          <div>
            <div className="topbar-title">{meta.title}</div>
            <div className="topbar-sub">{meta.sub}</div>
          </div>
          <div className="topbar-actions">
            {/* Search */}
            <div ref={searchRef} style={{position:'relative'}}>
              <button className="btn btn-secondary btn-sm" style={{gap:6,paddingRight:10}} onClick={()=>setSearchOpen(o=>!o)}>
                <Search size={14}/><span style={{fontSize:11,color:'var(--text-3)',fontWeight:400}}>Ctrl+K</span>
              </button>
              {searchOpen && (
                <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:360,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'var(--shadow-lg)',zIndex:1000,overflow:'hidden',animation:'fadeUp .2s ease'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                    <Search size={14} style={{color:'var(--text-3)',flexShrink:0}}/>
                    <input autoFocus value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                      placeholder="Buscar alunos, eventos, páginas..."
                      style={{background:'none',border:'none',outline:'none',color:'var(--text-1)',fontFamily:"'DM Sans',sans-serif",fontSize:13.5,flex:1}}/>
                    {searchQ&&<button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}} onClick={()=>setSearchQ('')}><X size={13}/></button>}
                  </div>
                  {searchResults.length>0
                    ? <div style={{padding:6}}>
                        {searchResults.map((r,i)=>(
                          <div key={i} onClick={r.action}
                            style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,cursor:'pointer',transition:'background .15s'}}
                            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <div style={{width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',
                              background:r.type==='aluno'?'var(--accent-dim)':r.type==='evento'?'var(--blu-dim)':'var(--bg-hover)',fontSize:13}}>
                              {r.type==='aluno'?'👤':r.type==='evento'?'📅':'→'}
                            </div>
                            <div>
                              <div style={{fontSize:13.5,color:'var(--text-1)',fontWeight:450}}>{r.label}</div>
                              <div style={{fontSize:11,color:'var(--text-3)'}}>{r.sub}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    : <div style={{padding:'20px',textAlign:'center',fontSize:13,color:'var(--text-3)'}}>
                        {searchQ.length>1?`Nenhum resultado para "${searchQ}"`:'Digite para buscar...'}
                      </div>
                  }
                </div>
              )}
            </div>

            {/* ── NOTIFICAÇÕES ── */}
            <div ref={notifRef} style={{position:'relative'}}>
              <button
                className="btn btn-secondary btn-sm"
                style={{padding:'7px 10px', position:'relative'}}
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setNotifOpen(o => !o)}
              >
                <Bell size={14}/>
                {notifCount > 0 && (
                  <span style={{
                    position:'absolute', top:-4, right:-4,
                    background:'var(--red)', color:'#fff',
                    fontSize:9, fontWeight:700, borderRadius:'50%',
                    width:16, height:16,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    pointerEvents:'none',
                  }}>
                    {notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    position:'absolute', top:'calc(100% + 8px)', right:0,
                    width:320, background:'var(--bg-card)',
                    border:'1px solid var(--border)', borderRadius:12,
                    boxShadow:'var(--shadow-lg)', zIndex:1000,
                    animation:'fadeUp .2s ease', overflow:'hidden',
                  }}
                >
                  {/* Cabeçalho */}
                  <div style={{
                    padding:'12px 16px', borderBottom:'1px solid var(--border)',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                  }}>
                    <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:'var(--text-1)'}}>
                      Notificações
                    </span>
                    <span className="badge bg-gray">{notifCount}</span>
                  </div>

                  {/* Item: Inadimplentes */}
                  {inadimplentes.length > 0 && (
                    <NotifItem
                      icon={<AlertTriangle size={15} style={{color:'var(--red)'}}/>}
                      iconBg="var(--red-dim)"
                      title={`${inadimplentes.length} pagamento${inadimplentes.length > 1 ? 's' : ''} em atraso`}
                      sub={`${formatBRL(inadimplentes.reduce((s,p)=>s+p.valor,0))} em aberto · Ver detalhes`}
                      onClick={() => {
                        setNotifOpen(false)
                        nav('/financeiro/inadimplentes')
                      }}
                    />
                  )}

                  {/* Item: Pendentes */}
                  {pendentes.length > 0 && (
                    <NotifItem
                      icon={<Clock size={15} style={{color:'var(--yellow)'}}/>}
                      iconBg="var(--yel-dim)"
                      title={`${pendentes.length} pagamento${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''}`}
                      sub="Aguardando confirmação"
                      onClick={() => {
                        setNotifOpen(false)
                        if (loc.pathname !== '/financeiro') nav('/financeiro')
                      }}
                    />
                  )}

                  {/* Itens: Eventos de hoje */}
                  {eventosHoje.map(ev => (
                    <NotifItem
                      key={ev.id}
                      icon={<Calendar size={15} style={{color:'var(--blue)'}}/>}
                      iconBg="var(--blu-dim)"
                      title={`Hoje: ${ev.titulo}`}
                      sub={ev.hora || 'Dia todo'}
                      onClick={() => {
                        setNotifOpen(false)
                        if (loc.pathname !== '/agenda') nav('/agenda')
                      }}
                    />
                  ))}

                  {/* Estado vazio */}
                  {notifCount === 0 && (
                    <div style={{padding:'24px', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
                      <div style={{fontSize:24, marginBottom:6}}>✅</div>
                      Tudo em dia!
                    </div>
                  )}

                  {/* Rodapé */}
                  {notifCount > 0 && (
                    <div style={{
                      padding:'10px 16px', borderTop:'1px solid var(--border)',
                      display:'flex', justifyContent:'flex-end',
                    }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{fontSize:11}}
                        onClick={() => setNotifOpen(false)}
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="theme-toggle" onClick={toggleTema} title="Alternar tema">
              {tema==='dark'?<Sun size={16}/>:<Moon size={16}/>}
            </button>
            {/* Window controls — integrado ao topbar */}
            <div className="win-ctrl" style={{padding:0,borderLeft:'1px solid var(--border)',marginLeft:4}}>
              <button className="wbtn tbtn" title="Minimizar" onClick={wMinimize} style={{width:46,height:54}}>
                <svg width="11" height="11" viewBox="0 0 11 2" fill="none"><rect y="0.5" width="11" height="1.1" rx="0.5" fill="currentColor"/></svg>
              </button>
              <button className="wbtn tbtn" title={isMaximized?"Restaurar":"Maximizar"} onClick={()=>{wMaximize();setIsMaximized(v=>!v)}} style={{width:46,height:54}}>
                {isMaximized
                  ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2.5" y="0.5" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.1"/><rect x="0.5" y="2.5" width="7" height="7" rx="0.5" fill="var(--bg-side)" stroke="currentColor" strokeWidth="1.1"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.1"/></svg>
                }
              </button>
              <button className="wbtn tbtn tbtn-close" title="Fechar" onClick={wClose} style={{width:46,height:54}}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </header>

        <AppRoutes/>
      </div>

      {toast&&(
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type==='success'&&<CheckCircle size={16}/>}
          {toast.type==='error'  &&<AlertCircle size={16}/>}
          {toast.type==='info'   &&<Info size={16}/>}
          {toast.type==='warning'&&<AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
