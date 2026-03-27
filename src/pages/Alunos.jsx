import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, UserCheck, UserX, AlertCircle, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp, formatBRL, formatDate, mesAtualDinamico } from '../context/AppContext.jsx'
import Modal, { ConfirmModal } from '../components/Modal.jsx'

const EMPTY_FORM = { nome:'', email:'', telefone:'', turmaId:'', mensalidade:'', status:'Ativo', dataNasc:'', dataMatricula:'', obs:'' }

function FieldError({ msg }) {
  if (!msg) return null
  return <span style={{fontSize:11,color:'var(--red)',marginTop:2}}>{msg}</span>
}

function AlunoForm({ data, onChange, turmas, erros={} }) {
  return (
    <div className="form-grid">
      <div className="field form-full">
        <label>Nome Completo *</label>
        <input className="input" style={{borderColor:erros.nome?'var(--red)':''}}
          placeholder="Nome do aluno" value={data.nome} onChange={e=>onChange('nome',e.target.value)}/>
        <FieldError msg={erros.nome}/>
      </div>
      <div className="field">
        <label>E-mail</label>
        <input className="input" style={{borderColor:erros.email?'var(--red)':''}}
          type="email" placeholder="email@exemplo.com" value={data.email} onChange={e=>onChange('email',e.target.value)}/>
        <FieldError msg={erros.email}/>
      </div>
      <div className="field">
        <label>Telefone</label>
        <input className="input" placeholder="(11) 99999-9999" value={data.telefone} onChange={e=>onChange('telefone',e.target.value)}/>
      </div>
      <div className="field">
        <label>Data de Nascimento</label>
        <input className="input" type="date" value={data.dataNasc} onChange={e=>onChange('dataNasc',e.target.value)}/>
      </div>
      <div className="field">
        <label>Data de Matrícula</label>
        <input className="input" type="date" value={data.dataMatricula} onChange={e=>onChange('dataMatricula',e.target.value)}/>
      </div>
      <div className="field">
        <label>Turma</label>
        <select className="select" value={data.turmaId} onChange={e=>onChange('turmaId',Number(e.target.value))}>
          <option value="">Selecionar turma</option>
          {turmas.filter(t=>t.ativa).map(t=>(
            <option key={t.id} value={t.id}>{t.codigo} — {t.idioma} {t.nivel}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Mensalidade (R$) *</label>
        <input className="input" style={{borderColor:erros.mensalidade?'var(--red)':''}}
          type="number" placeholder="0" value={data.mensalidade} onChange={e=>onChange('mensalidade',Number(e.target.value))}/>
        <FieldError msg={erros.mensalidade}/>
      </div>
      <div className="field">
        <label>Status</label>
        <select className="select" value={data.status} onChange={e=>onChange('status',e.target.value)}>
          <option>Ativo</option>
          <option>Inativo</option>
          <option>Trancado</option>
        </select>
      </div>
      <div className="field form-full">
        <label>Observações</label>
        <textarea className="textarea" placeholder="Informações adicionais..." value={data.obs} onChange={e=>onChange('obs',e.target.value)}/>
      </div>
    </div>
  )
}

function AlunoDetail({ aluno, turmas, professores, pagamentos, onClose, onEdit }) {
  const turma = turmas.find(t=>t.id===aluno.turmaId)
  const prof  = professores.find(p=>p.id===turma?.professorId)
  const pgAluno = pagamentos.filter(p=>p.alunoId===aluno.id).slice().reverse().slice(0,8)

  return (
    <Modal title="Ficha do Aluno" onClose={onClose} size="modal-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        <button className="btn btn-primary" onClick={onEdit}><Pencil size={14}/> Editar</button>
      </>}
    >
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <div className="aluno-avatar" style={{width:52,height:52,fontSize:18,background:'var(--accent)',color:'var(--bg-app)',flexShrink:0}}>
              {aluno.nome.split(' ').slice(0,2).map(p=>p[0]).join('')}
            </div>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:'var(--text-1)'}}>{aluno.nome}</div>
              <div style={{fontSize:12,color:'var(--text-3)'}}>{turma?.idioma} · {turma?.nivel}</div>
              <div style={{marginTop:4}}>
                {aluno.status==='Ativo'
                  ? <span className="badge bg-green"><span className="bdot"/>Ativo</span>
                  : <span className="badge bg-gray">{aluno.status}</span>}
              </div>
            </div>
          </div>
          {[
            ['E-mail',     aluno.email||'—'],
            ['Telefone',   aluno.telefone||'—'],
            ['Nascimento', formatDate(aluno.dataNasc)],
            ['Matrícula',  formatDate(aluno.dataMatricula)],
            ['Turma',      turma?.codigo||'—'],
            ['Horário',    turma?.horario||'—'],
            ['Professor',  prof?.nome||'—'],
            ['Mensalidade',formatBRL(aluno.mensalidade)],
          ].map(([k,v])=>(
            <div key={k} className="detail-row">
              <span className="detail-key">{k}</span>
              <span className="detail-val" style={k==='Mensalidade'?{color:'var(--accent)',fontWeight:600}:{}}>{v}</span>
            </div>
          ))}
          {aluno.obs && (
            <div className="detail-row">
              <span className="detail-key">Obs.</span>
              <span className="detail-val" style={{fontSize:12,color:'var(--text-2)'}}>{aluno.obs}</span>
            </div>
          )}

          {/* Responsável */}
          {(aluno.respNome || aluno.respTelefone) && (
            <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:10}}>
                Responsável
              </div>
              {aluno.respNome && (
                <div className="detail-row">
                  <span className="detail-key">Nome</span>
                  <span className="detail-val">
                    {aluno.respNome}
                    {aluno.respParentesco && <span style={{marginLeft:6,fontSize:11,color:'var(--text-3)'}}>({aluno.respParentesco})</span>}
                  </span>
                </div>
              )}
              {aluno.respTelefone && (
                <div className="detail-row">
                  <span className="detail-key">Telefone</span>
                  <span className="detail-val" style={{display:'flex',alignItems:'center',gap:8}}>
                    {aluno.respTelefone}
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{color:'#25d366',padding:'2px 6px'}}
                      onClick={()=>window.electronAPI?.whatsappAbrir(aluno.respTelefone,`Olá${aluno.respNome?' '+aluno.respNome:''}! Entramos em contato sobre o aluno ${aluno.nome}.`)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WA
                    </button>
                  </span>
                </div>
              )}
              {aluno.respEmail && (
                <div className="detail-row">
                  <span className="detail-key">E-mail</span>
                  <span className="detail-val">{aluno.respEmail}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:'var(--text-1)',marginBottom:12}}>
            Histórico de Pagamentos
          </div>
          {pgAluno.length===0
            ? <div style={{color:'var(--text-3)',fontSize:13}}>Sem histórico registrado.</div>
            : pgAluno.map(p=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                <div>
                  <div style={{fontSize:13,color:'var(--text-1)'}}>{p.mes}</div>
                  <div style={{fontSize:11,color:'var(--text-3)'}}>Venc: {formatDate(p.vencimento)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:'var(--text-1)'}}>{formatBRL(p.valor)}</div>
                  {p.status==='Pago'     && <span className="badge bg-green"  style={{fontSize:10}}>Pago</span>}
                  {p.status==='Atrasado' && <span className="badge bg-red"    style={{fontSize:10}}>Atrasado</span>}
                  {p.status==='Pendente' && <span className="badge bg-yellow" style={{fontSize:10}}>Pendente</span>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </Modal>
  )
}

export default function Alunos() {
  const { alunos, addAluno, updateAluno, deleteAluno, turmas, professores, pagamentos, exportCSV } = useApp()
  const nav = useNavigate()

  const [search,  setSearch]  = useState('')
  const [fStatus, setFStatus] = useState('Todos')
  const [fTurma,  setFTurma]  = useState('Todos')
  const [modal,   setModal]   = useState(null)
  const [sel,     setSel]     = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [erros,   setErros]   = useState({})
  const [page,    setPage]    = useState(1)
  const PER_PAGE = 10

  const idiomas = ['Todos', ...Array.from(new Set(turmas.map(t=>t.idioma)))]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return alunos.filter(a => {
      const t = turmas.find(t=>t.id===a.turmaId)
      const matchQ = !q || a.nome.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || t?.idioma?.toLowerCase().includes(q)
      const matchS = fStatus==='Todos' || a.status===fStatus
      const matchT = fTurma==='Todos'  || t?.idioma===fTurma
      return matchQ && matchS && matchT
    })
  }, [alunos, turmas, search, fStatus, fTurma])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage-1)*PER_PAGE, safePage*PER_PAGE)

  function openAdd()    { nav('/alunos/novo') }
  function openEdit(a)  { nav(`/alunos/editar/${a.id}`) }
  function openDetail(a){ setSel(a); setModal('detail') }
  function openDelete(a){ setSel(a); setModal('confirm') }

  function handleField(k,v) { setForm(f=>({...f,[k]:v})); if(erros[k]) setErros(e=>({...e,[k]:''})) }

  function validate() {
    const e = {}
    if (!form.nome?.trim()) e.nome = 'Nome é obrigatório'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido'
    if (!form.mensalidade || Number(form.mensalidade) <= 0) e.mensalidade = 'Informe um valor válido'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErros(e); return }
    modal==='add' ? addAluno(form) : updateAluno(sel.id, form)
    setModal(null)
  }

  function handleDelete() { deleteAluno(sel.id); setModal(null) }
  function resetFiltros() { setSearch(''); setFStatus('Todos'); setFTurma('Todos'); setPage(1) }

  function iniciais(nome) { return nome?.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()||'??' }
  const avatarColors = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316']
  const totalMensalidade = filtered.filter(a=>a.status==='Ativo').reduce((s,a)=>s+a.mensalidade,0)
  const hasFilter = search || fStatus!=='Todos' || fTurma!=='Todos'

  return (
    <div className="fade-up">
      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="search-wrap" style={{flex:1,maxWidth:320}}>
          <Search/>
          <input placeholder="Buscar nome, e-mail, idioma..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
          {search && <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}} onClick={()=>{setSearch('');setPage(1)}}><X size={13}/></button>}
        </div>
        <select className="select" style={{width:150}} value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1)}}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option><option>Trancado</option><option>Lista de Espera</option>
        </select>
        <select className="select" style={{width:140}} value={fTurma} onChange={e=>{setFTurma(e.target.value);setPage(1)}}>
          {idiomas.map(i=><option key={i}>{i}</option>)}
        </select>
        {hasFilter && <button className="btn btn-ghost btn-sm" onClick={resetFiltros}>Limpar</button>}
        <div className="toolbar-right">
          <button className="btn btn-secondary btn-sm" onClick={()=>exportCSV('alunos')}><Download size={13}/> CSV</button>
          <button className="btn btn-primary   btn-sm" onClick={openAdd}><Plus size={14}/> Novo Aluno</button>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="summary-strip">
        <div className="ss-item"><UserCheck size={13} style={{color:'var(--accent)'}}/> Ativos: <strong>{alunos.filter(a=>a.status==='Ativo').length}</strong></div>
        <div className="ss-divider"/>
        <div className="ss-item"><UserX size={13}/> Inativos: <strong>{alunos.filter(a=>a.status==='Inativo'||a.status==='Trancado').length}</strong></div>
        <div className="ss-divider"/>
        <div className="ss-item" style={{cursor:'pointer'}} onClick={()=>{setFStatus('Lista de Espera');setPage(1)}}>
          <AlertCircle size={13} style={{color:'var(--yellow)'}}/> Espera: <strong style={{color:'var(--yellow)'}}>{alunos.filter(a=>a.status==='Lista de Espera').length}</strong>
        </div>
        <div className="ss-divider"/>
        <div className="ss-item"><AlertCircle size={13} style={{color:'var(--red)'}}/> Inadimplentes: <strong style={{color:'var(--red)'}}>{pagamentos.filter(p=>p.mes===mesAtualDinamico()&&p.status==='Atrasado').length}</strong></div>
        <div style={{marginLeft:'auto'}} className="ss-item">Receita potencial: <strong style={{color:'var(--accent)'}}>{formatBRL(totalMensalidade)}/mês</strong></div>
        <div className="ss-divider"/>
        <div className="ss-item" style={{color:'var(--text-3)'}}>{filtered.length} resultado{filtered.length!==1?'s':''}</div>
      </div>

      {/* TABLE */}
      <div className="tbl-wrap">
        {filtered.length===0
          ? <div className="empty">
              <Search size={40}/>
              <p>Nenhum aluno encontrado.</p>
              {hasFilter && <button className="btn btn-secondary btn-sm" style={{marginTop:8}} onClick={resetFiltros}>Limpar filtros</button>}
            </div>
          : <>
              <table className="tbl-compact">
                <thead><tr>
                  <th>#</th><th>Aluno</th><th>Turma</th><th>Mensalidade</th><th>Situação</th><th>Status</th><th>Matrícula</th><th style={{width:108}}>Ações</th>
                </tr></thead>
                <tbody>
                  {paginated.map((a,i) => {
                    const t    = turmas.find(t=>t.id===a.turmaId)
                    const pgAt = pagamentos.find(p=>p.alunoId===a.id && p.mes===mesAtualDinamico())
                    const sit  = pgAt?.status || 'Sem pgto'
                    const idx  = (safePage-1)*PER_PAGE + i
                    return (
                      <tr key={a.id}>
                        <td className="td-muted">{String(a.id).padStart(2,'0')}</td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            <div className="aluno-avatar" style={{width:28,height:28,fontSize:10,background:avatarColors[idx%avatarColors.length],color:'#fff',flexShrink:0}}>
                              {iniciais(a.nome)}
                            </div>
                            <div>
                              <div className="td-name">{a.nome}</div>
                              <div className="td-muted">{a.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{t ? <><span className="badge bg-blue">{t.codigo}</span><div className="td-muted" style={{marginTop:2}}>{t.horario}</div></> : '—'}</td>
                        <td className="td-mono">{formatBRL(a.mensalidade)}</td>
                        <td>
                          {sit==='Pago'     && <span className="badge bg-green"><span className="bdot"/>Em dia</span>}
                          {sit==='Atrasado' && <span className="badge bg-red"><span className="bdot"/>Atrasado</span>}
                          {sit==='Pendente' && <span className="badge bg-yellow"><span className="bdot"/>Pendente</span>}
                          {sit==='Sem pgto' && <span className="badge bg-gray">—</span>}
                        </td>
                        <td>
                          {a.status==='Ativo'
                            ? <span className="badge bg-green"><span className="bdot"/>Ativo</span>
                            : a.status==='Lista de Espera'
                              ? <span className="badge bg-yellow"><span className="bdot"/>Espera</span>
                              : <span className="badge bg-gray" style={{opacity:.6}}>{a.status}</span>}
                        </td>
                        <td className="td-muted">{formatDate(a.dataMatricula)}</td>
                        <td>
                          <div style={{display:'flex',gap:3}}>
                            <button className="btn btn-ghost  btn-xs" onClick={()=>openDetail(a)} title="Ver ficha"><Eye size={13}/></button>
                            <button className="btn btn-ghost  btn-xs" onClick={()=>openEdit(a)}   title="Editar"><Pencil size={13}/></button>
                            <button className="btn btn-danger btn-xs" onClick={()=>openDelete(a)} title="Excluir"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="pagination">
                  <span>{(safePage-1)*PER_PAGE+1}–{Math.min(safePage*PER_PAGE,filtered.length)} de {filtered.length}</span>
                  <div className="pg-btns">
                    <button className="pg-btn" onClick={()=>setPage(1)}           disabled={safePage===1}>«</button>
                    <button className="pg-btn" onClick={()=>setPage(p=>p-1)}      disabled={safePage===1}><ChevronLeft size={13}/></button>
                    {Array.from({length:totalPages},(_,i)=>i+1)
                      .filter(p => p===1||p===totalPages||Math.abs(p-safePage)<=1)
                      .reduce((acc,p,idx,arr)=>{
                        if(idx>0 && p-arr[idx-1]>1) acc.push('…')
                        acc.push(p)
                        return acc
                      },[])
                      .map((p,i)=> typeof p==='string'
                        ? <span key={i} style={{padding:'0 4px',color:'var(--text-3)',fontSize:13}}>…</span>
                        : <button key={p} className={`pg-btn${p===safePage?' active':''}`} onClick={()=>setPage(p)}>{p}</button>
                      )
                    }
                    <button className="pg-btn" onClick={()=>setPage(p=>p+1)}      disabled={safePage===totalPages}><ChevronRight size={13}/></button>
                    <button className="pg-btn" onClick={()=>setPage(totalPages)}  disabled={safePage===totalPages}>»</button>
                  </div>
                </div>
              )}
            </>
        }
      </div>

      {/* Criação/edição de aluno agora é feita em tela dedicada: /alunos/novo e /alunos/editar/:id */}

      {modal==='detail' && sel && (
        <AlunoDetail aluno={sel} turmas={turmas} professores={professores} pagamentos={pagamentos}
          onClose={()=>setModal(null)} onEdit={()=>openEdit(sel)}/>
      )}

      {modal==='confirm' && (
        <ConfirmModal title="Excluir Aluno"
          msg={`Tem certeza que deseja excluir "${sel?.nome}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete} onClose={()=>setModal(null)} danger/>
      )}
    </div>
  )
}
