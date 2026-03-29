/**
 * EditarTurma.jsx — Tela dedicada para criar ou editar turma
 * Rotas: /cursos/turmas/nova  e  /cursos/turmas/editar/:id
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, BookOpen, AlertCircle, Users, Clock, UserPlus, X, DollarSign } from 'lucide-react'
import { useApp, formatBRL } from '../context/AppContext.jsx'

const NIVEIS      = ['Básico','Intermediário','Avançado','Conversação','Business']
const IDIOMAS     = ['Inglês','Espanhol','Francês','Alemão','Italiano','Japonês','Mandarim','Português']
const COR_IDIOMA  = { Inglês:'#63dcaa',Espanhol:'#f5c542',Francês:'#5b9cf6',Alemão:'#f2617a',Italiano:'#a78bfa' }
const EMPTY       = { codigo:'', idioma:'', nivel:'Básico', professorId:'', horario:'', vagas:15, ativa:true }
const DIAS_SEMANA = ['Seg','Ter','Qua','Qui','Sex','Sáb']

function parseHorario(str) {
  if (!str) return { dias: [], hora: '' }
  const partes = str.trim().split(' ')
  const candidatoDias = partes[0] || ''
  const diasParsed = candidatoDias.split('/').filter(d => DIAS_SEMANA.includes(d))
  const hora = diasParsed.length ? partes.slice(1).join(' ') : str
  return { dias: diasParsed, hora }
}

function buildHorario(dias, hora) {
  const d = dias.join('/')
  if (d && hora) return `${d} ${hora}`
  return d || hora
}

export default function EditarTurma() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isNova    = !id
  const { turmas, addTurma, updateTurma, professores, alunos, updateAluno } = useApp()

  const [form,     setForm]     = useState({ ...EMPTY })
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)
  const [diasSel,  setDiasSel]  = useState([])
  const [horaTxt,  setHoraTxt]  = useState('')

  // Garante que o form só é inicializado UMA VEZ, mesmo que `turmas` mude
  const formIniciado = useRef(false)

  useEffect(() => {
    if (!isNova && id && !formIniciado.current) {
      const t = turmas.find(t => String(t.id) === String(id))
      if (t) {
        setForm({ ...EMPTY, ...t })
        const parsed = parseHorario(t.horario || '')
        setDiasSel(parsed.dias)
        setHoraTxt(parsed.hora)
        formIniciado.current = true
      }
    }
  }, [id, turmas, isNova])

  const toggleDia = useCallback((dia) => {
    setDiasSel(prev => {
      const novos = prev.includes(dia)
        ? prev.filter(d => d !== dia)
        : [...prev, dia].sort((a, b) => DIAS_SEMANA.indexOf(a) - DIAS_SEMANA.indexOf(b))
      setForm(x => ({ ...x, horario: buildHorario(novos, horaTxt) }))
      setErros(e => ({ ...e, horario: '' }))
      return novos
    })
  }, [horaTxt])

  const atualizarHora = useCallback((val) => {
    setHoraTxt(val)
    setForm(x => ({ ...x, horario: buildHorario(diasSel, val) }))
    setErros(e => ({ ...e, horario: '' }))
  }, [diasSel])

  function f(k, v) { setForm(x => ({ ...x, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  function validar() {
    const e = {}
    if (!form.codigo?.trim())  e.codigo  = 'Código é obrigatório'
    if (!form.idioma)          e.idioma  = 'Selecione um idioma'
    if (!form.vagas || form.vagas < 1) e.vagas = 'Informe a quantidade de vagas'
    return e
  }

  function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)
    if (isNova) addTurma(form)
    else        updateTurma(Number(id), form)
    navigate('/cursos')
  }

  function cancelar() { navigate('/cursos') }

  const [showAddAluno,    setShowAddAluno]    = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState('')
  const [mensalidadeAdd,  setMensalidadeAdd]  = useState('')
  const [adicionando,     setAdicionando]     = useState(false)

  const prof = professores.find(p => p.id === Number(form.professorId))
  const cor  = COR_IDIOMA[form.idioma] || '#8b949e'

  // Alunos que têm vínculo com esta turma (para exibição na lista)
  const alunosNaTurma = !isNova
    ? alunos.filter(a => {
        if (Number(a.turmaId) === Number(id)) return true
        if (Array.isArray(a.matriculas)) return a.matriculas.some(m => Number(m.turmaId) === Number(id))
        return false
      })
    : []

  // Apenas os que efetivamente ocupam uma vaga:
  // Ativo sempre ocupa; Inativo/Trancado só ocupa se manterVaga=true
  const alunosOcupandoVaga = alunosNaTurma.filter(a =>
    a.status === 'Ativo' ||
    ((a.status === 'Inativo' || a.status === 'Trancado') && a.manterVaga)
  )

  const matriculados = alunosOcupandoVaga.length
  const ocup         = form.vagas ? Math.min(100, Math.round(matriculados / form.vagas * 100)) : 0
  const vagasDisp    = Math.max(0, (form.vagas || 0) - matriculados)

  // Alunos aguardando especificamente esta turma — baseado em turmasEsperaIds,
  // independente do status (pode já ser Ativo em outro curso mas ainda aguardar este)
  const alunosEsperandoEssaTurma = !isNova
    ? alunos.filter(a => {
        if (alunosNaTurma.some(m => m.id === a.id)) return false // já está na turma
        if (Array.isArray(a.turmasEsperaIds) && a.turmasEsperaIds.length > 0)
          return a.turmasEsperaIds.includes(Number(id))
        // legado: só checa turmaEsperaId se ainda estiver em Lista de Espera
        return a.status === 'Lista de Espera' && Number(a.turmaEsperaId) === Number(id)
      })
    : []

  // Demais ativos que não estão na turma nem na lista de espera desta turma
  const alunosAtivosDisponiveis = alunos.filter(a =>
    a.status === 'Ativo' &&
    !alunosNaTurma.some(m => m.id === a.id) &&
    !alunosEsperandoEssaTurma.some(m => m.id === a.id)
  )

  const alunosDisponiveis = [...alunosEsperandoEssaTurma, ...alunosAtivosDisponiveis]

  async function adicionarAluno() {
    if (!alunoSelecionado) return
    const aluno = alunos.find(a => a.id === Number(alunoSelecionado))
    if (!aluno) return
    setAdicionando(true)

    // Preserva matrículas existentes e acrescenta a nova
    const matriculasExistentes = Array.isArray(aluno.matriculas) && aluno.matriculas.length > 0
      ? aluno.matriculas
      : (aluno.turmaId ? [{ turmaId: aluno.turmaId, mensalidade: aluno.mensalidade || 0 }] : [])

    const novasMatriculas = [
      ...matriculasExistentes.filter(m => Number(m.turmaId) !== Number(id)),
      { turmaId: Number(id), mensalidade: Number(mensalidadeAdd) || 0 },
    ]

    // Sempre remove esta turma de turmasEsperaIds, independente do status atual
    const turmasEsperaRestantes = Array.isArray(aluno.turmasEsperaIds)
      ? aluno.turmasEsperaIds.filter(tid => tid !== Number(id))
      : []

    await updateAluno(aluno.id, {
      ...aluno,
      status: 'Ativo',
      matriculas: novasMatriculas,
      turmaId: aluno.turmaId || Number(id),
      mensalidade: novasMatriculas.reduce((s, m) => s + (Number(m.mensalidade) || 0), 0),
      turmaEsperaId:   turmasEsperaRestantes[0] ?? null,
      turmasEsperaIds: turmasEsperaRestantes,
      cursoEspera:     turmasEsperaRestantes.length === 0 ? '' : aluno.cursoEspera,
    })

    setShowAddAluno(false)
    setAlunoSelecionado('')
    setMensalidadeAdd('')
    setAdicionando(false)
  }

  return (
    <div className="fade-up" style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={cancelar} style={{padding:'8px 12px'}}>
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'var(--text-1)', letterSpacing:-.3 }}>
            {isNova ? 'Nova Turma' : 'Editar Turma'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNova ? 'Preencha os dados para criar a turma' : `Editando: ${turmas.find(t=>String(t.id)===String(id))?.codigo || '—'}`}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={cancelar} style={{minWidth:100}}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{minWidth:130}}>
          {salvando
            ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : <><Save size={14}/> {isNova ? 'Criar turma' : 'Salvar'}</>
          }
        </button>
      </div>

      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{marginBottom:16}}>
          <AlertCircle size={15}/><span>Corrija os campos destacados.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>

        {/* ── FORMULÁRIO ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
              <BookOpen size={14} style={{color:'var(--blue)'}}/>
              Identificação da Turma
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Código *</label>
                <input className="input" placeholder="Ex: ING-B1-2025"
                  value={form.codigo} onChange={e=>f('codigo',e.target.value.toUpperCase())}
                  style={{borderColor:erros.codigo?'var(--red)':'', fontFamily:"'DM Mono','Courier New',monospace", fontWeight:600}}/>
                {erros.codigo && <span style={{fontSize:11,color:'var(--red)'}}>{erros.codigo}</span>}
                <span className="input-hint">Use letras maiúsculas e números. Ex: ING-B1, ESP-A2</span>
              </div>

              <div className="field">
                <label>Idioma *</label>
                <select className="select" value={form.idioma} onChange={e=>f('idioma',e.target.value)}
                  style={{borderColor:erros.idioma?'var(--red)':'', borderLeft: form.idioma ? `3px solid ${cor}` : ''}}>
                  <option value="">Selecionar idioma</option>
                  {IDIOMAS.map(i=><option key={i}>{i}</option>)}
                </select>
                {erros.idioma && <span style={{fontSize:11,color:'var(--red)'}}>{erros.idioma}</span>}
              </div>

              <div className="field">
                <label>Nível</label>
                <select className="select" value={form.nivel} onChange={e=>f('nivel',e.target.value)}>
                  {NIVEIS.map(n=><option key={n}>{n}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Professor</label>
                <select className="select" value={form.professorId||''} onChange={e=>f('professorId',Number(e.target.value))}>
                  <option value="">Sem professor atribuído</option>
                  {professores.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.nome} — {p.idioma}</option>)}
                </select>
                {prof && (
                  <div style={{marginTop:6,padding:'6px 10px',background:'var(--accent-dim)',borderRadius:7,fontSize:11,color:'var(--accent)'}}>
                    ✅ {prof.nome} · {prof.idioma}
                  </div>
                )}
              </div>

              <div className="field form-full">
                <label style={{display:'flex',alignItems:'center',gap:6}}>
                  <Clock size={12} style={{color:'var(--text-3)'}}/> Horário
                </label>
                {/* Dias da semana */}
                <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                  {DIAS_SEMANA.map(dia => {
                    const ativo = diasSel.includes(dia)
                    return (
                      <button key={dia} type="button"
                        onClick={() => toggleDia(dia)}
                        style={{
                          padding:'5px 11px', borderRadius:7, fontSize:12, fontWeight:600,
                          border: `1px solid ${ativo ? 'var(--accent)' : 'var(--border)'}`,
                          background: ativo ? 'var(--accent)' : 'var(--surface-2)',
                          color: ativo ? 'var(--bg-app)' : 'var(--text-2)',
                          cursor:'pointer', transition:'all .15s',
                        }}>
                        {dia}
                      </button>
                    )
                  })}
                </div>
                {/* Campo de hora */}
                <input className="input" placeholder="Ex: 18h30 ou 08:00–10:00"
                  value={horaTxt} onChange={e => atualizarHora(e.target.value)}
                  style={{marginBottom:4}}/>
                {form.horario && (
                  <div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>
                    Resultado: <strong style={{color:'var(--text-1)'}}>{form.horario}</strong>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Vagas *</label>
                <input className="input" type="number" min="1" max="50"
                  value={form.vagas} onChange={e=>f('vagas',Number(e.target.value))}
                  style={{borderColor:erros.vagas?'var(--red)':''}}/>
                {erros.vagas && <span style={{fontSize:11,color:'var(--red)'}}>{erros.vagas}</span>}
              </div>

              <div className="field form-full">
                <label>Status da turma</label>
                <div style={{display:'flex',gap:14,marginTop:6}}>
                  {[{v:true,l:'Ativa'},{v:false,l:'Inativa'}].map(({v,l})=>(
                    <label key={String(v)} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:13.5,color:'var(--text-2)'}}>
                      <input type="radio" checked={form.ativa===v} onChange={()=>f('ativa',v)} style={{accentColor:'var(--accent)'}}/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── ALUNOS DA TURMA (só ao editar) ── */}
          {!isNova && (
            <div className="card" style={{padding:'20px 22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:'var(--text-1)',display:'flex',alignItems:'center',gap:7}}>
                  <Users size={14} style={{color:'var(--accent)'}}/> Alunos Matriculados
                  <span style={{fontSize:11,fontWeight:500,color:'var(--text-3)',marginLeft:4}}>
                    ({alunosNaTurma.length}/{form.vagas || '?'})
                  </span>
                </div>
                {vagasDisp > 0 && (
                  <button className="btn btn-primary btn-sm"
                    onClick={() => { setShowAddAluno(true); setAlunoSelecionado(''); setMensalidadeAdd('') }}
                    style={{gap:6,padding:'5px 12px'}}>
                    <UserPlus size={13}/> Adicionar Aluno
                  </button>
                )}
                {vagasDisp === 0 && (
                  <span style={{fontSize:11,color:'var(--red)',fontWeight:600}}>Turma lotada</span>
                )}
              </div>

              {alunosNaTurma.length === 0 ? (
                <div style={{textAlign:'center',padding:'24px 0',color:'var(--text-3)',fontSize:13}}>
                  Nenhum aluno matriculado nesta turma.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {alunosNaTurma.map(a => {
                    const mensalidade = Array.isArray(a.matriculas)
                      ? a.matriculas.find(m => Number(m.turmaId) === Number(id))?.mensalidade
                      : (Number(a.turmaId) === Number(id) ? a.mensalidade : null)
                    return (
                      <div key={a.id} style={{
                        display:'flex', alignItems:'center', gap:10,
                        padding:'8px 12px', borderRadius:8,
                        background:'var(--surface-2)', border:'1px solid var(--border)',
                      }}>
                        <div style={{
                          width:30,height:30,borderRadius:'50%',flexShrink:0,
                          background:'var(--accent)',color:'var(--bg-app)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:11,fontWeight:800,
                        }}>
                          {(a.nome||'?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.nome}</div>
                          <div style={{fontSize:11,color:'var(--text-3)'}}>{a.telefone || a.email || '—'}</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          {mensalidade != null && (
                            <div style={{fontSize:12,fontWeight:600,color:'var(--accent)'}}>{formatBRL(mensalidade)}</div>
                          )}
                          <span style={{
                            fontSize:10,fontWeight:600,
                            color: a.status==='Ativo' ? 'var(--accent)' : 'var(--yellow)',
                            background: (a.status==='Ativo' ? 'var(--accent)' : 'var(--yellow)')+'22',
                            padding:'1px 7px',borderRadius:10,
                          }}>{a.status}</span>
                          {(a.status==='Inativo'||a.status==='Trancado') && (
                            <span style={{fontSize:10,color: a.manterVaga ? 'var(--blue)' : 'var(--text-3)',marginTop:2,display:'block'}}>
                              {a.manterVaga ? `Vaga reservada${a.manterVagaDias ? ` (${a.manterVagaDias}d)` : ''}` : 'Sem reserva de vaga'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {vagasDisp > 0 && (
                <div style={{marginTop:10,fontSize:11,color:'var(--text-3)',textAlign:'right'}}>
                  {vagasDisp} vaga{vagasDisp !== 1 ? 's' : ''} disponível{vagasDisp !== 1 ? 'is' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PAINEL LATERAL ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14,position:'sticky',top:16}}>

          {/* Preview da turma */}
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{
              textAlign:'center', paddingBottom:14,
              borderBottom:'1px solid var(--border)', marginBottom:14,
            }}>
              <div style={{
                width:52,height:52,borderRadius:14,margin:'0 auto 10px',
                background:cor+'22',display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <BookOpen size={22} style={{color:cor}}/>
              </div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:'var(--text-1)',letterSpacing:.5}}>
                {form.codigo||'CÓDIGO'}
              </div>
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>
                {form.idioma||'Idioma'} · {form.nivel}
              </div>
              <div style={{marginTop:8,display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
                <span style={{
                  fontSize:11,fontWeight:600,color:cor,
                  background:cor+'22',padding:'2px 10px',borderRadius:20,
                }}>{form.idioma||'—'}</span>
                <span className={`badge ${form.ativa?'bg-green':'bg-gray'}`}>
                  {form.ativa?'Ativa':'Inativa'}
                </span>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {[
                ['Horário',    form.horario||'—'],
                ['Professor',  prof?.nome||'—'],
                ['Vagas',      form.vagas||'—'],
                ...(!isNova ? [
                  ['Matriculados', `${matriculados} alunos`],
                  ['Ocupação',     `${ocup}%`],
                ] : []),
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>{k}</span>
                  <span style={{color:'var(--text-1)',fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Barra de ocupação (só ao editar) */}
            {!isNova && (
              <div style={{marginTop:12}}>
                <div style={{height:6,background:'var(--bg-hover)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{
                    height:'100%',borderRadius:3,
                    width:`${ocup}%`,
                    background:ocup>80?'var(--red)':ocup>50?'var(--yellow)':cor,
                    transition:'width .3s',
                  }}/>
                </div>
                <div style={{fontSize:10,color:'var(--text-3)',marginTop:4,textAlign:'right'}}>
                  {matriculados}/{form.vagas} vagas ocupadas
                </div>
              </div>
            )}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{width:'100%',justifyContent:'center'}}>
              <Save size={14}/> {isNova?'Criar turma':'Salvar alterações'}
            </button>
            <button className="btn btn-secondary" onClick={cancelar}
              style={{width:'100%',justifyContent:'center'}}>
              <ArrowLeft size={14}/> Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL ADICIONAR ALUNO ── */}
      {showAddAluno && createPortal(
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseDown={e => { if (e.target === e.currentTarget) e.stopPropagation() }}>
          <div style={{background:'var(--bg-card)',borderRadius:14,padding:'24px 26px',width:420,boxShadow:'0 20px 60px rgba(0,0,0,.4)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:'var(--text-1)',display:'flex',alignItems:'center',gap:8}}>
                <UserPlus size={16} style={{color:'var(--accent)'}}/> Adicionar Aluno à Turma
              </div>
              <button className="btn btn-ghost btn-sm" style={{padding:4}}
                onClick={() => setShowAddAluno(false)}>
                <X size={16}/>
              </button>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:6}}>Aluno</label>
              <select className="select" value={alunoSelecionado}
                onChange={e => setAlunoSelecionado(e.target.value)}>
                <option value="">Selecionar aluno...</option>
                {alunosEsperandoEssaTurma.length > 0 && (
                  <optgroup label="— Lista de Espera (aguardando esta turma)">
                    {alunosEsperandoEssaTurma.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </optgroup>
                )}
                {alunosAtivosDisponiveis.length > 0 && (
                  <optgroup label="— Outros alunos ativos">
                    {alunosAtivosDisponiveis.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {alunosDisponiveis.length === 0 && (
                <div style={{fontSize:11,color:'var(--text-3)',marginTop:5}}>
                  Nenhum aluno disponível para adicionar.
                </div>
              )}
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:6}}>Mensalidade (R$)</label>
              <div style={{position:'relative'}}>
                <DollarSign size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                  value={mensalidadeAdd} onChange={e => setMensalidadeAdd(e.target.value)}
                  style={{paddingLeft:30}}/>
              </div>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={() => setShowAddAluno(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={!alunoSelecionado || adicionando}
                onClick={adicionarAluno}>
                {adicionando
                  ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                  : <><UserPlus size={13}/> Adicionar</>
                }
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
