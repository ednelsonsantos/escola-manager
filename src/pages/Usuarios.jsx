import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Shield, Users,
  Check, X, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
import { useUsuarios } from '../context/UsuariosContext.jsx'
import { useApp }      from '../context/AppContext.jsx'
import { useAuth }     from '../context/AuthContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

// ── Configuração de módulos ────────────────────────────────────────────────────
const MODULOS = [
  { key:'dashboard',  label:'Dashboard'   },
  { key:'alunos',     label:'Alunos'      },
  { key:'financeiro', label:'Financeiro'  },
  { key:'cursos',     label:'Cursos'      },
  { key:'relatorios', label:'Relatórios'  },
  { key:'agenda',     label:'Agenda'      },
  { key:'config',     label:'Configurações'},
  { key:'usuarios',   label:'Usuários'    },
]

const NIVEIS = [
  { val:0, label:'Sem acesso', color:'var(--text-3)', bg:'var(--bg-hover)' },
  { val:1, label:'Visualizar', color:'var(--blue)',   bg:'var(--blu-dim)'  },
  { val:2, label:'Editar',     color:'var(--accent)', bg:'var(--accent-dim)'},
]

const AVATAR_CORES = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316','#14b8a6','#ec4899']

// ── Componente: Seletor de nível de permissão ─────────────────────────────────
function PermSelector({ value, onChange }) {
  const n = NIVEIS.find(n=>n.val===value) || NIVEIS[0]
  const next = () => onChange((value+1) % 3)
  return (
    <button onClick={next} style={{
      padding:'3px 10px', borderRadius:6, border:'none', cursor:'pointer',
      background:n.bg, color:n.color, fontSize:11, fontWeight:600,
      transition:'all .15s', minWidth:82, fontFamily:"'DM Sans',sans-serif"
    }}>
      {n.label}
    </button>
  )
}

// ── Componente: Matriz de permissões de um perfil ──────────────────────────────
function MatrizPermissoes({ form, setForm, readOnly=false }) {
  return (
    <div style={{border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr repeat(3,80px)',background:'var(--bg-hover)',padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>
        <span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:.6,color:'var(--text-3)'}}>Módulo</span>
        {NIVEIS.map(n=><span key={n.val} style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:n.color,textAlign:'center'}}>{n.label}</span>)}
      </div>
      {MODULOS.map((mod,i)=>(
        <div key={mod.key} style={{
          display:'grid',gridTemplateColumns:'1fr repeat(3,80px)',
          padding:'9px 14px', alignItems:'center',
          borderBottom: i<MODULOS.length-1 ? '1px solid var(--border)' : 'none',
          background: i%2===0?'transparent':'rgba(128,128,128,0.02)'
        }}>
          <span style={{fontSize:13,color:'var(--text-1)',fontWeight:450}}>{mod.label}</span>
          {NIVEIS.map(n=>(
            <div key={n.val} style={{display:'flex',justifyContent:'center'}}>
              {!readOnly
                ? <button onClick={()=>setForm(f=>({...f,[`perm_${mod.key}`]:n.val}))}
                    style={{
                      width:22,height:22,borderRadius:'50%',border:'2px solid',
                      cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'center',justifyContent:'center',
                      borderColor: form[`perm_${mod.key}`]===n.val ? n.color : 'var(--border)',
                      background:  form[`perm_${mod.key}`]===n.val ? n.bg : 'transparent',
                    }}>
                    {form[`perm_${mod.key}`]===n.val && <Check size={11} style={{color:n.color}}/>}
                  </button>
                : <span style={{fontSize:12,color:form[`perm_${mod.key}`]===n.val?n.color:'var(--border)',textAlign:'center'}}>
                    {form[`perm_${mod.key}`]===n.val ? '●' : '○'}
                  </span>
              }
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Usuarios() {
  const { usuarios, perfis, loadingU, addUsuario, updateUsuario, removeUsuario, addPerfil, updatePerfil, removePerfil } = useUsuarios()
  const nav = useNavigate()
  const loc = useLocation()
  const { showToast } = useApp()
  const { permissao } = useAuth()
  const perm = permissao('usuarios')

  // Lê aba da query string (?tab=perfis) para retorno do EditarPerfil
  const tabInicial = new URLSearchParams(loc.search).get('tab') === 'perfis' ? 'perfis' : 'usuarios'
  const [tab,      setTab]    = useState(tabInicial)
  const [sel,      setSel]    = useState(null)
  const [confirm,  setConfirm]= useState(null)  // {tipo, item}
  const [expandP,  setExpandP]= useState(null)

  // ── Usuários ────────────────────────────────────────────────────────────────
  function abrirAddU()    { nav('/usuarios/novo') }
  function abrirEditU(u)  { nav(`/usuarios/editar/${u.id}`) }
  function abrirDelU(u)   { setSel(u); setConfirm({ tipo:'usuario', item:u }) }

  async function confirmarDelU() {
    const res = await removeUsuario(confirm.item.id)
    if (!res.ok) { showToast(res.erro||'Erro ao remover', 'error'); setConfirm(null); return }
    showToast('Usuário removido.', 'info')
    setConfirm(null)
  }

  // ── Perfis ──────────────────────────────────────────────────────────────────
  function abrirAddP()   { nav('/perfis/novo') }
  function abrirEditP(p) { nav(`/perfis/editar/${p.id}`) }
  function abrirDelP(p)  { setSel(p); setConfirm({ tipo:'perfil', item:p }) }

  async function confirmarDelP() {
    const res = await removePerfil(confirm.item.id)
    if (!res.ok) { showToast(res.erro||'Erro ao remover', 'error'); setConfirm(null); return }
    showToast('Perfil removido.', 'info')
    setConfirm(null)
  }

  function iniciais(nome) { return nome?.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()||'??' }

  if (!perm.podeVer) {
    return (
      <div className="empty">
        <Shield size={48}/>
        <p style={{fontSize:16}}>Sem permissão</p>
        <small>Você não tem acesso a este módulo.</small>
      </div>
    )
  }

  return (
    <div className="fade-up">
      {/* HEADER TABS */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div className="tabs" style={{margin:0}}>
          <button className={`tab${tab==='usuarios'?' active':''}`} onClick={()=>setTab('usuarios')}>
            <Users size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Usuários ({usuarios.length})
          </button>
          <button className={`tab${tab==='perfis'?' active':''}`} onClick={()=>setTab('perfis')}>
            <Shield size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Perfis ({perfis.length})
          </button>
        </div>
        {perm.podeEditar && (
          tab==='usuarios'
            ? <button className="btn btn-primary btn-sm" onClick={abrirAddU}><Plus size={14}/> Novo Usuário</button>
            : <button className="btn btn-primary btn-sm" onClick={abrirAddP}><Plus size={14}/> Novo Perfil</button>
        )}
      </div>

      {/* ── ABA USUÁRIOS ── */}
      {tab==='usuarios' && (
        <div className="tbl-wrap">
          {loadingU
            ? <div className="empty"><RefreshCw size={28} style={{animation:'spin .7s linear infinite'}}/><p>Carregando...</p></div>
            : usuarios.length===0
              ? <div className="empty"><Users size={40}/><p>Nenhum usuário cadastrado.</p></div>
              : <table>
                  <thead><tr>
                    <th>Usuário</th><th>Login</th><th>Perfil</th><th>Permissões (resumo)</th><th>Status</th><th>Último acesso</th>
                    {perm.podeEditar && <th style={{width:90}}>Ações</th>}
                  </tr></thead>
                  <tbody>
                    {usuarios.map(u=>{
                      const p = perfis.find(p=>p.id===u.perfil_id)||{}
                      const totalAcesso = MODULOS.filter(m=>(p[`perm_${m.key}`]||0)>=1).length
                      const totalEditar = MODULOS.filter(m=>(p[`perm_${m.key}`]||0)>=2).length
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div style={{width:32,height:32,borderRadius:'50%',background:u.avatar_cor||'#63dcaa',
                                display:'flex',alignItems:'center',justifyContent:'center',
                                fontSize:12,fontWeight:700,color:'#fff',fontFamily:"'Syne',sans-serif",flexShrink:0}}>
                                {iniciais(u.nome)}
                              </div>
                              <div>
                                <div className="td-name">{u.nome}</div>
                                <div className="td-muted">{u.email||'—'}</div>
                              </div>
                            </div>
                          </td>
                          <td><code style={{fontSize:12,background:'var(--bg-hover)',padding:'2px 7px',borderRadius:5,color:'var(--accent)'}}>{u.login}</code></td>
                          <td>
                            <span className="badge" style={{background:u.perfil_cor+'22',color:u.perfil_cor,border:`1px solid ${u.perfil_cor}44`}}>
                              {u.perfil_nome}
                            </span>
                          </td>
                          <td>
                            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                              <span className="badge bg-green" style={{fontSize:10}}>{totalEditar} edit.</span>
                              <span className="badge bg-blue"  style={{fontSize:10}}>{totalAcesso} vis.</span>
                              {(MODULOS.length-totalAcesso)>0 && <span className="badge bg-gray" style={{fontSize:10}}>{MODULOS.length-totalAcesso} bloq.</span>}
                            </div>
                          </td>
                          <td>
                            {u.ativo
                              ? <span className="badge bg-green"><span className="bdot"/>Ativo</span>
                              : <span className="badge bg-gray">Inativo</span>}
                          </td>
                          <td className="td-muted">{u.ultimo_acesso ? u.ultimo_acesso.split(' ')[0] : '—'}</td>
                          {perm.podeEditar && (
                            <td>
                              <div style={{display:'flex',gap:3}}>
                                <button className="btn btn-ghost btn-xs" onClick={()=>abrirEditU(u)}><Pencil size={12}/></button>
                                <button className="btn btn-danger btn-xs" onClick={()=>abrirDelU(u)}><Trash2 size={12}/></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          }
        </div>
      )}

      {/* ── ABA PERFIS ── */}
      {tab==='perfis' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {perfis.map(p=>{
            const qtdUsuarios = usuarios.filter(u=>u.perfil_id===p.id).length
            const isExpanded  = expandP===p.id
            return (
              <div key={p.id} className="card" style={{overflow:'hidden'}}>
                {/* Header do card de perfil */}
                <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',cursor:'pointer'}}
                  onClick={()=>setExpandP(isExpanded?null:p.id)}>
                  <div style={{width:36,height:36,borderRadius:9,background:p.cor+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Shield size={16} style={{color:p.cor}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:'var(--text-1)',display:'flex',alignItems:'center',gap:8}}>
                      {p.nome}
                      <span style={{width:8,height:8,borderRadius:'50%',background:p.cor,display:'inline-block'}}/>
                    </div>
                    <div style={{fontSize:12,color:'var(--text-3)'}}>{p.desc||'Sem descrição'} · {qtdUsuarios} usuário{qtdUsuarios!==1?'s':''}</div>
                  </div>
                  {/* Mini badges dos módulos */}
                  <div style={{display:'flex',gap:3,flexWrap:'wrap',maxWidth:300}}>
                    {MODULOS.filter(m=>p[`perm_${m.key}`]>0).map(m=>{
                      const nv = p[`perm_${m.key}`]
                      const n  = NIVEIS.find(n=>n.val===nv)
                      return (
                        <span key={m.key} className="badge" style={{fontSize:9,background:n?.bg,color:n?.color}}>
                          {m.label}
                        </span>
                      )
                    })}
                  </div>
                  <div style={{display:'flex',gap:4,marginLeft:8}}>
                    {perm.podeEditar && (
                      <>
                        <button className="btn btn-ghost btn-xs" onClick={e=>{e.stopPropagation();abrirEditP(p)}}><Pencil size={12}/></button>
                        <button className="btn btn-danger btn-xs" onClick={e=>{e.stopPropagation();abrirDelP(p)}}><Trash2 size={12}/></button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp size={14} style={{color:'var(--text-3)'}}/> : <ChevronDown size={14} style={{color:'var(--text-3)'}}/> }
                  </div>
                </div>

                {/* Matriz expandida */}
                {isExpanded && (
                  <div style={{padding:'0 18px 16px'}}>
                    <MatrizPermissoes form={p} setForm={()=>{}} readOnly={true}/>
                    {qtdUsuarios>0 && (
                      <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
                        <span style={{fontSize:11,color:'var(--text-3)'}}>Usuários com este perfil:</span>
                        {usuarios.filter(u=>u.perfil_id===p.id).map(u=>(
                          <div key={u.id} style={{display:'flex',alignItems:'center',gap:5,background:'var(--bg-hover)',padding:'3px 9px',borderRadius:20}}>
                            <div style={{width:16,height:16,borderRadius:'50%',background:u.avatar_cor||p.cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'#fff'}}>
                              {iniciais(u.nome)}
                            </div>
                            <span style={{fontSize:11,color:'var(--text-2)'}}>{u.nome}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Criação/edição de usuário agora é feita em tela dedicada: /usuarios/novo e /usuarios/editar/:id */}

      {/* Criação/edição de perfil agora em tela dedicada: /perfis/novo e /perfis/editar/:id */}

      {/* ── CONFIRMS ── */}
      {confirm?.tipo==='usuario' && (
        <ConfirmModal title="Excluir Usuário"
          msg={`Excluir o usuário "${confirm.item.nome}" (${confirm.item.login})? Esta ação não pode ser desfeita.`}
          onConfirm={confirmarDelU} onClose={()=>setConfirm(null)} danger/>
      )}
      {confirm?.tipo==='perfil' && (
        <ConfirmModal title="Excluir Perfil"
          msg={`Excluir o perfil "${confirm.item.nome}"? Certifique-se de que nenhum usuário usa este perfil.`}
          onConfirm={confirmarDelP} onClose={()=>setConfirm(null)} danger/>
      )}
    </div>
  )
}
