/**
 * EditarAluno.jsx
 * Tela dedicada para criar ou editar um aluno.
 * Rotas: /alunos/novo  e  /alunos/editar/:id
 * v5.12 — suporte a múltiplos cursos + desconto
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams }      from 'react-router-dom'
import {
  ArrowLeft, Save, AlertCircle, User,
  Mail, Phone, Calendar, BookOpen, DollarSign,
  FileText, UserCheck, Users, Plus, Trash2, Tag, Percent
} from 'lucide-react'
import { useApp, formatBRL, formatDate } from '../context/AppContext.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function hoje() { return new Date().toISOString().split('T')[0] }

function EMPTY_MATRICULA() { return { turmaId: '', mensalidade: '' } }

function EMPTY_FORM() {
  return {
    nome: '', email: '', telefone: '',
    status: 'Ativo', dataNasc: '',
    dataMatricula: hoje(),
    obs: '',
    respEhProprio: false,
    respNome: '', respTelefone: '', respEmail: '', respParentesco: '',
    // Acadêmico
    matriculas: [EMPTY_MATRICULA()],
    turmasEsperaIds: [],
    cursoEspera: '',
    statusMotivo: '',
    manterVaga: false,
    manterVagaDias: '',
    descontoAtivo: false,
    descontoTipo: 'percentual',
    descontoValor: '',
  }
}

// Reconstrói o estado de form a partir dos dados do aluno (BD)
function alunoParaForm(a) {
  const base = EMPTY_FORM()

  // Matrículas: se o aluno já tem o array, usa; senão reconstrói do campo único
  let matriculas = []
  if (Array.isArray(a.matriculas) && a.matriculas.length > 0) {
    matriculas = a.matriculas.map(m => ({
      turmaId:    String(m.turmaId || ''),
      mensalidade: String(m.mensalidade ?? ''),
    }))
  } else if (a.turmaId) {
    matriculas = [{ turmaId: String(a.turmaId), mensalidade: String(a.mensalidade ?? '') }]
  } else {
    matriculas = [EMPTY_MATRICULA()]
  }

  const descontoAtivo = !!a.descontoTipo
  const descontoTipo  = a.descontoTipo || 'percentual'
  const descontoValor = a.descontoValor > 0 ? String(a.descontoValor) : ''

  return {
    ...base,
    nome:           a.nome          || '',
    email:          a.email         || '',
    telefone:       a.telefone      || '',
    status:         a.status        || 'Ativo',
    dataNasc:       a.dataNasc      || '',
    dataMatricula:  a.dataMatricula || hoje(),
    obs:            a.obs           || '',
    respEhProprio:  !!a.respEhProprio,
    respNome:       a.respNome      || '',
    respTelefone:   a.respTelefone  || '',
    respEmail:      a.respEmail     || '',
    respParentesco: a.respParentesco|| '',
    matriculas,
    descontoAtivo,
    descontoTipo,
    descontoValor,
    turmasEsperaIds: Array.isArray(a.turmasEsperaIds) && a.turmasEsperaIds.length > 0
      ? a.turmasEsperaIds.map(Number)
      : (a.turmaEsperaId ? [Number(a.turmaEsperaId)] : []),
    cursoEspera:    a.cursoEspera   || '',
    statusMotivo:   a.statusMotivo  || '',
    manterVaga:     !!a.manterVaga,
    manterVagaDias: a.manterVagaDias ? String(a.manterVagaDias) : '',
  }
}

function FieldError({ msg }) {
  if (!msg) return null
  return <span style={{fontSize:11,color:'var(--red)',marginTop:3,display:'block'}}>{msg}</span>
}

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

  const [form,     setForm]     = useState(EMPTY_FORM)
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)

  // Ref para garantir que o form só é inicializado UMA VEZ ao editar,
  // mesmo que o array `alunos` mude enquanto o usuário digita
  const formIniciado = useRef(false)

  useEffect(() => {
    if (!isNovo && id && !formIniciado.current) {
      const a = alunos.find(a => String(a.id) === String(id))
      if (a) {
        setForm(alunoParaForm(a))
        formIniciado.current = true
      }
    }
  }, [id, alunos, isNovo])

  // Funções de atualização do form
  function f(k, v) {
    if (k === 'status' && v === 'Lista de Espera') {
      // Ao mudar para Lista de Espera: zera matrículas (libera vagas)
      setForm(x => ({
        ...x, status: v,
        matriculas: [EMPTY_MATRICULA()],
        turmasEsperaIds: [], cursoEspera: '',
      }))
      setErros(e => ({ ...e, status: '', matriculas: '' }))
      return
    }
    setForm(x => ({ ...x, [k]: v }))
    if (erros[k]) setErros(e => ({ ...e, [k]: '' }))
  }

  // ── Matrículas ───────────────────────────────────────────────────────────
  function addMatricula() {
    setForm(x => ({ ...x, matriculas: [...x.matriculas, EMPTY_MATRICULA()] }))
  }

  function removeMatricula(idx) {
    setForm(x => ({
      ...x,
      matriculas: x.matriculas.length > 1
        ? x.matriculas.filter((_, i) => i !== idx)
        : [EMPTY_MATRICULA()],
    }))
  }

  function updateMatricula(idx, key, val) {
    setForm(x => ({
      ...x,
      matriculas: x.matriculas.map((m, i) => i === idx ? { ...m, [key]: val } : m),
    }))
    if (erros[`matricula_${idx}_${key}`])
      setErros(e => ({ ...e, [`matricula_${idx}_${key}`]: '' }))
  }

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const totalBruto = useMemo(() =>
    form.matriculas.reduce((s, m) => s + Number(String(m.mensalidade || '0').replace(',', '.') || 0), 0),
  [form.matriculas])

  const descontoCalc = useMemo(() => {
    if (!form.descontoAtivo || !form.descontoValor) return 0
    const v = Number(String(form.descontoValor).replace(',', '.') || 0)
    if (form.descontoTipo === 'percentual') return totalBruto * v / 100
    return v
  }, [form.descontoAtivo, form.descontoTipo, form.descontoValor, totalBruto])

  const totalLiquido = Math.max(0, totalBruto - descontoCalc)

  // ── Validação ─────────────────────────────────────────────────────────────
  function validar() {
    const e = {}
    if (!form.nome?.trim()) e.nome = 'Nome é obrigatório'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'E-mail inválido'

    // Pelo menos 1 matrícula com mensalidade (não obrigatório em Lista de Espera)
    if (form.status !== 'Lista de Espera') {
      const validas = form.matriculas.filter(m => m.turmaId || String(m.mensalidade).trim())
      if (validas.length === 0 || totalBruto <= 0)
        e.matriculas = 'Informe pelo menos um curso com valor de mensalidade'
    }

    return e
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)

    const matriculasLimpas = form.matriculas
      .filter(m => m.turmaId || Number(m.mensalidade) > 0)
      .map(m => ({
        turmaId:    Number(m.turmaId) || null,
        mensalidade: Number(String(m.mensalidade).replace(',', '.') || 0),
      }))

    const dados = {
      ...form,
      matriculas:   matriculasLimpas,
      descontoValor: form.descontoAtivo ? Number(String(form.descontoValor || '0').replace(',', '.')) : 0,
      _permitirMensalidadeZero: form.status === 'Lista de Espera',
      turmasEsperaIds: form.status === 'Lista de Espera' ? (form.turmasEsperaIds || []) : [],
      turmaEsperaId:  form.status === 'Lista de Espera' ? (form.turmasEsperaIds?.[0] || null) : null,
      cursoEspera:    form.status === 'Lista de Espera' ? (form.cursoEspera || '') : '',
      statusMotivo:   (form.status === 'Inativo' || form.status === 'Trancado') ? (form.statusMotivo || '') : '',
      manterVaga:     (form.status === 'Inativo' || form.status === 'Trancado') ? (form.manterVaga ? 1 : 0) : 0,
      manterVagaDias: (form.status === 'Inativo' || form.status === 'Trancado') && form.manterVaga ? (Number(form.manterVagaDias) || 0) : 0,
      // Legado — preenchido pelo database helper
      turmaId:      form.status === 'Lista de Espera' ? null : (matriculasLimpas[0]?.turmaId ?? null),
      mensalidade:  form.status === 'Lista de Espera' ? 0 : totalLiquido,
    }

    if (!isNovo) {
      const original = alunos.find(a => String(a.id) === String(id))
      const turmaIdNovo = matriculasLimpas[0]?.turmaId ?? null
      const mudouTurma  = original && turmaIdNovo && String(original.turmaId) !== String(turmaIdNovo)
      if (mudouTurma) {
        dados.turmaAnteriorId = original.turmaId
        dados.dataRematricula = hoje()
      }
      const inativos = ['Inativo', 'Trancado', 'Lista de Espera']
      if (original && inativos.includes(original.status) && form.status === 'Ativo') {
        dados.dataReativacao = hoje()
      }
    }

    if (isNovo) addAluno(dados)
    else        updateAluno(Number(id), dados)
    navigate('/alunos')
  }

  function cancelar() { navigate('/alunos') }

  // ── Dados contextuais ─────────────────────────────────────────────────────
  const turmasAtivas    = turmas.filter(t => t.ativa)
  const turmasPrimaria  = turmas.find(t => t.id === Number(form.matriculas[0]?.turmaId))
  const profPrimario    = professores.find(p => p.id === turmasPrimaria?.professorId)
  const pgAluno         = !isNovo
    ? pagamentos.filter(p => p.alunoId === Number(id)).slice().reverse().slice(0, 6)
    : []

  const STATUS_COLORS = {
    Ativo: 'var(--accent)', Inativo: 'var(--text-3)',
    Trancado: 'var(--yellow)', 'Lista de Espera': 'var(--blue)',
  }

  // Turmas já usadas para evitar seleção duplicada
  const turmasUsadas = form.matriculas.map(m => String(m.turmaId)).filter(Boolean)

  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={cancelar} style={{padding:'8px 12px'}}>
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'var(--text-1)', letterSpacing:-.3 }}>
            {isNovo ? 'Novo Aluno' : 'Editar Aluno'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNovo
              ? 'Preencha os dados para cadastrar um novo aluno'
              : `Editando: ${alunos.find(a=>String(a.id)===String(id))?.nome || '—'}`}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={cancelar} style={{minWidth:100}}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{minWidth:130}}>
          {salvando
            ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : <><Save size={14}/> {isNovo ? 'Cadastrar' : 'Salvar'}</>
          }
        </button>
      </div>

      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{marginBottom:16}}>
          <AlertCircle size={15}/>
          <span>Corrija os campos destacados antes de salvar.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>

        {/* ── COLUNA ESQUERDA ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Dados pessoais */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
              <User size={14} style={{color:'var(--accent)'}}/> Dados Pessoais
            </div>
            <div className="form-grid">
              <div className="field form-full">
                <FieldLabel icon={User} text="Nome Completo" required/>
                <input className="input" placeholder="Nome completo do aluno"
                  value={form.nome} onChange={e => f('nome', e.target.value)}
                  style={{borderColor: erros.nome ? 'var(--red)' : ''}}/>
                <FieldError msg={erros.nome}/>
              </div>

              <div className="field">
                <FieldLabel icon={Mail} text="E-mail"/>
                <input className="input" type="email" placeholder="email@exemplo.com"
                  value={form.email} onChange={e => f('email', e.target.value)}
                  style={{borderColor: erros.email ? 'var(--red)' : ''}}/>
                <FieldError msg={erros.email}/>
              </div>

              <div className="field">
                <FieldLabel icon={Phone} text="Telefone"/>
                <input className="input" placeholder="(11) 99999-9999"
                  value={form.telefone} onChange={e => f('telefone', e.target.value)}/>
              </div>

              <div className="field">
                <FieldLabel icon={Calendar} text="Data de Nascimento"/>
                <input className="input" type="date"
                  value={form.dataNasc} onChange={e => f('dataNasc', e.target.value)}/>
              </div>

              <div className="field">
                <FieldLabel icon={Calendar} text="Data de Matrícula"/>
                <input className="input" type="date"
                  value={form.dataMatricula} onChange={e => f('dataMatricula', e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Dados acadêmicos — múltiplos cursos */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <BookOpen size={14} style={{color:'var(--blue)'}}/> Dados Acadêmicos
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <FieldLabel icon={UserCheck} text="Status"/>
                <select className="select" value={form.status}
                  onChange={e => f('status', e.target.value)}
                  style={{borderLeft:`3px solid ${STATUS_COLORS[form.status]||'var(--border)'}`,minWidth:150}}>
                  <option>Ativo</option>
                  {!isNovo && <option>Inativo</option>}
                  {!isNovo && <option>Trancado</option>}
                  <option>Lista de Espera</option>
                </select>
              </div>
            </div>

            {/* ── INATIVO / TRANCADO: motivo + manter vaga (só ao editar) ── */}
            {!isNovo && (form.status === 'Inativo' || form.status === 'Trancado') && (
              <div style={{padding:'14px 16px',background:'var(--yellow)11',border:'1px solid var(--yellow)44',borderRadius:10,marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,fontSize:12,fontWeight:600,color:'var(--yellow)'}}>
                  <AlertCircle size={13}/> Aluno {form.status.toLowerCase()} — informe o motivo e a situação da vaga
                </div>
                <div className="form-grid">
                  <div className="field form-full">
                    <label>Motivo</label>
                    <input className="input" placeholder="Ex: Atraso no pagamento, viagem, problema de saúde..."
                      value={form.statusMotivo} onChange={e => f('statusMotivo', e.target.value)}/>
                  </div>
                  <div className="field form-full">
                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                      <input type="checkbox" checked={form.manterVaga}
                        onChange={e => {
                          f('manterVaga', e.target.checked)
                          if (!e.target.checked) f('manterVagaDias', '')
                        }}
                        style={{accentColor:'var(--yellow)',width:14,height:14}}/>
                      Manter a vaga reservada
                    </label>
                  </div>
                  {form.manterVaga && (
                    <div className="field form-full">
                      <label>Duração da reserva (dias)</label>
                      <input className="input" type="number" min="1" max="365"
                        placeholder="Ex: 30"
                        value={form.manterVagaDias}
                        onChange={e => f('manterVagaDias', e.target.value)}/>
                      {form.manterVagaDias && (
                        <span style={{fontSize:11,color:'var(--text-3)',marginTop:3,display:'block'}}>
                          Vaga reservada por {form.manterVagaDias} dia{Number(form.manterVagaDias) !== 1 ? 's' : ''} a partir de hoje.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── LISTA DE ESPERA: campos específicos ── */}
            {form.status === 'Lista de Espera' && (
              <div style={{padding:'16px',background:'var(--yellow)11',border:'1px solid var(--yellow)44',borderRadius:10,marginBottom:4}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:12,fontWeight:600,color:'var(--yellow)'}}>
                  <AlertCircle size={13}/> Aluno em lista de espera — sem vaga alocada
                </div>
                <div className="form-grid">
                  <div className="field form-full">
                    <label>Turmas desejadas (pode selecionar mais de uma)</label>
                    {turmas.filter(t => t.ativa).length === 0 ? (
                      <div style={{fontSize:12,color:'var(--text-3)'}}>Nenhuma turma ativa cadastrada.</div>
                    ) : (
                      <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:4}}>
                        {turmas.filter(t => t.ativa).map(t => {
                          const selecionada = form.turmasEsperaIds.includes(t.id)
                          return (
                            <button key={t.id} type="button"
                              onClick={() => {
                                const ids = selecionada
                                  ? form.turmasEsperaIds.filter(i => i !== t.id)
                                  : [...form.turmasEsperaIds, t.id]
                                f('turmasEsperaIds', ids)
                              }}
                              style={{
                                padding:'5px 11px', borderRadius:8, fontSize:12, fontWeight:600,
                                border:`1px solid ${selecionada ? 'var(--yellow)' : 'var(--border)'}`,
                                background: selecionada ? 'var(--yellow)22' : 'var(--surface-2)',
                                color: selecionada ? 'var(--yellow)' : 'var(--text-2)',
                                cursor:'pointer', transition:'all .15s',
                              }}>
                              {t.codigo} — {t.idioma} {t.nivel}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {form.turmasEsperaIds.length > 0 && (
                      <div style={{fontSize:11,color:'var(--text-3)',marginTop:6}}>
                        {form.turmasEsperaIds.length} turma{form.turmasEsperaIds.length > 1 ? 's' : ''} selecionada{form.turmasEsperaIds.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div className="field form-full">
                    <label>Descreva o curso que deseja aguardar</label>
                    <input className="input" placeholder="Ex: Inglês Básico turno manhã, Espanhol intermediário..."
                      value={form.cursoEspera} onChange={e => f('cursoEspera', e.target.value)}/>
                  </div>
                </div>
              </div>
            )}


            {/* ── CURSOS (visível apenas quando não é Lista de Espera) ── */}
            {form.status !== 'Lista de Espera' && form.matriculas.map((m, idx) => {
              const turma = turmas.find(t => t.id === Number(m.turmaId))
              const prof  = professores.find(p => p.id === turma?.professorId)
              // Turmas disponíveis para este slot = não usadas por outros slots
              const disponíveis = turmasAtivas.filter(
                t => String(t.id) === String(m.turmaId) ||
                     !turmasUsadas.filter((_, i) => i !== idx).includes(String(t.id))
              )

              return (
                <div key={idx} style={{
                  border: '1px solid var(--border)', borderRadius: 10,
                  padding: '14px 16px', marginBottom: 10,
                  background: 'var(--surface-2)',
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                    <span style={{
                      width:22,height:22,borderRadius:'50%',
                      background:'var(--accent)',color:'var(--bg-app)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,fontWeight:800,flexShrink:0,
                    }}>{idx + 1}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text-2)',flex:1}}>
                      {idx === 0 ? 'Curso principal' : `Curso adicional ${idx}`}
                    </span>
                    {form.matriculas.length > 1 && (
                      <button className="btn btn-danger btn-xs" onClick={() => removeMatricula(idx)}
                        style={{padding:'2px 8px'}}>
                        <Trash2 size={11}/>
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>Turma</label>
                      <select className="select" value={m.turmaId}
                        disabled={turmasAtivas.length === 0}
                        onChange={e => updateMatricula(idx, 'turmaId', e.target.value)}
                        style={turmasAtivas.length === 0 ? {opacity:.5,cursor:'not-allowed'} : {}}>
                        <option value="">
                          {turmasAtivas.length === 0 ? 'Nenhuma turma cadastrada' : 'Selecionar turma'}
                        </option>
                        {disponíveis.map(t => (
                          <option key={t.id} value={t.id}>{t.codigo} — {t.idioma} {t.nivel}</option>
                        ))}
                      </select>
                      {turmasAtivas.length === 0 && (
                        <div style={{marginTop:6,padding:'6px 10px',background:'var(--yellow)22',borderRadius:7,fontSize:11,color:'var(--yellow)',display:'flex',alignItems:'center',gap:5}}>
                          <AlertCircle size={11}/> Cadastre um curso/turma primeiro para vincular o aluno.
                        </div>
                      )}
                      {turma && (
                        <div style={{marginTop:6,padding:'6px 10px',background:'var(--blu-dim)',borderRadius:7,fontSize:11,color:'var(--blue)'}}>
                          📅 {turma.horario||'Sem horário'} · 👨‍🏫 {prof?.nome||'Sem professor'}
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label>Mensalidade (R$) *</label>
                      <div style={{position:'relative'}}>
                        <DollarSign size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                        <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                          value={m.mensalidade}
                          onChange={e => updateMatricula(idx, 'mensalidade', e.target.value)}
                          style={{paddingLeft:30}}/>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {erros.matriculas && (
              <div style={{fontSize:11,color:'var(--red)',marginBottom:10,display:'flex',alignItems:'center',gap:5}}>
                <AlertCircle size={12}/> {erros.matriculas}
              </div>
            )}

            {/* Botão adicionar curso — oculto em Lista de Espera */}
            {form.status !== 'Lista de Espera' && (
              <button className="btn btn-ghost btn-sm" onClick={addMatricula}
                style={{width:'100%',justifyContent:'center',border:'1px dashed var(--border)',marginBottom:16}}>
                <Plus size={13}/> Adicionar curso
              </button>
            )}

            {/* Totais — ocultos em Lista de Espera */}
            {form.status !== 'Lista de Espera' && <div style={{borderTop:'1px solid var(--border)',paddingTop:14}}>

              {/* Total bruto */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:13,color:'var(--text-2)'}}>
                  Total das mensalidades {form.matriculas.filter(m=>m.turmaId||m.mensalidade).length > 1 ? `(${form.matriculas.filter(m=>m.turmaId||m.mensalidade).length} cursos)` : ''}
                </span>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:'var(--text-1)'}}>
                  {formatBRL(totalBruto)}
                </span>
              </div>

              {/* Toggle desconto */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom: form.descontoAtivo ? 12 : 0}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'var(--text-2)'}}>
                  <div
                    onClick={() => f('descontoAtivo', !form.descontoAtivo)}
                    style={{
                      width:36,height:20,borderRadius:10,position:'relative',
                      background: form.descontoAtivo ? 'var(--accent)' : 'var(--bg-hover)',
                      cursor:'pointer',transition:'background .2s',flexShrink:0,
                    }}>
                    <div style={{
                      position:'absolute',top:3,
                      left: form.descontoAtivo ? 19 : 3,
                      width:14,height:14,borderRadius:'50%',
                      background:'#fff',transition:'left .2s',
                    }}/>
                  </div>
                  <Tag size={13} style={{color: form.descontoAtivo ? 'var(--accent)' : 'var(--text-3)'}}/>
                  Aplicar desconto
                </label>
              </div>

              {/* Campos de desconto */}
              {form.descontoAtivo && (
                <div style={{
                  padding:'12px 14px',borderRadius:8,
                  background:'var(--surface-2)',border:'1px solid var(--accent)44',
                  marginBottom:12,
                }}>
                  <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:10,alignItems:'end'}}>
                    {/* Tipo de desconto */}
                    <div className="field" style={{margin:0}}>
                      <label>Tipo</label>
                      <div style={{display:'flex',gap:6}}>
                        {[
                          {v:'percentual', label:'%', Icon:Percent},
                          {v:'fixo',       label:'R$', Icon:DollarSign},
                        ].map(({v,label,Icon})=>(
                          <button key={v}
                            className={`btn btn-sm ${form.descontoTipo===v?'btn-primary':'btn-secondary'}`}
                            onClick={()=>f('descontoTipo',v)}
                            style={{gap:4,padding:'4px 12px'}}>
                            <Icon size={12}/>{label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Valor do desconto */}
                    <div className="field" style={{margin:0}}>
                      <label>
                        {form.descontoTipo === 'percentual' ? 'Percentual de desconto' : 'Valor fixo de desconto (R$)'}
                      </label>
                      <div style={{position:'relative'}}>
                        {form.descontoTipo === 'percentual'
                          ? <Percent size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                          : <DollarSign size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                        }
                        <input className="input" type="number" min="0" step="0.01"
                          placeholder={form.descontoTipo==='percentual'?'Ex: 10':'Ex: 50,00'}
                          value={form.descontoValor}
                          onChange={e=>f('descontoValor',e.target.value)}
                          style={{paddingLeft:30}}/>
                      </div>
                    </div>
                  </div>

                  {descontoCalc > 0 && (
                    <div style={{marginTop:10,fontSize:12,color:'var(--text-3)',textAlign:'right'}}>
                      Desconto aplicado: <strong style={{color:'#f2617a'}}>−{formatBRL(descontoCalc)}</strong>
                      {form.descontoTipo==='percentual' && form.descontoValor && ` (${form.descontoValor}% de ${formatBRL(totalBruto)})`}
                    </div>
                  )}
                </div>
              )}

              {/* Total líquido */}
              <div style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'10px 14px',borderRadius:8,
                background: 'var(--accent)11', border:'1px solid var(--accent)44',
              }}>
                <span style={{fontSize:13,fontWeight:600,color:'var(--text-2)'}}>
                  {form.descontoAtivo && descontoCalc > 0 ? 'Total com desconto' : 'Total a cobrar'}
                </span>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:'var(--accent)'}}>
                  {formatBRL(totalLiquido)}
                </span>
              </div>
            </div>}
          </div>

          {/* Observações */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <FileText size={14} style={{color:'var(--text-3)'}}/> Observações
            </div>
            <textarea className="textarea"
              placeholder="Informações adicionais sobre o aluno..."
              value={form.obs} onChange={e => f('obs', e.target.value)}
              style={{minHeight:90}}/>
          </div>

          {/* Responsável */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <Users size={14} style={{color:'var(--purple)'}}/> Responsável
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,color:'var(--text-2)',fontWeight:400}}>
                <input type="checkbox" checked={form.respEhProprio}
                  onChange={e => {
                    const checked = e.target.checked
                    if (checked) {
                      setForm(x => ({
                        ...x,
                        respEhProprio: true,
                        respNome: x.nome,
                        respTelefone: x.telefone,
                        respEmail: x.email,
                        respParentesco: 'O próprio aluno',
                      }))
                    } else {
                      f('respEhProprio', false)
                    }
                  }}
                  style={{accentColor:'var(--purple)',width:14,height:14}}/>
                Aluno é o próprio responsável
              </label>
            </div>
            {form.respEhProprio && (
              <div style={{padding:'8px 12px',background:'var(--purple)11',border:'1px solid var(--purple)33',borderRadius:8,fontSize:12,color:'var(--purple)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
                <UserCheck size={13}/> Os dados do responsável foram preenchidos com os dados do próprio aluno.
              </div>
            )}
            <div className="form-grid">
              <div className="field form-full">
                <FieldLabel icon={User} text="Nome do Responsável"/>
                <input className="input" placeholder="Nome completo do responsável"
                  disabled={form.respEhProprio}
                  value={form.respNome} onChange={e => f('respNome', e.target.value)}
                  style={form.respEhProprio ? {opacity:.6,cursor:'not-allowed'} : {}}/>
              </div>
              <div className="field">
                <FieldLabel icon={Phone} text="Telefone do Responsável"/>
                <div style={{display:'flex',gap:6}}>
                  <input className="input" placeholder="(11) 99999-9999"
                    disabled={form.respEhProprio}
                    value={form.respTelefone} onChange={e => f('respTelefone', e.target.value)}
                    style={form.respEhProprio ? {opacity:.6,cursor:'not-allowed'} : {}}/>
                  {form.respTelefone && (
                    <button type="button" className="btn btn-secondary btn-sm"
                      style={{flexShrink:0,padding:'0 10px',color:'#25d366'}} title="Abrir WhatsApp"
                      onClick={()=>window.electronAPI?.whatsappAbrir(
                        form.respTelefone,
                        `Olá${form.respNome?' '+form.respNome:''}! Entramos em contato da Escola Manager.`
                      )}>
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
                  disabled={form.respEhProprio}
                  value={form.respEmail} onChange={e => f('respEmail', e.target.value)}
                  style={form.respEhProprio ? {opacity:.6,cursor:'not-allowed'} : {}}/>
              </div>
              <div className="field">
                <FieldLabel icon={UserCheck} text="Parentesco"/>
                <select className="select" value={form.respParentesco}
                  disabled={form.respEhProprio}
                  onChange={e => {
                    const val = e.target.value
                    if (val === 'O próprio aluno') {
                      setForm(x => ({
                        ...x,
                        respEhProprio: true,
                        respNome: x.nome,
                        respTelefone: x.telefone,
                        respEmail: x.email,
                        respParentesco: 'O próprio aluno',
                      }))
                    } else {
                      f('respParentesco', val)
                    }
                  }}
                  style={form.respEhProprio ? {opacity:.6,cursor:'not-allowed'} : {}}>
                  <option value="">Selecionar</option>
                  <option>Pai</option>
                  <option>Mãe</option>
                  <option>Avô/Avó</option>
                  <option>Tio/Tia</option>
                  <option>Responsável legal</option>
                  <option>O próprio aluno</option>
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
                {form.matriculas.filter(m=>m.turmaId).length > 0
                  ? form.matriculas.filter(m=>m.turmaId).map(m=>turmas.find(t=>t.id===Number(m.turmaId))?.idioma).filter(Boolean).join(' · ')
                  : 'Sem turma selecionada'}
              </div>
              <div style={{marginTop:8}}>
                <span style={{
                  fontSize:11,fontWeight:600,
                  color:STATUS_COLORS[form.status]||'var(--text-3)',
                  background:(STATUS_COLORS[form.status]||'var(--text-3)')+'22',
                  padding:'2px 10px',borderRadius:20,
                }}>{form.status}</span>
              </div>
            </div>

            {/* Cursos resumidos */}
            {form.matriculas.filter(m=>m.turmaId||m.mensalidade).map((m, idx) => {
              const t = turmas.find(tt => tt.id === Number(m.turmaId))
              return (
                <div key={idx} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                  <span style={{color:'var(--text-3)'}}>{t ? `${t.codigo} — ${t.idioma}` : `Curso ${idx+1}`}</span>
                  <span style={{color:'var(--text-1)',fontWeight:600}}>
                    {m.mensalidade ? formatBRL(Number(String(m.mensalidade).replace(',','.'))) : '—'}
                  </span>
                </div>
              )
            })}

            {(form.descontoAtivo && descontoCalc > 0) && (
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                <span style={{color:'#f2617a'}}>Desconto</span>
                <span style={{color:'#f2617a',fontWeight:600}}>−{formatBRL(descontoCalc)}</span>
              </div>
            )}

            {totalLiquido > 0 && (
              <div style={{
                display:'flex',justifyContent:'space-between',fontSize:13,
                marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)',
              }}>
                <span style={{color:'var(--text-2)',fontWeight:600}}>Total/mês</span>
                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,color:'var(--accent)'}}>
                  {formatBRL(totalLiquido)}
                </span>
              </div>
            )}

            {!isNovo && turmasPrimaria && (
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:5}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Horário</span>
                  <span style={{color:'var(--text-1)'}}>{turmasPrimaria.horario||'—'}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Professor</span>
                  <span style={{color:'var(--text-1)'}}>{profPrimario?.nome||'—'}</span>
                </div>
                {form.dataMatricula && (
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                    <span style={{color:'var(--text-3)'}}>Matrícula</span>
                    <span style={{color:'var(--text-1)'}}>{formatDate(form.dataMatricula)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Histórico de pagamentos */}
          {!isNovo && pgAluno.length > 0 && (
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>
                Últimos pagamentos
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {pgAluno.map(p=>(
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                    <div>
                      <div style={{color:'var(--text-1)',fontWeight:500}}>{p.mes}</div>
                      <div style={{color:'var(--text-3)',fontSize:11}}>Venc: {formatDate(p.vencimento)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'var(--text-1)'}}>{formatBRL(p.valor)}</div>
                      <span className={`badge ${p.status==='Pago'?'bg-green':p.status==='Atrasado'?'bg-red':'bg-yellow'}`} style={{fontSize:9}}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{width:'100%',justifyContent:'center'}}>
              {salvando
                ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                : <><Save size={14}/> {isNovo?'Cadastrar aluno':'Salvar alterações'}</>
              }
            </button>
            <button className="btn btn-secondary" onClick={cancelar} style={{width:'100%',justifyContent:'center'}}>
              <ArrowLeft size={14}/> Cancelar e voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
