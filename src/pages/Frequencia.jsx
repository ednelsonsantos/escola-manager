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
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  BookOpen, Users, Plus, Check, X, Save, Trash2,
  BarChart2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, CheckCircle,
  AlertCircle, RefreshCw, Pencil, FileDown, FileText,
  Ban, RotateCcw, Link, Search, Filter, User
} from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'
import { gerarHTMLRelatorioFrequencia, gerarPDF } from '../utils/pdfUtils.js'
import { ConfirmModal } from '../components/Modal.jsx'
import { createPortal } from 'react-dom'

const hoje = () => new Date().toISOString().split('T')[0]

// ── Helpers de conflito de horário ────────────────────────────────────────────
const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function diaSemana(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return DIAS_ABREV[new Date(y, m - 1, d).getDay()]
}

function parseHorarioConflito(str) {
  if (!str) return { dias: [], hora: '' }
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const partes = str.trim().split(' ')
  const dias = partes[0].split('/').filter(d => DIAS.includes(d))
  const hora = dias.length ? partes.slice(1).join(' ').trim() : str.trim()
  return { dias, hora }
}

/**
 * Returns true if `prof` has another active turma on the same day+time as `turmaRef` on `aulaData`.
 * If horario is not set on either side, no conflict is detected (returns false).
 */
function professorTemConflito(prof, aulaData, turmaRef, todasTurmas) {
  if (!aulaData || !turmaRef) return false
  const dia = diaSemana(aulaData)
  const { hora: horaAula } = parseHorarioConflito(turmaRef.horario || '')
  if (!dia || !horaAula) return false

  return todasTurmas.some(t => {
    if (t.id === turmaRef.id) return false        // same class — not a conflict
    if (Number(t.professorId) !== Number(prof.id)) return false
    if (!t.ativa) return false
    const { dias, hora } = parseHorarioConflito(t.horario || '')
    return hora && hora === horaAula && dias.includes(dia)
  })
}

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

// ── Calendário de intervalo de datas ─────────────────────────────────────────
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const CAL_DIAS = ['D','S','T','Q','Q','S','S']

function CalendarioRangePicker({ inicio, fim, onInicio, onFim, anchorRect, onFechar }) {
  const [ref, setRef] = useState(() => {
    const d = inicio ? new Date(inicio + 'T12:00:00') : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [fase, setFase] = useState(inicio && !fim ? 'fim' : 'inicio')

  function fmt(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function celulas() {
    const { year, month } = ref
    const offset = new Date(year, month, 1).getDay()
    const total  = new Date(year, month + 1, 0).getDate()
    const cells  = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let i = 1; i <= total; i++) cells.push(i)
    return cells
  }

  function handleClick(day) {
    if (!day) return
    const ds = fmt(ref.year, ref.month, day)
    if (fase === 'inicio') {
      onInicio(ds)
      if (fim && fim < ds) onFim('')
      setFase('fim')
    } else {
      if (inicio && ds < inicio) { onFim(inicio); onInicio(ds) }
      else onFim(ds)
      setFase('inicio')
    }
  }

  function cor(day) {
    if (!day) return {}
    const ds = fmt(ref.year, ref.month, day)
    if (ds === inicio || ds === fim) return { background: 'var(--accent)', color: '#fff', fontWeight: 700 }
    if (inicio && fim && ds > inicio && ds < fim) return { background: 'var(--accent-dim)', color: 'var(--accent)' }
    return {}
  }

  function navMes(delta) {
    setRef(r => {
      let m = r.month + delta, y = r.year
      if (m < 0)  { m = 11; y-- }
      if (m > 11) { m = 0;  y++ }
      return { year: y, month: m }
    })
  }

  const pos = anchorRect ? {
    top:  Math.min(anchorRect.bottom + 6, window.innerHeight - 360),
    left: Math.max(4, Math.min(anchorRect.left, window.innerWidth - 300)),
  } : { top: 80, left: 20 }

  return createPortal(
    <>
      <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={onFechar}/>
      <div style={{
        position:'fixed', zIndex:1000, width:292,
        background:'var(--surface-1)', border:'1px solid var(--border)',
        borderRadius:14, padding:'14px 12px',
        boxShadow:'0 8px 40px rgba(0,0,0,.4)',
        ...pos,
      }} onClick={e => e.stopPropagation()}>

        {/* Navegação do mês */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <button className="btn btn-ghost btn-xs" onClick={() => navMes(-1)}><ChevronLeft size={14}/></button>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-1)' }}>
            {MESES_PT[ref.month]} {ref.year}
          </span>
          <button className="btn btn-ghost btn-xs" onClick={() => navMes(1)}><ChevronRight size={14}/></button>
        </div>

        {/* Seleção de fase */}
        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
          {[['inicio','De',inicio],['fim','Até',fim]].map(([key, lbl, val]) => (
            <button key={key} onClick={() => setFase(key)} style={{
              flex:1, padding:'5px 8px', borderRadius:7, fontSize:11, fontWeight:600,
              border:`2px solid ${fase===key ? 'var(--accent)' : 'var(--border)'}`,
              background: fase===key ? 'var(--accent-dim)' : 'var(--bg-hover)',
              color: fase===key ? 'var(--accent)' : 'var(--text-2)', cursor:'pointer',
            }}>
              <div style={{fontSize:9,color:'var(--text-3)',marginBottom:1}}>{lbl}</div>
              {val ? val.split('-').reverse().join('/') : '—'}
            </button>
          ))}
          {(inicio || fim) && (
            <button onClick={() => { onInicio(''); onFim(''); setFase('inicio') }} style={{
              padding:'5px 10px', borderRadius:7, fontSize:14, border:'1px solid var(--border)',
              background:'var(--bg-hover)', color:'var(--text-3)', cursor:'pointer',
            }}>×</button>
          )}
        </div>

        {/* Cabeçalho dias */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:3 }}>
          {CAL_DIAS.map((d, i) => (
            <div key={i} style={{ textAlign:'center', fontSize:10, color:'var(--text-3)', fontWeight:600 }}>{d}</div>
          ))}
        </div>

        {/* Grade de dias */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {celulas().map((day, i) => {
            const c = cor(day)
            return (
              <div key={i} onClick={() => handleClick(day)} style={{
                height:30, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, borderRadius:6, cursor: day ? 'pointer' : 'default',
                transition:'background .1s', ...c,
              }}
              onMouseEnter={e => { if (day && !c.background) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (day && !c.background) e.currentTarget.style.background = '' }}
              >
                {day || ''}
              </div>
            )
          })}
        </div>

        {/* Atalho: hoje */}
        <div style={{ marginTop:10, display:'flex', justifyContent:'center' }}>
          <button className="btn btn-secondary btn-xs" onClick={() => {
            const d = new Date().toISOString().split('T')[0]
            if (fase === 'inicio') { onInicio(d); setFase('fim') } else onFim(d)
          }}>Hoje</button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Frequencia() {
  const { turmas, alunos, professores } = useApp()
  const api = window.electronAPI

  // Usuário logado — determina perfil e vínculo com professor
  const sessionUser = (() => { try { return JSON.parse(sessionStorage.getItem('em_user_v5') || '{}') } catch { return {} } })()
  const ehPerfProfessor = sessionUser.perfil_nome === 'Professor'

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
  const [novaAulaProfId, setNovaAulaProfId] = useState('')  // professor no form de nova aula
  const [conteudoAula,      setConteudoAula]      = useState('')
  const [profAusente,       setProfAusente]       = useState(false)
  const [justificativaAus,  setJustificativaAus]  = useState('')
  const [profAulaId,        setProfAulaId]        = useState(null)  // professor que ministrou a aula selecionada
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)

  // Cancelamento e reposição (v5.8)
  const [aulaCancelada,      setAulaCancelada]      = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [showReposicao,      setShowReposicao]      = useState(false)
  const [reposicaoData,      setReposicaoData]      = useState(hoje())
  const [reposicaoTit,       setReposicaoTit]       = useState('')
  const [salvandoReposicao,  setSalvandoReposicao]  = useState(false)

  // ── Grupos de dias na lista de chamada ───────────────────────────────────
  const [gruposExpandidos,  setGruposExpandidos]  = useState(() => new Set([hoje()]))
  const [mostrarTodasAulas, setMostrarTodasAulas] = useState(false)

  function toggleGrupo(data) {
    setGruposExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(data)) next.delete(data)
      else next.add(data)
      return next
    })
  }

  // ── Relatório avançado ────────────────────────────────────────────────────
  const [relatorio,      setRelatorio]      = useState(null)
  const [carregandoRel,  setCarregandoRel]  = useState(false)
  const [relDataInicio,  setRelDataInicio]  = useState('')
  const [relDataFim,     setRelDataFim]     = useState('')
  const [relBuscaAluno,  setRelBuscaAluno]  = useState('')
  const [relProfFiltro,  setRelProfFiltro]  = useState('')
  const [relShowCal,     setRelShowCal]     = useState(false)
  const [relCalRect,     setRelCalRect]     = useState(null)
  const relCalBtnRef = useRef(null)

  // Em modo "todas as turmas" sem turma selecionada, usa a turma da aula aberta
  const turmaAtualId = turmaSel ? Number(turmaSel) : (aulaSel?.turma_ls_id ?? 0)
  const turma     = turmas.find(t => t.id === turmaAtualId)
  const alunosDaTurma = turmaAtualId
    ? alunos.filter(a => a.turmaId === turmaAtualId && a.status === 'Ativo')
    : []
  const totalPresentes = Object.values(presencas).filter(Boolean).length
  const totalAlunos    = alunosDaTurma.length

  // Date reference for conflict checking:
  // - when creating a new class: use the selected date in the form
  // - when viewing an existing class: use that class's date
  const aulaDataConflito = aulaSel ? aulaSel.data : novaAulaData

  // Professors available for substitution on this day/time (no scheduling conflict)
  const professoresDisponiveis = professores.filter(p =>
    p.ativo && !professorTemConflito(p, aulaDataConflito, turma, turmas)
  )

  // ── Aulas filtradas e agrupadas por dia (painel chamada) ─────────────────

  const aulasPainel = (() => {
    if (mostrarTodasAulas) {
      // No profile filter still applies
      if (ehPerfProfessor && sessionUser.professor_db_id) {
        return aulas.filter(a => a.professor_id === sessionUser.professor_db_id)
      }
      return aulas
    }
    // Build the cutoff date string for 5-day window
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 4)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return aulas.filter(a => {
      if (a.data < cutoffStr) return false
      if (ehPerfProfessor && sessionUser.professor_db_id) {
        return a.professor_id === sessionUser.professor_db_id
      }
      return true
    })
  })()

  const gruposPorDia = (() => {
    const ref = new Date(); ref.setHours(0, 0, 0, 0)
    const map = {}
    aulasPainel.forEach(a => { if (!map[a.data]) map[a.data] = []; map[a.data].push(a) })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([data, items]) => {
        const d = new Date(data + 'T12:00:00'); d.setHours(0, 0, 0, 0)
        const dia = String(Number(data.split('-')[2]))
        return {
          data,
          label: `${DIAS_ABREV[d.getDay()]} ${dia}`,
          items,
        }
      })
  })()

  // Total de aulas fora da janela de 5 dias (para o link "ver mais antigas")
  const aulasAntigas = mostrarTodasAulas ? 0 : aulas.filter(a => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 4)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    const passaFiltroProf = !ehPerfProfessor || !sessionUser.professor_db_id || a.professor_id === sessionUser.professor_db_id
    return a.data < cutoffStr && passaFiltroProf
  }).length

  // Carrega aulas quando turma muda
  const carregarAulas = useCallback(async () => {
    const apiRef = window.electronAPI
    if (!apiRef?.freqListarAulas) { setAulas([]); return }
    // Sem turma selecionada só carrega se "todas as turmas" estiver ativo
    if (!turmaSel && !mostrarInativas) { setAulas([]); return }
    setLoading(true)
    const filtro = turmaSel ? { turmaLsId: Number(turmaSel) } : {}
    const lista = await apiRef.freqListarAulas(filtro)
    setAulas(lista || [])
    setLoading(false)
  }, [turmaSel, mostrarInativas])

  useEffect(() => { carregarAulas() }, [carregarAulas])

  // Quando seleciona uma aula, carrega presenças existentes
  async function selecionarAula(aula) {
    setAulaSel(aula)
    setConteudoAula(aula.conteudo || '')
    setProfAusente(!!aula.professor_ausente)
    setJustificativaAus(aula.justificativa_ausencia || '')
    setAulaCancelada(!!aula.cancelada)
    setMotivoCancelamento(aula.motivo_cancelamento || '')
    setProfAulaId(aula.professor_id || null)
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
    // Resolve professor: perfil Professor usa o vinculado ao usuário; admin/sec usa o selecionado
    const profId = ehPerfProfessor
      ? (sessionUser.professor_db_id || turma?.professorId || null)
      : (novaAulaProfId ? Number(novaAulaProfId) : (turma?.professorId || null))
    const res = await api?.freqCriarAula({
      turmaLsId:   Number(turmaSel),
      turmaCodigo: turma?.codigo || '',
      data:        novaAulaData,
      titulo:      novaAulaTit.trim() || `Aula ${novaAulaData}`,
      conteudo:    novaAulaCont.trim(),
      professorId: profId,
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
      const profIdAlterado = (profAulaId || null) !== (aulaSel.professor_id || null)
      const aulaAlterada =
        conteudoAula       !== (aulaSel.conteudo               || '') ||
        profAusente        !== !!aulaSel.professor_ausente             ||
        justificativaAus   !== (aulaSel.justificativa_ausencia  || '') ||
        aulaCancelada      !== !!aulaSel.cancelada                     ||
        motivoCancelamento !== (aulaSel.motivo_cancelamento    || '')  ||
        profIdAlterado

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
          professor_id:           profIdAlterado ? (profAulaId || null) : undefined,
        }, getReq())
        setAulaSel(a => ({
          ...a,
          conteudo:               conteudoAula,
          professor_ausente:      profAusente ? 1 : 0,
          justificativa_ausencia: profAusente ? justificativaAus : '',
          cancelada:              aulaCancelada ? 1 : 0,
          motivo_cancelamento:    aulaCancelada ? motivoCancelamento : '',
          professor_id:           profIdAlterado ? (profAulaId || null) : a.professor_id,
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
    if (!relatorio || !relatorio.totalAulas) return
    const html = gerarHTMLRelatorioFrequencia({ turma, stats: relatorio, alunosDaTurma })
    const res  = await gerarPDF({
      html,
      nomeArquivo: `frequencia-${turma?.codigo || 'geral'}.pdf`,
      titulo:      `Frequência ${turma?.codigo || 'Geral'}`
    })
    if (res?.ok && !res?.fallback) console.log('[PDF] Frequência salva')
  }

  async function carregarRelatorio() {
    if (!api?.freqRelatorioAvancado) return
    setCarregandoRel(true)
    setRelatorio(null)
    const filtros = {
      turmaId:     turmaSel     ? Number(turmaSel)     : null,
      professorId: ehPerfProfessor
        ? (sessionUser.professor_db_id || null)
        : (relProfFiltro ? Number(relProfFiltro) : null),
      dataInicio: relDataInicio || null,
      dataFim:    relDataFim    || null,
    }
    const s = await api.freqRelatorioAvancado(filtros)
    setRelatorio(s)
    setCarregandoRel(false)
  }

  useEffect(() => {
    if (tab === 'relatorio') carregarRelatorio()
  }, [tab, turmaSel, relDataInicio, relDataFim, relProfFiltro])

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

        <div className="toolbar-right" style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-3)', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
            <input
              type="checkbox"
              checked={mostrarInativas}
              onChange={e => { setMostrarInativas(e.target.checked); setTurmaSel(''); setAulaSel(null); setPresencas({}); setRelatorio(null) }}
              style={{ cursor:'pointer' }}
            />
            Todas as turmas
          </label>
          <select
            className="select"
            style={{ width: 240 }}
            value={turmaSel}
            onChange={e => { setTurmaSel(e.target.value); setAulaSel(null); setPresencas({}); setRelatorio(null) }}
          >
            <option value="">Selecionar turma...</option>
            {(mostrarInativas ? turmas : turmas.filter(t => t.ativa)).map(t => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.idioma} {t.nivel}{!t.ativa ? ' (inativa)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!turmaSel && !mostrarInativas && (
        <div className="empty" style={{ paddingTop: 60 }}>
          <BookOpen size={48} style={{ opacity: .3 }}/>
          <p>Selecione uma turma acima para começar.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ABA: CHAMADA                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'chamada' && (turmaSel || mostrarInativas) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── LISTA DE AULAS ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                Aulas registradas
              </span>
              {turmaSel && (
                <button
                  className="btn btn-primary btn-xs"
                  onClick={() => setShowNovaAula(v => !v)}
                >
                  <Plus size={12}/> Nova aula
                </button>
              )}
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
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11 }}>Conteúdo ministrado (opcional)</label>
                  <textarea className="textarea" placeholder="Ex: Revisão de verbos irregulares, diálogo em pares..."
                    value={novaAulaCont} onChange={e => setNovaAulaCont(e.target.value)}
                    style={{ minHeight: 64, fontSize: 12 }}/>
                </div>
                {/* Professor da aula */}
                <div className="field" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11 }}>Professor</label>
                  {ehPerfProfessor ? (
                    <div style={{
                      padding: '7px 10px', borderRadius: 7, fontSize: 12,
                      background: 'var(--bg-hover)', color: 'var(--text-1)',
                      border: '1px solid var(--border)',
                    }}>
                      {professores.find(p => p.id === sessionUser.professor_db_id)?.nome
                        || turma?.professorNome
                        || professores.find(p => p.id === turma?.professorId)?.nome
                        || '—'}
                    </div>
                  ) : (
                    <>
                      <select
                        className="select"
                        value={novaAulaProfId || turma?.professorId || ''}
                        onChange={e => setNovaAulaProfId(e.target.value)}
                      >
                        <option value="">Selecionar professor...</option>
                        {professoresDisponiveis.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome}{p.id === turma?.professorId ? ' (titular)' : ''}
                          </option>
                        ))}
                      </select>
                      {professores.filter(p => p.ativo).length > professoresDisponiveis.length && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'block' }}>
                          {professores.filter(p => p.ativo).length - professoresDisponiveis.length} professor(es) com conflito de horário ocultados
                        </span>
                      )}
                    </>
                  )}
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

            {/* Lista agrupada por dia */}
            <div>
            {loading && !aulas.length && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>
                <RefreshCw size={18} style={{ animation: 'spin .7s linear infinite' }}/>
              </div>
            )}
            {!loading && aulasPainel.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                {aulas.length === 0
                  ? <>{turmaSel ? 'Nenhuma aula registrada.' : 'Nenhuma aula encontrada.'}<br/>{turmaSel && 'Clique em "Nova aula" para começar.'}</>
                  : ehPerfProfessor
                    ? 'Nenhuma aula sua nos últimos 5 dias.'
                    : 'Nenhuma aula nos últimos 5 dias.'
                }
              </div>
            )}
            {gruposPorDia.map(({ data, label, items }) => {
              const expandido = gruposExpandidos.has(data)
              const temAtiva  = items.some(a => a.id === aulaSel?.id)
              return (
                <div key={data}>
                  {/* Cabeçalho do grupo */}
                  <div
                    onClick={() => toggleGrupo(data)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 14px', cursor: 'pointer',
                      background: temAtiva ? 'var(--accent-dim)' : 'var(--bg-hover)',
                      borderBottom: '1px solid var(--border)',
                      borderTop: '1px solid var(--border)',
                      userSelect: 'none',
                    }}
                  >
                    {expandido
                      ? <ChevronDown size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }}/>
                      : <ChevronRight size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }}/>
                    }
                    <span style={{
                      fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700,
                      color: temAtiva ? 'var(--accent)' : 'var(--text-2)',
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center',
                      padding: '1px 6px', borderRadius: 20,
                      background: temAtiva ? 'var(--accent)' : 'var(--border)',
                      color: temAtiva ? '#fff' : 'var(--text-3)',
                    }}>{items.length}</span>
                  </div>

                  {/* Itens do grupo — grid horizontal de cards */}
                  {expandido && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 8,
                      padding: '10px 14px',
                    }}>
                      {items.map(a => {
                        const ativo      = aulaSel?.id === a.id
                        const aulaProf   = a.professor_id ? professores.find(p => p.id === a.professor_id) : null
                        const aulasTurma = turmas.find(t => t.id === a.turma_ls_id)
                        const eSubst     = a.professor_id && aulasTurma?.professorId && a.professor_id !== aulasTurma.professorId
                        return (
                          <div
                            key={a.id}
                            onClick={() => selecionarAula(a)}
                            style={{
                              position: 'relative',
                              aspectRatio: '1',
                              borderRadius: 10,
                              border: `2px solid ${ativo ? 'var(--accent)' : 'var(--border)'}`,
                              background: ativo ? 'var(--accent-dim)' : 'var(--bg-card, var(--bg-hover))',
                              cursor: 'pointer',
                              padding: '8px 7px 7px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 3,
                              overflow: 'hidden',
                              transition: 'border-color .12s, background .12s',
                            }}
                            onMouseEnter={e => { if (!ativo) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--accent)' } }}
                            onMouseLeave={e => { if (!ativo) { e.currentTarget.style.background = 'var(--bg-card, var(--bg-hover))'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                          >
                            {/* Botão excluir — canto superior direito */}
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={e => { e.stopPropagation(); setConfirmDel(a) }}
                              style={{ position: 'absolute', top: 4, right: 4, opacity: .55, padding: '1px 3px', minWidth: 0 }}
                            >
                              <Trash2 size={9}/>
                            </button>

                            {/* Ícone */}
                            <div style={{
                              width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                              background: ativo ? 'var(--accent)' : 'var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Calendar size={12} style={{ color: ativo ? '#fff' : 'var(--text-3)' }}/>
                            </div>

                            {/* Título / data */}
                            <div style={{
                              fontSize: 11, fontWeight: 600, lineHeight: 1.25,
                              color: ativo ? 'var(--accent)' : 'var(--text-1)',
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}>
                              {a.titulo || formatDate(a.data)}
                            </div>

                            {/* Código da turma (modo "todas as turmas") */}
                            {!turmaSel && a.turma_codigo && (
                              <div style={{ fontSize: 9.5, color: 'var(--accent)', fontWeight: 700 }}>{a.turma_codigo}</div>
                            )}

                            {/* Professor */}
                            {aulaProf && (
                              <div style={{
                                fontSize: 9.5, color: eSubst ? '#84cc16' : 'var(--text-3)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {aulaProf.nome.split(' ')[0]}
                              </div>
                            )}

                            {/* Tags — empurradas para baixo */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 'auto' }}>
                              {!!a.cancelada        && <span style={{ fontSize:8, fontWeight:700, padding:'1px 3px', borderRadius:2, background:'var(--red-dim)',           color:'var(--red)',    border:'1px solid var(--red)'       }}>CANCEL.</span>}
                              {!!a.aula_reposicao_id && <span style={{ fontSize:8, fontWeight:700, padding:'1px 3px', borderRadius:2, background:'rgba(91,156,246,.12)',    color:'var(--blue)',   border:'1px solid var(--blue)'      }}>REPOS.</span>}
                              {!!a.professor_ausente && <span style={{ fontSize:8, fontWeight:700, padding:'1px 3px', borderRadius:2, background:'rgba(245,197,66,.1)',     color:'var(--yellow)', border:'1px solid var(--yellow)'    }}>AUS.</span>}
                              {eSubst               && <span style={{ fontSize:8, fontWeight:700, padding:'1px 3px', borderRadius:2, background:'rgba(163,230,53,.1)',      color:'#84cc16',       border:'1px solid #84cc1644'        }}>SUBST.</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            </div>{/* fim área rolável */}

            {/* Link para aulas mais antigas — fixo na base do card */}
            {!loading && (aulasAntigas > 0 || mostrarTodasAulas) && (
              <button
                onClick={() => { setMostrarTodasAulas(v => !v) }}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'none', border: 'none', borderTop: '1px solid var(--border)',
                  fontSize: 11, color: 'var(--text-3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                {mostrarTodasAulas
                  ? <><ChevronUp size={12}/> Mostrar apenas últimos 5 dias</>
                  : <><ChevronDown size={12}/> Ver {aulasAntigas} aula{aulasAntigas !== 1 ? 's' : ''} mais antiga{aulasAntigas !== 1 ? 's' : ''}</>
                }
              </button>
            )}
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                        {aulaSel.titulo || formatDate(aulaSel.data)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {turma?.codigo} · {formatDate(aulaSel.data)} · {totalAlunos} alunos
                      </div>
                      {/* Professor da aula */}
                      {(() => {
                        const profTitular  = professores.find(p => p.id === turma?.professorId)
                        const profAula     = profAulaId ? professores.find(p => p.id === profAulaId) : profTitular
                        const eSubstituicao = profAulaId && turma?.professorId && profAulaId !== turma.professorId
                        return (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {ehPerfProfessor ? (
                              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                Professor: <strong>{profAula?.nome || '—'}</strong>
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Professor:</span>
                                <select
                                  className="select"
                                  style={{ height: 28, fontSize: 12, padding: '0 8px', minWidth: 160 }}
                                  value={profAulaId || turma?.professorId || ''}
                                  onChange={e => setProfAulaId(e.target.value ? Number(e.target.value) : null)}
                                >
                                  <option value="">— sem professor —</option>
                                  {professoresDisponiveis.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome}{p.id === turma?.professorId ? ' (titular)' : ''}
                                    </option>
                                  ))}
                                </select>
                                {professores.filter(p => p.ativo).length > professoresDisponiveis.length && (
                                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                    {professores.filter(p => p.ativo).length - professoresDisponiveis.length} com conflito ocultado(s)
                                  </span>
                                )}
                              </div>
                            )}
                            {eSubstituicao && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, letterSpacing: .4,
                                padding: '2px 7px', borderRadius: 4,
                                background: 'rgba(245,197,66,.15)', color: 'var(--yellow)',
                                border: '1px solid var(--yellow)',
                              }}>
                                SUBSTITUIÇÃO — titular: {profTitular?.nome || '—'}
                              </span>
                            )}
                          </div>
                        )
                      })()}
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
      {tab === 'relatorio' && (() => {
        // Client-side student filter applied to report data
        const alunosFiltrados = (relatorio?.alunos ?? []).filter(a =>
          !relBuscaAluno || a.aluno_nome.toLowerCase().includes(relBuscaAluno.toLowerCase())
        )

        // For professor profile without link, show a warning
        if (ehPerfProfessor && !sessionUser.professor_db_id) {
          return (
            <div className="empty" style={{ paddingTop: 60 }}>
              <User size={48} style={{ opacity: .3 }}/>
              <p>Seu usuário não está vinculado a um professor.</p>
              <small>Peça ao administrador para vincular seu login ao cadastro de professor.</small>
            </div>
          )
        }

        return (
          <div>
            {/* ── Barra de filtros ── */}
            <div className="card" style={{ padding:'12px 16px', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>

                {/* Intervalo de datas */}
                <div style={{ display:'flex', alignItems:'center', gap:6, position:'relative' }}>
                  <button
                    ref={relCalBtnRef}
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (relShowCal) { setRelShowCal(false); return }
                      setRelCalRect(relCalBtnRef.current?.getBoundingClientRect())
                      setRelShowCal(true)
                    }}
                    style={{ gap:6, minWidth:180, justifyContent:'flex-start' }}
                  >
                    <Calendar size={13} style={{ flexShrink:0 }}/>
                    <span style={{ fontSize:12 }}>
                      {relDataInicio && relDataFim
                        ? `${relDataInicio.split('-').reverse().join('/')} → ${relDataFim.split('-').reverse().join('/')}`
                        : relDataInicio
                          ? `De ${relDataInicio.split('-').reverse().join('/')}`
                          : 'Filtrar por período'}
                    </span>
                  </button>
                  {(relDataInicio || relDataFim) && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => { setRelDataInicio(''); setRelDataFim('') }}
                      title="Limpar datas"
                    >×</button>
                  )}
                </div>

                {/* Busca por aluno */}
                <div style={{ position:'relative', flex:1, minWidth:160 }}>
                  <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
                  <input
                    className="input"
                    placeholder="Filtrar aluno..."
                    value={relBuscaAluno}
                    onChange={e => setRelBuscaAluno(e.target.value)}
                    style={{ paddingLeft:30, height:34, fontSize:12 }}
                  />
                  {relBuscaAluno && (
                    <button onClick={() => setRelBuscaAluno('')} style={{
                      position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:14,
                    }}>×</button>
                  )}
                </div>

                {/* Filtro de professor — apenas admin/secretaria */}
                {!ehPerfProfessor && (
                  <div style={{ position:'relative', minWidth:180 }}>
                    <User size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', zIndex:1 }}/>
                    <select
                      className="select"
                      value={relProfFiltro}
                      onChange={e => setRelProfFiltro(e.target.value)}
                      style={{ paddingLeft:28, height:34, fontSize:12 }}
                    >
                      <option value="">Todos os professores</option>
                      {professores.filter(p => p.ativo).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={carregarRelatorio} disabled={carregandoRel}>
                    <RefreshCw size={13} style={{ animation: carregandoRel ? 'spin .7s linear infinite' : 'none' }}/> Atualizar
                  </button>
                  {relatorio && relatorio.totalAulas > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={handlePDFFrequencia}>
                      <FileDown size={13}/> Exportar PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Label dos filtros ativos */}
              {(relDataInicio || relDataFim || relProfFiltro || turmaSel) && (
                <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                  {turmaSel && (
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--accent-dim)', color:'var(--accent)' }}>
                      Turma: {turma?.codigo}
                    </span>
                  )}
                  {relProfFiltro && !ehPerfProfessor && (
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--bg-hover)', color:'var(--text-2)' }}>
                      Prof: {professores.find(p => String(p.id) === String(relProfFiltro))?.nome}
                    </span>
                  )}
                  {ehPerfProfessor && sessionUser.professor_db_id && (
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--bg-hover)', color:'var(--text-2)' }}>
                      Suas aulas: {professores.find(p => p.id === sessionUser.professor_db_id)?.nome}
                    </span>
                  )}
                  {(relDataInicio || relDataFim) && (
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--bg-hover)', color:'var(--text-2)' }}>
                      {relDataInicio && relDataFim
                        ? `${relDataInicio.split('-').reverse().join('/')} → ${relDataFim.split('-').reverse().join('/')}`
                        : relDataInicio ? `De ${relDataInicio.split('-').reverse().join('/')}` : `Até ${relDataFim.split('-').reverse().join('/')}`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Carregando ── */}
            {carregandoRel && (
              <div style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>
                <RefreshCw size={24} style={{ animation:'spin .7s linear infinite' }}/>
              </div>
            )}

            {/* ── Sem dados ── */}
            {!carregandoRel && relatorio && relatorio.totalAulas === 0 && (
              <div className="empty">
                <BarChart2 size={40}/>
                <p>Nenhuma chamada encontrada com os filtros aplicados.</p>
                <small>Ajuste o período ou remova os filtros.</small>
              </div>
            )}

            {/* ── Cards de resumo ── */}
            {!carregandoRel && relatorio && relatorio.totalAulas > 0 && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:14 }}>
                  {[
                    ['Aulas registradas', relatorio.totalAulas, 'var(--accent)'],
                    ['Alunos avaliados',  relatorio.alunos.length, 'var(--blue)'],
                    ['Freq. média',
                      relatorio.alunos.length
                        ? Math.round(relatorio.alunos.reduce((s, a) => s + (a.percentual || 0), 0) / relatorio.alunos.length) + '%'
                        : '—',
                      'var(--yellow)'],
                    ...(!ehPerfProfessor && relatorio.professoresStats.length > 0
                      ? [['Professores', relatorio.professoresStats.length, 'var(--text-2)']]
                      : []),
                  ].map(([lbl, val, cor]) => (
                    <div key={lbl} className="card" style={{ padding:'14px 16px', textAlign:'center' }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color: cor }}>{val}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* ── Tabela de professores (admin/sec apenas) ── */}
                {!ehPerfProfessor && relatorio.professoresStats.length > 0 && (
                  <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
                    <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, color:'var(--text-1)' }}>
                      Resumo por professor
                    </div>
                    <table style={{ width:'100%' }}>
                      <thead>
                        <tr>
                          <th>Professor</th>
                          <th style={{ width:110, textAlign:'center' }}>Aulas ministradas</th>
                          <th style={{ width:100, textAlign:'center' }}>Ausências</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.professoresStats.map(ps => {
                          const p = professores.find(p => p.id === ps.professor_id)
                          return (
                            <tr key={ps.professor_id ?? 'none'}>
                              <td className="td-name">{p?.nome || (ps.professor_id ? `ID ${ps.professor_id}` : '— sem professor —')}</td>
                              <td style={{ textAlign:'center', fontWeight:600, color:'var(--accent)' }}>{ps.total_aulas}</td>
                              <td style={{ textAlign:'center', color: ps.total_ausencias > 0 ? 'var(--red)' : 'var(--text-3)' }}>
                                {ps.total_ausencias || 0}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Tabela de alunos ── */}
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th style={{ width:90, textAlign:'center' }}>Presenças</th>
                        <th style={{ width:90, textAlign:'center' }}>Faltas</th>
                        <th style={{ width:80, textAlign:'center' }}>Freq. %</th>
                        <th style={{ width:180 }}>Progresso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunosFiltrados.map(a => {
                        const faltas = a.total_aulas - a.total_presentes
                        const pct    = a.percentual || 0
                        const cor    = pct >= 75 ? 'var(--accent)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
                        return (
                          <tr key={a.aluno_ls_id}>
                            <td className="td-name">{a.aluno_nome}</td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ color:'var(--accent)', fontWeight:600 }}>{a.total_presentes}</span>
                            </td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ color: faltas > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: faltas > 0 ? 600 : 400 }}>{faltas}</span>
                            </td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color: cor }}>{pct}%</span>
                            </td>
                            <td>
                              <div style={{ height:7, background:'var(--bg-hover)', borderRadius:4, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background: cor, borderRadius:4, transition:'width .4s' }}/>
                              </div>
                              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>
                                {pct >= 75 ? '✅ Regular' : pct >= 50 ? '⚠️ Atenção' : '❌ Crítico'}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {alunosFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign:'center', color:'var(--text-3)', padding:24, fontSize:13 }}>
                            {relBuscaAluno ? `Nenhum aluno encontrado para "${relBuscaAluno}"` : 'Nenhum aluno com chamada registrada.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:20, fontSize:11, color:'var(--text-3)', flexWrap:'wrap' }}>
                    <span>✅ Regular: ≥75%</span>
                    <span>⚠️ Atenção: 50–74%</span>
                    <span>❌ Crítico: &lt;50%</span>
                    <span style={{ marginLeft:'auto' }}>
                      {alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''} · {relatorio.totalAulas} aula{relatorio.totalAulas !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Calendário range picker ── */}
            {relShowCal && relCalRect && (
              <CalendarioRangePicker
                inicio={relDataInicio}
                fim={relDataFim}
                onInicio={setRelDataInicio}
                onFim={setRelDataFim}
                anchorRect={relCalRect}
                onFechar={() => setRelShowCal(false)}
              />
            )}
          </div>
        )
      })()}

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
