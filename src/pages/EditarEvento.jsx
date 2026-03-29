/**
 * EditarEvento.jsx — Tela dedicada para criar ou editar evento
 * Rotas: /agenda/novo  e  /agenda/editar/:id
 * Preserva a data pré-selecionada via state de navegação (openAdd(data))
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Save, Calendar, Clock, AlertCircle,
  Users, BookOpen, DollarSign, Briefcase
} from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'

const TIPO_CONFIG = {
  reuniao:    { label:'Reunião',    color:'#5b9cf6', icon:Users,      bg:'var(--blu-dim)' },
  prova:      { label:'Prova',      color:'#f2617a', icon:BookOpen,   bg:'var(--red-dim)' },
  atividade:  { label:'Atividade',  color:'#a78bfa', icon:Briefcase,  bg:'var(--pur-dim)' },
  financeiro: { label:'Financeiro', color:'#63dcaa', icon:DollarSign, bg:'var(--accent-dim)' },
  turma:      { label:'Turma',      color:'#f5c542', icon:BookOpen,   bg:'var(--yel-dim)' },
  feriado:    { label:'Feriado',    color:'#f97316', icon:Calendar,   bg:'rgba(249,115,22,0.12)' },
  outro:      { label:'Outro',      color:'#8b949e', icon:Calendar,   bg:'rgba(139,148,158,0.12)' },
}

const EMPTY = { titulo:'', data:'', hora:'', tipo:'reuniao', desc:'', turmaId:'' }

export default function EditarEvento() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { id }     = useParams()
  const isNovo     = !id
  const { eventos, addEvento, updateEvento, turmas } = useApp()

  // Aceita data pré-selecionada via state de navegação (clique numa célula do calendário)
  const dataInicial = location.state?.data || ''

  const [form,     setForm]     = useState({ ...EMPTY, data: dataInicial })
  const [erros,    setErros]    = useState({})
  const [salvando, setSalvando] = useState(false)

  const formIniciado = useRef(false)

  useEffect(() => {
    if (!isNovo && id && !formIniciado.current) {
      const ev = eventos.find(e => String(e.id) === String(id))
      if (ev) {
        setForm({ ...EMPTY, ...ev })
        formIniciado.current = true
      }
    }
  }, [id, eventos, isNovo])

  function f(k, v) { setForm(x => ({ ...x, [k]: v })); setErros(e => ({ ...e, [k]: '' })) }

  function validar() {
    const e = {}
    if (!form.titulo?.trim()) e.titulo = 'Título é obrigatório'
    if (!form.data)           e.data   = 'Data é obrigatória'
    return e
  }

  function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)
    if (isNovo) addEvento(form)
    else        updateEvento(Number(id), form)
    navigate('/agenda')
  }

  function cancelar() { navigate('/agenda') }

  const cfg    = TIPO_CONFIG[form.tipo] || TIPO_CONFIG.outro
  const TIcon  = cfg.icon
  const turma  = turmas.find(t => String(t.id) === String(form.turmaId))

  // Dias da semana em pt-BR para o preview de data
  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const dataObj  = form.data ? new Date(form.data + 'T00:00:00') : null
  const diaSemana = dataObj ? DIAS[dataObj.getDay()] : ''

  return (
    <div className="fade-up" style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={cancelar} style={{padding:'8px 12px'}}>
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'var(--text-1)', letterSpacing:-.3 }}>
            {isNovo ? 'Novo Evento' : 'Editar Evento'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNovo ? 'Adicionar evento ao calendário' : `Editando: ${eventos.find(e=>String(e.id)===String(id))?.titulo || '—'}`}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={cancelar} style={{minWidth:100}}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{minWidth:130}}>
          {salvando
            ? <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#0d1a12',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
            : <><Save size={14}/> {isNovo ? 'Criar evento' : 'Salvar'}</>
          }
        </button>
      </div>

      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{marginBottom:16}}>
          <AlertCircle size={15}/><span>Corrija os campos destacados.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16, alignItems:'start' }}>

        {/* ── FORMULÁRIO ── */}
        <div className="card" style={{padding:'20px 22px'}}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7 }}>
            <Calendar size={14} style={{color:'var(--accent)'}}/>
            Dados do Evento
          </div>
          <div className="form-grid">

            {/* Tipo — destaque visual */}
            <div className="field form-full">
              <label>Tipo de evento</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                {Object.entries(TIPO_CONFIG).map(([k, v]) => {
                  const Icon = v.icon
                  const ativo = form.tipo === k
                  return (
                    <button key={k} onClick={() => f('tipo', k)} style={{
                      display:'flex',alignItems:'center',gap:6,
                      padding:'6px 12px',borderRadius:9,border:'1.5px solid',cursor:'pointer',
                      transition:'all .15s',fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,
                      borderColor: ativo ? v.color : 'var(--border)',
                      background:  ativo ? v.bg    : 'transparent',
                      color:       ativo ? v.color : 'var(--text-2)',
                    }}>
                      <Icon size={13}/>{v.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="field form-full">
              <label>Título *</label>
              <input className="input" placeholder="Nome do evento"
                value={form.titulo} onChange={e=>f('titulo',e.target.value)}
                style={{borderColor:erros.titulo?'var(--red)':''}}
                autoFocus={isNovo}/>
              {erros.titulo && <span style={{fontSize:11,color:'var(--red)'}}>{erros.titulo}</span>}
            </div>

            <div className="field">
              <label>Data *</label>
              <div style={{position:'relative'}}>
                <Calendar size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                <input className="input" type="date"
                  value={form.data} onChange={e=>f('data',e.target.value)}
                  style={{paddingLeft:34,borderColor:erros.data?'var(--red)':''}}/>
              </div>
              {erros.data && <span style={{fontSize:11,color:'var(--red)'}}>{erros.data}</span>}
            </div>

            <div className="field">
              <label>Hora <span style={{color:'var(--text-3)',fontWeight:400}}>(opcional)</span></label>
              <div style={{position:'relative'}}>
                <Clock size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
                <input className="input" type="time"
                  value={form.hora} onChange={e=>f('hora',e.target.value)}
                  style={{paddingLeft:34}}/>
              </div>
            </div>

            <div className="field form-full">
              <label>Turma relacionada <span style={{color:'var(--text-3)',fontWeight:400}}>(opcional)</span></label>
              <select className="select" value={form.turmaId||''} onChange={e=>f('turmaId',e.target.value)}>
                <option value="">Nenhuma turma específica</option>
                {turmas.filter(t=>t.ativa).map(t=>(
                  <option key={t.id} value={t.id}>{t.codigo} — {t.idioma} {t.nivel}</option>
                ))}
              </select>
            </div>

            <div className="field form-full">
              <label>Descrição <span style={{color:'var(--text-3)',fontWeight:400}}>(opcional)</span></label>
              <textarea className="textarea"
                placeholder="Detalhes, observações, local..."
                value={form.desc} onChange={e=>f('desc',e.target.value)}
                style={{minHeight:80}}/>
            </div>
          </div>
        </div>

        {/* ── PAINEL LATERAL ── */}
        <div style={{display:'flex',flexDirection:'column',gap:14,position:'sticky',top:16}}>

          {/* Preview do evento */}
          <div className="card" style={{padding:'18px 20px'}}>
            <div style={{textAlign:'center',paddingBottom:14,borderBottom:'1px solid var(--border)',marginBottom:14}}>
              <div style={{
                width:52,height:52,borderRadius:14,margin:'0 auto 10px',
                background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <TIcon size={22} style={{color:cfg.color}}/>
              </div>
              <div style={{
                fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,
                color:'var(--text-1)',lineHeight:1.3,maxWidth:180,margin:'0 auto',
              }}>
                {form.titulo || 'Título do evento'}
              </div>
              <div style={{marginTop:8}}>
                <span style={{
                  fontSize:11,fontWeight:600,color:cfg.color,
                  background:cfg.bg,padding:'2px 10px',borderRadius:20,
                }}>{cfg.label}</span>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {form.data && (
                <div style={{
                  display:'flex',alignItems:'center',gap:8,
                  padding:'9px 12px',background:'var(--bg-hover)',borderRadius:9,
                }}>
                  <Calendar size={14} style={{color:'var(--accent)',flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)'}}>
                      {diaSemana}, {formatDate(form.data)}
                    </div>
                    {form.hora && <div style={{fontSize:11,color:'var(--text-3)'}}>às {form.hora}</div>}
                  </div>
                </div>
              )}
              {turma && (
                <div style={{
                  display:'flex',alignItems:'center',gap:8,
                  padding:'9px 12px',background:'var(--blu-dim)',borderRadius:9,
                }}>
                  <BookOpen size={14} style={{color:'var(--blue)',flexShrink:0}}/>
                  <div style={{fontSize:13,color:'var(--blue)',fontWeight:500}}>
                    {turma.codigo} — {turma.idioma}
                  </div>
                </div>
              )}
              {!form.data && !form.turmaId && (
                <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0'}}>
                  Preencha os campos para ver o preview.
                </div>
              )}
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}
              style={{width:'100%',justifyContent:'center'}}>
              <Save size={14}/> {isNovo?'Criar evento':'Salvar alterações'}
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
