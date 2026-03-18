/**
 * Frequencia.jsx — Módulo de chamada / presença
 *
 * Fluxo:
 *  1. Selecionar turma → carrega alunos da turma (localStorage) e aulas (SQLite)
 *  2. Criar aula ou selecionar aula existente
 *  3. Fazer chamada clicando em cada aluno (Presente / Falta)
 *  4. Salvar → grava em SQLite via IPC
 *  5. Aba "Relatório" mostra percentual de presença por aluno
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Users, Plus, Check, X, Save, Trash2,
  BarChart2, ChevronLeft, Calendar, CheckCircle,
  AlertCircle, RefreshCw, Pencil, FileDown
} from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'
import { gerarHTMLRelatorioFrequencia, gerarPDF } from '../utils/pdfUtils.js'
import { ConfirmModal } from '../components/Modal.jsx'

const hoje = () => new Date().toISOString().split('T')[0]

function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

// ── Componente: card de aluno na chamada ──────────────────────────────────────
function AlunoCard({ aluno, presente, onToggle }) {
  const iniciais = aluno.nome.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
        border: '2px solid',
        borderColor:  presente ? 'var(--accent)' : 'var(--red)',
        background:   presente ? 'var(--accent-dim)' : 'var(--red-dim)',
        transition: 'all .15s', userSelect: 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: presente ? 'var(--accent)' : 'var(--red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff',
        transition: 'background .15s',
      }}>
        {iniciais}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500,
          color: presente ? 'var(--accent)' : 'var(--red)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {aluno.nome}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
          {aluno.email || 'Sem e-mail'}
        </div>
      </div>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: presente ? 'var(--accent)' : 'var(--red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {presente
          ? <Check size={14} style={{ color: '#fff', strokeWidth: 3 }}/>
          : <X     size={14} style={{ color: '#fff', strokeWidth: 3 }}/>
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Frequencia() {
  const { turmas, alunos } = useApp()
  const api = window.electronAPI

  const [tab,          setTab]          = useState('chamada')  // 'chamada' | 'relatorio'
  const [turmaSel,     setTurmaSel]     = useState('')
  const [aulas,        setAulas]        = useState([])
  const [aulaSel,      setAulaSel]      = useState(null)   // aula em edição/chamada
  const [presencas,    setPresencas]    = useState({})     // { alunoLsId: true/false }
  const [loading,      setLoading]      = useState(false)
  const [salvando,     setSalvando]     = useState(false)
  const [novaAulaData, setNovaAulaData] = useState(hoje())
  const [novaAulaTit,  setNovaAulaTit]  = useState('')
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [stats,        setStats]        = useState(null)

  const turma     = turmas.find(t => String(t.id) === String(turmaSel))
  const alunosDaTurma = alunos.filter(a => a.turmaId === Number(turmaSel) && a.status === 'Ativo')
  const totalPresentes = Object.values(presencas).filter(Boolean).length
  const totalAlunos    = alunosDaTurma.length

  // Carrega aulas quando turma muda
  const carregarAulas = useCallback(async () => {
    if (!turmaSel || !api?.freqListarAulas) { setAulas([]); return }
    setLoading(true)
    const lista = await api.freqListarAulas({ turmaLsId: Number(turmaSel) })
    setAulas(lista || [])
    setLoading(false)
  }, [turmaSel, api])

  useEffect(() => { carregarAulas() }, [carregarAulas])

  // Quando seleciona uma aula, carrega presenças existentes
  async function selecionarAula(aula) {
    setAulaSel(aula)
    setLoading(true)
    const lista = await api?.freqGetPresencas(aula.id) || []
    // Inicia com todos presentes se não há registro ainda
    const mapa = {}
    if (lista.length === 0) {
      alunosDaTurma.forEach(a => { mapa[a.id] = true })
    } else {
      lista.forEach(p => { mapa[p.aluno_ls_id] = p.presente === 1 })
    }
    setPresencas(mapa)
    setLoading(false)
  }

  function togglePresenca(alunoId) {
    setPresencas(p => ({ ...p, [alunoId]: !p[alunoId] }))
  }

  function marcarTodos(valor) {
    const mapa = {}
    alunosDaTurma.forEach(a => { mapa[a.id] = valor })
    setPresencas(mapa)
  }

  async function criarAula() {
    if (!novaAulaData || !turmaSel) return
    const res = await api?.freqCriarAula({
      turmaLsId:   Number(turmaSel),
      turmaCodigo: turma?.codigo || '',
      data:        novaAulaData,
      titulo:      novaAulaTit.trim() || `Aula ${novaAulaData}`,
    }, getReq())
    if (res?.ok) {
      setShowNovaAula(false)
      setNovaAulaTit('')
      await carregarAulas()
      // Abre automaticamente a aula recém-criada
      const novaLista = await api.freqListarAulas({ turmaLsId: Number(turmaSel) })
      setAulas(novaLista || [])
      const nova = novaLista?.find(a => a.id === res.id) || novaLista?.[0]
      if (nova) selecionarAula(nova)
    }
  }

  async function salvarChamada() {
    if (!aulaSel) return
    setSalvando(true)
    const lista = alunosDaTurma.map(a => ({
      alunoLsId:  a.id,
      alunoNome:  a.nome,
      presente:   presencas[a.id] ?? true,
      obs:        '',
    }))
    await api?.freqSalvarPresencas(aulaSel.id, lista, getReq())
    setSalvando(false)
    await carregarAulas()
  }

  async function deletarAula() {
    await api?.freqDeletarAula(confirmDel.id, getReq())
    setConfirmDel(null)
    if (aulaSel?.id === confirmDel.id) { setAulaSel(null); setPresencas({}) }
    carregarAulas()
  }

  async function handlePDFFrequencia() {
    if (!stats || !turma) return
    const html = gerarHTMLRelatorioFrequencia({ turma, stats, alunosDaTurma })
    const res  = await gerarPDF({
      html,
      nomeArquivo: `frequencia-${turma.codigo}.pdf`,
      titulo:      `Frequência ${turma.codigo}`
    })
    if (res?.ok && !res?.fallback) console.log('[PDF] Frequência salva')
  }

  async function carregarStats() {
    if (!turmaSel || !api?.freqEstatisticasFrequencia) return
    const s = await api.freqEstatisticasFrequencia(Number(turmaSel))
    setStats(s)
  }

  useEffect(() => {
    if (tab === 'relatorio') carregarStats()
  }, [tab, turmaSel])

  // ── SEM ELECTRON ────────────────────────────────────────────────────────────
  if (!api?.freqListarAulas) {
    return (
      <div className="fade-up">
        <div className="empty" style={{ paddingTop: 60 }}>
          <BookOpen size={48} style={{ opacity: .3 }}/>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Módulo de Frequência</p>
          <small>Disponível apenas no app Electron. Abra com <code>npm run dev</code>.</small>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-up">

      {/* ── TOOLBAR ── */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab${tab==='chamada'?' active':''}`} onClick={()=>setTab('chamada')}>
            <Users size={13} style={{ marginRight: 5, verticalAlign: 'middle' }}/>
            Chamada
          </button>
          <button className={`tab${tab==='relatorio'?' active':''}`} onClick={()=>setTab('relatorio')}>
            <BarChart2 size={13} style={{ marginRight: 5, verticalAlign: 'middle' }}/>
            Relatório de Frequência
          </button>
        </div>

        <div className="toolbar-right">
          <select
            className="select"
            style={{ width: 220 }}
            value={turmaSel}
            onChange={e => { setTurmaSel(e.target.value); setAulaSel(null); setPresencas({}); setStats(null) }}
          >
            <option value="">Selecionar turma...</option>
            {turmas.filter(t => t.ativa).map(t => (
              <option key={t.id} value={t.id}>{t.codigo} — {t.idioma} {t.nivel}</option>
            ))}
          </select>
        </div>
      </div>

      {!turmaSel && (
        <div className="empty" style={{ paddingTop: 60 }}>
          <BookOpen size={48} style={{ opacity: .3 }}/>
          <p>Selecione uma turma acima para começar.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ABA: CHAMADA                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'chamada' && turmaSel && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

          {/* ── LISTA DE AULAS ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                Aulas registradas
              </span>
              <button
                className="btn btn-primary btn-xs"
                onClick={() => setShowNovaAula(v => !v)}
              >
                <Plus size={12}/> Nova aula
              </button>
            </div>

            {/* Formulário nova aula */}
            {showNovaAula && (
              <div style={{
                padding: '12px 14px', borderBottom: '1px solid var(--border)',
                background: 'var(--accent-dim)',
              }}>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11 }}>Data da aula *</label>
                  <input className="input" type="date" value={novaAulaData}
                    onChange={e => setNovaAulaData(e.target.value)}/>
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Título (opcional)</label>
                  <input className="input" placeholder={`Aula ${novaAulaData}`}
                    value={novaAulaTit} onChange={e => setNovaAulaTit(e.target.value)}/>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={criarAula}>
                    <Check size={13}/> Criar
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowNovaAula(false)}>
                    <X size={13}/>
                  </button>
                </div>
              </div>
            )}

            {/* Lista */}
            {loading && !aulas.length && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>
                <RefreshCw size={18} style={{ animation: 'spin .7s linear infinite' }}/>
              </div>
            )}
            {!loading && aulas.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Nenhuma aula registrada.<br/>Clique em "Nova aula" para começar.
              </div>
            )}
            {aulas.map(a => {
              const ativo = aulaSel?.id === a.id
              return (
                <div key={a.id}
                  onClick={() => selecionarAula(a)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: ativo ? 'var(--accent-dim)' : 'transparent',
                    borderLeft: ativo ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!ativo) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: ativo ? 'var(--accent)' : 'var(--bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Calendar size={15} style={{ color: ativo ? '#fff' : 'var(--text-3)' }}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: ativo ? 'var(--accent)' : 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.titulo || formatDate(a.data)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {formatDate(a.data)}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={e => { e.stopPropagation(); setConfirmDel(a) }}
                    style={{ opacity: .7 }}
                  >
                    <Trash2 size={11}/>
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── CHAMADA ── */}
          <div>
            {!aulaSel && (
              <div className="empty" style={{ paddingTop: 60 }}>
                <CheckCircle size={48} style={{ opacity: .25 }}/>
                <p>Selecione uma aula ou crie uma nova.</p>
              </div>
            )}

            {aulaSel && (
              <div>
                {/* Cabeçalho da aula */}
                <div className="card" style={{ padding: '16px 20px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                        {aulaSel.titulo || formatDate(aulaSel.data)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {turma?.codigo} · {formatDate(aulaSel.data)} · {totalAlunos} alunos
                      </div>
                    </div>

                    {/* Contador */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '10px 18px', background: 'var(--bg-hover)', borderRadius: 10,
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                          {totalPresentes}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .6 }}>Presentes</div>
                      </div>
                      <div style={{ width: 1, height: 36, background: 'var(--border)' }}/>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>
                          {totalAlunos - totalPresentes}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .6 }}>Faltas</div>
                      </div>
                      <div style={{ width: 1, height: 36, background: 'var(--border)' }}/>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>
                          {totalAlunos ? Math.round(totalPresentes / totalAlunos * 100) : 0}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .6 }}>Freq.</div>
                      </div>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => marcarTodos(true)}>
                      <CheckCircle size={13}/> Todos presentes
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => marcarTodos(false)}>
                      <X size={13}/> Todos ausentes
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginLeft: 'auto' }}
                      onClick={salvarChamada}
                      disabled={salvando}
                    >
                      {salvando
                        ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }}/>
                        : <Save size={13}/>
                      }
                      {salvando ? ' Salvando...' : ' Salvar chamada'}
                    </button>
                  </div>
                </div>

                {/* Grid de alunos */}
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin .7s linear infinite' }}/>
                  </div>
                ) : alunosDaTurma.length === 0 ? (
                  <div className="empty">
                    <Users size={40}/>
                    <p>Nenhum aluno ativo nesta turma.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                    {alunosDaTurma.map(a => (
                      <AlunoCard
                        key={a.id}
                        aluno={a}
                        presente={presencas[a.id] ?? true}
                        onToggle={() => togglePresenca(a.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ABA: RELATÓRIO DE FREQUÊNCIA                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'relatorio' && turmaSel && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                Frequência — {turma?.codigo} · {turma?.idioma}
              </div>
              {stats && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {stats.totalAulas} aula{stats.totalAulas !== 1 ? 's' : ''} registrada{stats.totalAulas !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={carregarStats}>
              <RefreshCw size={13}/> Atualizar
            </button>
            {stats && stats.totalAulas > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handlePDFFrequencia}>
                <FileDown size={13}/> Exportar PDF
              </button>
            )}
          </div>
          </div>

          {!stats && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
              <RefreshCw size={24} style={{ animation: 'spin .7s linear infinite' }}/>
            </div>
          )}

          {stats && stats.totalAulas === 0 && (
            <div className="empty">
              <BarChart2 size={40}/>
              <p>Nenhuma chamada registrada para esta turma.</p>
              <small>Vá para a aba Chamada e registre as presenças.</small>
            </div>
          )}

          {stats && stats.totalAulas > 0 && (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Presenças</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Faltas</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Freq. %</th>
                    <th style={{ width: 180 }}>Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Alunos com chamada registrada */}
                  {stats.alunos.map(a => {
                    const faltas   = a.total_aulas - a.total_presentes
                    const pct      = a.percentual || 0
                    const cor      = pct >= 75 ? 'var(--accent)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
                    return (
                      <tr key={a.aluno_ls_id}>
                        <td className="td-name">{a.aluno_nome}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{a.total_presentes}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ color: faltas > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: faltas > 0 ? 600 : 400 }}>{faltas}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: cor }}>
                            {pct}%
                          </span>
                        </td>
                        <td>
                          <div style={{ height: 7, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width .4s' }}/>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            {pct >= 75 ? '✅ Regular' : pct >= 50 ? '⚠️ Atenção' : '❌ Crítico'}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Alunos ativos na turma sem nenhuma chamada registrada */}
                  {alunosDaTurma
                    .filter(a => !stats.alunos.find(s => s.aluno_ls_id === a.id))
                    .map(a => (
                      <tr key={`sem-${a.id}`} style={{ opacity: .6 }}>
                        <td className="td-name">{a.nome}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>—</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>—</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>—</td>
                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>Sem registros</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>

              {/* Legenda */}
              <div style={{
                padding: '12px 16px', borderTop: '1px solid var(--border)',
                display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-3)',
              }}>
                <span>✅ Regular: ≥75%</span>
                <span>⚠️ Atenção: 50–74%</span>
                <span>❌ Crítico: &lt;50%</span>
                <span style={{ marginLeft: 'auto' }}>Total: {stats.totalAulas} aula{stats.totalAulas !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRM DELETE AULA ── */}
      {confirmDel && (
        <ConfirmModal
          title="Excluir Aula"
          msg={`Excluir a aula "${confirmDel.titulo || formatDate(confirmDel.data)}"? Todas as presenças registradas serão removidas.`}
          onConfirm={deletarAula}
          onClose={() => setConfirmDel(null)}
          danger
        />
      )}
    </div>
  )
}
