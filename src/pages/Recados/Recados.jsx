// src/pages/Recados/Recados.jsx
// Módulo de Recados — Escola Manager v5.6
// Design system: variáveis CSS do style.css (--bg-card, --accent, --text-1, etc.)

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

const api = window.electronAPI

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtData(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const hoje = new Date()
  const diffDias = Math.floor((hoje - d) / 86400000)
  if (diffDias === 0) return 'Hoje, ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDias === 1) return 'Ontem, ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TIPOS_DEST = [
  { value: 'todos',         label: 'Todos os alunos' },
  { value: 'lista_espera',  label: 'Lista de espera' },
  { value: 'inadimplentes', label: 'Inadimplentes' },
  { value: 'turma',         label: 'Turma específica' },
  { value: 'aluno',         label: 'Aluno específico' },
]

// ── Ícones inline ─────────────────────────────────────────────────────────────
const IcRecados = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v9a2 2 0 01-2 2H7l-4 3V4z"/>
  </svg>
)
const IcPlus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M8 3v10M3 8h10"/>
  </svg>
)
const IcSend = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 7l11-5-5 11-1.5-4.5L1.5 7z"/>
  </svg>
)
const IcEdit = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M9.5 2.5l2 2-7 7H2.5V9.5l7-7z"/>
  </svg>
)
const IcTrash = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4"/>
  </svg>
)
const IcChevron = ({ open }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--text-3)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
    <path d="M4 6l4 4 4-4"/>
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE CARD de um recado (na listagem admin/prof)
// ═══════════════════════════════════════════════════════════════════════════════
function RecadoCard({ recado, onEditar, onEnviar, onExcluir, podeEditar }) {
  const [aberto, setAberto] = useState(false)

  const totalDest  = recado.total_destinatarios ?? 0
  const totalLidos = recado.total_lidos ?? 0
  const taxa = totalDest > 0 ? Math.round((totalLidos / totalDest) * 100) : 0

  const borderColor = recado.prioridade === 'urgente'
    ? 'var(--red)'
    : recado.prioridade === 'importante'
      ? 'var(--yellow)'
      : recado.status === 'enviado'
        ? 'var(--accent)'
        : recado.status === 'agendado'
          ? 'var(--blue)'
          : 'var(--border)'

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 12, overflow: 'hidden',
      transition: 'border-color .2s', marginBottom: 8,
    }}>
      {/* Linha clicável */}
      <div
        onClick={() => setAberto(a => !a)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Título + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            {/* Status badge */}
            {recado.status === 'enviado' && <span className="badge bg-green"><span className="bdot"/>Enviado</span>}
            {recado.status === 'agendado' && <span className="badge bg-blue">Agendado</span>}
            {recado.status === 'rascunho' && <span className="badge bg-gray">Rascunho</span>}
            {/* Prioridade */}
            {recado.prioridade === 'urgente'    && <span className="badge bg-red">Urgente</span>}
            {recado.prioridade === 'importante' && <span className="badge bg-yellow">Importante</span>}
          </div>

          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {recado.titulo}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Por {recado.remetente_nome}</span>
            <span>·</span>
            {recado.status === 'enviado'  && <span>{fmtData(recado.enviado_em)}</span>}
            {recado.status === 'agendado' && <span>Agendado para {fmtData(recado.agendado_para)}</span>}
            {recado.status === 'rascunho' && <span>Criado {fmtData(recado.criado_em)}</span>}
          </div>
        </div>

        {/* Stats leitura + destinatários */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {recado.status === 'enviado' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 64, height: 4, background: 'var(--bg-hover)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${taxa}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .4s' }}/>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{totalLidos}/{totalDest} leram</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {(recado.destinatarios ?? []).slice(0, 2).map((d, i) => (
              <span key={i} style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-3)', fontSize: 11 }}>
                {d.tipo === 'aluno' || d.tipo === 'turma' ? d.referencia_nome : TIPOS_DEST.find(t => t.value === d.tipo)?.label}
              </span>
            ))}
            {(recado.destinatarios ?? []).length > 2 && (
              <span style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-3)', fontSize: 11 }}>
                +{recado.destinatarios.length - 2}
              </span>
            )}
          </div>
        </div>

        <IcChevron open={aberto} />
      </div>

      {/* Corpo expandido */}
      {aberto && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: '12px 0' }}>
            {recado.mensagem}
          </p>
          {podeEditar && recado.status !== 'enviado' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-secondary" onClick={onEditar}><IcEdit/>Editar</button>
              <button className="btn btn-sm btn-secondary" onClick={onEnviar}
                style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}>
                <IcSend/>Enviar agora
              </button>
              <button className="btn btn-sm btn-danger" onClick={onExcluir}><IcTrash/>Excluir</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — Criar / Editar recado
// ═══════════════════════════════════════════════════════════════════════════════
function ModalRecado({ recado, usuarioAtual, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    titulo:        recado?.titulo       ?? '',
    mensagem:      recado?.mensagem     ?? '',
    prioridade:    recado?.prioridade   ?? 'normal',
    agendado_para: recado?.agendado_para ? recado.agendado_para.slice(0, 16) : '',
  })
  const [destinatarios, setDestinatarios] = useState(
    recado?.destinatarios?.length
      ? recado.destinatarios.map(d => ({ tipo: d.tipo, referencia_id: d.referencia_id ?? null, referencia_nome: d.referencia_nome ?? null }))
      : [{ tipo: 'todos', referencia_id: null, referencia_nome: null }]
  )
  const [turmas, setTurmas]   = useState([])
  const [alunos, setAlunos]   = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]       = useState('')

  // Carregar turmas e alunos do localStorage (padrão v5)
  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem('turmas') || '[]')
      const a = JSON.parse(localStorage.getItem('alunos') || '[]')
      setTurmas(t)
      setAlunos(a.filter(al => al.status === 'Ativo' || al.status === 'ativo'))
    } catch {}
  }, [])

  function set(campo, valor) { setForm(f => ({ ...f, [campo]: valor })) }

  function atualizarDest(idx, campo, valor) {
    setDestinatarios(d => d.map((item, i) => {
      if (i !== idx) return item
      if (campo === 'tipo') return { tipo: valor, referencia_id: null, referencia_nome: null }
      if (campo === 'referencia_id') {
        const idNum = Number(valor)
        let nome = null
        if (item.tipo === 'turma')  nome = turmas.find(t => String(t.id) === String(valor) || t.id === idNum)?.codigo || null
        if (item.tipo === 'aluno')  nome = alunos.find(a => String(a.id) === String(valor) || a.id === idNum)?.nome   || null
        return { ...item, referencia_id: idNum, referencia_nome: nome }
      }
      return { ...item, [campo]: valor }
    }))
  }

  async function submit(enviar_agora) {
    if (!form.titulo.trim())   { setErro('Informe o título.'); return }
    if (!form.mensagem.trim()) { setErro('Informe a mensagem.'); return }
    if (destinatarios.length === 0) { setErro('Adicione ao menos um destinatário.'); return }
    const invalidos = destinatarios.filter(d => (d.tipo === 'turma' || d.tipo === 'aluno') && !d.referencia_id)
    if (invalidos.length) { setErro('Selecione a turma/aluno para todos os grupos.'); return }

    setSalvando(true); setErro('')
    try {
      const req = { userId: usuarioAtual?.id, userLogin: usuarioAtual?.login }
      await onSalvar({
        id: recado?.id,
        ...form,
        agendado_para:  form.agendado_para || null,
        remetente_tipo: usuarioAtual?.perfil_nome?.toLowerCase() === 'professor' ? 'professor' : 'secretaria',
        remetente_id:   usuarioAtual?.id   ?? 0,
        remetente_nome: usuarioAtual?.nome ?? 'Sistema',
        destinatarios,
        enviar_agora,
      }, req)
    } catch (err) {
      setErro(err?.message ?? 'Erro ao salvar recado.')
    } finally {
      setSalvando(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onFechar()}>
      <div className="modal" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 48px)' }}>
        <div className="modal-head">
          <span className="modal-title">{recado ? 'Editar recado' : 'Novo recado'}</span>
          <button className="close-btn" onClick={onFechar}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          {/* Título */}
          <div className="field">
            <label>Título <span style={{ color: 'var(--red)' }}>*</span></label>
            <input className="input" placeholder="Ex: Reunião de pais — outubro"
              value={form.titulo} onChange={e => set('titulo', e.target.value)} maxLength={120}/>
          </div>

          {/* Mensagem */}
          <div className="field">
            <label>Mensagem <span style={{ color: 'var(--red)' }}>*</span></label>
            <textarea className="textarea" placeholder="Conteúdo do recado..." rows={5}
              value={form.mensagem} onChange={e => set('mensagem', e.target.value)}/>
          </div>

          {/* Prioridade + Agendamento */}
          <div className="form-grid">
            <div className="field">
              <label>Prioridade</label>
              <select className="select" value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="field">
              <label>Agendar envio para</label>
              <input className="input" type="datetime-local"
                value={form.agendado_para} onChange={e => set('agendado_para', e.target.value)}/>
              <span className="input-hint">Deixe vazio para enviar agora</span>
            </div>
          </div>

          {/* Destinatários */}
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>Destinatários <span style={{ color: 'var(--red)' }}>*</span></label>
              <button className="btn btn-xs btn-ghost"
                onClick={() => setDestinatarios(d => [...d, { tipo: 'todos', referencia_id: null, referencia_nome: null }])}>
                + Adicionar grupo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {destinatarios.map((dest, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="select" style={{ flex: 1 }} value={dest.tipo}
                    onChange={e => atualizarDest(idx, 'tipo', e.target.value)}>
                    {TIPOS_DEST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>

                  {dest.tipo === 'turma' && (
                    <select className="select" style={{ flex: 1 }} value={dest.referencia_id ?? ''}
                      onChange={e => atualizarDest(idx, 'referencia_id', e.target.value)}>
                      <option value="">Selecione a turma…</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo || t.nome}</option>)}
                    </select>
                  )}

                  {dest.tipo === 'aluno' && (
                    <select className="select" style={{ flex: 1 }} value={dest.referencia_id ?? ''}
                      onChange={e => atualizarDest(idx, 'referencia_id', e.target.value)}>
                      <option value="">Selecione o aluno…</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  )}

                  {destinatarios.length > 1 && (
                    <button className="btn btn-xs btn-danger" style={{ flexShrink: 0 }}
                      onClick={() => setDestinatarios(d => d.filter((_, i) => i !== idx))}>
                      –
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {erro && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <circle cx="7" cy="7" r="6"/><path d="M7 4.5v3M7 9.5v.5"/>
              </svg>
              {erro}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button className="btn btn-secondary" onClick={() => submit(false)} disabled={salvando}>
            {salvando ? 'Salvando…' : form.agendado_para ? 'Agendar' : 'Rascunho'}
          </button>
          {!form.agendado_para && (
            <button className="btn btn-primary" onClick={() => submit(true)} disabled={salvando}>
              <IcSend/>{salvando ? 'Enviando…' : 'Enviar agora'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — Admin / Secretaria / Professor
// ═══════════════════════════════════════════════════════════════════════════════
export default function Recados({ usuarioAtual }) {
  const [recados,   setRecados]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca,     setBusca]     = useState('')
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [toast,     setToast]     = useState(null)

  const isProf = usuarioAtual?.perfil_nome?.toLowerCase() === 'professor'
  const req    = { userId: usuarioAtual?.id, userLogin: usuarioAtual?.login }

  function showToast(msg, tipo = 'success') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const filtros = {}
      if (filtroStatus) filtros.status = filtroStatus
      if (busca.trim()) filtros.busca  = busca.trim()
      if (isProf) { filtros.remetente_tipo = 'professor'; filtros.remetente_id = usuarioAtual?.id }
      const data = await api.recadosListar(filtros, req)
      setRecados(data ?? [])
    } catch (e) {
      showToast('Erro ao carregar recados', 'error')
    } finally {
      setLoading(false)
    }
  }, [filtroStatus, busca, isProf, usuarioAtual?.id])

  useEffect(() => { carregar() }, [carregar])

  async function handleSalvar(dados, reqParam) {
    const result = await api.recadosSalvar(dados, reqParam)
    if (!result?.ok) throw new Error(result?.erro || 'Erro ao salvar')
    setModal(false); setEditando(null)
    showToast(dados.enviar_agora ? 'Recado enviado!' : dados.agendado_para ? 'Recado agendado!' : 'Rascunho salvo!')
    carregar()
  }

  async function handleEnviar(id) {
    if (!window.confirm('Enviar este recado agora para todos os destinatários?')) return
    const result = await api.recadosEnviar({ id }, req)
    if (result?.ok) { showToast('Recado enviado!'); carregar() }
    else showToast(result?.erro || 'Erro ao enviar', 'error')
  }

  async function handleExcluir(id) {
    if (!window.confirm('Excluir este rascunho? Esta ação não pode ser desfeita.')) return
    const result = await api.recadosExcluir({ id }, req)
    if (result?.ok) { showToast('Recado excluído.'); carregar() }
    else showToast(result?.erro || 'Erro ao excluir', 'error')
  }

  const contadores = useMemo(() => ({
    enviados:  recados.filter(r => r.status === 'enviado').length,
    agendados: recados.filter(r => r.status === 'agendado').length,
    rascunhos: recados.filter(r => r.status === 'rascunho').length,
  }), [recados])

  return (
    <div className="fade-up">
      {/* ── Topbar da página ── */}
      <div className="toolbar">
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <IcRecados/>
            Recados
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 8 }}>
            {contadores.enviados > 0  && <span className="badge bg-green">{contadores.enviados} enviados</span>}
            {contadores.agendados > 0 && <span className="badge bg-blue">{contadores.agendados} agendados</span>}
            {contadores.rascunhos > 0 && <span className="badge bg-gray">{contadores.rascunhos} rascunhos</span>}
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <IcPlus/>Novo Recado
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l2.5 2.5" strokeLinecap="round"/>
          </svg>
          <input placeholder="Buscar recados…" value={busca} onChange={e => setBusca(e.target.value)}/>
        </div>
        <div className="tabs" style={{ margin: 0 }}>
          {[['', 'Todos'], ['enviado', 'Enviados'], ['agendado', 'Agendados'], ['rascunho', 'Rascunhos']].map(([v, l]) => (
            <button key={v} className={`tab${filtroStatus === v ? ' active' : ''}`} onClick={() => setFiltroStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      {loading && (
        <div className="empty"><div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/><p>Carregando recados…</p></div>
      )}

      {!loading && recados.length === 0 && (
        <div className="empty">
          <IcRecados/>
          <p>Nenhum recado {filtroStatus ? `com status "${filtroStatus}"` : ''} encontrado.</p>
          <small>Clique em <strong>Novo Recado</strong> para começar.</small>
        </div>
      )}

      {!loading && recados.map(r => (
        <RecadoCard
          key={r.id}
          recado={r}
          onEditar={() => { setEditando(r); setModal(true) }}
          onEnviar={() => handleEnviar(r.id)}
          onExcluir={() => handleExcluir(r.id)}
          podeEditar={!isProf || r.remetente_id === usuarioAtual?.id}
        />
      ))}

      {/* ── Modal ── */}
      {modal && (
        <ModalRecado
          recado={editando}
          usuarioAtual={usuarioAtual}
          onSalvar={handleSalvar}
          onFechar={() => { setModal(false); setEditando(null) }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast-${toast.tipo === 'error' ? 'error' : 'success'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
