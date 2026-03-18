/**
 * EditarTurma.jsx — Tela dedicada para criar ou editar turma
 * Rotas: /cursos/turmas/nova  e  /cursos/turmas/editar/:id
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, BookOpen, AlertCircle, Users, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const NIVEIS      = ['Básico','Intermediário','Avançado','Conversação','Business']
const IDIOMAS     = ['Inglês','Espanhol','Francês','Alemão','Italiano','Japonês','Mandarim','Português']
const COR_IDIOMA  = { Inglês:'#63dcaa',Espanhol:'#f5c542',Francês:'#5b9cf6',Alemão:'#f2617a',Italiano:'#a78bfa' }
const EMPTY       = { codigo:'', idioma:'', nivel:'Básico', professorId:'', horario:'', vagas:15, ativa:true }

export default function EditarTurma() {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const isNova    = !id
  const { turmas, addTurma, updateTurma, professores, alunos } = useApp()

  const [form,     setForm]     = useState({ ...EMPTY })
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!isNova && id) {
      const t = turmas.find(t => String(t.id) === String(id))
      if (t) setForm({ ...EMPTY, ...t })
    }
  }, [id, turmas, isNova])

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

  const prof          = professores.find(p => p.id === Number(form.professorId))
  const matriculados  = !isNova ? alunos.filter(a => a.turmaId === Number(id) && a.status === 'Ativo').length : 0
  const ocup          = form.vagas ? Math.min(100, Math.round(matriculados / form.vagas * 100)) : 0
  const cor           = COR_IDIOMA[form.idioma] || '#8b949e'

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

              <div className="field">
                <label>Horário</label>
                <input className="input" placeholder="Ex: Seg/Qua 18h30"
                  value={form.horario} onChange={e=>f('horario',e.target.value)}/>
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
    </div>
  )
}
