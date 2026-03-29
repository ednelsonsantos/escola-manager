/**
 * EditarProfessor.jsx — Tela dedicada para criar ou editar professor
 * Rotas: /cursos/professores/novo  e  /cursos/professores/editar/:id
 * v5.12 — contrato CLT/PJ com salário e valor/hora
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, User, Mail, Phone, BookOpen, AlertCircle, DollarSign, Clock, Briefcase } from 'lucide-react'
import { useApp, formatBRL } from '../context/AppContext.jsx'

const IDIOMAS = ['Inglês','Espanhol','Francês','Alemão','Italiano','Japonês','Mandarim','Português']
const COR_IDIOMA = { Inglês:'#63dcaa',Espanhol:'#f5c542',Francês:'#5b9cf6',Alemão:'#f2617a',Italiano:'#a78bfa' }

const EMPTY = {
  nome: '', idioma: '', email: '', telefone: '', ativo: true,
  tipo_contrato: 'CLT',
  salario_fixo: '',
  carga_horaria_mensal: '',
  valor_hora_pj: '',
}

export default function EditarProfessor() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isNovo   = !id
  const { professores, addProfessor, updateProfessor, turmas, alunos } = useApp()

  const [form,     setForm]     = useState({ ...EMPTY })
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)

  // Garante que o form só é inicializado UMA VEZ, mesmo que `professores` mude
  const formIniciado = useRef(false)

  useEffect(() => {
    if (!isNovo && id && !formIniciado.current) {
      const p = professores.find(p => String(p.id) === String(id))
      if (p) {
        setForm({ ...EMPTY, ...p,
          salario_fixo:         p.salario_fixo         || '',
          carga_horaria_mensal: p.carga_horaria_mensal || '',
          valor_hora_pj:        p.valor_hora_pj        || '',
          tipo_contrato:        p.tipo_contrato        || 'CLT',
        })
        formIniciado.current = true
      }
    }
  }, [id, professores, isNovo])

  function f(k, v) { setForm(x => ({ ...x, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  // Valor/hora calculado para CLT (salario / carga_horaria_mensal)
  const valorHoraCLT = (() => {
    const s = parseFloat(String(form.salario_fixo).replace(',', '.'))
    const h = parseFloat(String(form.carga_horaria_mensal).replace(',', '.'))
    if (s > 0 && h > 0) return s / h
    return null
  })()

  function validar() {
    const e = {}
    if (!form.nome?.trim()) e.nome = 'Nome é obrigatório'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (form.tipo_contrato === 'CLT') {
      if (!form.salario_fixo || Number(String(form.salario_fixo).replace(',','.')) <= 0)
        e.salario_fixo = 'Informe o salário fixo'
      if (!form.carga_horaria_mensal || Number(String(form.carga_horaria_mensal).replace(',','.')) <= 0)
        e.carga_horaria_mensal = 'Informe a carga horária mensal'
    } else {
      if (!form.valor_hora_pj || Number(String(form.valor_hora_pj).replace(',','.')) <= 0)
        e.valor_hora_pj = 'Informe o valor por hora'
    }
    return e
  }

  function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)
    const payload = {
      ...form,
      salario_fixo:         Number(String(form.salario_fixo        || '0').replace(',','.')),
      carga_horaria_mensal: Number(String(form.carga_horaria_mensal|| '0').replace(',','.')),
      valor_hora_pj:        Number(String(form.valor_hora_pj       || '0').replace(',','.')),
    }
    if (isNovo) addProfessor(payload)
    else        updateProfessor(Number(id), payload)
    navigate('/cursos')
  }

  function cancelar() { navigate('/cursos') }

  const cor        = COR_IDIOMA[form.idioma] || '#8b949e'
  const turmasProf = !isNovo ? turmas.filter(t => t.professorId === Number(id)) : []
  const alunosProf = turmasProf.reduce((s, t) => s + alunos.filter(a => a.turmaId === t.id && a.status === 'Ativo').length, 0)
  const iniciais   = (form.nome || '?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()
  const isCLT      = form.tipo_contrato !== 'PJ'

  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={cancelar} style={{padding:'8px 12px'}}>
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'var(--text-1)', letterSpacing:-.3 }}>
            {isNovo ? 'Novo Professor' : 'Editar Professor'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNovo ? 'Preencha os dados do professor' : `Editando: ${professores.find(p=>String(p.id)===String(id))?.nome || '—'}`}
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
          <AlertCircle size={15}/><span>Corrija os campos destacados.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>

        {/* ── FORMULÁRIO ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Dados pessoais */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
              <User size={14} style={{color:'var(--accent)'}}/>
              Dados do Professor
            </div>
            <div className="form-grid">
              <div className="field form-full">
                <label>Nome completo *</label>
                <div style={{position:'relative'}}>
                  <User size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                  <input className="input" placeholder="Nome do professor"
                    value={form.nome} onChange={e=>f('nome',e.target.value)}
                    style={{paddingLeft:34, borderColor:erros.nome?'var(--red)':''}}/>
                </div>
                {erros.nome && <span style={{fontSize:11,color:'var(--red)'}}>{erros.nome}</span>}
              </div>

              <div className="field">
                <label>Idioma lecionado</label>
                <select className="select" value={form.idioma} onChange={e=>f('idioma',e.target.value)}
                  style={{borderLeft: form.idioma ? `3px solid ${cor}` : ''}}>
                  <option value="">Selecionar</option>
                  {IDIOMAS.map(i=><option key={i}>{i}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Status</label>
                <div style={{display:'flex',gap:14,marginTop:6}}>
                  {[{v:true,l:'Ativo'},{v:false,l:'Inativo'}].map(({v,l})=>(
                    <label key={String(v)} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:13.5,color:'var(--text-2)'}}>
                      <input type="radio" checked={form.ativo===v} onChange={()=>f('ativo',v)} style={{accentColor:'var(--accent)'}}/> {l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>E-mail</label>
                <div style={{position:'relative'}}>
                  <Mail size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                  <input className="input" type="email" placeholder="email@escola.com"
                    value={form.email} onChange={e=>f('email',e.target.value)}
                    style={{paddingLeft:34, borderColor:erros.email?'var(--red)':''}}/>
                </div>
                {erros.email && <span style={{fontSize:11,color:'var(--red)'}}>{erros.email}</span>}
              </div>

              <div className="field">
                <label>Telefone</label>
                <div style={{position:'relative'}}>
                  <Phone size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                  <input className="input" placeholder="(11) 99999-9999"
                    value={form.telefone} onChange={e=>f('telefone',e.target.value)}
                    style={{paddingLeft:34}}/>
                </div>
              </div>
            </div>
          </div>

          {/* Contrato de trabalho */}
          <div className="card" style={{padding:'20px 22px'}}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
              <Briefcase size={14} style={{color:'var(--accent)'}}/>
              Contrato de Trabalho
            </div>

            {/* Tipo de contrato */}
            <div className="field" style={{marginBottom:18}}>
              <label>Tipo de contrato</label>
              <div style={{display:'flex',gap:10,marginTop:6}}>
                {[{v:'CLT',desc:'Salário fixo mensal'},{v:'PJ',desc:'Valor por hora'}].map(({v,desc})=>(
                  <label key={v} onClick={()=>f('tipo_contrato',v)} style={{
                    flex:1, display:'flex', flexDirection:'column', gap:3, cursor:'pointer',
                    border:`2px solid ${form.tipo_contrato===v?'var(--accent)':'var(--border)'}`,
                    borderRadius:8, padding:'10px 14px',
                    background: form.tipo_contrato===v ? 'var(--accent)11' : 'var(--surface-2)',
                    transition:'all .15s',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <input type="radio" checked={form.tipo_contrato===v} onChange={()=>f('tipo_contrato',v)}
                        style={{accentColor:'var(--accent)',margin:0}}/>
                      <span style={{fontWeight:700,fontSize:14,color:'var(--text-1)'}}>{v}</span>
                    </div>
                    <span style={{fontSize:11,color:'var(--text-3)',paddingLeft:20}}>{desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CLT */}
            {isCLT && (
              <div className="form-grid">
                <div className="field">
                  <label>Salário fixo mensal (R$) *</label>
                  <div style={{position:'relative'}}>
                    <DollarSign size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                    <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                      value={form.salario_fixo} onChange={e=>f('salario_fixo',e.target.value)}
                      style={{paddingLeft:34, borderColor:erros.salario_fixo?'var(--red)':''}}/>
                  </div>
                  {erros.salario_fixo && <span style={{fontSize:11,color:'var(--red)'}}>{erros.salario_fixo}</span>}
                </div>

                <div className="field">
                  <label>Carga horária mensal (h) *</label>
                  <div style={{position:'relative'}}>
                    <Clock size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                    <input className="input" type="number" min="0" step="0.5" placeholder="Ex: 160"
                      value={form.carga_horaria_mensal} onChange={e=>f('carga_horaria_mensal',e.target.value)}
                      style={{paddingLeft:34, borderColor:erros.carga_horaria_mensal?'var(--red)':''}}/>
                  </div>
                  {erros.carga_horaria_mensal && <span style={{fontSize:11,color:'var(--red)'}}>{erros.carga_horaria_mensal}</span>}
                </div>

                {/* Preview das horas calculadas */}
                {valorHoraCLT !== null && (
                  <div className="form-full" style={{marginTop:4}}>
                    <div style={{
                      display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10,
                      padding:'12px 14px', borderRadius:8,
                      background:'var(--surface-2)', border:'1px solid var(--border)',
                    }}>
                      {[
                        { label:'Hora normal', valor: valorHoraCLT,       cor:'var(--accent)' },
                        { label:'Hora extra 50%', valor: valorHoraCLT * 1.5, cor:'#f5c542' },
                        { label:'Hora extra 100%', valor: valorHoraCLT * 2,   cor:'#f2617a' },
                      ].map(({label,valor,cor})=>(
                        <div key={label} style={{textAlign:'center'}}>
                          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:3}}>{label}</div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:cor}}>
                            {formatBRL(valor)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:11,color:'var(--text-3)',marginTop:5,textAlign:'right'}}>
                      Calculado automaticamente · base: {formatBRL(parseFloat(String(form.salario_fixo).replace(',','.')))} ÷ {form.carga_horaria_mensal}h
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PJ */}
            {!isCLT && (
              <div className="form-grid">
                <div className="field">
                  <label>Valor por hora cobrado (R$) *</label>
                  <div style={{position:'relative'}}>
                    <DollarSign size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                    <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                      value={form.valor_hora_pj} onChange={e=>f('valor_hora_pj',e.target.value)}
                      style={{paddingLeft:34, borderColor:erros.valor_hora_pj?'var(--red)':''}}/>
                  </div>
                  {erros.valor_hora_pj && <span style={{fontSize:11,color:'var(--red)'}}>{erros.valor_hora_pj}</span>}
                </div>
                <div style={{display:'flex',alignItems:'flex-end',paddingBottom:4}}>
                  <div style={{
                    padding:'10px 14px', borderRadius:8,
                    background:'var(--surface-2)', border:'1px solid var(--border)',
                    fontSize:12, color:'var(--text-3)', lineHeight:1.5,
                  }}>
                    O pagamento PJ é calculado pelo total de<br/>
                    horas ministradas registradas na carga horária.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PAINEL LATERAL ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14,position:'sticky',top:16}}>

          {/* Preview do professor */}
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{textAlign:'center',paddingBottom:14,borderBottom:'1px solid var(--border)',marginBottom:14}}>
              <div style={{
                width:56,height:56,borderRadius:'50%',margin:'0 auto 10px',
                background:cor,display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:'#fff',
                boxShadow:`0 4px 16px ${cor}44`,transition:'background .2s',
              }}>
                {iniciais}
              </div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:'var(--text-1)'}}>
                {form.nome || 'Nome do professor'}
              </div>
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>
                {form.idioma || 'Idioma não definido'}
              </div>
              <div style={{marginTop:8,display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
                {form.idioma && (
                  <span style={{fontSize:11,fontWeight:600,color:cor,background:cor+'22',padding:'2px 10px',borderRadius:20}}>
                    {form.idioma}
                  </span>
                )}
                <span className={`badge ${form.ativo?'bg-green':'bg-gray'}`}>
                  {form.ativo?'Ativo':'Inativo'}
                </span>
                <span style={{
                  fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:20,
                  background: isCLT ? '#63dcaa22' : '#5b9cf622',
                  color:      isCLT ? '#63dcaa'   : '#5b9cf6',
                }}>
                  {form.tipo_contrato}
                </span>
              </div>
            </div>

            {/* Resumo contrato */}
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {isCLT && form.salario_fixo && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Salário mensal</span>
                  <span style={{color:'var(--text-1)',fontWeight:600}}>
                    {formatBRL(parseFloat(String(form.salario_fixo).replace(',','.')))}
                  </span>
                </div>
              )}
              {isCLT && valorHoraCLT !== null && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Hora normal</span>
                  <span style={{color:'var(--accent)',fontWeight:600}}>{formatBRL(valorHoraCLT)}</span>
                </div>
              )}
              {!isCLT && form.valor_hora_pj && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Valor/hora PJ</span>
                  <span style={{color:'#5b9cf6',fontWeight:600}}>
                    {formatBRL(parseFloat(String(form.valor_hora_pj).replace(',','.')))}
                  </span>
                </div>
              )}
            </div>

            {/* Turmas do professor (só ao editar) */}
            {!isNovo && turmasProf.length > 0 && (
              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Turmas</span>
                  <span style={{color:'var(--text-1)',fontWeight:600}}>{turmasProf.length}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'var(--text-3)'}}>Alunos ativos</span>
                  <span style={{color:'var(--accent)',fontWeight:600}}>{alunosProf}</span>
                </div>
                <div style={{marginTop:6,display:'flex',flexWrap:'wrap',gap:4}}>
                  {turmasProf.map(t=>(
                    <span key={t.id} className="badge bg-blue" style={{fontSize:11}}>{t.codigo}</span>
                  ))}
                </div>
              </div>
            )}

            {isNovo && (
              <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0',borderTop:'1px solid var(--border)',marginTop:12}}>
                As turmas aparecerão após o cadastro.
              </div>
            )}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{width:'100%',justifyContent:'center'}}>
              <Save size={14}/> {isNovo?'Cadastrar professor':'Salvar alterações'}
            </button>
            <button className="btn btn-secondary" onClick={cancelar}
              style={{width:'100%',justifyContent:'center'}}>
              <ArrowLeft size={14}/> Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
