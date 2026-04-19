/**
 * Biblioteca.jsx — Módulo de Biblioteca (v5.15)
 *
 * Funcionalidades:
 *  - Acervo: CRUD de livros com busca por título, autor e ISBN
 *  - Empréstimos: registro de empréstimo, devolução e controle de atrasos
 *  - Carteirinha: geração de carteirinha de leitor em PDF para aluno/professor
 *
 * Rota: /biblioteca
 */
import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen, Plus, Pencil, Trash2, RefreshCw, Search, X,
  ArrowLeftRight, CheckCircle, AlertTriangle, Clock, BookMarked,
  Users, Save, ChevronDown, Printer, Tag, Filter,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

const CATEGORIAS = ['Didático', 'Literatura', 'Gramática', 'Dicionário', 'Paradidático', 'Referência', 'Outro']
const TABS = ['Acervo', 'Empréstimos', 'Carteirinha']

function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

function hoje() { return new Date().toISOString().split('T')[0] }
function addDias(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function fmtData(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
function diasAtraso(prevista) {
  if (!prevista) return 0
  const diff = Math.floor((new Date(hoje()) - new Date(prevista)) / 86400000)
  return Math.max(0, diff)
}

// ── Modal Livro ───────────────────────────────────────────────────────────────
function ModalLivro({ livro, onSave, onClose }) {
  const isNovo = !livro?.id
  const [form, setForm] = useState({
    titulo:           livro?.titulo            || '',
    autor:            livro?.autor             || '',
    isbn:             livro?.isbn              || '',
    editora:          livro?.editora           || '',
    ano:              livro?.ano               || '',
    categoria:        livro?.categoria         || 'Didático',
    descricao:        livro?.descricao         || '',
    localizacao:      livro?.localizacao       || '',
    total_exemplares: livro?.total_exemplares  ?? 1,
    ativo:            livro?.ativo             ?? 1,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  function f(k, v) { setForm(x => ({ ...x, [k]: v })) }

  async function salvar() {
    if (!form.titulo.trim()) { setErro('Título é obrigatório'); return }
    if (Number(form.total_exemplares) < 1) { setErro('Exemplares deve ser ≥ 1'); return }
    setSalvando(true); setErro('')
    const api = window.electronAPI
    const req = getReq()
    const res = isNovo
      ? await api?.bibLivrosCriar(form, req)
      : await api?.bibLivrosEditar(livro.id, form, req)
    setSalvando(false)
    if (res?.ok) onSave()
    else setErro(res?.erro || 'Erro ao salvar')
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 'min(580px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{isNovo ? 'Novo Livro' : 'Editar Livro'}</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {erro && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', borderRadius: 7, fontSize: 12 }}>{erro}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Título *</label>
              <input value={form.titulo} onChange={e => f('titulo', e.target.value)} placeholder="Título do livro"/>
            </div>
            <div className="field">
              <label>Autor</label>
              <input value={form.autor} onChange={e => f('autor', e.target.value)} placeholder="Nome do autor"/>
            </div>
            <div className="field">
              <label>ISBN</label>
              <input value={form.isbn} onChange={e => f('isbn', e.target.value)} placeholder="978-..."/>
            </div>
            <div className="field">
              <label>Editora</label>
              <input value={form.editora} onChange={e => f('editora', e.target.value)}/>
            </div>
            <div className="field">
              <label>Ano</label>
              <input type="number" value={form.ano} onChange={e => f('ano', e.target.value)} placeholder="2024" min={1900} max={2099}/>
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={form.categoria} onChange={e => f('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Localização / Prateleira</label>
              <input value={form.localizacao} onChange={e => f('localizacao', e.target.value)} placeholder="Ex: Prateleira A-3"/>
            </div>
            <div className="field">
              <label>Total de exemplares *</label>
              <input type="number" value={form.total_exemplares} onChange={e => f('total_exemplares', e.target.value)} min={1}/>
            </div>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Descrição</label>
              <textarea value={form.descricao} onChange={e => f('descricao', e.target.value)} rows={2} placeholder="Sinopse ou observações..."/>
            </div>
            {!isNovo && (
              <div className="field" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="ativo-livro" checked={!!form.ativo} onChange={e => f('ativo', e.target.checked ? 1 : 0)}/>
                <label htmlFor="ativo-livro" style={{ margin: 0 }}>Livro ativo no acervo</label>
              </div>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            <Save size={14}/> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Modal Empréstimo ──────────────────────────────────────────────────────────
function ModalEmprestimo({ livros, emprestimo, onSave, onClose }) {
  const isNovo = !emprestimo?.id
  const [form, setForm] = useState({
    livro_id:       emprestimo?.livro_id      || '',
    tomador_tipo:   emprestimo?.tomador_tipo  || 'aluno',
    tomador_nome:   emprestimo?.tomador_nome  || '',
    tomador_turma:  emprestimo?.tomador_turma || '',
    data_emprestimo: hoje(),
    data_prevista:  addDias(14),
    observacoes:    '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  function f(k, v) { setForm(x => ({ ...x, [k]: v })) }

  const livrosDisponiveis = livros.filter(l => l.disponiveis > 0 && l.ativo)

  async function salvar() {
    if (!form.livro_id)         { setErro('Selecione o livro'); return }
    if (!form.tomador_nome.trim()) { setErro('Nome do tomador é obrigatório'); return }
    if (!form.data_prevista)    { setErro('Data prevista de devolução é obrigatória'); return }
    setSalvando(true); setErro('')
    const res = await window.electronAPI?.bibEmpCriar(form, getReq())
    setSalvando(false)
    if (res?.ok) onSave()
    else setErro(res?.erro || 'Erro ao registrar empréstimo')
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 'min(520px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Novo Empréstimo</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {erro && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', borderRadius: 7, fontSize: 12 }}>{erro}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Livro *</label>
              <select value={form.livro_id} onChange={e => f('livro_id', e.target.value)}>
                <option value="">Selecione...</option>
                {livrosDisponiveis.map(l => (
                  <option key={l.id} value={l.id}>{l.titulo} ({l.disponiveis} disp.)</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tipo de tomador</label>
              <select value={form.tomador_tipo} onChange={e => f('tomador_tipo', e.target.value)}>
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="field">
              <label>Nome do tomador *</label>
              <input value={form.tomador_nome} onChange={e => f('tomador_nome', e.target.value)} placeholder="Nome completo"/>
            </div>
            <div className="field">
              <label>Turma (opcional)</label>
              <input value={form.tomador_turma} onChange={e => f('tomador_turma', e.target.value)} placeholder="Ex: Inglês Avançado"/>
            </div>
            <div className="field">
              <label>Data de devolução prevista *</label>
              <input type="date" value={form.data_prevista} onChange={e => f('data_prevista', e.target.value)} min={hoje()}/>
            </div>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Observações</label>
              <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} rows={2}/>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando}>
            <Save size={14}/> {salvando ? 'Registrando...' : 'Registrar Empréstimo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Aba Acervo ────────────────────────────────────────────────────────────────
function AbaAcervo({ permEditar }) {
  const [livros,       setLivros]       = useState([])
  const [carregando,   setCarregando]   = useState(true)
  const [busca,        setBusca]        = useState('')
  const [filtroCat,    setFiltroCat]    = useState('')
  const [modalLivro,   setModalLivro]   = useState(null)
  const [confirmar,    setConfirmar]    = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const res = await window.electronAPI?.bibLivrosListar({}) || []
    setLivros(res)
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const visiveis = livros.filter(l => {
    const q = busca.toLowerCase()
    const match = !q || l.titulo?.toLowerCase().includes(q) || l.autor?.toLowerCase().includes(q) || l.isbn?.includes(q)
    const cat   = !filtroCat || l.categoria === filtroCat
    return match && cat
  })

  async function deletar(id) {
    const res = await window.electronAPI?.bibLivrosDeletar(id, getReq())
    if (res?.ok) carregar()
    else alert(res?.erro || 'Erro ao excluir')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}/>
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título, autor ou ISBN..."
            style={{ paddingLeft: 32, width: '100%' }}
          />
        </div>
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
        {permEditar && (
          <button className="btn-primary" onClick={() => setModalLivro({})}>
            <Plus size={14}/> Novo Livro
          </button>
        )}
        <button className="btn-outline" onClick={carregar} title="Atualizar">
          <RefreshCw size={14}/>
        </button>
      </div>

      {carregando ? (
        <p style={{ opacity: 0.5, textAlign: 'center', padding: 40 }}>Carregando acervo...</p>
      ) : visiveis.length === 0 ? (
        <div className="empty" style={{ paddingTop: 60 }}>
          <BookOpen size={44} style={{ opacity: 0.25 }}/>
          <p>Nenhum livro encontrado</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoria</th>
                <th>Localização</th>
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Disp.</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                {permEditar && <th style={{ textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {visiveis.map(l => (
                <tr key={l.id} style={{ opacity: l.ativo ? 1 : 0.5 }}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{l.titulo}</span>
                    {l.isbn && <span style={{ fontSize: 11, opacity: 0.5, display: 'block' }}>ISBN: {l.isbn}</span>}
                  </td>
                  <td>{l.autor || '—'}</td>
                  <td><span className="badge badge-blue">{l.categoria || '—'}</span></td>
                  <td style={{ fontSize: 12 }}>{l.localizacao || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{l.total_exemplares}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: l.disponiveis === 0 ? 'var(--red)' : 'var(--green)' }}>
                      {l.disponiveis}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {!l.ativo
                      ? <span className="badge badge-gray">Inativo</span>
                      : l.disponiveis === 0
                        ? <span className="badge badge-red">Esgotado</span>
                        : <span className="badge badge-green">Disponível</span>}
                  </td>
                  {permEditar && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn-icon" title="Editar" onClick={() => setModalLivro(l)}><Pencil size={13}/></button>
                        <button className="btn-icon btn-icon-red" title="Excluir" onClick={() => setConfirmar({ id: l.id, nome: l.titulo })}><Trash2 size={13}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalLivro !== null && (
        <ModalLivro livro={modalLivro?.id ? modalLivro : null} onSave={() => { setModalLivro(null); carregar() }} onClose={() => setModalLivro(null)}/>
      )}
      {confirmar && (
        <ConfirmModal
          title="Excluir livro"
          message={`Excluir "${confirmar.nome}" do acervo? Esta ação não pode ser desfeita.`}
          onConfirm={() => { deletar(confirmar.id); setConfirmar(null) }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  )
}

// ── Aba Empréstimos ───────────────────────────────────────────────────────────
function AbaEmprestimos({ permEditar }) {
  const [emprestimos, setEmprestimos] = useState([])
  const [livros,      setLivros]      = useState([])
  const [carregando,  setCarregando]  = useState(true)
  const [busca,       setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [modalEmp,    setModalEmp]    = useState(false)
  const [confirmar,   setConfirmar]   = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [emps, livs] = await Promise.all([
      window.electronAPI?.bibEmpListar({ status: filtroStatus || undefined }) || [],
      window.electronAPI?.bibLivrosListar({}) || [],
    ])
    setEmprestimos(emps)
    setLivros(livs)
    setCarregando(false)
  }, [filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  const visiveis = emprestimos.filter(e => {
    const q = busca.toLowerCase()
    return !q || e.tomador_nome?.toLowerCase().includes(q) || e.livro_titulo?.toLowerCase().includes(q)
  })

  async function devolver(id) {
    const res = await window.electronAPI?.bibEmpDevolver(id, getReq())
    if (res?.ok) carregar()
    else alert(res?.erro || 'Erro ao registrar devolução')
  }

  async function deletar(id) {
    const res = await window.electronAPI?.bibEmpDeletar(id, getReq())
    if (res?.ok) carregar()
    else alert(res?.erro || 'Erro ao excluir')
  }

  const BADGE = {
    ativo:      { label: 'Ativo',     cls: 'badge-blue'  },
    devolvido:  { label: 'Devolvido', cls: 'badge-green' },
    atrasado:   { label: 'Atrasado',  cls: 'badge-red'   },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}/>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por tomador ou livro..." style={{ paddingLeft: 32, width: '100%' }}/>
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ minWidth: 130 }}>
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="atrasado">Atrasados</option>
          <option value="devolvido">Devolvidos</option>
        </select>
        {permEditar && (
          <button className="btn-primary" onClick={() => setModalEmp(true)}>
            <Plus size={14}/> Novo Empréstimo
          </button>
        )}
        <button className="btn-outline" onClick={carregar} title="Atualizar"><RefreshCw size={14}/></button>
      </div>

      {carregando ? (
        <p style={{ opacity: 0.5, textAlign: 'center', padding: 40 }}>Carregando empréstimos...</p>
      ) : visiveis.length === 0 ? (
        <div className="empty" style={{ paddingTop: 60 }}>
          <ArrowLeftRight size={44} style={{ opacity: 0.25 }}/>
          <p>Nenhum empréstimo encontrado</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Livro</th>
                <th>Tomador</th>
                <th>Turma</th>
                <th style={{ textAlign: 'center' }}>Empréstimo</th>
                <th style={{ textAlign: 'center' }}>Devolução prevista</th>
                <th style={{ textAlign: 'center' }}>Devolvido em</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                {permEditar && <th style={{ textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {visiveis.map(e => {
                const atraso = e.status === 'atrasado' ? diasAtraso(e.data_prevista) : 0
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.livro_titulo}</td>
                    <td>
                      {e.tomador_nome}
                      <span style={{ fontSize: 11, opacity: 0.5, display: 'block', textTransform: 'capitalize' }}>{e.tomador_tipo}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{e.tomador_turma || '—'}</td>
                    <td style={{ textAlign: 'center', fontSize: 12 }}>{fmtData(e.data_emprestimo)}</td>
                    <td style={{ textAlign: 'center', fontSize: 12 }}>
                      {fmtData(e.data_prevista)}
                      {atraso > 0 && <span style={{ color: 'var(--red)', fontSize: 11, display: 'block' }}>+{atraso}d atraso</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12 }}>{fmtData(e.data_devolucao)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${BADGE[e.status]?.cls || 'badge-gray'}`}>{BADGE[e.status]?.label || e.status}</span>
                    </td>
                    {permEditar && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {e.status !== 'devolvido' && (
                            <button className="btn-icon btn-icon-green" title="Registrar devolução" onClick={() => devolver(e.id)}>
                              <CheckCircle size={13}/>
                            </button>
                          )}
                          <button className="btn-icon btn-icon-red" title="Excluir" onClick={() => setConfirmar({ id: e.id, nome: `${e.livro_titulo} → ${e.tomador_nome}` })}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalEmp && (
        <ModalEmprestimo livros={livros} onSave={() => { setModalEmp(false); carregar() }} onClose={() => setModalEmp(false)}/>
      )}
      {confirmar && (
        <ConfirmModal
          title="Excluir empréstimo"
          message={`Excluir o empréstimo "${confirmar.nome}"?`}
          onConfirm={() => { deletar(confirmar.id); setConfirmar(null) }}
          onCancel={() => setConfirmar(null)}
        />
      )}
    </div>
  )
}

// ── Aba Carteirinha ───────────────────────────────────────────────────────────
function AbaCarteirinha({ identidade }) {
  const [nome,     setNome]     = useState('')
  const [tipo,     setTipo]     = useState('Aluno')
  const [turma,    setTurma]    = useState('')
  const [validade, setValidade] = useState(addDias(365))
  const [gerando,  setGerando]  = useState(false)

  async function gerarPDF() {
    if (!nome.trim()) { alert('Informe o nome do leitor'); return }
    setGerando(true)
    const escola = identidade?.nome || 'Escola Manager'
    const logoHTML = identidade?.logo
      ? `<img src="${identidade.logo}" style="height:52px;object-fit:contain;" alt="logo"/>`
      : `<div style="font-size:22px;font-weight:700;color:#63dcaa;">${escola.charAt(0)}</div>`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { size: 86mm 54mm; margin: 0; }
  body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #fff; }
  .card {
    width: 86mm; height: 54mm; box-sizing: border-box;
    background: linear-gradient(135deg, #1a1f35 0%, #0f172a 100%);
    color: #fff; padding: 10px 14px; position: relative; overflow: hidden;
  }
  .stripe {
    position: absolute; top: 0; right: 0; width: 28mm; height: 100%;
    background: linear-gradient(180deg, #63dcaa 0%, #3ab88a 100%);
    opacity: 0.15; border-radius: 0 0 0 40%;
  }
  .top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; }
  .escola { font-size: 11px; font-weight: 700; color: #63dcaa; letter-spacing: 0.5px; }
  .label { font-size: 7px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 1px; }
  .valor { font-size: 12px; font-weight: 600; color: #fff; }
  .nome  { font-size: 14px; font-weight: 700; color: #fff; margin: 4px 0 8px; }
  .grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .foot  { position: absolute; bottom: 8px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .bib   { font-size: 8px; color: rgba(255,255,255,0.35); }
  .val   { font-size: 8px; color: #63dcaa; font-weight: 600; }
</style></head><body>
<div class="card">
  <div class="stripe"></div>
  <div class="top">
    ${logoHTML}
    <div>
      <div class="escola">${escola}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.5)">Carteirinha de Leitor</div>
    </div>
  </div>
  <div class="label">Nome</div>
  <div class="nome">${nome}</div>
  <div class="grid">
    <div>
      <div class="label">Categoria</div>
      <div class="valor">${tipo}</div>
    </div>
    ${turma ? `<div><div class="label">Turma</div><div class="valor">${turma}</div></div>` : ''}
  </div>
  <div class="foot">
    <div class="bib">Biblioteca · ${escola}</div>
    <div class="val">Válida até ${fmtData(validade)}</div>
  </div>
</div>
</body></html>`

    await window.electronAPI?.pdfGerar({
      html,
      nomeArquivo: `carteirinha_${nome.replace(/\s+/g, '_')}.pdf`,
      opcoes: { pageSize: { width: 325, height: 204 }, margins: { top: 0, bottom: 0, left: 0, right: 0 } },
    })
    setGerando(false)
  }

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ opacity: 0.6, fontSize: 13, margin: 0 }}>
        Preencha os dados do leitor e gere a carteirinha em PDF (tamanho cartão — 86 × 54 mm).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field" style={{ gridColumn: '1/-1' }}>
          <label>Nome do leitor *</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo"/>
        </div>
        <div className="field">
          <label>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option>Aluno</option>
            <option>Professor</option>
            <option>Funcionário</option>
          </select>
        </div>
        <div className="field">
          <label>Turma (opcional)</label>
          <input value={turma} onChange={e => setTurma(e.target.value)} placeholder="Ex: Inglês B2"/>
        </div>
        <div className="field">
          <label>Válida até</label>
          <input type="date" value={validade} onChange={e => setValidade(e.target.value)}/>
        </div>
      </div>

      <button className="btn-primary" style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, alignItems: 'center' }} onClick={gerarPDF} disabled={gerando}>
        <Printer size={15}/> {gerando ? 'Gerando PDF...' : 'Gerar Carteirinha PDF'}
      </button>
    </div>
  )
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function KPIs({ resumo }) {
  const itens = [
    { label: 'Títulos no acervo', valor: resumo.totalLivros ?? 0,  icon: BookOpen,       cor: 'var(--accent)' },
    { label: 'Total de exemplares', valor: resumo.totalExemp ?? 0, icon: BookMarked,     cor: 'var(--blue)'   },
    { label: 'Emprestados',        valor: resumo.emprestados ?? 0, icon: ArrowLeftRight, cor: 'var(--yellow)' },
    { label: 'Com atraso',         valor: resumo.atrasados ?? 0,   icon: AlertTriangle,  cor: 'var(--red)'    },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 4 }}>
      {itens.map(({ label, valor, icon: Icon, cor }) => (
        <div key={label} className="kpi-card">
          <Icon size={20} style={{ color: cor }}/>
          <div className="kpi-val">{valor}</div>
          <div className="kpi-label">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Biblioteca() {
  const { permissao, identidade } = useAuth()
  const perm        = permissao('biblioteca')
  const permEditar  = perm.podeEditar
  const [tab,    setTab]    = useState('Acervo')
  const [resumo, setResumo] = useState({})

  useEffect(() => {
    window.electronAPI?.bibResumo().then(r => setResumo(r || {}))
  }, [tab])

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <KPIs resumo={resumo}/>

      <div className="tabs-bar">
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Acervo'       && <AbaAcervo       permEditar={permEditar}/>}
      {tab === 'Empréstimos'  && <AbaEmprestimos  permEditar={permEditar}/>}
      {tab === 'Carteirinha'  && <AbaCarteirinha  identidade={identidade}/>}
    </div>
  )
}
