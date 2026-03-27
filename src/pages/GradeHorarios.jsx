/**
 * GradeHorarios.jsx
 * Grade visual semanal — exibe turmas alocadas por dia da semana e faixa de horário.
 * Rota: /cursos/grade  (ou aba dentro de Cursos)
 *
 * Como funciona o parsing de horário:
 *   O campo turma.horario é texto livre (ex: "Seg/Qua 18h", "Ter/Qui 19h30").
 *   Este componente extrai os dias e o horário por heurística simples.
 *   Para horários não reconhecidos, exibe na coluna "Outros".
 */
import React, { useState, useMemo } from 'react'
import { BookOpen, Users } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const DIAS_SEMANA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const ALIAS_DIAS  = {
  'segunda':'Seg','segunda-feira':'Seg','monday':'Seg',
  'terça':'Ter','terca':'Ter','terça-feira':'Ter','tuesday':'Ter',
  'quarta':'Qua','quarta-feira':'Qua','wednesday':'Qua',
  'quinta':'Qui','quinta-feira':'Qui','thursday':'Qui',
  'sexta':'Sex','sexta-feira':'Sex','friday':'Sex',
  'sábado':'Sáb','sabado':'Sáb','saturday':'Sáb',
  'domingo':'Dom','sunday':'Dom',
  // abreviações já no padrão
  'seg':'Seg','ter':'Ter','qua':'Qua','qui':'Qui','sex':'Sex','sáb':'Sáb','sab':'Sáb','dom':'Dom',
}

const CORES_IDIOMA = {
  'Inglês':   { bg:'#1a3a2a', border:'#63dcaa', text:'#63dcaa' },
  'Espanhol': { bg:'#3a3010', border:'#f5c542', text:'#f5c542' },
  'Francês':  { bg:'#0e2040', border:'#5b9cf6', text:'#5b9cf6' },
  'Alemão':   { bg:'#3a1020', border:'#f2617a', text:'#f2617a' },
  'Italiano': { bg:'#25154a', border:'#a78bfa', text:'#a78bfa' },
  'default':  { bg:'#1e2028', border:'#8b949e', text:'#8b949e' },
}

// Extrai dias e horário de um texto como "Seg/Qua 18h30" ou "Ter/Qui 19h"
function parsearHorario(texto) {
  if (!texto) return { dias: [], hora: '' }
  const t = texto.trim()

  // Separa parte dos dias da parte do horário
  // Hora: padrão NN:NN ou NNhNN ou NNh
  const matchHora = t.match(/(\d{1,2})[h:](\d{0,2})/)
  const hora = matchHora
    ? `${matchHora[1].padStart(2,'0')}h${matchHora[2] ? matchHora[2].padStart(2,'0') : ''}`
    : ''

  // Remove a hora do texto para isolar os dias
  const semHora = t.replace(/\d{1,2}[h:]\d{0,2}/g, '').trim()

  // Quebra por separadores comuns: / · , espaço
  const tokens = semHora.split(/[\s\/,·]+/).filter(Boolean)

  const dias = []
  for (const tok of tokens) {
    const normalizado = ALIAS_DIAS[tok.toLowerCase()]
    if (normalizado && !dias.includes(normalizado)) dias.push(normalizado)
  }

  return { dias: dias.length ? dias : [], hora }
}

// Converte hora "18h30" em minutos para ordenação
function horaEmMin(hora) {
  if (!hora) return 9999
  const m = hora.match(/(\d+)h(\d*)/)
  if (!m) return 9999
  return parseInt(m[1],10) * 60 + (m[2] ? parseInt(m[2],10) : 0)
}

export default function GradeHorarios() {
  const { turmas, professores, alunos } = useApp()
  const [filtroProfessor, setFiltroProfessor] = useState('')
  const [filtroIdioma,    setFiltroIdioma]    = useState('')
  const [modoVis,         setModoVis]         = useState('grade') // 'grade' | 'lista'

  // Monta mapa: { dia: { hora: [turma, ...] } }
  const grade = useMemo(() => {
    const mapa = {} // dia → hora → turmas[]
    const semDia = [] // turmas sem dia reconhecido

    turmas
      .filter(t => t.ativa !== false)
      .filter(t => !filtroProfessor || String(t.professorId) === filtroProfessor)
      .filter(t => !filtroIdioma || t.idioma === filtroIdioma)
      .forEach(t => {
        const { dias, hora } = parsearHorario(t.horario)
        const chaveHora = hora || 'Sem horário'

        if (!dias.length) {
          semDia.push({ ...t, horaFormatada: chaveHora })
          return
        }

        dias.forEach(dia => {
          if (!mapa[dia]) mapa[dia] = {}
          if (!mapa[dia][chaveHora]) mapa[dia][chaveHora] = []
          mapa[dia][chaveHora].push({ ...t, horaFormatada: chaveHora })
        })
      })

    return { mapa, semDia }
  }, [turmas, filtroProfessor, filtroIdioma])

  // Dias com pelo menos 1 turma
  const diasAtivos = DIAS_SEMANA.filter(d => grade.mapa[d])

  // Todos os horários únicos, ordenados
  const todosHorarios = useMemo(() => {
    const set = new Set()
    Object.values(grade.mapa).forEach(horas => Object.keys(horas).forEach(h => set.add(h)))
    return [...set].sort((a, b) => horaEmMin(a) - horaEmMin(b))
  }, [grade.mapa])

  const idiomasUnicos = [...new Set(turmas.map(t => t.idioma).filter(Boolean))].sort()

  function getProfNome(id) { return professores.find(p => p.id === id)?.nome?.split(' ')[0] || '—' }
  function getMatriculados(id) { return alunos.filter(a => a.turmaId === id && a.status === 'Ativo').length }

  function CardTurma({ t }) {
    const cor     = CORES_IDIOMA[t.idioma] || CORES_IDIOMA.default
    const mat     = getMatriculados(t.id)
    const ocup    = t.vagas ? Math.round(mat / t.vagas * 100) : 0
    const semVaga = mat >= t.vagas
    return (
      <div style={{
        background: cor.bg,
        border: `1px solid ${cor.border}40`,
        borderLeft: `3px solid ${cor.border}`,
        borderRadius: 8,
        padding: '7px 10px',
        marginBottom: 6,
        cursor: 'default',
        position: 'relative',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:700,color:cor.text,letterSpacing:.3}}>
              {t.codigo}
            </div>
            <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>{getProfNome(t.professorId)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:10,color: semVaga?'var(--red)':'var(--text-3)'}}>
              {mat}/{t.vagas}
            </div>
            {semVaga && <div style={{fontSize:9,color:'var(--red)',fontWeight:600}}>LOTADA</div>}
          </div>
        </div>
        {/* Barra de ocupação */}
        <div style={{height:2,background:'var(--bg-hover)',borderRadius:1,marginTop:6,overflow:'hidden'}}>
          <div style={{
            height:'100%',borderRadius:1,
            width:`${Math.min(100,ocup)}%`,
            background: ocup>=100?'var(--red)':ocup>70?'var(--yellow)':cor.border,
          }}/>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-up">

      {/* ── Toolbar ── */}
      <div className="toolbar" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {/* Filtro professor */}
          <select className="select" style={{fontSize:12,height:35,width:220,flexShrink:0}}
            value={filtroProfessor} onChange={e=>setFiltroProfessor(e.target.value)}>
            <option value="">Todos os professores</option>
            {professores.filter(p=>p.ativo!==false).map(p=>(
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {/* Filtro idioma */}
          <select className="select" style={{fontSize:12,height:35,width:160,flexShrink:0}}
            value={filtroIdioma} onChange={e=>setFiltroIdioma(e.target.value)}>
            <option value="">Todos os idiomas</option>
            {idiomasUnicos.map(i=><option key={i}>{i}</option>)}
          </select>
          {(filtroProfessor||filtroIdioma) && (
            <button className="btn btn-ghost btn-sm"
              onClick={()=>{setFiltroProfessor('');setFiltroIdioma('')}}>
              Limpar filtros
            </button>
          )}
        </div>
        <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
          <button className={`btn btn-sm ${modoVis==='grade'?'btn-primary':'btn-ghost'}`}
            onClick={()=>setModoVis('grade')}>Grade</button>
          <button className={`btn btn-sm ${modoVis==='lista'?'btn-primary':'btn-ghost'}`}
            onClick={()=>setModoVis('lista')}>Lista</button>
        </div>
      </div>

      {/* ── LEGENDA ── */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
        {idiomasUnicos.map(idioma => {
          const cor = CORES_IDIOMA[idioma] || CORES_IDIOMA.default
          return (
            <div key={idioma} style={{
              display:'flex',alignItems:'center',gap:5,fontSize:11,
              color:'var(--text-2)',cursor:'pointer',
              opacity: filtroIdioma && filtroIdioma!==idioma ? .4 : 1,
            }} onClick={()=>setFiltroIdioma(filtroIdioma===idioma?'':idioma)}>
              <span style={{width:10,height:10,borderRadius:2,background:cor.border,display:'inline-block'}}/>
              {idioma}
            </div>
          )
        })}
      </div>

      {/* ── MODO GRADE ── */}
      {modoVis === 'grade' && (
        diasAtivos.length === 0
          ? <div className="empty"><BookOpen size={40}/><p>Nenhuma turma ativa com horário cadastrado.</p></div>
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'separate',borderSpacing:'0 0'}}>
                <thead>
                  <tr>
                    <th style={{
                      width:70,padding:'8px 10px',fontSize:11,
                      color:'var(--text-3)',fontWeight:500,
                      textAlign:'left',borderBottom:'1px solid var(--border)',
                    }}>Horário</th>
                    {diasAtivos.map(dia => (
                      <th key={dia} style={{
                        padding:'8px 10px',fontSize:12,fontWeight:600,
                        color:'var(--text-1)',textAlign:'center',
                        borderBottom:'1px solid var(--border)',
                        minWidth:150,
                      }}>{dia}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todosHorarios.map(hora => (
                    <tr key={hora}>
                      <td style={{
                        padding:'8px 10px',fontSize:12,fontWeight:600,
                        color:'var(--accent)',verticalAlign:'top',
                        borderBottom:'1px solid var(--border-tertiary)',
                        whiteSpace:'nowrap',
                      }}>{hora}</td>
                      {diasAtivos.map(dia => {
                        const turmasDia = grade.mapa[dia]?.[hora] || []
                        return (
                          <td key={dia} style={{
                            padding:'6px 8px',verticalAlign:'top',
                            borderBottom:'1px solid var(--border-tertiary)',
                          }}>
                            {turmasDia.map(t => <CardTurma key={t.id} t={t}/>)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {/* ── MODO LISTA ── */}
      {modoVis === 'lista' && (
        <div className="tbl-wrap">
          <table>
            <thead><tr>
              <th>Turma</th><th>Idioma / Nível</th><th>Horário</th><th>Professor</th><th>Alunos</th><th>Ocupação</th>
            </tr></thead>
            <tbody>
              {turmas
                .filter(t => t.ativa !== false)
                .filter(t => !filtroProfessor || String(t.professorId) === filtroProfessor)
                .filter(t => !filtroIdioma || t.idioma === filtroIdioma)
                .sort((a,b) => {
                  const { hora: ha } = parsearHorario(a.horario)
                  const { hora: hb } = parsearHorario(b.horario)
                  return horaEmMin(ha) - horaEmMin(hb)
                })
                .map(t => {
                  const cor  = CORES_IDIOMA[t.idioma] || CORES_IDIOMA.default
                  const mat  = getMatriculados(t.id)
                  const ocup = t.vagas ? Math.round(mat/t.vagas*100) : 0
                  return (
                    <tr key={t.id}>
                      <td>
                        <span className="badge" style={{background:cor.bg,color:cor.text,border:`1px solid ${cor.border}40`,fontSize:12}}>
                          {t.codigo}
                        </span>
                      </td>
                      <td><span style={{color:'var(--text-2)',fontSize:12}}>{t.idioma} · {t.nivel}</span></td>
                      <td style={{fontSize:12,color:'var(--text-1)',fontWeight:500}}>{t.horario||'—'}</td>
                      <td style={{fontSize:12,color:'var(--text-2)'}}>{getProfNome(t.professorId)}</td>
                      <td><strong style={{color:'var(--text-1)'}}>{mat}</strong><span style={{color:'var(--text-3)',fontSize:11}}>/{t.vagas}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:5,background:'var(--bg-hover)',borderRadius:3,overflow:'hidden',minWidth:60}}>
                            <div style={{height:'100%',width:`${Math.min(100,ocup)}%`,borderRadius:3,background:ocup>=100?'var(--red)':ocup>70?'var(--yellow)':cor.border}}/>
                          </div>
                          <span style={{fontSize:11,color:'var(--text-3)',minWidth:28}}>{ocup}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Turmas sem dia reconhecido */}
      {grade.semDia.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
            <BookOpen size={12}/> Turmas sem dia da semana identificado ({grade.semDia.length})
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {grade.semDia.map(t => <CardTurma key={t.id} t={t}/>)}
          </div>
        </div>
      )}
    </div>
  )
}
