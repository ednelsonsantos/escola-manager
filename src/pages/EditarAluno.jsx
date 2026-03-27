/**
 * EditarAluno.jsx
 * Tela dedicada para criar ou editar um aluno.
 * Rotas: /alunos/novo  e  /alunos/editar/:id
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams }      from 'react-router-dom'
import {
  ArrowLeft, Save, AlertCircle, User,
  Mail, Phone, Calendar, BookOpen, DollarSign,
  FileText, UserCheck, Users
} from 'lucide-react'
import { useApp, formatBRL, formatDate } from '../context/AppContext.jsx'

const EMPTY_FORM = {
  nome:'', email:'', telefone:'',
  turmaId:'', mensalidade:'',
  status:'Ativo', dataNasc:'',
  dataMatricula: new Date().toISOString().split('T')[0],
  obs:'',
  respNome:'', respTelefone:'', respEmail:'', respParentesco:'',
}

function FieldError({ msg }) {
  if (!msg) return null
  return <span style={{fontSize:11,color:'var(--red)',marginTop:3,display:'block'}}>{msg}</span>
}

// ── Label com ícone ────────────────────────────────────────────────────────────
function FieldLabel({ icon: Icon, text, required }) {
  return (
    <label style={{display:'flex',alignItems:'center',gap:5}}>
      {Icon && <Icon size={12} style={{color:'var(--text-3)',flexShrink:0}}/>}
      {text}{required && <span style={{color:'var(--red)',marginLeft:1}}>*</span>}
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function EditarAluno() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isNovo   = !id

  const { alunos, turmas, professores, pagamentos, addAluno, updateAluno } = useApp()

  const [form,     setForm]     = useState({ ...EMPTY_FORM })
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)

  // Carrega dados do aluno ao editar
  useEffect(() => {
    if (!isNovo && id) {
      const a = alunos.find(a => String(a.id) === String(id))
      if (a) setForm({ ...EMPTY_FORM, ...a })
    }
  }, [id, alunos, isNovo])

  function f(k, v) {
    setForm(x => ({ ...x, [k]: v }))
    if (erros[k]) setErros(e => ({ ...e, [k]: '' }))
  }

  function validar() {
    const e = {}
    if (!form.nome?.trim())                 e.nome         = 'Nome é obrigatório'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                            e.email        = 'E-mail inválido'
    if (!form.mensalidade || Number(form.mensalidade) <= 0)
                                            e.mensalidade  = 'Informe o valor da mensalidade'
    return e
  }

  function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)

    const dados = { ...form, mensalidade: Number(form.mensalidade) }

    if (!isNovo) {
      const original = alunos.find(a => String(a.id) === String(id))

      // ── Detecta mudança de turma ─────────────────────────────────────────
      // Grava turmaAnteriorId e dataRematricula apenas quando a turma realmente
      // mudou para uma turma diferente (não limpeza de campo)
      const mudouTurma =
        original &&
        form.turmaId &&
        String(original.turmaId) !== String(form.turmaId)

      if (mudouTurma) {
        dados.turmaAnteriorId = original.turmaId
        dados.dataRematricula = new Date().toISOString().split('T')[0]
      }

      // ── Detecta reativação de status ─────────────────────────────────────
      // Grava dataReativacao quando o aluno volta para Ativo vindo de status
      // inativo (Inativo, Trancado ou Lista de Espera)
      const statusesInativos = ['Inativo', 'Trancado', 'Lista de Espera']
      const reativado =
        original &&
        statusesInativos.includes(original.status) &&
        form.status === 'Ativo'

      if (reativado) {
        dados.dataReativacao = new Date().toISOString().split('T')[0]
      }
    }

    if (isNovo) addAluno(dados)
    else        updateAluno(Number(id), dados)
    navigate('/alunos')
  }

  function cancelar() { navigate('/alunos') }

  // Dados contextuais
  const turma = turmas.find(t => t.id === Number(form.turmaId))
  const prof  = professores.find(p => p.id === turma?.professorId)
  const pgAluno = !isNovo
    ? pagamentos.filter(p => p.alunoId === Number(id)).slice().reverse().slice(0, 6)
    : []

  const STATUS_COLORS = { Ativo:'var(--accent)', Inativo:'var(--text-3)', Trancado:'var(--yellow)', 'Lista de Espera':'var(--blue)' }

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
            {isNovo ? 'Novo Aluno' : 'Editar Aluno'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNovo
              ? 'Preencha os dados para cadastrar um novo aluno'
              : `Editando: ${alunos.find(a=>String(a.id)===String(id))?.nome || '—'}`
            }
          </div>
        </div>
        <button className="btn btn-secondary" onClick={cancelar} style={{minWidth:100}}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{minWidth:130}}>
          {salvando
            ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : <><Save size={14}/> {isNovo ? 'Cadastrar' : 'Salvar'}</>
          }
        </button>
      </div>

      {/* ── ERROS GERAIS ── */}
      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{marginBottom:16}}>
          <AlertCircle size={15}/>
          <span>Corrija os campos destacados antes de salvar.</span>
        </div>
      )}

      {/* ── GRID: formulário + painel lateral ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>

        {/* ── COLUNA ESQUERDA: formulário ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Dados pessoais */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7,
            }}>
              <User size={14} style={{color:'var(--accent)'}}/>
              Dados Pessoais
            </div>

            <div className="form-grid">
              <div className="field form-full">
                <FieldLabel icon={User} text="Nome Completo" required/>
                <input className="input" placeholder="Nome completo do aluno"
                  value={form.nome} onChange={e=>f('nome',e.target.value)}
                  style={{borderColor:erros.nome?'var(--red)':''}}/>
                <FieldError msg={erros.nome}/>
              </div>

              <div className="field">
                <FieldLabel icon={Mail} text="E-mail"/>
                <input className="input" type="email" placeholder="email@exemplo.com"
                  value={form.email} onChange={e=>f('email',e.target.value)}
                  style={{borderColor:erros.email?'var(--red)':''}}/>
                <FieldError msg={erros.email}/>
              </div>

              <div className="field">
                <FieldLabel icon={Phone} text="Telefone"/>
                <input className="input" placeholder="(11) 99999-9999"
                  value={form.telefone} onChange={e=>f('telefone',e.target.value)}/>
              </div>

              <div className="field">
                <FieldLabel icon={Calendar} text="Data de Nascimento"/>
                <input className="input" type="date"
                  value={form.dataNasc} onChange={e=>f('dataNasc',e.target.value)}/>
              </div>

              <div className="field">
                <FieldLabel icon={Calendar} text="Data de Matrícula"/>
                <input className="input" type="date"
                  value={form.dataMatricula} onChange={e=>f('dataMatricula',e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Dados acadêmicos */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7,
            }}>
              <BookOpen size={14} style={{color:'var(--blue)'}}/>
              Dados Acadêmicos
            </div>

            <div className="form-grid">
              <div className="field">
                <FieldLabel icon={BookOpen} text="Turma"/>
                <select className="select" value={form.turmaId}
                  onChange={e=>f('turmaId',Number(e.target.value))}>
                  <option value="">Selecionar turma</option>
                  {turmas.filter(t=>t.ativa).map(t=>(
                    <option key={t.id} value={t.id}>{t.codigo} — {t.idioma} {t.nivel}</option>
                  ))}
                </select>
                {/* Preview da turma selecionada */}
                {turma && (
                  <div style={{
                    marginTop:8, padding:'8px 12px',
                    background:'var(--blu-dim)', borderRadius:8, fontSize:12, color:'var(--blue)',
                  }}>
                    📅 {turma.horario||'Sem horário'} · 👨‍🏫 {prof?.nome||'Sem professor'}
                  </div>
                )}
              </div>

              <div className="field">
                <FieldLabel icon={UserCheck} text="Status"/>
                <select className="select" value={form.status}
                  onChange={e=>f('status',e.target.value)}
                  style={{borderLeft:`3px solid ${STATUS_COLORS[form.status]||'var(--border)'}`}}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                  <option>Trancado</option>
                  <option>Lista de Espera</option>
                </select>
              </div>

              <div className="field">
                <FieldLabel icon={DollarSign} text="Mensalidade (R$)" required/>
                <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                  value={form.mensalidade} onChange={e=>f('mensalidade',e.target.value)}
                  style={{borderColor:erros.mensalidade?'var(--red)':''}}/>
                <FieldError msg={erros.mensalidade}/>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:12, display:'flex', alignItems:'center', gap:7,
            }}>
              <FileText size={14} style={{color:'var(--text-3)'}}/>
              Observações
            </div>
            <textarea className="textarea"
              placeholder="Informações adicionais sobre o aluno (alergias, necessidades especiais, etc.)..."
              value={form.obs} onChange={e=>f('obs',e.target.value)}
              style={{minHeight:90}}/>
          </div>

          {/* Responsável */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7,
            }}>
              <Users size={14} style={{color:'var(--purple)'}}/>
              Responsável
            </div>
            <div className="form-grid">
              <div className="field form-full">
                <FieldLabel icon={User} text="Nome do Responsável"/>
                <input className="input" placeholder="Nome completo do responsável"
                  value={form.respNome||''} onChange={e=>f('respNome',e.target.value)}/>
              </div>
              <div className="field">
                <FieldLabel icon={Phone} text="Telefone do Responsável"/>
                <div style={{display:'flex',gap:6}}>
                  <input className="input" placeholder="(11) 99999-9999"
                    value={form.respTelefone||''} onChange={e=>f('respTelefone',e.target.value)}/>
                  {form.respTelefone && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{flexShrink:0,padding:'0 10px',color:'#25d366'}}
                      title="Abrir WhatsApp"
                      onClick={()=>window.electronAPI?.whatsappAbrir(form.respTelefone,`Olá${form.respNome?' '+form.respNome:''}! Entramos em contato da ${form.nome ? form.nome+' — ' : ''}Escola Manager.`)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="field">
                <FieldLabel icon={Mail} text="E-mail do Responsável"/>
                <input className="input" type="email" placeholder="email@responsavel.com"
                  value={form.respEmail||''} onChange={e=>f('respEmail',e.target.value)}/>
              </div>
              <div className="field">
                <FieldLabel icon={UserCheck} text="Parentesco"/>
                <select className="select" value={form.respParentesco||''}
                  onChange={e=>f('respParentesco',e.target.value)}>
                  <option value="">Selecionar</option>
                  <option>Pai</option>
                  <option>Mãe</option>
                  <option>Avô/Avó</option>
                  <option>Tio/Tia</option>
                  <option>Responsável legal</option>
                  <option>Outro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: painel de contexto ── */}
        <div style={{display:'flex', flexDirection:'column', gap:14, position:'sticky', top:16}}>

          {/* Preview do aluno */}
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{textAlign:'center', paddingBottom:14, borderBottom:'1px solid var(--border)', marginBottom:14}}>
              <div style={{
                width:56, height:56, borderRadius:'50%', margin:'0 auto 10px',
                background:'var(--accent)', color:'var(--bg-app)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800,
              }}>
                {(form.nome||'?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()||'?'}
              </div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:'var(--text-1)'}}>
                {form.nome||'Nome do aluno'}
              </div>
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:3}}>
                {turma ? `${turma.idioma} · ${turma.nivel}` : 'Sem turma selecionada'}
              </div>
              <div style={{marginTop:8}}>
                <span style={{
                  fontSize:11,fontWeight:600,
                  color:STATUS_COLORS[form.status]||'var(--text-3)',
                  background:(STATUS_COLORS[form.status]||'var(--text-3)')+'22',
                  padding:'2px 10px',borderRadius:20,
                }}>
                  {form.status}
                </span>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {[
                ['Mensalidade', form.mensalidade ? formatBRL(Number(form.mensalidade)) : '—'],
                ['Turma',       turma?.codigo || '—'],
                ['Horário',     turma?.horario || '—'],
                ['Professor',   prof?.nome || '—'],
                ['Matrícula',   form.dataMatricula ? formatDate(form.dataMatricula) : '—'],
                ...(form.respNome ? [['Responsável', form.respNome]] : []),
                ...(form.respTelefone ? [['Tel. Resp.', form.respTelefone]] : []),
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>{k}</span>
                  <span style={{
                    color: k==='Mensalidade' ? 'var(--accent)' : 'var(--text-1)',
                    fontWeight: k==='Mensalidade' ? 600 : 400,
                  }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de pagamentos (só ao editar) */}
          {!isNovo && pgAluno.length > 0 && (
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{
                fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700,
                color:'var(--text-1)', marginBottom:12,
              }}>
                Últimos pagamentos
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {pgAluno.map(p=>(
                  <div key={p.id} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'7px 0', borderBottom:'1px solid var(--border)',
                    fontSize:12,
                  }}>
                    <div>
                      <div style={{color:'var(--text-1)',fontWeight:500}}>{p.mes}</div>
                      <div style={{color:'var(--text-3)',fontSize:11}}>Venc: {formatDate(p.vencimento)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'var(--text-1)'}}>{formatBRL(p.valor)}</div>
                      <span className={`badge ${p.status==='Pago'?'bg-green':p.status==='Atrasado'?'bg-red':'bg-yellow'}`} style={{fontSize:9}}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{width:'100%',justifyContent:'center'}}>
              {salvando
                ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                : <><Save size={14}/> {isNovo ? 'Cadastrar aluno' : 'Salvar alterações'}</>
              }
            </button>
            <button className="btn btn-secondary" onClick={cancelar}
              style={{width:'100%',justifyContent:'center'}}>
              <ArrowLeft size={14}/> Cancelar e voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
