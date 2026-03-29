import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Users, BookOpen, Search, X, Clock, AlertTriangle, Phone, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp, formatBRL } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

const CORES_IDIOMA = { 'Inglês':'#63dcaa','Espanhol':'#f5c542','Francês':'#5b9cf6','Alemão':'#f2617a','Italiano':'#a78bfa','default':'#8b949e' }

export default function Cursos() {
  const nav = useNavigate()
  const { turmas, deleteTurma, professores, deleteProfessor, alunos } = useApp()

  const [tab,    setTab]    = useState('turmas')
  const [search, setSearch] = useState('')
  const [confirm,setConfirm]= useState(null) // { tipo:'turma'|'prof', item }

  const filtTurmas = turmas.filter(t => {
    const q = search.toLowerCase()
    return !q || t.codigo.toLowerCase().includes(q) || t.idioma.toLowerCase().includes(q) || t.nivel.toLowerCase().includes(q)
  })
  const filtProfs = professores.filter(p => {
    const q = search.toLowerCase()
    return !q || p.nome.toLowerCase().includes(q) || p.idioma.toLowerCase().includes(q)
  })

  // ── Lista de Espera ──────────────────────────────────────────────────────────
  const listaEspera = alunos.filter(a => {
    const q = search.toLowerCase()
    return a.status === 'Lista de Espera' &&
      (!q || a.nome.toLowerCase().includes(q) || (a.telefone||'').includes(q) || (a.respNome||'').toLowerCase().includes(q))
  })

  function alunosDaTurma(id) {
    return alunos.filter(a => {
      const temTurma = a.turmaId === id ||
        (Array.isArray(a.matriculas) && a.matriculas.some(m => Number(m.turmaId) === id))
      if (!temTurma) return false
      return a.status === 'Ativo' ||
        ((a.status === 'Inativo' || a.status === 'Trancado') && a.manterVaga)
    }).length
  }
  function getProfNome(id)   { return professores.find(p=>p.id===id)?.nome || '—' }

  function delTurma() { deleteTurma(confirm.item.id); setConfirm(null) }
  function delProf()  { deleteProfessor(confirm.item.id); setConfirm(null) }

  function abrirWhatsApp(tel, nome) {
    window.electronAPI?.whatsappAbrir(tel, `Olá ${nome}! Temos uma vaga disponível. Entre em contato conosco.`)
  }

  return (
    <div className="fade-up">
      <div className="toolbar">
        <div className="tabs" style={{margin:0}}>
          <button className={`tab${tab==='turmas'?' active':''}`} onClick={()=>{setTab('turmas');setSearch('')}}>
            <BookOpen size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Turmas ({turmas.length})
          </button>
          <button className={`tab${tab==='professores'?' active':''}`} onClick={()=>{setTab('professores');setSearch('')}}>
            <Users size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Professores ({professores.length})
          </button>
          <button className={`tab${tab==='espera'?' active':''}`} onClick={()=>{setTab('espera');setSearch('')}}>
            <Clock size={13} style={{marginRight:5,verticalAlign:'middle'}}/>
            Lista de Espera
            {listaEspera.length > 0 && (
              <span style={{
                marginLeft:5, fontSize:10, fontWeight:700,
                background:'var(--yellow)', color:'#7a4f00',
                padding:'1px 6px', borderRadius:20,
              }}>{alunos.filter(a=>a.status==='Lista de Espera').length}</span>
            )}
          </button>
        </div>

        <div className="search-wrap" style={{flex:1,maxWidth:280}}>
          <Search/><input placeholder={`Buscar ${tab==='espera'?'lista de espera':tab}...`} value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}} onClick={()=>setSearch('')}><X size={12}/></button>}
        </div>

        <div className="toolbar-right">
          {tab==='turmas'  && <button className="btn btn-primary btn-sm" onClick={()=>nav('/cursos/turmas/nova')}><Plus size={14}/> Nova Turma</button>}
          {tab==='professores' && <button className="btn btn-primary btn-sm" onClick={()=>nav('/cursos/professores/novo')}><Plus size={14}/> Novo Professor</button>}
          {tab==='espera'  && <button className="btn btn-primary btn-sm" onClick={()=>nav('/alunos/novo')}><Plus size={14}/> Novo Aluno</button>}
        </div>
      </div>

      {/* TURMAS */}
      {tab==='turmas' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
          {filtTurmas.length===0
            ? <div className="empty" style={{gridColumn:'1/-1'}}><BookOpen size={40}/><p>Nenhuma turma encontrada.</p></div>
            : filtTurmas.map(t => {
              const matriculados = alunosDaTurma(t.id)
              const ocup = Math.min(100, Math.round(matriculados/t.vagas*100))
              const cor  = CORES_IDIOMA[t.idioma] || CORES_IDIOMA.default
              const nivel_color = t.nivel==='Básico'?'bg-green':t.nivel==='Intermediário'?'bg-yellow':t.nivel==='Avançado'?'bg-red':'bg-blue'
              const vagasLivres = t.vagas - matriculados
              // Alunos na lista de espera que querem esta turma
              const esperandoEssaTurma = alunos.filter(a => {
                // Quem já está matriculado não conta na espera
                const jaMatriculado = Number(a.turmaId) === t.id ||
                  (Array.isArray(a.matriculas) && a.matriculas.some(m => Number(m.turmaId) === t.id))
                if (jaMatriculado) return false
                if (Array.isArray(a.turmasEsperaIds) && a.turmasEsperaIds.length > 0)
                  return a.turmasEsperaIds.includes(t.id)
                return a.status === 'Lista de Espera' && Number(a.turmaEsperaId) === t.id
              }).length
              return (
                <div key={t.id} className="curso-card">
                  <div className="curso-card-head">
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{width:10,height:10,borderRadius:3,background:cor,display:'inline-block'}}/>
                        <span className="curso-idioma">{t.idioma}</span>
                      </div>
                      <span className={`badge ${nivel_color} curso-nivel-badge`}>{t.nivel}</span>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>nav(`/cursos/turmas/editar/${t.id}`)}><Pencil size={12}/></button>
                      <button className="btn btn-danger btn-xs" onClick={()=>setConfirm({tipo:'turma',item:t})}><Trash2 size={12}/></button>
                    </div>
                  </div>

                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                    <span className="badge bg-blue" style={{fontSize:12}}>{t.codigo}</span>
                    {!t.ativa && <span className="badge bg-gray">Inativa</span>}
                    {esperandoEssaTurma > 0 && (
                      <span className="badge bg-yellow" style={{fontSize:10,cursor:'pointer'}} onClick={()=>{setTab('espera');setSearch('')}}
                        title={`${esperandoEssaTurma} na lista de espera`}>
                        <Clock size={9} style={{marginRight:3,verticalAlign:'middle'}}/>
                        {esperandoEssaTurma} esperando
                      </span>
                    )}
                  </div>

                  <div style={{fontSize:12,color:'var(--text-2)',marginBottom:4}}>
                    <span style={{color:'var(--text-3)'}}>Horário:</span> {t.horario||'—'}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-2)',marginBottom:12}}>
                    <span style={{color:'var(--text-3)'}}>Professor:</span> {getProfNome(t.professorId)}
                  </div>

                  <div className="curso-stats">
                    <div className="curso-stat"><span className="cs-label">Alunos</span><span className="cs-val">{matriculados}</span></div>
                    <div className="curso-stat"><span className="cs-label">Vagas</span><span className="cs-val">{t.vagas}</span></div>
                    <div className="curso-stat">
                      <span className="cs-label">Livres</span>
                      <span className="cs-val" style={{color: vagasLivres===0?'var(--red)':vagasLivres<=2?'var(--yellow)':'inherit'}}>
                        {vagasLivres}
                      </span>
                    </div>
                  </div>

                  <div className="ocupacao-bar" style={{marginTop:10}}>
                    <div className="ocupacao-fill" style={{width:`${ocup}%`,background:ocup>80?'var(--red)':ocup>50?'var(--yellow)':cor}}/>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* PROFESSORES */}
      {tab==='professores' && (
        <div className="tbl-wrap">
          {filtProfs.length===0
            ? <div className="empty"><Users size={40}/><p>Nenhum professor encontrado.</p></div>
            : <table>
                <thead><tr>
                  <th>Nome</th><th>Idioma</th><th>Contrato</th><th>E-mail</th><th>Turmas</th><th>Alunos</th><th>Status</th><th style={{width:90}}>Ações</th>
                </tr></thead>
                <tbody>
                  {filtProfs.map(p => {
                    const turmasProf  = turmas.filter(t=>t.professorId===p.id)
                    const alunosProf  = turmasProf.reduce((s,t)=>s+alunosDaTurma(t.id),0)
                    const cor         = CORES_IDIOMA[p.idioma]||CORES_IDIOMA.default
                    const isCLT       = p.tipo_contrato !== 'PJ'
                    const corContrato = isCLT ? '#63dcaa' : '#5b9cf6'
                    const valorHora   = isCLT && p.salario_fixo > 0 && p.carga_horaria_mensal > 0
                      ? p.salario_fixo / p.carga_horaria_mensal
                      : null
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,borderRadius:'50%',background:cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0,fontFamily:"'Syne',sans-serif"}}>
                              {p.nome.split(' ').slice(0,2).map(x=>x[0]).join('')}
                            </div>
                            <span className="td-name">{p.nome}</span>
                          </div>
                        </td>
                        <td><span className="badge" style={{background:cor+'22',color:cor}}>{p.idioma||'—'}</span></td>
                        <td>
                          <div style={{display:'flex',flexDirection:'column',gap:2}}>
                            <span style={{
                              fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,alignSelf:'flex-start',
                              background:corContrato+'22',color:corContrato,
                            }}>{p.tipo_contrato||'CLT'}</span>
                            {isCLT && p.salario_fixo > 0 && (
                              <span style={{fontSize:11,color:'var(--text-3)'}}>
                                {formatBRL(p.salario_fixo)}/mês
                                {valorHora !== null && <> · {formatBRL(valorHora)}/h</>}
                              </span>
                            )}
                            {!isCLT && p.valor_hora_pj > 0 && (
                              <span style={{fontSize:11,color:'var(--text-3)'}}>{formatBRL(p.valor_hora_pj)}/h</span>
                            )}
                          </div>
                        </td>
                        <td className="td-muted">{p.email||'—'}</td>
                        <td><strong style={{color:'var(--text-1)'}}>{turmasProf.length}</strong></td>
                        <td><strong style={{color:'var(--text-1)'}}>{alunosProf}</strong></td>
                        <td>{p.ativo?<span className="badge bg-green">Ativo</span>:<span className="badge bg-gray">Inativo</span>}</td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-ghost btn-xs" onClick={()=>nav(`/cursos/professores/editar/${p.id}`)}><Pencil size={12}/></button>
                            <button className="btn btn-danger btn-xs" onClick={()=>setConfirm({tipo:'prof',item:p})}><Trash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* LISTA DE ESPERA */}
      {tab==='espera' && (
        <div>
          {listaEspera.length === 0 ? (
            <div className="empty">
              <Clock size={40}/>
              <p>{search ? 'Nenhum resultado para a busca.' : 'Nenhum aluno na lista de espera.'}</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead><tr>
                  <th>Aluno</th>
                  <th>Turma desejada</th>
                  <th>Responsável</th>
                  <th>Contato</th>
                  <th>Desde</th>
                  <th style={{width:100}}>Ações</th>
                </tr></thead>
                <tbody>
                  {listaEspera.map(a => {
                    const turma    = turmas.find(t => t.id === a.turmaId)
                    const cor      = CORES_IDIOMA[turma?.idioma] || CORES_IDIOMA.default
                    const tel      = a.respTelefone || a.telefone
                    const nomeContato = a.respNome || a.nome
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            <div style={{width:30,height:30,borderRadius:'50%',background:'var(--yellow)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#7a4f00',flexShrink:0,fontFamily:"'Syne',sans-serif"}}>
                              {a.nome.split(' ').slice(0,2).map(x=>x[0]).join('')}
                            </div>
                            <div>
                              <div style={{fontWeight:500,color:'var(--text-1)',fontSize:13}}>{a.nome}</div>
                              <div style={{fontSize:11,color:'var(--text-3)'}}>{a.email||'—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {turma
                            ? <div>
                                <span className="badge" style={{background:cor+'22',color:cor,fontSize:11}}>{turma.codigo}</span>
                                <div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>{turma.idioma} · {turma.nivel}</div>
                              </div>
                            : <span style={{color:'var(--text-3)',fontSize:12}}>Sem preferência</span>
                          }
                        </td>
                        <td>
                          {a.respNome
                            ? <div>
                                <div style={{fontSize:13,color:'var(--text-1)'}}>{a.respNome}</div>
                                <div style={{fontSize:11,color:'var(--text-3)'}}>{a.respParentesco||'Responsável'}</div>
                              </div>
                            : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>
                          }
                        </td>
                        <td>
                          {tel
                            ? <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <span style={{fontSize:12,color:'var(--text-2)'}}>{tel}</span>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  style={{color:'#25d366',padding:'2px 6px'}}
                                  onClick={()=>abrirWhatsApp(tel, nomeContato)}
                                  title="Chamar via WhatsApp"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                </button>
                              </div>
                            : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>
                          }
                        </td>
                        <td style={{fontSize:12,color:'var(--text-3)'}}>
                          {a.dataMatricula ? new Date(a.dataMatricula).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-ghost btn-xs" title="Editar aluno" onClick={()=>nav(`/alunos/editar/${a.id}`)}><Pencil size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumo por turma com vagas */}
          {!search && listaEspera.length > 0 && (() => {
            const porTurma = {}
            listaEspera.forEach(a => {
              const k = a.turmaId || 0
              porTurma[k] = (porTurma[k] || 0) + 1
            })
            const turmasComEspera = Object.entries(porTurma).map(([tid, qtd]) => ({
              turma: turmas.find(t => t.id === Number(tid)),
              qtd,
              vagasLivres: Math.max(0, (turmas.find(t => t.id === Number(tid))?.vagas || 0) - alunosDaTurma(Number(tid))),
            })).filter(x => x.turma)

            if (!turmasComEspera.length) return null
            return (
              <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:10}}>
                {turmasComEspera.map(({turma, qtd, vagasLivres}) => {
                  const cor = CORES_IDIOMA[turma.idioma] || CORES_IDIOMA.default
                  return (
                    <div key={turma.id} style={{
                      padding:'10px 14px', borderRadius:10,
                      background:'var(--bg-card)', border:'1px solid var(--border)',
                      fontSize:12, minWidth:160,
                    }}>
                      <div style={{fontWeight:600,color:cor,marginBottom:4}}>{turma.codigo}</div>
                      <div style={{color:'var(--text-2)'}}>{qtd} aguardando</div>
                      <div style={{color: vagasLivres===0?'var(--red)':'var(--accent)', marginTop:2}}>
                        {vagasLivres===0 ? '⚠ Sem vagas' : `${vagasLivres} vaga(s) livre(s)`}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {confirm?.tipo==='turma' && <ConfirmModal title="Excluir Turma"     msg={`Excluir a turma "${confirm.item.codigo}"? Alunos vinculados perderão a turma.`} onConfirm={delTurma} onClose={()=>setConfirm(null)} danger/>}
      {confirm?.tipo==='prof'  && <ConfirmModal title="Excluir Professor" msg={`Excluir "${confirm.item.nome}"? As turmas vinculadas ficarão sem professor.`}    onConfirm={delProf}  onClose={()=>setConfirm(null)} danger/>}
    </div>
  )
}
