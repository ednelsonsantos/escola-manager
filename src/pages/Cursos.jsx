import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Users, BookOpen, Search, X } from 'lucide-react'
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

  function alunosDaTurma(id) { return alunos.filter(a=>a.turmaId===id && a.status==='Ativo').length }
  function getProfNome(id)   { return professores.find(p=>p.id===id)?.nome || '—' }

  function delTurma() { deleteTurma(confirm.item.id); setConfirm(null) }
  function delProf()  { deleteProfessor(confirm.item.id); setConfirm(null) }

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
        </div>

        <div className="search-wrap" style={{flex:1,maxWidth:280}}>
          <Search/><input placeholder={`Buscar ${tab}...`} value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&<button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}} onClick={()=>setSearch('')}><X size={12}/></button>}
        </div>

        <div className="toolbar-right">
          {tab==='turmas'
            ? <button className="btn btn-primary btn-sm" onClick={()=>nav('/cursos/turmas/nova')}><Plus size={14}/> Nova Turma</button>
            : <button className="btn btn-primary btn-sm" onClick={()=>nav('/cursos/professores/novo')}><Plus size={14}/> Novo Professor</button>}
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
                    <div className="curso-stat"><span className="cs-label">Ocupação</span><span className="cs-val">{ocup}%</span></div>
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
                  <th>Nome</th><th>Idioma</th><th>E-mail</th><th>Telefone</th><th>Turmas</th><th>Alunos</th><th>Status</th><th style={{width:90}}>Ações</th>
                </tr></thead>
                <tbody>
                  {filtProfs.map(p => {
                    const turmasProf = turmas.filter(t=>t.professorId===p.id)
                    const alunosProf = turmasProf.reduce((s,t)=>s+alunosDaTurma(t.id),0)
                    const cor = CORES_IDIOMA[p.idioma]||CORES_IDIOMA.default
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
                        <td><span className="badge" style={{background:cor+'22',color:cor}}>{p.idioma}</span></td>
                        <td className="td-muted">{p.email||'—'}</td>
                        <td className="td-muted">{p.telefone||'—'}</td>
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

      {confirm?.tipo==='turma' && <ConfirmModal title="Excluir Turma"     msg={`Excluir a turma "${confirm.item.codigo}"? Alunos vinculados perderão a turma.`} onConfirm={delTurma} onClose={()=>setConfirm(null)} danger/>}
      {confirm?.tipo==='prof'  && <ConfirmModal title="Excluir Professor" msg={`Excluir "${confirm.item.nome}"? As turmas vinculadas ficarão sem professor.`}    onConfirm={delProf}  onClose={()=>setConfirm(null)} danger/>}
    </div>
  )
}
