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
  FileText, UserCheck
} from 'lucide-react'
import { useApp, formatBRL, formatDate } from '../context/AppContext.jsx'

const EMPTY_FORM = {
  nome:'', email:'', telefone:'',
  turmaId:'', mensalidade:'',
  status:'Ativo', dataNasc:'',
  dataMatricula: new Date().toISOString().split('T')[0],
  obs:'',
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

  const STATUS_COLORS = { Ativo:'var(--accent)', Inativo:'var(--text-3)', Trancado:'var(--yellow)' }

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
