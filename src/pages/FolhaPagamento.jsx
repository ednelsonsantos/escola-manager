/**
 * FolhaPagamento.jsx — Módulo de folha de pagamento de professores (v5.12)
 *
 * Fluxo:
 *  1. Selecionar mês → listar professores com folha gerada ou gerar nova
 *  2. Editar horas extras e deduções
 *  3. Fechar / Marcar como Paga
 *
 * Integra-se com a carga horária (horas_normais apuradas automaticamente)
 */
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  DollarSign, Clock, Users, Plus, Pencil, Trash2, CheckCircle,
  AlertCircle, ChevronDown, ChevronRight, RefreshCw, Save, X,
  Briefcase, Calendar, TrendingUp
} from 'lucide-react'
import { useApp, formatBRL, formatDate } from '../context/AppContext.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function mesAtual() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

function nomeMes(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function fmtHoras(n) {
  const h = Math.floor(n || 0)
  const min = Math.round(((n || 0) - h) * 60)
  return min === 0 ? `${h}h` : `${h}h ${min}min`
}

const STATUS_COR = {
  Aberta:  { bg:'#5b9cf622', color:'#5b9cf6', label:'Aberta' },
  Fechada: { bg:'#f5c54222', color:'#f5c542', label:'Fechada' },
  Paga:    { bg:'#63dcaa22', color:'#63dcaa', label:'Paga' },
}

// ── Modal de edição da folha ──────────────────────────────────────────────────
function ModalEditarFolha({ folha, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    horas_normais:  folha.horas_normais  || 0,
    horas_extra_50: folha.horas_extra_50 || 0,
    horas_extra_100:folha.horas_extra_100|| 0,
    deducoes:       folha.deducoes       || 0,
    obs:            folha.obs            || '',
    status:         folha.status         || 'Aberta',
  })

  const vHora = folha.valor_hora_ref || 0
  const vNormal  = vHora * Number(form.horas_normais)
  const vExtra50 = vHora * 1.5 * Number(form.horas_extra_50)
  const vExtra100= vHora * 2.0 * Number(form.horas_extra_100)
  const bruto    = vNormal + vExtra50 + vExtra100
  const liquido  = bruto - Number(form.deducoes || 0)

  function f(k, v) { setForm(x => ({ ...x, [k]: v })) }

  return createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
    }} onClick={onFechar}>
      <div style={{
        background:'var(--surface-1)', borderRadius:14, padding:'24px 26px',
        width:520, maxWidth:'95vw', boxShadow:'0 8px 40px rgba(0,0,0,.4)',
        border:'1px solid var(--border)',
      }} onClick={e=>e.stopPropagation()}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:'var(--text-1)'}}>
              Editar Folha
            </div>
            <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>
              {folha.professor_nome} · {nomeMes(folha.mes)}
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onFechar}><X size={14}/></button>
        </div>

        {/* Horas */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
          {[
            {k:'horas_normais',  label:'Horas normais', cor:'var(--accent)'},
            {k:'horas_extra_50', label:'Extra 50%',      cor:'#f5c542'},
            {k:'horas_extra_100',label:'Extra 100%',     cor:'#f2617a'},
          ].map(({k,label,cor})=>(
            <div key={k} className="field">
              <label style={{color:cor,fontSize:11}}>{label}</label>
              <input className="input" type="number" min="0" step="0.5"
                value={form[k]} onChange={e=>f(k,e.target.value)}/>
            </div>
          ))}
        </div>

        {/* Preview de valores */}
        <div style={{
          display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,
          padding:'12px 14px',borderRadius:8,
          background:'var(--surface-2)',border:'1px solid var(--border)',
          marginBottom:14,
        }}>
          {[
            {label:'Normal',   valor:vNormal,   cor:'var(--accent)'},
            {label:'Extra 50%',valor:vExtra50,  cor:'#f5c542'},
            {label:'Extra 100%',valor:vExtra100, cor:'#f2617a'},
          ].map(({label,valor,cor})=>(
            <div key={label} style={{textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--text-3)',marginBottom:2}}>{label}</div>
              <div style={{fontSize:13,fontWeight:700,color:cor}}>{formatBRL(valor)}</div>
            </div>
          ))}
        </div>

        {/* Deduções */}
        <div className="field" style={{marginBottom:12}}>
          <label>Deduções / Descontos (R$)</label>
          <input className="input" type="number" min="0" step="0.01"
            value={form.deducoes} onChange={e=>f('deducoes',e.target.value)}/>
        </div>

        {/* Obs */}
        <div className="field" style={{marginBottom:14}}>
          <label>Observações</label>
          <textarea className="input" rows={2} style={{resize:'vertical'}}
            value={form.obs} onChange={e=>f('obs',e.target.value)}/>
        </div>

        {/* Status */}
        <div className="field" style={{marginBottom:18}}>
          <label>Status da folha</label>
          <div style={{display:'flex',gap:8,marginTop:6}}>
            {['Aberta','Fechada','Paga'].map(s=>{
              const sc = STATUS_COR[s]
              return (
                <label key={s} style={{
                  flex:1,display:'flex',alignItems:'center',gap:7,cursor:'pointer',
                  border:`2px solid ${form.status===s?sc.color:'var(--border)'}`,
                  borderRadius:8,padding:'6px 10px',
                  background:form.status===s?sc.bg:'transparent',transition:'all .15s',
                }}>
                  <input type="radio" checked={form.status===s} onChange={()=>f('status',s)}
                    style={{accentColor:sc.color,margin:0}}/>
                  <span style={{fontSize:12,fontWeight:600,color:sc.color}}>{s}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Totais finais */}
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',
          padding:'12px 14px',borderRadius:8,
          background:'var(--surface-2)',border:'1px solid var(--border)',
          marginBottom:18,
        }}>
          <div style={{fontSize:12,color:'var(--text-3)'}}>
            Bruto: <strong style={{color:'var(--text-1)'}}>{formatBRL(bruto)}</strong>
            {' '}· Deduções: <strong style={{color:'#f2617a'}}>{formatBRL(Number(form.deducoes||0))}</strong>
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:'var(--accent)'}}>
            {formatBRL(liquido)}
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>onSalvar(form)}>
            <Save size={13}/> Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function FolhaPagamento() {
  const { professores, user } = useApp()

  const [mes,      setMes]      = useState(mesAtual())
  const [folhas,   setFolhas]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [gerando,  setGerando]  = useState(null)  // professorId sendo gerado
  const [editando, setEditando] = useState(null)   // folha em edição
  const [expandido,setExpandido]= useState(new Set())

  const api = window.electronAPI
  const req = { userId: user?.id, userLogin: user?.login }

  async function carregar() {
    setLoading(true)
    try {
      const data = await api?.folhaListar({ mes }) || []
      setFolhas(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [mes])

  // Professores ativos sem folha no mês selecionado
  const semFolha = useMemo(() => {
    const comFolha = new Set(folhas.map(f => f.professor_id))
    return professores.filter(p => p.ativo && !comFolha.has(p.id))
  }, [professores, folhas])

  async function gerarParaProfessor(profId) {
    setGerando(profId)
    try {
      const res = await api?.folhaGerar({ professorId: profId, mes }, req)
      if (res?.ok) await carregar()
      else alert(res?.erro || 'Erro ao gerar folha')
    } finally {
      setGerando(null)
    }
  }

  async function gerarTodas() {
    for (const p of semFolha) {
      await gerarParaProfessor(p.id)
    }
  }

  async function salvarEdicao(form) {
    if (!editando) return
    const res = await api?.folhaEditar(editando.id, form, req)
    if (res?.ok) { setEditando(null); await carregar() }
    else alert(res?.erro || 'Erro ao salvar')
  }

  async function deletar(folha) {
    if (!confirm(`Excluir folha de ${folha.professor_nome} — ${nomeMes(folha.mes)}?`)) return
    const res = await api?.folhaDeletar(folha.id, req)
    if (res?.ok) await carregar()
    else alert(res?.erro || 'Erro ao excluir')
  }

  function toggleExpandido(id) {
    setExpandido(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // KPIs do mês
  const kpis = useMemo(() => {
    const total   = folhas.reduce((s, f) => s + (f.total_liquido || 0), 0)
    const pagas   = folhas.filter(f => f.status === 'Paga').length
    const abertas = folhas.filter(f => f.status === 'Aberta').length
    const horas   = folhas.reduce((s, f) => s + (f.horas_normais || 0) + (f.horas_extra_50 || 0) + (f.horas_extra_100 || 0), 0)
    return { total, pagas, abertas, horas }
  }, [folhas])

  return (
    <div className="fade-up">

      {/* ── CABEÇALHO ── */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:'var(--text-1)', letterSpacing:-.5 }}>
            Folha de Pagamento
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            Geração e controle de pagamento de professores por mês
          </div>
        </div>

        {/* Seletor de mês */}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Calendar size={14} style={{color:'var(--text-3)'}}/>
          <input type="month" className="input" value={mes}
            onChange={e=>setMes(e.target.value)}
            style={{width:160,fontWeight:600}}/>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={carregar} title="Recarregar">
          <RefreshCw size={13} style={loading?{animation:'spin .7s linear infinite'}:{}}/>
        </button>

        {semFolha.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={gerarTodas}>
            <Plus size={13}/> Gerar todas ({semFolha.length})
          </button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Total a pagar', value: formatBRL(kpis.total),    color:'var(--accent)',  bg:'#63dcaa22', Icon: DollarSign },
          { label:'Folhas pagas',  value: kpis.pagas,               color:'#63dcaa',        bg:'#63dcaa22', Icon: CheckCircle },
          { label:'Folhas abertas',value: kpis.abertas,             color:'#5b9cf6',        bg:'#5b9cf622', Icon: AlertCircle },
          { label:'Total de horas',value: fmtHoras(kpis.horas),    color:'#f5c542',        bg:'#f5c54222', Icon: Clock },
        ].map(({label,value,color,bg,Icon})=>(
          <div key={label} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:9,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Icon size={16} style={{color}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:'var(--text-3)',marginBottom:2}}>{label}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color}}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PROFESSORES SEM FOLHA ── */}
      {semFolha.length > 0 && (
        <div className="card" style={{padding:'16px 20px',marginBottom:16,border:'1px solid #5b9cf644'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#5b9cf6',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
            <AlertCircle size={13}/> Professores sem folha em {nomeMes(mes)}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {semFolha.map(p=>(
              <button key={p.id}
                className="btn btn-ghost btn-xs"
                style={{gap:6,border:'1px solid var(--border)'}}
                onClick={()=>gerarParaProfessor(p.id)}
                disabled={gerando===p.id}
              >
                {gerando===p.id
                  ? <span style={{display:'inline-block',width:10,height:10,border:'2px solid rgba(0,0,0,.2)',borderTopColor:'var(--text-1)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                  : <Plus size={11}/>
                }
                {p.nome} <span style={{
                  fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10,
                  background: p.tipo_contrato==='PJ'?'#5b9cf622':'#63dcaa22',
                  color:      p.tipo_contrato==='PJ'?'#5b9cf6':'#63dcaa',
                }}>{p.tipo_contrato||'CLT'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TABELA DE FOLHAS ── */}
      {folhas.length === 0 && !loading && (
        <div className="empty" style={{marginTop:40}}>
          <DollarSign size={40}/>
          <p>Nenhuma folha gerada para {nomeMes(mes)}.</p>
          {semFolha.length > 0 && (
            <button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={gerarTodas}>
              <Plus size={13}/> Gerar folhas para todos os professores ativos
            </button>
          )}
        </div>
      )}

      {folhas.length > 0 && (
        <div className="card" style={{overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--surface-2)',fontSize:11,color:'var(--text-3)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>
                <th style={{padding:'10px 14px',textAlign:'left',width:32}}></th>
                <th style={{padding:'10px 14px',textAlign:'left'}}>Professor</th>
                <th style={{padding:'10px 14px',textAlign:'center'}}>Tipo</th>
                <th style={{padding:'10px 14px',textAlign:'center'}}>H. Normal</th>
                <th style={{padding:'10px 14px',textAlign:'center'}}>H. 50%</th>
                <th style={{padding:'10px 14px',textAlign:'center'}}>H. 100%</th>
                <th style={{padding:'10px 14px',textAlign:'right'}}>Bruto</th>
                <th style={{padding:'10px 14px',textAlign:'right'}}>Deduções</th>
                <th style={{padding:'10px 14px',textAlign:'right'}}>Líquido</th>
                <th style={{padding:'10px 14px',textAlign:'center'}}>Status</th>
                <th style={{padding:'10px 14px',textAlign:'center',width:90}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {folhas.map(f => {
                const sc       = STATUS_COR[f.status] || STATUS_COR.Aberta
                const expanded = expandido.has(f.id)
                const isCLT    = f.tipo_contrato !== 'PJ'
                const corTipo  = isCLT ? '#63dcaa' : '#5b9cf6'

                return (
                  <React.Fragment key={f.id}>
                    <tr style={{borderTop:'1px solid var(--border)',transition:'background .1s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>

                      <td style={{padding:'10px 6px 10px 14px'}}>
                        <button className="btn btn-ghost btn-xs" style={{padding:'2px 4px'}}
                          onClick={()=>toggleExpandido(f.id)}>
                          {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                        </button>
                      </td>

                      <td style={{padding:'10px 14px'}}>
                        <div style={{fontWeight:600,color:'var(--text-1)',fontSize:13}}>{f.professor_nome}</div>
                        <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>{f.professor_idioma||'—'}</div>
                      </td>

                      <td style={{padding:'10px 14px',textAlign:'center'}}>
                        <span style={{
                          fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,
                          background:corTipo+'22',color:corTipo,
                        }}>{f.tipo_contrato}</span>
                      </td>

                      <td style={{padding:'10px 14px',textAlign:'center',fontSize:13}}>
                        {fmtHoras(f.horas_normais)}
                      </td>
                      <td style={{padding:'10px 14px',textAlign:'center',fontSize:13,color:'#f5c542'}}>
                        {f.horas_extra_50 > 0 ? fmtHoras(f.horas_extra_50) : '—'}
                      </td>
                      <td style={{padding:'10px 14px',textAlign:'center',fontSize:13,color:'#f2617a'}}>
                        {f.horas_extra_100 > 0 ? fmtHoras(f.horas_extra_100) : '—'}
                      </td>

                      <td style={{padding:'10px 14px',textAlign:'right',fontSize:13,color:'var(--text-1)',fontWeight:500}}>
                        {formatBRL(f.total_bruto)}
                      </td>
                      <td style={{padding:'10px 14px',textAlign:'right',fontSize:13,color:f.deducoes>0?'#f2617a':'var(--text-3)'}}>
                        {f.deducoes > 0 ? `-${formatBRL(f.deducoes)}` : '—'}
                      </td>
                      <td style={{padding:'10px 14px',textAlign:'right'}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800,color:'var(--accent)'}}>
                          {formatBRL(f.total_liquido)}
                        </span>
                      </td>

                      <td style={{padding:'10px 14px',textAlign:'center'}}>
                        <span style={{
                          fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,
                          background:sc.bg,color:sc.color,
                        }}>{sc.label}</span>
                      </td>

                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                          {f.status !== 'Paga' && (
                            <button className="btn btn-ghost btn-xs" title="Editar"
                              onClick={()=>setEditando(f)}>
                              <Pencil size={11}/>
                            </button>
                          )}
                          <button className="btn btn-danger btn-xs" title="Excluir"
                            onClick={()=>deletar(f)}>
                            <Trash2 size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Linha expandida com detalhe */}
                    {expanded && (
                      <tr style={{background:'var(--surface-2)'}}>
                        <td colSpan={11} style={{padding:'10px 20px 14px 50px'}}>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(4,auto)',gap:'6px 24px',fontSize:12}}>
                            <div style={{color:'var(--text-3)'}}>Valor/hora base</div>
                            <div style={{fontWeight:600,color:'var(--text-1)'}}>{formatBRL(f.valor_hora_ref)}</div>
                            <div style={{color:'var(--text-3)'}}>Salário ref.</div>
                            <div style={{fontWeight:600,color:'var(--text-1)'}}>{f.salario_fixo_ref > 0 ? formatBRL(f.salario_fixo_ref) : '—'}</div>
                            <div style={{color:'var(--text-3)'}}>Valor normal</div>
                            <div style={{fontWeight:600,color:'var(--accent)'}}>{formatBRL(f.valor_normal)}</div>
                            <div style={{color:'var(--text-3)'}}>Extra 50%</div>
                            <div style={{fontWeight:600,color:'#f5c542'}}>{formatBRL(f.valor_extra_50)}</div>
                            <div style={{color:'var(--text-3)'}}>Extra 100%</div>
                            <div style={{fontWeight:600,color:'#f2617a'}}>{formatBRL(f.valor_extra_100)}</div>
                            {f.obs && <>
                              <div style={{color:'var(--text-3)'}}>Observações</div>
                              <div style={{gridColumn:'span 3',color:'var(--text-2)',fontStyle:'italic'}}>{f.obs}</div>
                            </>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL DE EDIÇÃO ── */}
      {editando && (
        <ModalEditarFolha
          folha={editando}
          onSalvar={salvarEdicao}
          onFechar={()=>setEditando(null)}
        />
      )}
    </div>
  )
}
