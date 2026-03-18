/**
 * EditarPerfil.jsx
 * Tela dedicada para criar ou editar um perfil de acesso.
 * Rotas: /perfis/novo  e  /perfis/editar/:id
 * Mesmo padrão de duas colunas do EditarUsuario.jsx.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Shield, Check, AlertCircle, Users
} from 'lucide-react'
import { useUsuarios } from '../context/UsuariosContext.jsx'
import { useApp }      from '../context/AppContext.jsx'

// ── Constantes ─────────────────────────────────────────────────────────────────
const MODULOS = [
  { key:'dashboard',  label:'Dashboard',     emoji:'📊' },
  { key:'alunos',     label:'Alunos',        emoji:'👥' },
  { key:'financeiro', label:'Financeiro',    emoji:'💰' },
  { key:'cursos',     label:'Cursos',        emoji:'📚' },
  { key:'relatorios', label:'Relatórios',    emoji:'📈' },
  { key:'agenda',     label:'Agenda',        emoji:'📅' },
  { key:'config',     label:'Configurações', emoji:'⚙️'  },
  { key:'usuarios',   label:'Usuários',      emoji:'🔐' },
]

const NIVEIS = [
  { val:0, label:'Sem acesso', color:'var(--text-3)', bg:'var(--bg-hover)',    icon:'❌' },
  { val:1, label:'Visualizar', color:'var(--blue)',   bg:'var(--blu-dim)',     icon:'👁️' },
  { val:2, label:'Editar',     color:'var(--accent)', bg:'var(--accent-dim)', icon:'✏️' },
]

const AVATAR_CORES = [
  '#63dcaa','#5b9cf6','#f5c542','#f2617a',
  '#a78bfa','#f97316','#14b8a6','#ec4899',
]

const EMPTY_PERFIL = {
  nome:'', desc:'', cor:'#63dcaa',
  perm_dashboard:1, perm_alunos:1, perm_financeiro:0,
  perm_cursos:1, perm_relatorios:1, perm_agenda:1,
  perm_config:0, perm_usuarios:0,
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EditarPerfil() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isNovo   = !id

  const { perfis, usuarios, addPerfil, updatePerfil } = useUsuarios()
  const { showToast } = useApp()

  const [form,     setForm]     = useState({ ...EMPTY_PERFIL })
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)

  // Carrega perfil ao editar
  useEffect(() => {
    if (!isNovo && id) {
      const p = perfis.find(p => String(p.id) === String(id))
      if (p) setForm({ ...EMPTY_PERFIL, ...p })
    }
  }, [id, perfis, isNovo])

  function f(k, v) {
    setForm(x => ({ ...x, [k]: v }))
    if (erros[k]) setErros(e => ({ ...e, [k]: '' }))
  }

  function setNivel(mod, val) {
    setForm(x => ({ ...x, [`perm_${mod}`]: val }))
  }

  function validar() {
    const e = {}
    if (!form.nome?.trim()) e.nome = 'Nome do perfil é obrigatório'
    return e
  }

  async function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)
    const res = isNovo
      ? await addPerfil(form)
      : await updatePerfil(Number(id), form)
    setSalvando(false)
    if (!res.ok) {
      setErros({ nome: res.erro || 'Erro ao salvar' })
      return
    }
    showToast(isNovo ? 'Perfil criado!' : 'Perfil atualizado!')
    navigate('/usuarios?tab=perfis')
  }

  function cancelar() { navigate('/usuarios?tab=perfis') }

  // Dados contextuais
  const perfilExistente = !isNovo ? perfis.find(p => String(p.id) === String(id)) : null
  const usuariosComPerfil = !isNovo
    ? usuarios.filter(u => u.perfil_id === Number(id))
    : []

  const totalEditar = MODULOS.filter(m => form[`perm_${m.key}`] === 2).length
  const totalVer    = MODULOS.filter(m => form[`perm_${m.key}`] === 1).length
  const totalBloq   = MODULOS.filter(m => form[`perm_${m.key}`] === 0).length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={cancelar} style={{padding:'8px 12px'}}>
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{
            fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800,
            color:'var(--text-1)', letterSpacing:-.3,
          }}>
            {isNovo ? 'Novo Perfil de Acesso' : 'Editar Perfil'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNovo
              ? 'Defina nome, cor e permissões do novo perfil'
              : `Editando: ${perfilExistente?.nome || '—'}`
            }
          </div>
        </div>
        <button className="btn btn-secondary" onClick={cancelar} style={{minWidth:100}}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{minWidth:130}}>
          {salvando
            ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : <><Save size={14}/> {isNovo ? 'Criar perfil' : 'Salvar'}</>
          }
        </button>
      </div>

      {/* ── ERROS ── */}
      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{marginBottom:16}}>
          <AlertCircle size={15}/>
          <span>{Object.values(erros).find(Boolean)}</span>
        </div>
      )}

      {/* ── GRID: formulário + painel lateral ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>

        {/* ── COLUNA ESQUERDA: formulário ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Identificação */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7,
            }}>
              <Shield size={14} style={{color:'var(--accent)'}}/> Identificação
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Nome do Perfil *</label>
                <input
                  className="input"
                  placeholder="Ex: Coordenador, Secretaria..."
                  value={form.nome}
                  onChange={e => f('nome', e.target.value)}
                  style={{ borderColor: erros.nome ? 'var(--red)' : '' }}
                  autoFocus={isNovo}
                />
                {erros.nome && <span style={{fontSize:11,color:'var(--red)'}}>{erros.nome}</span>}
              </div>
              <div className="field">
                <label>Cor de identificação</label>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  {AVATAR_CORES.map(c => (
                    <div
                      key={c}
                      onClick={() => f('cor', c)}
                      style={{
                        width:26, height:26, borderRadius:'50%', background:c,
                        cursor:'pointer', transition:'transform .15s, box-shadow .15s',
                        border:`3px solid ${form.cor === c ? 'var(--text-1)' : 'transparent'}`,
                        boxSizing:'border-box',
                        transform: form.cor === c ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: form.cor === c ? `0 0 0 2px ${c}44` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="field form-full">
                <label>Descrição</label>
                <input
                  className="input"
                  placeholder="Breve descrição das responsabilidades deste perfil"
                  value={form.desc || ''}
                  onChange={e => f('desc', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Permissões */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:8, display:'flex', alignItems:'center', gap:7,
            }}>
              <Shield size={14} style={{color:'var(--blue)'}}/> Permissões por Módulo
            </div>
            <div className="alert alert-info" style={{marginBottom:14}}>
              <Shield size={13}/>
              <span style={{fontSize:12}}>
                Clique no nível desejado para cada módulo:
                <strong> ❌ Sem acesso · 👁️ Visualizar · ✏️ Editar</strong>
              </span>
            </div>

            {/* Cabeçalho da matriz */}
            <div style={{
              display:'grid', gridTemplateColumns:'1fr repeat(3, 100px)',
              background:'var(--bg-hover)', padding:'8px 14px',
              borderRadius:'8px 8px 0 0', borderBottom:'1px solid var(--border)',
            }}>
              <span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:.6,color:'var(--text-3)'}}>Módulo</span>
              {NIVEIS.map(n => (
                <span key={n.val} style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,color:n.color,textAlign:'center'}}>
                  {n.label}
                </span>
              ))}
            </div>

            {/* Linhas da matriz */}
            <div style={{border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden'}}>
              {MODULOS.map((mod, i) => {
                const nivel = form[`perm_${mod.key}`] ?? 0
                return (
                  <div
                    key={mod.key}
                    style={{
                      display:'grid', gridTemplateColumns:'1fr repeat(3, 100px)',
                      padding:'10px 14px', alignItems:'center',
                      borderBottom: i < MODULOS.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.02)',
                    }}
                  >
                    <span style={{fontSize:13, color:'var(--text-1)', fontWeight:450}}>
                      {mod.emoji} {mod.label}
                    </span>
                    {NIVEIS.map(n => (
                      <div key={n.val} style={{display:'flex',justifyContent:'center'}}>
                        <button
                          onClick={() => setNivel(mod.key, n.val)}
                          title={n.label}
                          style={{
                            width:26, height:26, borderRadius:'50%', border:'2px solid',
                            cursor:'pointer', transition:'all .15s',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            borderColor: nivel === n.val ? n.color : 'var(--border)',
                            background:  nivel === n.val ? n.bg    : 'transparent',
                          }}
                        >
                          {nivel === n.val && <Check size={12} style={{color:n.color}}/>}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: painel sticky ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:16 }}>

          {/* Preview do perfil */}
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{
              textAlign:'center', paddingBottom:14,
              borderBottom:'1px solid var(--border)', marginBottom:14,
            }}>
              <div style={{
                width:52, height:52, borderRadius:14, margin:'0 auto 10px',
                background: form.cor + '22',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Shield size={22} style={{color: form.cor}}/>
              </div>
              <div style={{
                fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700,
                color:'var(--text-1)',
              }}>
                {form.nome || 'Nome do perfil'}
              </div>
              {form.desc && (
                <div style={{fontSize:12, color:'var(--text-3)', marginTop:3}}>
                  {form.desc}
                </div>
              )}
              <div style={{marginTop:8}}>
                <span style={{
                  fontSize:11, fontWeight:600,
                  color: form.cor, background: form.cor + '22',
                  padding:'2px 12px', borderRadius:20,
                }}>
                  ● {form.nome || 'Perfil'}
                </span>
              </div>
            </div>

            {/* Resumo de permissões */}
            <div style={{display:'flex', flexDirection:'column', gap:7}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
                <span style={{color:'var(--text-3)'}}>✏️ Editar</span>
                <span style={{color:'var(--accent)', fontWeight:600}}>{totalEditar} módulo{totalEditar !== 1 ? 's' : ''}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
                <span style={{color:'var(--text-3)'}}>👁️ Visualizar</span>
                <span style={{color:'var(--blue)', fontWeight:600}}>{totalVer} módulo{totalVer !== 1 ? 's' : ''}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
                <span style={{color:'var(--text-3)'}}>❌ Sem acesso</span>
                <span style={{color:'var(--text-3)'}}>{totalBloq} módulo{totalBloq !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Módulos com acesso (chips) */}
            {(totalEditar + totalVer) > 0 && (
              <div style={{marginTop:12, display:'flex', flexWrap:'wrap', gap:4}}>
                {MODULOS.filter(m => form[`perm_${m.key}`] > 0).map(m => {
                  const nv = form[`perm_${m.key}`]
                  const n  = NIVEIS.find(n => n.val === nv)
                  return (
                    <span key={m.key} className="badge" style={{fontSize:10, background:n?.bg, color:n?.color}}>
                      {m.label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Usuários com este perfil (só ao editar) */}
          {!isNovo && (
            <div className="card" style={{padding:'16px 18px'}}>
              <div style={{
                fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700,
                color:'var(--text-1)', marginBottom:10, display:'flex', alignItems:'center', gap:6,
              }}>
                <Users size={13} style={{color:'var(--text-3)'}}/>
                Usuários com este perfil ({usuariosComPerfil.length})
              </div>
              {usuariosComPerfil.length === 0 ? (
                <div style={{fontSize:12, color:'var(--text-3)'}}>Nenhum usuário usa este perfil.</div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {usuariosComPerfil.map(u => (
                    <div key={u.id} style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'5px 8px', background:'var(--bg-hover)', borderRadius:8,
                    }}>
                      <div style={{
                        width:22, height:22, borderRadius:'50%', flexShrink:0,
                        background: u.avatar_cor || form.cor,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:9, fontWeight:700, color:'#fff',
                      }}>
                        {(u.nome || '?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
                      </div>
                      <span style={{fontSize:12, color:'var(--text-2)'}}>{u.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <button
              className="btn btn-primary"
              onClick={salvar}
              disabled={salvando}
              style={{width:'100%', justifyContent:'center'}}
            >
              {salvando
                ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                : <><Save size={14}/> {isNovo ? 'Criar perfil' : 'Salvar alterações'}</>
              }
            </button>
            <button
              className="btn btn-secondary"
              onClick={cancelar}
              style={{width:'100%', justifyContent:'center'}}
            >
              <ArrowLeft size={14}/> Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
