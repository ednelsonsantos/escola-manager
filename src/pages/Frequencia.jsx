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
  AlertCircle, RefreshCw, Pencil, FileDown, FileText,
  Ban, RotateCcw, Link
} from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'
import { gerarHTMLRelatorioFrequencia, gerarPDF } from '../utils/pdfUtils.js'
import { ConfirmModal } from '../components/Modal.jsx'
import { createPortal } from 'react-dom'

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
  const [novaAulaCont, setNovaAulaCont] = useState('')
  const [conteudoAula,      setConteudoAula]      = useState('')  // conteúdo da aula em edição
  const [profAusente,       setProfAusente]       = useState(false)
  const [justificativaAus,  setJustificativaAus]  = useState('')
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [stats,        setStats]        = useState(null)

  // Cancelamento e reposição (v5.8)
  const [aulaCancelada,      setAulaCancelada]      = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [showReposicao,      setShowReposicao]      = useState(false)
  const [reposicaoData,      setReposicaoData]      = useState(hoje())
  const [reposicaoTit,       setReposicaoTit]       = useState('')
  const [salvandoReposicao,  setSalvandoReposicao]  = useState(false)

  const turma     = turmas.find(t => String(t.id) === String(turmaSel))
  const alunosDaTurma = alunos.filter(a => a.turmaId === Number(turmaSel) && a.status === 'Ativo')
  const totalPresentes = Object.values(presencas).filter(Boolean).length
  const totalAlunos    = alunosDaTurma.length

  // Carrega aulas quando turma muda
  const carregarAulas = useCallback(async () => {
    const apiRef = window.electronAPI
    if (!turmaSel || !apiRef?.freqListarAulas) { setAulas([]); return }
    setLoading(true)
    const lista = await apiRef.freqListarAulas({ turmaLsId: Number(turmaSel) })
    setAulas(lista || [])
    setLoading(false)
  }, [turmaSel])

  useEffect(() => { carregarAulas() }, [carregarAulas])

  // Quando seleciona uma aula, carrega presenças existentes
  async function selecionarAula(aula) {
    setAulaSel(aula)
    setConteudoAula(aula.conteudo || '')
    setProfAusente(!!aula.professor_ausente)
    setJustificativaAus(aula.justificativa_ausencia || '')
    setAulaCancelada(!!aula.cancelada)
    setMotivoCancelamento(aula.motivo_cancelamento || '')
    setShowReposicao(false)
    setLoading(true)
    const lista = await api?.freqGetPresencas(aula.id) || []
    const mapa = {}
    if (lista.length === 0) {
      // Nenhum registro ainda — inicializa todos como presentes
      alunosDaTurma.forEach(a => { mapa[String(a.id)] = true })
    } else {
      // Carrega presenças salvas; alunos não registrados ficam como presentes
      alunosDaTurma.forEach(a => { mapa[String(a.id)] = true })
      lista.forEach(p => { mapa[String(p.aluno_ls_id)] = p.presente === 1 })
    }
    setPresencas(mapa)
    setLoading(false)
  }

  function togglePresenca(alunoId) {
    setPresencas(p => ({ ...p, [String(alunoId)]: !p[String(alunoId)] }))
  }

  function marcarTodos(valor) {
    const mapa = {}
    alunosDaTurma.forEach(a => { mapa[String(a.id)] = valor })
    setPresencas(mapa)
  }

  async function criarAula() {
    if (!novaAulaData || !turmaSel) return
    const res = await api?.freqCriarAula({
      turmaLsId:   Number(turmaSel),
      turmaCodigo: turma?.codigo || '',
      data:        novaAulaData,
      titulo:      novaAulaTit.trim() || `Aula ${novaAulaData}`,
      conteudo:    novaAulaCont.trim(),
    }, getReq())
    if (res?.ok) {
      setShowNovaAula(false)
      setNovaAulaTit('')
      setNovaAulaCont('')
      await carregarAulas()
      // Abre automaticamente a aula recém-criada
      const novaLista = await api.freqListarAulas({ turmaLsId: Number(turmaSel) })
      setAulas(novaLista || [])
      const nova = novaLista?.find(a => a.id === res.id) || novaLista?.[0]
      if (nova) selecionarAula(nova)
    }
  }

  const salvandoRef = React.useRef(false)
  const [toastMsg, setToastMsg] = useState('')

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  async function salvarChamada() {
    if (!aulaSel || salvandoRef.current) return
    salvandoRef.current = true
    setSalvando(true)
    try {
      const aulaAlterada =
        conteudoAula      !== (aulaSel.conteudo               || '') ||
        profAusente       !== !!aulaSel.professor_ausente             ||
        justificativaAus  !== (aulaSel.justificativa_ausencia  || '') ||
        aulaCancelada     !== !!aulaSel.cancelada                     ||
        motivoCancelamento !== (aulaSel.motivo_cancelamento    || '')

      if (aulaAlterada) {
        await api?.freqEditarAula(aulaSel.id, {
          titulo:                 aulaSel.titulo || '',
          data:                   aulaSel.data,
          conteudo:               conteudoAula,
          professor_ausente:      profAusente,
          justificativa_ausencia: profAusente ? justificativaAus : '',
          cancelada:              aulaCancelada,
          motivo_cancelamento:    aulaCancelada ? motivoCancelamento : '',
          aula_reposicao_id:      aulaSel.aula_reposicao_id ?? null,
        }, getReq())
        setAulaSel(a => ({
          ...a,
          conteudo:               conteudoAula,
          professor_ausente:      profAusente ? 1 : 0,
          justificativa_ausencia: profAusente ? justificativaAus : '',
          cancelada:              aulaCancelada ? 1 : 0,
          motivo_cancelamento:    aulaCancelada ? motivoCancelamento : '',
        }))
      }

      // Recado automático para secretaria ao registrar ausência do professor
      const ausenciaJaRegistrada = !!aulaSel.professor_ausente
      if (profAusente && !ausenciaJaRegistrada) {
        const req = getReq()
        const u   = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
        await api?.freqRegistrarAusencia({
          aulaId:        aulaSel.id,
          turmaCodigo:   turma?.codigo || '',
          dataAula:      aulaSel.data,
          professorNome: u.nome || u.login || '',
          justificativa: justificativaAus,
        }, req)
      }

      const lista = alunosDaTurma.map(a => ({
        alunoLsId:  a.id,
        alunoNome:  a.nome,
        presente:   presencas[String(a.id)] ?? true,
        obs:        '',
      }))
      await api?.freqSalvarPresencas(aulaSel.id, lista, getReq())
      await carregarAulas()
      setAulaSel(null)
      setPresencas({})
      showToast('Chamada salva com sucesso!')
    } catch (e) {
      console.error('[Frequencia] salvarChamada:', e)
      showToast('Erro ao salvar chamada.')
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  async function deletarAula() {
    await api?.freqDeletarAula(confirmDel.id, getReq())
    setConfirmDel(null)
    if (aulaSel?.id === confirmDel.id) { setAulaSel(null); setPresencas({}) }
    carregarAulas()
  }

  // Cria aula de reposição vinculada à aula cancelada
  async function agendarReposicao() {
    if (!reposicaoData || !aulaSel) return
    setSalvandoReposicao(true)
    try {
      const res = await api?.freqCriarAula({
        turmaLsId:          Number(turmaSel),
        turmaCodigo:        turma?.codigo || '',
        data:               reposicaoData,
        titulo:             reposicaoTit.trim() || `Reposição — ${formatDate(aulaSel.data)}`,
        conteudo:           '',
        cancelada:          0,
        motivo_cancelamento:'',
        aula_reposicao_id:  aulaSel.id,
      }, getReq())

      if (res?.ok) {
        // Vincula o ID da reposição na aula cancelada
        await api?.freqEditarAula(aulaSel.id, {
          titulo:                 aulaSel.titulo || '',
          data:                   aulaSel.data,
          conteudo:               conteudoAula,
          professor_ausente:      profAusente,
          justificativa_ausencia: profAusente ? justificativaAus : '',
          cancelada:              aulaCancelada,
          motivo_cancelamento:    aulaCancelada ? motivoCancelamento : '',
          aula_reposicao_id:      res.id,
        }, getReq())

        setShowReposicao(false)
        setReposicaoTit('')
        await carregarAulas()
        showToast('Reposição agendada com sucesso!')
      }
    } catch (e) {
      console.error('[Frequencia] agendarReposicao:', e)
      showToast('Erro ao agendar reposição.')
    } finally {
      setSalvandoReposicao(false)
    }
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
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11 }}>Título (opcional)</label>
                  <input className="input" placeholder={`Aula ${novaAulaData}`}
                    value={novaAulaTit} onChange={e => setNovaAulaTit(e.target.value)}/>
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Conteúdo ministrado (opcional)</label>
                  <textarea className="textarea" placeholder="Ex: Revisão de verbos irregulares, diálogo em pares..."
                    value={novaAulaCont} onChange={e => setNovaAulaCont(e.target.value)}
                    style={{ minHeight: 64, fontSize: 12 }}/>
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
                    <div style={{ display:'flex', gap:4, marginTop:3, flexWrap:'wrap' }}>
                      {!!a.cancelada && (
                        <span style={{
                          fontSize:9, fontWeight:700, letterSpacing:.4,
                          padding:'1px 5px', borderRadius:3,
                          background:'var(--red-dim)', color:'var(--red)',
                          border:'1px solid var(--red)',
                        }}>CANCELADA</span>
                      )}
                      {!!a.aula_reposicao_id && (
                        <span style={{
                          fontSize:9, fontWeight:700, letterSpacing:.4,
                          padding:'1px 5px', borderRadius:3,
                          background:'rgba(91,156,246,.12)', color:'var(--blue)',
                          border:'1px solid var(--blue)',
                        }}>REPOSIÇÃO AGEND.</span>
                      )}
                      {!!a.professor_ausente && (
                        <span style={{
                          fontSize:9, fontWeight:700, letterSpacing:.4,
                          padding:'1px 5px', borderRadius:3,
                          background:'rgba(245,197,66,.1)', color:'var(--yellow)',
                          border:'1px solid var(--yellow)',
                        }}>PROF. AUSENTE</span>
                      )}
                      {a.conteudo && !a.cancelada && (
                        <span style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>
                          {a.conteudo}
                        </span>
                      )}
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

                  {/* Campo de conteúdo ministrado */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600, color: 'var(--text-2)',
                      textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6,
                    }}>
                      <FileText size={12} style={{ color: 'var(--text-3)' }}/>
                      Conteúdo ministrado
                    </label>
                    <textarea
                      className="textarea"
                      placeholder="Descreva o conteúdo trabalhado nesta aula (tópicos, atividades, materiais utilizados...)..."
                      value={conteudoAula}
                      onChange={e => setConteudoAula(e.target.value)}
                      style={{ minHeight: 72, fontSize: 13 }}
                    />
                  </div>

                  {/* Ausência do professor */}
                  <div style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    borderRadius: 9,
                    border: `1px solid ${profAusente ? 'var(--red)' : 'var(--border)'}`,
                    background: profAusente ? 'var(--red-dim)' : 'var(--bg-hover)',
                    transition: 'all .2s',
                  }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', userSelect: 'none',
                    }}>
                      <input
                        type="checkbox"
                        checked={profAusente}
                        onChange={e => {
                          setProfAusente(e.target.checked)
                          if (!e.target.checked) setJustificativaAus('')
                        }}
                        style={{ accentColor: 'var(--red)', width: 15, height: 15, cursor: 'pointer' }}
                      />
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: profAusente ? 'var(--red)' : 'var(--text-2)',
                        transition: 'color .2s',
                      }}>
                        Professor ausente nesta aula
                      </span>
                      {profAusente && aulaSel.professor_ausente ? (
                        <span style={{
                          marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                          color: 'var(--red)', background: 'var(--red-dim)',
                          border: '1px solid var(--red)', borderRadius: 4, padding: '2px 6px',
                        }}>
                          Já notificado
                        </span>
                      ) : profAusente ? (
                        <span style={{
                          marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                          color: 'var(--yellow)', background: 'rgba(245,197,66,.12)',
                          border: '1px solid var(--yellow)', borderRadius: 4, padding: '2px 6px',
                        }}>
                          Secretaria será notificada ao salvar
                        </span>
                      ) : null}
                    </label>

                    {profAusente && (
                      <div style={{ marginTop: 8 }}>
                        <textarea
                          className="textarea"
                          placeholder="Informe o motivo da ausência (opcional)..."
                          value={justificativaAus}
                          onChange={e => setJustificativaAus(e.target.value)}
                          style={{ minHeight: 60, fontSize: 12, borderColor: 'var(--red)' }}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Cancelamento de aula ── */}
                  <div style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    borderRadius: 9,
                    border: `1px solid ${aulaCancelada ? 'var(--red)' : 'var(--border)'}`,
                    background: aulaCancelada ? 'var(--red-dim)' : 'var(--bg-hover)',
                    transition: 'all .2s',
                  }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
                      <input
                        type="checkbox"
                        checked={aulaCancelada}
                        onChange={e => {
                          setAulaCancelada(e.target.checked)
                          if (!e.target.checked) setMotivoCancelamento('')
                        }}
                        style={{ accentColor:'var(--red)', width:15, height:15, cursor:'pointer' }}
                      />
                      <Ban size={13} style={{ color: aulaCancelada ? 'var(--red)' : 'var(--text-3)' }}/>
                      <span style={{ fontSize:12, fontWeight:600, color: aulaCancelada ? 'var(--red)' : 'var(--text-2)', transition:'color .2s' }}>
                        Aula cancelada
                      </span>
                      {aulaCancelada && aulaSel.aula_reposicao_id && (
                        <span style={{
                          marginLeft:'auto', fontSize:10, fontWeight:600,
                          color:'var(--blue)', background:'rgba(91,156,246,.12)',
                          border:'1px solid var(--blue)', borderRadius:4, padding:'2px 6px',
                          display:'flex', alignItems:'center', gap:4,
                        }}>
                          <Link size={9}/> Reposição vinculada
                        </span>
                      )}
                    </label>

                    {aulaCancelada && (
                      <div style={{ marginTop:8 }}>
                        <textarea
                          className="textarea"
                          placeholder="Motivo do cancelamento (opcional)..."
                          value={motivoCancelamento}
                          onChange={e => setMotivoCancelamento(e.target.value)}
                          style={{ minHeight:56, fontSize:12, borderColor:'var(--red)' }}
                        />
                      </div>
                    )}

                    {/* Botão agendar reposição — só aparece quando aula está cancelada e não tem reposição ainda */}
                    {aulaCancelada && !aulaSel.aula_reposicao_id && (
                      <div style={{ marginTop:8 }}>
                        {!showReposicao ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize:11 }}
                            onClick={() => { setShowReposicao(true); setReposicaoData(hoje()) }}
                          >
                            <RotateCcw size={12}/> Agendar reposição
                          </button>
                        ) : (
                          <div style={{
                            padding:'12px', borderRadius:8,
                            background:'var(--bg-card)', border:'1px solid var(--blue)',
                          }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'var(--blue)', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
                              <RotateCcw size={12}/> Nova aula de reposição
                            </div>
                            <div className="field" style={{ marginBottom:8 }}>
                              <label style={{ fontSize:11 }}>Data da reposição *</label>
                              <input
                                className="input" type="date"
                                value={reposicaoData}
                                onChange={e => setReposicaoData(e.target.value)}
                              />
                            </div>
                            <div className="field" style={{ marginBottom:10 }}>
                              <label style={{ fontSize:11 }}>Título (opcional)</label>
                              <input
                                className="input"
                                placeholder={`Reposição — ${formatDate(aulaSel.data)}`}
                                value={reposicaoTit}
                                onChange={e => setReposicaoTit(e.target.value)}
                              />
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ flex:1, justifyContent:'center' }}
                                onClick={agendarReposicao}
                                disabled={salvandoReposicao}
                              >
                                {salvandoReposicao
                                  ? <RefreshCw size={12} style={{ animation:'spin .7s linear infinite' }}/>
                                  : <Check size={12}/>
                                }
                                {salvandoReposicao ? ' Salvando...' : ' Confirmar'}
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setShowReposicao(false)}>
                                <X size={12}/>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                        presente={presencas[String(a.id)] ?? true}
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

      {/* ── TOAST ── */}
      {toastMsg && (
        <div className={`toast ${toastMsg.startsWith('Erro') ? 'toast-error' : 'toast-success'}`}>
          {toastMsg.startsWith('Erro')
            ? <X size={15}/>
            : <Check size={15}/>
          }
          {toastMsg}
        </div>
      )}
    </div>
  )
}
