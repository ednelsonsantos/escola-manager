/**
 * EditarUsuario.jsx
 * Tela dedicada para criar ou editar um usuário.
 * Abre como uma rota própria (/usuarios/novo e /usuarios/editar/:id)
 * em vez de um modal, resolvendo o problema da barra de rolagem.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Eye, EyeOff, Shield, Check,
  User, Mail, Lock, Palette, AlertCircle, CheckCircle
} from 'lucide-react'
import { useUsuarios }  from '../context/UsuariosContext.jsx'
import { useApp }       from '../context/AppContext.jsx'

// ── Constantes ────────────────────────────────────────────────────────────────
const MODULOS = [
  { key:'dashboard',  label:'Dashboard',     emoji:'📊' },
  { key:'alunos',     label:'Alunos',        emoji:'👥' },
  { key:'financeiro', label:'Financeiro',    emoji:'💰' },
  { key:'cursos',     label:'Cursos',        emoji:'📚' },
  { key:'relatorios', label:'Relatórios',    emoji:'📈' },
  { key:'agenda',     label:'Agenda',        emoji:'📅' },
  { key:'config',     label:'Configurações', emoji:'⚙️' },
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

function iniciais(nome) {
  return (nome || '?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function EditarUsuario() {
  const navigate = useNavigate()
  const { id }   = useParams() // undefined = novo usuário
  const isNovo   = !id

  const { usuarios, perfis, addUsuario, updateUsuario } = useUsuarios()
  const { showToast, professores } = useApp()

  const [form,    setForm]    = useState({
    nome:'', login:'', email:'', senha:'',
    perfilId:'', ativo:1, avatarCor:'#63dcaa', professorDbId:'',
  })
  const [showPw,  setShowPw]  = useState(false)
  const [erros,   setErros]   = useState({})
  const [salvando,setSalvando]= useState(false)

  const formIniciado = useRef(false)

  // Carrega usuário existente ao editar (apenas uma vez)
  useEffect(() => {
    if (!isNovo && id && !formIniciado.current) {
      const u = usuarios.find(u => String(u.id) === String(id))
      if (u) {
        setForm({
          nome:           u.nome            || '',
          login:          u.login           || '',
          email:          u.email           || '',
          senha:          '',
          perfilId:       u.perfil_id       || '',
          ativo:          u.ativo ?? 1,
          avatarCor:      u.avatar_cor      || '#63dcaa',
          professorDbId:  u.professor_db_id || '',
        })
        formIniciado.current = true
      }
    }
  }, [id, usuarios, isNovo])

  function f(k, v) {
    setForm(x => ({ ...x, [k]: v }))
    if (erros[k]) setErros(e => ({ ...e, [k]: '' }))
  }

  function validar() {
    const e = {}
    if (!form.nome?.trim())         e.nome     = 'Nome é obrigatório'
    if (isNovo && !form.login?.trim()) e.login  = 'Login é obrigatório'
    if (isNovo && (!form.senha || form.senha.length < 4))
                                    e.senha    = 'Senha deve ter pelo menos 4 caracteres'
    if (!form.perfilId)             e.perfilId = 'Selecione um perfil'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                    e.email    = 'E-mail inválido'
    return e
  }

  async function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)
    const payload = { ...form, professor_db_id: form.professorDbId ? Number(form.professorDbId) : null }
    const res = isNovo
      ? await addUsuario(payload)
      : await updateUsuario(Number(id), payload)
    setSalvando(false)
    if (res.ok) {
      showToast(isNovo ? 'Usuário criado!' : 'Usuário atualizado!')
      navigate('/usuarios')
    } else {
      showToast(res.erro || 'Erro ao salvar', 'error')
    }
  }

  function cancelar() { navigate('/usuarios') }

  // Perfil selecionado para preview
  const perfilSel = perfis.find(p => p.id === Number(form.perfilId))

  return (
    <div className="fade-up" style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── CABEÇALHO ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 24,
      }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={cancelar}
          style={{ padding: '8px 12px' }}
        >
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800,
            color: 'var(--text-1)', letterSpacing: -.3,
          }}>
            {isNovo ? 'Novo Usuário' : 'Editar Usuário'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {isNovo
              ? 'Preencha os dados e selecione o perfil de acesso'
              : `Editando: ${usuarios.find(u=>String(u.id)===String(id))?.nome || '—'}`
            }
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={cancelar}
          style={{ minWidth: 100 }}
        >
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={salvar}
          disabled={salvando}
          style={{ minWidth: 120 }}
        >
          {salvando
            ? <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#0d1a12', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            : <><Save size={14}/> {isNovo ? 'Criar usuário' : 'Salvar'}</>
          }
        </button>
      </div>

      {/* ── GRID PRINCIPAL ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── COLUNA ESQUERDA: dados pessoais ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Preview do avatar */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
              color: 'var(--text-1)', marginBottom: 16,
            }}>
              Identificação
            </div>

            {/* Avatar preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: form.avatarCor || '#63dcaa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff',
                flexShrink: 0, boxShadow: `0 4px 16px ${form.avatarCor}66`,
                transition: 'background .2s, box-shadow .2s',
              }}>
                {iniciais(form.nome || '?')}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                  {form.nome || 'Nome do usuário'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {form.login ? `@${form.login}` : '@login'}
                  {perfilSel && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 600,
                      color: perfilSel.cor, background: perfilSel.cor + '22',
                      padding: '1px 7px', borderRadius: 20,
                    }}>
                      {perfilSel.nome}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cor do avatar */}
            <div className="field">
              <label>Cor do avatar</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {AVATAR_CORES.map(c => (
                  <div key={c} onClick={() => f('avatarCor', c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    cursor: 'pointer', transition: 'transform .15s, border .15s',
                    border: `3px solid ${form.avatarCor === c ? 'var(--text-1)' : 'transparent'}`,
                    boxSizing: 'border-box',
                    transform: form.avatarCor === c ? 'scale(1.15)' : 'scale(1)',
                  }}/>
                ))}
              </div>
            </div>
          </div>

          {/* Dados básicos */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
              color: 'var(--text-1)', marginBottom: 16,
            }}>
              Dados de acesso
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Nome completo *</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
                  <input className="input" placeholder="Nome do usuário"
                    value={form.nome} onChange={e => f('nome', e.target.value)}
                    style={{ paddingLeft: 34, borderColor: erros.nome ? 'var(--red)' : '' }}/>
                </div>
                {erros.nome && <span style={{ fontSize:11, color:'var(--red)' }}>{erros.nome}</span>}
              </div>

              <div className="field">
                <label>Login * {isNovo ? '' : <span style={{color:'var(--text-3)',fontWeight:400}}>(não pode ser alterado)</span>}</label>
                <input className="input" placeholder="login_unico"
                  value={form.login} onChange={e => f('login', e.target.value.toLowerCase())}
                  disabled={!isNovo}
                  style={{
                    borderColor: erros.login ? 'var(--red)' : '',
                    opacity: !isNovo ? .6 : 1,
                    fontFamily: "'DM Mono','Courier New',monospace",
                  }}/>
                {erros.login && <span style={{ fontSize:11, color:'var(--red)' }}>{erros.login}</span>}
                {isNovo && <span className="input-hint">Apenas letras minúsculas, números e _</span>}
              </div>

              <div className="field">
                <label>E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
                  <input className="input" type="email" placeholder="email@escola.com"
                    value={form.email} onChange={e => f('email', e.target.value)}
                    style={{ paddingLeft: 34, borderColor: erros.email ? 'var(--red)' : '' }}/>
                </div>
                {erros.email && <span style={{ fontSize:11, color:'var(--red)' }}>{erros.email}</span>}
              </div>

              <div className="field">
                <label>
                  {isNovo ? 'Senha *' : 'Nova senha '}
                  {!isNovo && <span style={{color:'var(--text-3)',fontWeight:400}}>(deixe vazio para não alterar)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
                  <input className="input"
                    type={showPw ? 'text' : 'password'}
                    placeholder={isNovo ? 'Mínimo 4 caracteres' : '••••••••'}
                    value={form.senha} onChange={e => f('senha', e.target.value)}
                    style={{ paddingLeft: 34, paddingRight: 40, borderColor: erros.senha ? 'var(--red)' : '' }}/>
                  <button type="button" onClick={() => setShowPw(v=>!v)} style={{
                    position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex',
                  }}>
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                {erros.senha && <span style={{ fontSize:11, color:'var(--red)' }}>{erros.senha}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Perfil de acesso *</label>
                  <select className="select" value={form.perfilId} onChange={e => f('perfilId', Number(e.target.value))}
                    style={{ borderColor: erros.perfilId ? 'var(--red)' : '' }}>
                    <option value="">Selecionar</option>
                    {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  {erros.perfilId && <span style={{ fontSize:11, color:'var(--red)' }}>{erros.perfilId}</span>}
                </div>
                <div className="field">
                  <label>Status</label>
                  <select className="select" value={form.ativo} onChange={e => f('ativo', Number(e.target.value))}>
                    <option value={1}>Ativo</option>
                    <option value={0}>Inativo</option>
                  </select>
                </div>
              </div>

              {/* Vínculo com professor — aparece só para perfil Professor */}
              {perfilSel?.nome === 'Professor' && (
                <div className="field">
                  <label style={{ display:'flex', alignItems:'center', gap:5 }}>
                    Vincular ao professor
                    <span style={{ fontSize:10, color:'var(--text-3)', fontWeight:400 }}>
                      (identifica quem registra a frequência)
                    </span>
                  </label>
                  <select
                    className="select"
                    value={form.professorDbId}
                    onChange={e => f('professorDbId', e.target.value)}
                  >
                    <option value="">— não vinculado —</option>
                    {(professores || []).filter(p => p.ativo).map(p => (
                      <option key={p.id} value={p.id}>{p.nome} {p.idioma ? `· ${p.idioma}` : ''}</option>
                    ))}
                  </select>
                  {form.professorDbId && (
                    <span style={{ fontSize:11, color:'var(--accent)', marginTop:3, display:'block' }}>
                      Este usuário registrará frequência como {professores?.find(p=>String(p.id)===String(form.professorDbId))?.nome}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: permissões ── */}
        <div>
          <div className="card" style={{ padding: '20px 22px', position: 'sticky', top: 16 }}>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
              color: 'var(--text-1)', marginBottom: 4, display: 'flex',
              alignItems: 'center', gap: 8,
            }}>
              <Shield size={14} style={{ color: perfilSel?.cor || 'var(--text-3)' }}/>
              Permissões de acesso
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 16 }}>
              {perfilSel
                ? <>Herdadas do perfil <strong style={{ color: perfilSel.cor }}>{perfilSel.nome}</strong> · Para alterar, edite o perfil</>
                : 'Selecione um perfil ao lado para ver as permissões'
              }
            </div>

            {perfilSel ? (
              <>
                {/* Legenda */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                  {NIVEIS.map(n => (
                    <div key={n.val} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:n.color }}>
                      <span style={{
                        width:14, height:14, borderRadius:'50%', background:n.bg,
                        border:`1.5px solid ${n.color}`, display:'inline-block',
                      }}/>
                      {n.label}
                    </div>
                  ))}
                </div>

                {/* Módulos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {MODULOS.map(mod => {
                    const nivel = perfilSel[`perm_${mod.key}`] ?? 0
                    const n     = NIVEIS.find(n => n.val === nivel) || NIVEIS[0]
                    return (
                      <div key={mod.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', borderRadius: 9,
                        background: nivel > 0 ? n.bg : 'var(--bg-hover)',
                        border: `1px solid ${nivel > 0 ? n.color + '44' : 'var(--border)'}`,
                        transition: 'all .15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontSize: 15 }}>{mod.emoji}</span>
                          <span style={{
                            fontSize: 13, fontWeight: nivel > 0 ? 500 : 400,
                            color: nivel > 0 ? 'var(--text-1)' : 'var(--text-3)',
                          }}>
                            {mod.label}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: n.color,
                          background: n.bg, padding: '2px 9px', borderRadius: 20,
                        }}>
                          {n.icon} {n.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Resumo */}
                <div style={{
                  marginTop: 14, padding: '10px 12px',
                  background: 'var(--bg-hover)', borderRadius: 9,
                  fontSize: 12, color: 'var(--text-2)',
                }}>
                  {(() => {
                    const edita = MODULOS.filter(m => (perfilSel[`perm_${m.key}`]??0) >= 2)
                    const ve    = MODULOS.filter(m => (perfilSel[`perm_${m.key}`]??0) === 1)
                    const bloq  = MODULOS.filter(m => (perfilSel[`perm_${m.key}`]??0) === 0)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {edita.length > 0 && <span><strong style={{color:'var(--accent)'}}>✏️ Edita:</strong> {edita.map(m=>m.label).join(', ')}</span>}
                        {ve.length    > 0 && <span><strong style={{color:'var(--blue)'}}>👁️ Visualiza:</strong> {ve.map(m=>m.label).join(', ')}</span>}
                        {bloq.length  > 0 && <span><strong style={{color:'var(--text-3)'}}>❌ Bloqueado:</strong> {bloq.map(m=>m.label).join(', ')}</span>}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                color: 'var(--text-3)', border: '2px dashed var(--border)',
                borderRadius: 12,
              }}>
                <Shield size={36} style={{ opacity: .25, display:'block', margin:'0 auto 10px' }}/>
                <div style={{ fontSize: 13 }}>Selecione um perfil</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  As permissões aparecerão aqui
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Erros gerais */}
      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{ marginTop: 16 }}>
          <AlertCircle size={15}/>
          <span>Corrija os campos destacados antes de salvar.</span>
        </div>
      )}

      {/* Botões de ação — rodapé */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
      }}>
        <button className="btn btn-secondary" onClick={cancelar} style={{ minWidth: 100 }}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{ minWidth: 140 }}>
          {salvando
            ? <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#0d1a12', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            : <><Save size={14}/> {isNovo ? 'Criar usuário' : 'Salvar alterações'}</>
          }
        </button>
      </div>
    </div>
  )
}
