import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, DollarSign, Users, Briefcase } from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

const TIPO_CONFIG = {
  reuniao:    { label:'Reunião',    color:'#5b9cf6', icon:Users,      bg:'var(--blu-dim)' },
  prova:      { label:'Prova',      color:'#f2617a', icon:BookOpen,   bg:'var(--red-dim)' },
  atividade:  { label:'Atividade',  color:'#a78bfa', icon:Briefcase,  bg:'var(--pur-dim)' },
  financeiro: { label:'Financeiro', color:'#63dcaa', icon:DollarSign, bg:'var(--accent-dim)' },
  turma:      { label:'Turma',      color:'#f5c542', icon:BookOpen,   bg:'var(--yel-dim)' },
  feriado:    { label:'Feriado',    color:'#f97316', icon:Calendar,   bg:'rgba(249,115,22,0.12)' },
  outro:      { label:'Outro',      color:'#8b949e', icon:Calendar,   bg:'rgba(139,148,158,0.12)' },
}

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const EMPTY_EVENTO = { titulo:'', data:'', hora:'', tipo:'reuniao', desc:'', turmaId:'' }

export default function Agenda() {
  const { eventos, addEvento, updateEvento, deleteEvento, turmas } = useApp()
  const nav = useNavigate()

  const today = new Date()
  const [ano,   setAno]   = useState(today.getFullYear())
  const [mes,   setMes]   = useState(today.getMonth()) // 0-indexed
  const [modal, setModal] = useState(null)
  const [sel,   setSel]   = useState(null)
  const [form,  setForm]  = useState(EMPTY_EVENTO)
  const [view,  setView]  = useState('mes') // 'mes' | 'lista'
  const [filtroTipo, setFiltroTipo] = useState('todos')

  function f(k,v) { setForm(x=>({...x,[k]:v})) }

  function openAdd(data='') { nav('/agenda/novo', { state: { data } }) }
  function openEdit(ev)   { nav(`/agenda/editar/${ev.id}`) }
  function openDel(ev)    { setSel(ev); setModal('confirm') }

  function save() {
    if (!form.titulo || !form.data) return
    modal==='add' ? addEvento(form) : updateEvento(sel.id,form)
    setModal(null)
  }
  function del() { deleteEvento(sel.id); setModal(null) }

  function prevMes() { if (mes===0){setMes(11);setAno(a=>a-1)}else setMes(m=>m-1) }
  function nextMes() { if (mes===11){setMes(0);setAno(a=>a+1)}else setMes(m=>m+1) }

  // Build calendar grid
  const diasNoMes   = new Date(ano, mes+1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const cells = []
  for (let i=0; i<primeiroDia; i++) cells.push(null)
  for (let d=1; d<=diasNoMes; d++) cells.push(d)

  function isoDate(d) {
    return `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  function eventosNoDia(d) {
    const iso = isoDate(d)
    return eventos.filter(e=>e.data===iso)
  }

  const isToday = (d) => {
    const t = new Date()
    return d===t.getDate() && mes===t.getMonth() && ano===t.getFullYear()
  }

  // Lista view - all events sorted
  const eventosFiltrados = useMemo(()=>{
    return [...eventos]
      .filter(e => filtroTipo==='todos' || e.tipo===filtroTipo)
      .sort((a,b)=>a.data.localeCompare(b.data))
  }, [eventos, filtroTipo])

  // Upcoming (next 30 days) for sidebar
  const todayStr = today.toISOString().split('T')[0]
  const in30 = new Date(today); in30.setDate(in30.getDate()+30)
  const in30Str = in30.toISOString().split('T')[0]
  const proximos = eventos.filter(e=>e.data>=todayStr&&e.data<=in30Str).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,8)

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16}}>
        {/* MAIN CALENDAR */}
        <div>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button className="btn btn-ghost btn-sm" style={{padding:'6px 8px'}} onClick={prevMes}><ChevronLeft size={16}/></button>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:'var(--text-1)',minWidth:180,textAlign:'center'}}>
                {MESES_NOMES[mes]} {ano}
              </div>
              <button className="btn btn-ghost btn-sm" style={{padding:'6px 8px'}} onClick={nextMes}><ChevronRight size={16}/></button>
            </div>
            <div style={{display:'flex',gap:8}}>
              <div className="tabs" style={{margin:0}}>
                <button className={`tab${view==='mes'?' active':''}`} onClick={()=>setView('mes')}>Mês</button>
                <button className={`tab${view==='lista'?' active':''}`} onClick={()=>setView('lista')}>Lista</button>
              </div>
              <button className="btn btn-primary btn-sm" onClick={()=>openAdd()}><Plus size={14}/> Evento</button>
            </div>
          </div>

          {/* CALENDAR GRID */}
          {view==='mes' && (
            <div className="card" style={{overflow:'hidden',padding:0}}>
              {/* Day headers */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
                {DIAS_SEMANA.map(d=>(
                  <div key={d} style={{padding:'10px 0',textAlign:'center',fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--text-3)'}}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Cells */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                {cells.map((d,i)=>{
                  const evs = d ? eventosNoDia(d) : []
                  const todayCell = d && isToday(d)
                  return (
                    <div key={i} onClick={()=>d&&openAdd(isoDate(d))}
                      style={{
                        minHeight:90, padding:'8px 8px 6px',
                        borderRight:((i+1)%7===0)?'none':'1px solid var(--border)',
                        borderBottom:'1px solid var(--border)',
                        background: d ? 'transparent' : 'rgba(128,128,128,0.02)',
                        cursor:d?'pointer':'default',
                        transition:'background .15s',
                        position:'relative',
                      }}
                      onMouseEnter={e=>{ if(d) e.currentTarget.style.background='var(--bg-hover)' }}
                      onMouseLeave={e=>{ if(d) e.currentTarget.style.background='transparent' }}
                    >
                      {d && (
                        <>
                          <div style={{
                            width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                            marginBottom:4,fontSize:12.5,fontWeight:todayCell?700:400,
                            background:todayCell?'var(--accent)':'transparent',
                            color:todayCell?'var(--bg-app)':'var(--text-2)',
                          }}>
                            {d}
                          </div>
                          {evs.slice(0,3).map(ev=>{
                            const cfg = TIPO_CONFIG[ev.tipo]||TIPO_CONFIG.outro
                            return (
                              <div key={ev.id}
                                onClick={e=>{e.stopPropagation();openEdit(ev)}}
                                style={{
                                  background:cfg.color+'22', color:cfg.color,
                                  fontSize:10, fontWeight:600, padding:'2px 6px',
                                  borderRadius:4, marginBottom:2, cursor:'pointer',
                                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                                  borderLeft:`2px solid ${cfg.color}`,
                                }}
                              >{ev.titulo}</div>
                            )
                          })}
                          {evs.length>3&&<div style={{fontSize:10,color:'var(--text-3)',paddingLeft:4}}>+{evs.length-3} mais</div>}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* LISTA VIEW */}
          {view==='lista' && (
            <div>
              <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                <button className={`btn btn-xs ${filtroTipo==='todos'?'btn-primary':'btn-secondary'}`} onClick={()=>setFiltroTipo('todos')}>Todos</button>
                {Object.entries(TIPO_CONFIG).map(([k,v])=>(
                  <button key={k} className={`btn btn-xs ${filtroTipo===k?'btn-primary':'btn-secondary'}`} onClick={()=>setFiltroTipo(k)}>
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="tbl-wrap">
                {eventosFiltrados.length===0
                  ? <div className="empty"><Calendar size={40}/><p>Nenhum evento.</p></div>
                  : <table>
                      <thead><tr><th>Data</th><th>Hora</th><th>Título</th><th>Tipo</th><th>Turma</th><th style={{width:80}}>Ações</th></tr></thead>
                      <tbody>
                        {eventosFiltrados.map(ev=>{
                          const cfg = TIPO_CONFIG[ev.tipo]||TIPO_CONFIG.outro
                          const t   = turmas.find(t=>t.id===Number(ev.turmaId))
                          const past = ev.data < todayStr
                          return (
                            <tr key={ev.id} style={{opacity:past?.6:1}}>
                              <td className="td-name">{formatDate(ev.data)}</td>
                              <td className="td-muted">{ev.hora||'—'}</td>
                              <td>
                                <div className="td-name">{ev.titulo}</div>
                                {ev.desc&&<div className="td-muted">{ev.desc}</div>}
                              </td>
                              <td>
                                <span className="badge" style={{background:cfg.color+'22',color:cfg.color}}>{cfg.label}</span>
                              </td>
                              <td>{t?<span className="badge bg-blue">{t.codigo}</span>:'—'}</td>
                              <td>
                                <div style={{display:'flex',gap:4}}>
                                  <button className="btn btn-ghost btn-xs" onClick={()=>openEdit(ev)}><Pencil size={12}/></button>
                                  <button className="btn btn-danger btn-xs" onClick={()=>openDel(ev)}><Trash2 size={12}/></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                }
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: próximos eventos */}
        <div>
          <div className="chart-card" style={{position:'sticky',top:0}}>
            <div className="chart-title" style={{marginBottom:14}}>Próximos 30 dias</div>
            {proximos.length===0
              ? <div style={{color:'var(--text-3)',fontSize:13,textAlign:'center',padding:'24px 0'}}>Nenhum evento próximo.</div>
              : proximos.map(ev=>{
                  const cfg = TIPO_CONFIG[ev.tipo]||TIPO_CONFIG.outro
                  const Icon = cfg.icon
                  return (
                    <div key={ev.id} onClick={()=>openEdit(ev)}
                      style={{
                        display:'flex',gap:10,alignItems:'flex-start',padding:'10px 0',
                        borderBottom:'1px solid var(--border)',cursor:'pointer',
                      }}
                    >
                      <div style={{width:32,height:32,borderRadius:8,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Icon size={14} style={{color:cfg.color}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:450,color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.titulo}</div>
                        <div style={{fontSize:11,color:'var(--text-3)'}}>{formatDate(ev.data)}{ev.hora?` · ${ev.hora}`:''}</div>
                      </div>
                    </div>
                  )
                })
            }
            <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginTop:12}} onClick={()=>openAdd()}>
              <Plus size={13}/> Novo evento
            </button>
          </div>
        </div>
      </div>

      {/* Criação/edição de eventos agora em tela dedicada: /agenda/novo e /agenda/editar/:id */}

      {modal==='confirm'&&<ConfirmModal title="Excluir Evento" msg={`Excluir "${sel?.titulo}"?`} onConfirm={del} onClose={()=>setModal(null)} danger/>}
    </div>
  )
}
