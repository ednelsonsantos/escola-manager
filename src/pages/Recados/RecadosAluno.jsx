// src/pages/Recados/RecadosAluno.jsx
// Painel de recados para o aluno/responsável — Escola Manager v5.6

import React, { useState, useEffect, useCallback } from 'react'

const api = window.electronAPI

function fmtData(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoje = new Date()
  const diffDias = Math.floor((hoje - d) / 86400000)
  if (diffDias === 0) return 'Hoje às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDias === 1) return 'Ontem às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const PRIO_BADGE = {
  urgente:    <span className="badge bg-red">Urgente</span>,
  importante: <span className="badge bg-yellow">Importante</span>,
  normal:     null,
}

export default function RecadosAluno({ alunoId, turmaId }) {
  // alunoId e turmaId: IDs do localStorage (ls_id) do aluno logado
  const [recados, setRecados]   = useState([])
  const [naoLidos, setNaoLidos] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('todos') // 'todos' | 'nao_lidos'
  const [aberto, setAberto]     = useState(null)

  const carregar = useCallback(async () => {
    if (!alunoId) return
    setLoading(true)
    try {
      const params = { aluno_ls_id: alunoId, turma_ls_id: turmaId ?? -1 }
      const [data, count] = await Promise.all([
        api.recadosParaAluno(params),
        api.recadosNaoLidos(params),
      ])
      setRecados(data ?? [])
      setNaoLidos(count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [alunoId, turmaId])

  useEffect(() => { carregar() }, [carregar])

  async function abrirRecado(r) {
    const novoAberto = aberto === r.id ? null : r.id
    setAberto(novoAberto)
    if (novoAberto && !r.lido) {
      await api.recadosMarcarLido({ recado_id: r.id, aluno_ls_id: alunoId })
      setRecados(prev => prev.map(x => x.id === r.id ? { ...x, lido: 1 } : x))
      setNaoLidos(prev => Math.max(0, prev - 1))
    }
  }

  const lista = filtro === 'nao_lidos' ? recados.filter(r => !r.lido) : recados

  if (loading) {
    return (
      <div className="page-scroll">
        <div className="empty">
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
          <p>Carregando recados…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-scroll fade-up">
      {/* Cabeçalho */}
      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            Recados
          </div>
          {naoLidos > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff',
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            }}>
              {naoLidos} novo{naoLidos > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="tabs">
        <button className={`tab${filtro === 'todos' ? ' active' : ''}`}    onClick={() => setFiltro('todos')}>
          Todos ({recados.length})
        </button>
        <button className={`tab${filtro === 'nao_lidos' ? ' active' : ''}`} onClick={() => setFiltro('nao_lidos')}>
          Não lidos ({naoLidos})
        </button>
      </div>

      {/* Lista */}
      {lista.length === 0 && (
        <div className="empty">
          <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".3">
            <path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v9a2 2 0 01-2 2H7l-4 3V4z"/>
          </svg>
          <p>{filtro === 'nao_lidos' ? 'Nenhum recado não lido.' : 'Nenhum recado recebido ainda.'}</p>
        </div>
      )}

      {lista.map(r => (
        <div
          key={r.id}
          onClick={() => abrirRecado(r)}
          style={{
            background: r.lido ? 'var(--bg-card)' : 'var(--bg-hover)',
            border: `1px solid ${!r.lido ? 'var(--border-focus)' : 'var(--border)'}`,
            borderLeft: `3px solid ${r.prioridade === 'urgente' ? 'var(--red)' : r.prioridade === 'importante' ? 'var(--yellow)' : !r.lido ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12, marginBottom: 8, cursor: 'pointer',
            transition: 'border-color .2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px' }}>
            {/* Indicador não lido */}
            <div style={{ width: 8, flexShrink: 0, paddingTop: 6, display: 'flex', justifyContent: 'center' }}>
              {!r.lido && (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pulseDot 2s ease-in-out infinite' }}/>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Meta */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                  {r.remetente_tipo === 'secretaria' || r.remetente_tipo === 'admin'
                    ? '📋 Secretaria'
                    : `👩‍🏫 ${r.remetente_nome}`}
                </span>
                {PRIO_BADGE[r.prioridade]}
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{fmtData(r.enviado_em)}</span>
              </div>
              {/* Título */}
              <div style={{ fontSize: 14, fontWeight: r.lido ? 450 : 600, color: 'var(--text-1)', marginBottom: 4 }}>
                {r.titulo}
              </div>
              {/* Preview (quando fechado) */}
              {aberto !== r.id && (
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r.mensagem}
                </p>
              )}
            </div>

            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--text-3)', transition: 'transform .2s', transform: aberto === r.id ? 'rotate(180deg)' : 'none' }}>
              <path d="M4 6l4 4 4-4"/>
            </svg>
          </div>

          {/* Mensagem completa */}
          {aberto === r.id && (
            <div style={{ padding: '0 16px 14px 34px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '12px 0 0' }}>
                {r.mensagem}
              </p>
              {r.lido_em && (
                <span style={{ display: 'block', marginTop: 10, fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Lido em {fmtData(r.lido_em)}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// HOOK — Badge de não lidos para usar na sidebar
// Uso: const naoLidos = useRecadosBadge(alunoId, turmaId)
// ═══════════════════════════════════════════════════════════════════════════════
export function useRecadosBadge(alunoId, turmaId) {
  const [count, setCount] = useState(0)

  const atualizar = useCallback(async () => {
    if (!alunoId) return
    try {
      const n = await api.recadosNaoLidos({ aluno_ls_id: alunoId, turma_ls_id: turmaId ?? -1 })
      setCount(n ?? 0)
    } catch {}
  }, [alunoId, turmaId])

  useEffect(() => {
    atualizar()
    const intervalo = setInterval(atualizar, 30 * 1000) // atualiza a cada 30s
    return () => clearInterval(intervalo)
  }, [atualizar])

  return count
}
