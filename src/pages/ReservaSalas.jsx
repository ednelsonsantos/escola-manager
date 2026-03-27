/**
 * ReservaSalas.jsx — Módulo de Reserva de Salas (v5.9.1)
 *
 * Cadastro de salas + recursos, agenda de reservas com:
 * - Detecção de conflito de horário
 * - Vínculo opcional com turma existente
 * - Autopreenchimento de título e responsável ao selecionar turma
 * - Sugestão de sala pela capacidade (menor sala que comporte os alunos da turma)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  DoorOpen, Plus, Pencil, Trash2, Search, X, RefreshCw,
  Download, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle,
  Clock, Users, Tv, Wifi, Monitor, Mic, BookOpen, Zap,
  Calendar, CalendarDays, Settings, Tag, LayoutGrid, List,
  GraduationCap, Lightbulb,
} from 'lucide-react'
import { formatDate } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

function hoje() { return new Date().toISOString().split('T')[0] }

function semanaDeData(dataStr) {
  const d = new Date(dataStr + 'T00:00:00')
  const dia = d.getDay()
  const seg = new Date(d)
  seg.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return seg.toISOString().split('T')[0]
}

function adicionarDias(dataStr, n) {
  const d = new Date(dataStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function fmtHora(h) { return h || '--:--' }

function duracaoMin(inicio, fim) {
  if (!inicio || !fim) return 0
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fim.split(':').map(Number)
  return (hf * 60 + mf) - (hi * 60 + mi)
}

const DIAS_SEMANA  = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const ICONES_RECURSO = {
  'Projetor': Monitor, 'TV': Tv, 'Wi-Fi': Wifi,
  'Microfone': Mic, 'Quadro': BookOpen, 'Tomadas': Zap, 'Outros': Tag,
}

function IconeRecurso({ nome, size = 12 }) {
  const Ic = ICONES_RECURSO[nome] || Tag
  return <Ic size={size}/>
}

const COR_STATUS = {
  confirmada: { bg: 'rgba(99,220,170,.15)',  border: '#63dcaa40', text: '#63dcaa', label: 'Confirmada' },
  pendente:   { bg: 'rgba(245,197,66,.12)',  border: '#f5c54240', text: '#f5c542', label: 'Pendente'   },
  cancelada:  { bg: 'rgba(242,97,122,.10)',  border: '#f2617a40', text: '#f2617a', label: 'Cancelada'  },
}

const HORARIOS = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00','21:30','22:00',
]

function BadgeStatus({ status }) {
  const cfg = COR_STATUS[status] || COR_STATUS.pendente
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text,
      textTransform: 'uppercase', letterSpacing: '.4px',
    }}>{cfg.label}</span>
  )
}

function BadgeTurma({ codigo }) {
  if (!codigo) return null
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
      background: 'rgba(91,156,246,.15)', border: '1px solid rgba(91,156,246,.3)',
      color: '#5b9cf6', display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      <GraduationCap size={8}/>{codigo}
    </span>
  )
}

// ── Modal de Sala ─────────────────────────────────────────────────────────────
function ModalSala({ sala, onSalvar, onClose }) {
  const editando = !!sala?.id
  const [form, setForm] = useState({
    nome:       sala?.nome       || '',
    capacidade: sala?.capacidade || 20,
    descricao:  sala?.descricao  || '',
    ativa:      sala?.ativa      ?? 1,
  })
  const [recursos, setRecursos] = useState(sala?.recursos || [])
  const [novoRec,  setNovoRec]  = useState('')
  const [erro,     setErro]     = useState('')

  function f(k, v) { setForm(x => ({ ...x, [k]: v })); setErro('') }

  function addRecurso() {
    const r = novoRec.trim()
    if (!r || recursos.includes(r)) { setNovoRec(''); return }
    setRecursos(x => [...x, r]); setNovoRec('')
  }

  function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome da sala é obrigatório'); return }
    if (Number(form.capacidade) < 1) { setErro('Capacidade deve ser ≥ 1'); return }
    onSalvar({ ...form, capacidade: Number(form.capacidade), recursos })
  }

  const RECURSOS_SUGERIDOS = ['Projetor','TV','Wi-Fi','Microfone','Quadro','Tomadas','Ar-condicionado','Lousa digital']

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: 14, width: 480, maxWidth: '95vw',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp .18s ease', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DoorOpen size={18} style={{ color: 'var(--accent)' }}/>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
              {editando ? 'Editar Sala' : 'Nova Sala'}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14}/></button>
        </div>

        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {erro && <div className="alert alert-danger" style={{ marginBottom: 14 }}><AlertTriangle size={14}/>{erro}</div>}

          <div className="form-grid">
            <div className="field form-full">
              <label>Nome da sala *</label>
              <input className="input" placeholder="Ex: Sala A, Lab de Idiomas…"
                value={form.nome} onChange={e => f('nome', e.target.value)}/>
            </div>
            <div className="field">
              <label>Capacidade (pessoas) *</label>
              <input className="input" type="number" min="1" max="500"
                value={form.capacidade} onChange={e => f('capacidade', e.target.value)}/>
            </div>
            <div className="field">
              <label>Status</label>
              <select className="select" value={form.ativa} onChange={e => f('ativa', Number(e.target.value))}>
                <option value={1}>Ativa</option>
                <option value={0}>Inativa</option>
              </select>
            </div>
            <div className="field form-full">
              <label>Descrição / localização</label>
              <input className="input" placeholder="Ex: 2º andar, bloco B…"
                value={form.descricao} onChange={e => f('descricao', e.target.value)}/>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Recursos disponíveis
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {RECURSOS_SUGERIDOS.filter(r => !recursos.includes(r)).map(r => (
                <button key={r} className="btn btn-ghost btn-xs" style={{ fontSize: 11, gap: 4 }}
                  onClick={() => setRecursos(x => [...x, r])}>
                  <Plus size={10}/>{r}
                </button>
              ))}
            </div>
            {recursos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {recursos.map(r => (
                  <span key={r} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 500, padding: '4px 9px', borderRadius: 6,
                    background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)40',
                  }}>
                    <IconeRecurso nome={r} size={11}/>{r}
                    <button onClick={() => setRecursos(x => x.filter(i => i !== r))} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      display: 'flex', color: 'inherit', opacity: .7,
                    }}><X size={10}/></button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" placeholder="Outro recurso…" style={{ flex: 1 }}
                value={novoRec} onChange={e => setNovoRec(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRecurso()}/>
              <button className="btn btn-secondary btn-sm" onClick={addRecurso}><Plus size={13}/></button>
            </div>
          </div>
        </div>

        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSalvar}>
            <CheckCircle size={14}/> {editando ? 'Salvar alterações' : 'Criar sala'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Modal de Reserva ──────────────────────────────────────────────────────────
function ModalReserva({ reserva, salas, turmas, professores, alunosPorTurma, onSalvar, onClose }) {
  const editando = !!reserva?.id
  const [form, setForm] = useState({
    sala_id:     String(reserva?.sala_id    || salas[0]?.id || ''),
    turma_id:    String(reserva?.turma_id   || ''),
    turma_nome:  reserva?.turma_nome        || '',
    data:        reserva?.data              || hoje(),
    hora_inicio: reserva?.hora_inicio       || '08:00',
    hora_fim:    reserva?.hora_fim          || '09:00',
    titulo:      reserva?.titulo            || '',
    responsavel: reserva?.responsavel       || '',
    descricao:   reserva?.descricao         || '',
    status:      reserva?.status            || 'confirmada',
  })
  const [erro,     setErro]     = useState('')
  const [conflitos,setConflitos]= useState([])
  const [checando, setChecando] = useState(false)
  const [sugestao, setSugestao] = useState(null)  // { sala, qtdAlunos } | null

  function f(k, v) { setForm(x => ({ ...x, [k]: v })); setErro(''); setConflitos([]) }

  // ── Selecionar turma → autopreenchimento + sugestão de sala ───────────────
  function handleSelecionarTurma(turmaId) {
    if (!turmaId) {
      setForm(x => ({ ...x, turma_id: '', turma_nome: '' }))
      setSugestao(null)
      return
    }
    const turma     = turmas.find(t => String(t.id) === String(turmaId))
    if (!turma) return
    const professor = professores.find(p => p.id === (turma.professor_id ?? turma.professorId))
    const qtdAlunos = alunosPorTurma[String(turma.id)] || 0

    // Menor sala ativa com capacidade suficiente
    const salaSugerida = salas
      .filter(s => s.ativa && s.capacidade >= qtdAlunos)
      .sort((a, b) => a.capacidade - b.capacidade)[0] || null

    setForm(x => ({
      ...x,
      turma_id:    String(turmaId),
      turma_nome:  `${turma.idioma} — ${turma.codigo}`,
      titulo:      x.titulo      || `${turma.idioma} — ${turma.codigo}`,
      responsavel: x.responsavel || professor?.nome || '',
      sala_id:     salaSugerida  ? String(salaSugerida.id) : x.sala_id,
    }))
    setSugestao(salaSugerida ? { sala: salaSugerida, qtdAlunos } : null)
    setConflitos([])
  }

  // ── Verificar conflito de horário ─────────────────────────────────────────
  async function checarConflito() {
    if (!form.sala_id || !form.data || !form.hora_inicio || !form.hora_fim) return
    if (duracaoMin(form.hora_inicio, form.hora_fim) <= 0) return
    setChecando(true)
    try {
      const res = await window.electronAPI.rsListarReservas({ sala_id: form.sala_id, data: form.data })
      setConflitos((res || []).filter(r =>
        r.id !== reserva?.id && r.status !== 'cancelada' &&
        r.hora_inicio < form.hora_fim && r.hora_fim > form.hora_inicio
      ))
    } catch {}
    setChecando(false)
  }

  useEffect(() => { checarConflito() }, [form.sala_id, form.data, form.hora_inicio, form.hora_fim])

  function handleSalvar() {
    if (!form.sala_id)       { setErro('Selecione uma sala'); return }
    if (!form.titulo.trim()) { setErro('Título é obrigatório'); return }
    if (!form.data)          { setErro('Data é obrigatória'); return }
    if (!form.hora_inicio || !form.hora_fim) { setErro('Informe horário de início e fim'); return }
    if (duracaoMin(form.hora_inicio, form.hora_fim) <= 0) { setErro('Hora de fim deve ser após o início'); return }
    if (conflitos.length > 0 && form.status !== 'cancelada') {
      setErro('Existe conflito de horário. Ajuste ou cancele a reserva.')
      return
    }
    onSalvar({ ...form, sala_id: Number(form.sala_id), turma_id: form.turma_id ? Number(form.turma_id) : null })
  }

  const salaSel  = salas.find(s => String(s.id) === String(form.sala_id))
  const turmaSel = turmas.find(t => String(t.id) === String(form.turma_id))
  const duracao  = duracaoMin(form.hora_inicio, form.hora_fim)
  const qtdTurma = turmaSel ? (alunosPorTurma[String(turmaSel.id)] || 0) : 0

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: 14, width: 540, maxWidth: '96vw',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp .18s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} style={{ color: 'var(--accent)' }}/>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
              {editando ? 'Editar Reserva' : 'Nova Reserva'}
            </span>
            {turmaSel && <BadgeTurma codigo={turmaSel.codigo}/>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14}/></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', maxHeight: '74vh', overflowY: 'auto' }}>

          {/* Alertas */}
          {conflitos.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 14 }}>
              <AlertTriangle size={14}/>
              <div>
                <strong>Conflito de horário!</strong> Esta sala já está reservada neste período:
                {conflitos.map(c => (
                  <div key={c.id} style={{ fontSize: 12, marginTop: 4 }}>
                    • {c.titulo} — {fmtHora(c.hora_inicio)} às {fmtHora(c.hora_fim)}
                    {c.responsavel ? ` (${c.responsavel})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          {erro && <div className="alert alert-danger" style={{ marginBottom: 14 }}><AlertTriangle size={14}/>{erro}</div>}

          {/* ── Seção Turma ────────────────────────────────────────────────── */}
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <GraduationCap size={14} style={{ color: '#5b9cf6' }}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Turma <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-3)' }}>(opcional)</span>
              </span>
            </div>

            <select className="select" value={form.turma_id} onChange={e => handleSelecionarTurma(e.target.value)}>
              <option value="">— Sem turma vinculada —</option>
              {turmas.filter(t => t.ativa).sort((a,b) => a.codigo.localeCompare(b.codigo)).map(t => {
                const qtd = alunosPorTurma[String(t.id)] || 0
                return (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.idioma} · {qtd} aluno{qtd !== 1 ? 's' : ''}
                  </option>
                )
              })}
            </select>

            {/* Sugestão de sala pela capacidade */}
            {sugestao && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(91,156,246,.08)', border: '1px solid rgba(91,156,246,.25)',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Lightbulb size={14} style={{ color: '#5b9cf6', flexShrink: 0, marginTop: 1 }}/>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  <strong style={{ color: '#5b9cf6' }}>Sala sugerida:</strong>{' '}
                  <strong style={{ color: 'var(--text-1)' }}>{sugestao.sala.nome}</strong>
                  {' '}(cap. {sugestao.sala.capacidade}) — turma tem{' '}
                  <strong>{sugestao.qtdAlunos}</strong> aluno{sugestao.qtdAlunos !== 1 ? 's' : ''}.
                  {' '}Sala selecionada automaticamente.
                </div>
              </div>
            )}

            {/* Aviso: turma sem sala suficiente */}
            {form.turma_id && !sugestao && (
              <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 8, display: 'flex', gap: 5, alignItems: 'center' }}>
                <AlertTriangle size={11}/>
                Nenhuma sala ativa tem capacidade suficiente para esta turma. Selecione manualmente.
              </div>
            )}
          </div>

          {/* ── Formulário principal ────────────────────────────────────────── */}
          <div className="form-grid">

            {/* Sala */}
            <div className="field form-full">
              <label>Sala *</label>
              <select className="select" value={form.sala_id}
                onChange={e => { f('sala_id', e.target.value); setSugestao(null) }}>
                <option value="">Selecionar sala</option>
                {salas.filter(s => s.ativa).map(s => {
                  const insuf = turmaSel && qtdTurma > 0 && s.capacidade < qtdTurma
                  return (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.capacidade} lugares{insuf ? ' ⚠ capacidade insuficiente' : ''}
                    </option>
                  )
                })}
              </select>

              {/* Recursos da sala */}
              {salaSel?.recursos?.length > 0 && (
                <span className="input-hint" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {salaSel.recursos.map(r => (
                    <span key={r} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--bg-hover)', color: 'var(--text-3)',
                    }}>
                      <IconeRecurso nome={r} size={9}/>{r}
                    </span>
                  ))}
                </span>
              )}

              {/* Aviso de capacidade insuficiente */}
              {turmaSel && salaSel && qtdTurma > 0 && salaSel.capacidade < qtdTurma && (
                <span className="input-hint" style={{ color: 'var(--yellow)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={11}/>
                  Sala para {salaSel.capacidade} pessoas, turma tem {qtdTurma} alunos matriculados.
                </span>
              )}
            </div>

            {/* Título */}
            <div className="field form-full">
              <label>Título *</label>
              <input className="input" placeholder="Ex: Aula de Inglês, Reunião de pais…"
                value={form.titulo} onChange={e => f('titulo', e.target.value)}/>
            </div>

            {/* Data */}
            <div className="field">
              <label>Data *</label>
              <input className="input" type="date" value={form.data} onChange={e => f('data', e.target.value)}/>
            </div>

            {/* Status */}
            <div className="field">
              <label>Status</label>
              <select className="select" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="confirmada">Confirmada</option>
                <option value="pendente">Pendente</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {/* Horários */}
            <div className="field">
              <label>Início *</label>
              <select className="select" value={form.hora_inicio} onChange={e => f('hora_inicio', e.target.value)}>
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Fim *</label>
              <select className="select" value={form.hora_fim} onChange={e => f('hora_fim', e.target.value)}>
                {HORARIOS.filter(h => h > form.hora_inicio).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Duração / status de conflito */}
            {duracao > 0 && (
              <div className="field form-full">
                <div style={{
                  padding: '8px 12px', borderRadius: 8, background: 'var(--accent-dim)',
                  fontSize: 12, color: 'var(--accent)', fontWeight: 600,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <Clock size={13}/>
                  Duração: {Math.floor(duracao / 60)}h{duracao % 60 > 0 ? `${duracao % 60}min` : ''}
                  {checando && <span style={{ opacity: .6, fontWeight: 400 }}>· verificando conflitos…</span>}
                  {!checando && conflitos.length === 0 && form.sala_id && (
                    <span style={{ color: '#63dcaa', fontWeight: 400 }}>· horário disponível ✓</span>
                  )}
                </div>
              </div>
            )}

            {/* Responsável */}
            <div className="field">
              <label>Responsável</label>
              <input className="input" placeholder="Nome do professor ou responsável"
                value={form.responsavel} onChange={e => f('responsavel', e.target.value)}/>
            </div>

            {/* Descrição */}
            <div className="field">
              <label>Descrição / obs</label>
              <input className="input" placeholder="Finalidade, observações…"
                value={form.descricao} onChange={e => f('descricao', e.target.value)}/>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSalvar}>
            <CheckCircle size={14}/> {editando ? 'Salvar alterações' : 'Criar reserva'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Aba: Salas ────────────────────────────────────────────────────────────────
function AbaSalas({ salas, carregarSalas, showToast }) {
  const [modalSala,  setModalSala]  = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busca,      setBusca]      = useState('')

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase()
    return salas.filter(s => s.nome.toLowerCase().includes(q) || (s.descricao || '').toLowerCase().includes(q))
  }, [salas, busca])

  async function handleSalvarSala(form) {
    const req = getReq()
    try {
      const res = modalSala?.id
        ? await window.electronAPI.rsEditarSala(modalSala.id, form, req)
        : await window.electronAPI.rsCriarSala(form, req)
      if (res?.ok) { showToast('Sala salva com sucesso', 'success'); setModalSala(null); carregarSalas() }
      else showToast(res?.erro || 'Erro ao salvar sala', 'error')
    } catch (e) { showToast('Erro: ' + e.message, 'error') }
  }

  async function handleDeletar() {
    try {
      const res = await window.electronAPI.rsDeletarSala(confirmDel.id, getReq())
      if (res?.ok) { showToast('Sala removida', 'success'); setConfirmDel(null); carregarSalas() }
      else showToast(res?.erro || 'Erro ao remover', 'error')
    } catch (e) { showToast('Erro: ' + e.message, 'error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}/>
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar sala…"
            value={busca} onChange={e => setBusca(e.target.value)}/>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalSala({})}>
          <Plus size={13}/> Nova sala
        </button>
      </div>

      {filtradas.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <DoorOpen size={40} style={{ opacity: .2, marginBottom: 12, color: 'var(--text-3)' }}/>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
            {salas.length === 0 ? 'Nenhuma sala cadastrada.' : 'Nenhum resultado.'}
          </p>
          {salas.length === 0 && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => setModalSala({})}>
              <Plus size={13}/> Cadastrar primeira sala
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtradas.map(sala => (
            <div key={sala.id} className="card" style={{
              padding: '16px 18px', opacity: sala.ativa ? 1 : 0.6,
              borderLeft: `3px solid ${sala.ativa ? 'var(--accent)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <DoorOpen size={15} style={{ color: 'var(--accent)', flexShrink: 0 }}/>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                      {sala.nome}
                    </span>
                  </div>
                  {sala.descricao && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, marginLeft: 22 }}>{sala.descricao}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => setModalSala(sala)}><Pencil size={12}/></button>
                  <button className="btn btn-danger btn-xs" onClick={() => setConfirmDel(sala)}><Trash2 size={12}/></button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
                <Users size={12} style={{ color: 'var(--text-3)' }}/>
                Capacidade: <strong style={{ color: 'var(--text-1)' }}>{sala.capacidade} pessoas</strong>
                {!sala.ativa && <span className="badge bg-gray" style={{ fontSize: 10, marginLeft: 4 }}>Inativa</span>}
              </div>

              {sala.recursos?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {sala.recursos.map(r => (
                    <span key={r} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, padding: '2px 7px', borderRadius: 5,
                      background: 'var(--bg-hover)', color: 'var(--text-3)', border: '1px solid var(--border)',
                    }}>
                      <IconeRecurso nome={r} size={9}/>{r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalSala !== null && <ModalSala sala={modalSala} onSalvar={handleSalvarSala} onClose={() => setModalSala(null)}/>}
      {confirmDel && (
        <ConfirmModal
          title="Remover Sala"
          msg={`Remover "${confirmDel.nome}"? Todas as reservas desta sala também serão excluídas.`}
          onConfirm={handleDeletar} onClose={() => setConfirmDel(null)} danger
        />
      )}
    </div>
  )
}

// ── Aba: Agenda ───────────────────────────────────────────────────────────────
function AbaAgenda({ salas, turmas, professores, alunosPorTurma, showToast }) {
  const [reservas,     setReservas]     = useState([])
  const [loading,      setLoading]      = useState(false)
  const [viewMode,     setViewMode]     = useState('semana')
  const [semana,       setSemana]       = useState(() => semanaDeData(hoje()))
  const [salaFiltro,   setSalaFiltro]   = useState('')
  const [turmaFiltro,  setTurmaFiltro]  = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [busca,        setBusca]        = useState('')
  const [modalReserva, setModalReserva] = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)

  const dias = Array.from({ length: 7 }, (_, i) => adicionarDias(semana, i))

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const filtros = { de: semana, ate: adicionarDias(semana, 6) }
      if (salaFiltro)   filtros.sala_id  = Number(salaFiltro)
      if (statusFiltro) filtros.status   = statusFiltro
      if (turmaFiltro)  filtros.turma_id = Number(turmaFiltro)
      const res = await window.electronAPI.rsListarReservas(filtros)
      setReservas(res || [])
    } catch {}
    setLoading(false)
  }, [semana, salaFiltro, statusFiltro, turmaFiltro])

  useEffect(() => { carregar() }, [carregar])

  const reservasFiltradas = useMemo(() => {
    if (!busca) return reservas
    const q = busca.toLowerCase()
    return reservas.filter(r =>
      r.titulo.toLowerCase().includes(q) ||
      (r.responsavel || '').toLowerCase().includes(q) ||
      (r.turma_nome  || '').toLowerCase().includes(q)
    )
  }, [reservas, busca])

  async function handleSalvarReserva(form) {
    try {
      const res = modalReserva?.id
        ? await window.electronAPI.rsEditarReserva(modalReserva.id, form, getReq())
        : await window.electronAPI.rsCriarReserva(form, getReq())
      if (res?.ok) { showToast('Reserva salva com sucesso', 'success'); setModalReserva(null); carregar() }
      else showToast(res?.erro || 'Erro ao salvar reserva', 'error')
    } catch (e) { showToast('Erro: ' + e.message, 'error') }
  }

  async function handleDeletar() {
    try {
      const res = await window.electronAPI.rsDeletarReserva(confirmDel.id, getReq())
      if (res?.ok) { showToast('Reserva removida', 'success'); setConfirmDel(null); carregar() }
      else showToast(res?.erro || 'Erro ao remover', 'error')
    } catch (e) { showToast('Erro: ' + e.message, 'error') }
  }

  function exportarCSV() {
    if (!reservasFiltradas.length) return
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linhas = [
      ['Sala','Turma','Data','Início','Fim','Título','Responsável','Status','Descrição'].map(q).join(','),
      ...reservasFiltradas.map(r => [
        salas.find(s => s.id === r.sala_id)?.nome || '',
        r.turma_nome || '', r.data, r.hora_inicio, r.hora_fim,
        r.titulo, r.responsavel || '', r.status, r.descricao || '',
      ].map(q).join(','))
    ]
    const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `reservas-${semana}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Vista Semanal ─────────────────────────────────────────────────────────
  function VistaSemanal() {
    const porDia = {}
    dias.forEach(d => { porDia[d] = [] })
    reservasFiltradas.forEach(r => { if (porDia[r.data]) porDia[r.data].push(r) })
    const dataHoje = hoje()

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {dias.map((dia, idx) => {
          const [,mm,dd]    = dia.split('-')
          const isHoje      = dia === dataHoje
          const reservasDia = (porDia[dia] || []).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))
          return (
            <div key={dia} style={{
              background: 'var(--bg-card)',
              border: isHoje ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', minHeight: 120,
            }}>
              <div style={{
                padding: '8px 10px',
                background: isHoje ? 'var(--accent-dim)' : 'var(--bg-hover)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, color: isHoje ? 'var(--accent)' : 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {DIAS_SEMANA[idx]}
                </span>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: isHoje ? 'var(--accent)' : 'var(--text-1)', lineHeight: 1.1 }}>
                  {dd}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{MESES_CURTOS[parseInt(mm,10)-1]}</span>
              </div>

              <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reservasDia.length === 0
                  ? <div style={{ fontSize: 10, color: 'var(--text-4)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>livre</div>
                  : reservasDia.map(r => {
                      const cfg  = COR_STATUS[r.status] || COR_STATUS.pendente
                      const sala = salas.find(s => s.id === r.sala_id)
                      const codigoTurma = r.turma_nome ? r.turma_nome.split('—').pop()?.trim() : null
                      return (
                        <div key={r.id}
                          onClick={() => setModalReserva(r)}
                          title={[r.titulo, `${r.hora_inicio}–${r.hora_fim}`, sala?.nome, r.turma_nome].filter(Boolean).join('\n')}
                          style={{
                            padding: '5px 7px', borderRadius: 6, background: cfg.bg,
                            border: `1px solid ${cfg.border}`, cursor: 'pointer',
                            fontSize: 10, transition: 'filter .1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                        >
                          <div style={{ fontWeight: 700, color: cfg.text, marginBottom: 1 }}>
                            {r.hora_inicio}–{r.hora_fim}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.titulo}
                          </div>
                          {sala && (
                            <div style={{ color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sala.nome}
                            </div>
                          )}
                          {codigoTurma && <div style={{ marginTop: 3 }}><BadgeTurma codigo={codigoTurma}/></div>}
                        </div>
                      )
                    })
                }
                <button className="btn btn-ghost btn-xs"
                  style={{ fontSize: 9, padding: '3px 0', marginTop: 2, opacity: .5, justifyContent: 'center' }}
                  onClick={() => setModalReserva({ data: dia })}>
                  <Plus size={9}/> reservar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Vista Lista ───────────────────────────────────────────────────────────
  function VistaLista() {
    return reservasFiltradas.length === 0 ? (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <Calendar size={40} style={{ opacity: .2, marginBottom: 12 }}/>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Nenhuma reserva neste período.</p>
      </div>
    ) : (
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-hover)' }}>
              {['SALA','TURMA','DATA','HORÁRIO','TÍTULO','RESPONSÁVEL','STATUS',''].map((h,i) => (
                <th key={i} style={{ padding: '10px 14px', textAlign: i === 7 ? 'right' : 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas
              .sort((a,b) => a.data.localeCompare(b.data) || a.hora_inicio.localeCompare(b.hora_inicio))
              .map((r,idx) => {
                const sala = salas.find(s => s.id === r.sala_id)
                const codigoTurma = r.turma_nome ? r.turma_nome.split('—').pop()?.trim() : null
                return (
                  <tr key={r.id}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DoorOpen size={13} style={{ color: 'var(--accent)', flexShrink: 0 }}/>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{sala?.nome || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {codigoTurma ? <BadgeTurma codigo={codigoTurma}/> : <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-2)' }}>{formatDate(r.data)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle', color: 'var(--text-3)' }}/>
                      {fmtHora(r.hora_inicio)} – {fmtHora(r.hora_fim)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{r.titulo}</div>
                      {r.descricao && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{r.descricao}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                      {r.responsavel || <span style={{ color: 'var(--text-4)' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}><BadgeStatus status={r.status}/></td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setModalReserva(r)}><Pencil size={12}/></button>
                        <button className="btn btn-danger btn-xs" onClick={() => setConfirmDel(r)}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    )
  }

  const [,smm,sdd] = semana.split('-')
  const fimSemana  = adicionarDias(semana, 6)
  const [,fmm,fdd] = fimSemana.split('-')

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Navegação semana */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 6px' }}>
          <button className="btn btn-ghost btn-xs" onClick={() => setSemana(s => adicionarDias(s, -7))}><ChevronLeft size={14}/></button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', minWidth: 110, textAlign: 'center' }}>
            {sdd}/{smm} – {fdd}/{fmm}
          </span>
          <button className="btn btn-ghost btn-xs" onClick={() => setSemana(s => adicionarDias(s, 7))}><ChevronRight size={14}/></button>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => setSemana(semanaDeData(hoje()))}>Hoje</button>

        <select className="select" style={{ fontSize: 12, height: 32, width: 150 }}
          value={salaFiltro} onChange={e => setSalaFiltro(e.target.value)}>
          <option value="">Todas as salas</option>
          {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select className="select" style={{ fontSize: 12, height: 32, width: 160 }}
          value={turmaFiltro} onChange={e => setTurmaFiltro(e.target.value)}>
          <option value="">Todas as turmas</option>
          {turmas.filter(t => t.ativa).sort((a,b) => a.codigo.localeCompare(b.codigo)).map(t => (
            <option key={t.id} value={t.id}>{t.codigo} — {t.idioma}</option>
          ))}
        </select>

        <select className="select" style={{ fontSize: 12, height: 32, width: 130 }}
          value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="confirmada">Confirmadas</option>
          <option value="pendente">Pendentes</option>
          <option value="cancelada">Canceladas</option>
        </select>

        <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}/>
          <input className="input" style={{ paddingLeft: 28, fontSize: 12, height: 32 }} placeholder="Buscar…"
            value={busca} onChange={e => setBusca(e.target.value)}/>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
          {[['semana', LayoutGrid], ['lista', List]].map(([mode, Icon]) => (
            <button key={mode} className="btn btn-ghost btn-xs"
              style={{ borderRadius: 0, padding: '6px 10px', background: viewMode === mode ? 'var(--accent-dim)' : 'none', color: viewMode === mode ? 'var(--accent)' : 'var(--text-3)' }}
              onClick={() => setViewMode(mode)}>
              <Icon size={13}/>
            </button>
          ))}
        </div>

        <button className="btn btn-secondary btn-sm" onClick={carregar}><RefreshCw size={13}/></button>
        <button className="btn btn-secondary btn-sm" onClick={exportarCSV}>
          <Download size={13}/><span style={{ marginLeft: 3, fontSize: 12 }}>CSV</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setModalReserva({})}>
          <Plus size={13}/> Nova reserva
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          <RefreshCw size={24} style={{ opacity: .4, animation: 'spin 1s linear infinite' }}/>
          <p style={{ marginTop: 10, fontSize: 13 }}>Carregando reservas…</p>
        </div>
      ) : viewMode === 'semana' ? <VistaSemanal/> : <VistaLista/>}

      {modalReserva !== null && (
        <ModalReserva
          reserva={modalReserva?.id ? modalReserva : { ...modalReserva }}
          salas={salas} turmas={turmas} professores={professores}
          alunosPorTurma={alunosPorTurma}
          onSalvar={handleSalvarReserva}
          onClose={() => setModalReserva(null)}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title="Remover Reserva"
          msg={`Remover a reserva "${confirmDel.titulo}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDeletar} onClose={() => setConfirmDel(null)} danger
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function ReservaSalas() {
  const [tab,            setTab]            = useState('agenda')
  const [salas,          setSalas]          = useState([])
  const [turmas,         setTurmas]         = useState([])
  const [professores,    setProfessores]    = useState([])
  const [alunosPorTurma, setAlunosPorTurma] = useState({})
  const [loading,        setLoading]        = useState(false)
  const [toast,          setToast]          = useState(null)

  function showToast(msg, tipo = 'success') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3200)
  }

  const carregarSalas = useCallback(async () => {
    try { setSalas(await window.electronAPI.rsListarSalas({}).catch(() => [])) } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      window.electronAPI.rsListarSalas({}).catch(() => []),
      window.electronAPI.turmasListar({}).catch(() => []),
      window.electronAPI.professoresListar({}).catch(() => []),
      window.electronAPI.alunosListar({ status: 'Ativo' }).catch(() => []),
    ]).then(([sl, tr, pr, al]) => {
      setSalas(sl || [])
      setTurmas(tr || [])
      setProfessores(pr || [])
      // Mapa turmaId → qtd alunos ativos
      const mapa = {}
      ;(al || []).forEach(a => {
        const tid = String(a.turmaId ?? a.turma_id ?? '')
        if (tid) mapa[tid] = (mapa[tid] || 0) + 1
      })
      setAlunosPorTurma(mapa)
    }).finally(() => setLoading(false))
  }, [])

  const TABS = [
    { id: 'agenda', label: 'Agenda de Reservas', icon: CalendarDays },
    { id: 'salas',  label: 'Salas e Recursos',   icon: Settings      },
  ]

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Salas cadastradas',  value: salas.length,                                  icon: DoorOpen,      color: '#5b9cf6' },
          { label: 'Salas ativas',       value: salas.filter(s => s.ativa).length,             icon: CheckCircle,   color: '#63dcaa' },
          { label: 'Turmas vinculáveis', value: turmas.filter(t => t.ativa).length,            icon: GraduationCap, color: '#a78bfa' },
          { label: 'Com recursos',       value: salas.filter(s => s.recursos?.length > 0).length, icon: Tv,         color: '#f5c542' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={17} style={{ color }}/>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                {loading ? '…' : value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => {
          const ativa = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: 13,
              fontWeight: ativa ? 600 : 400,
              color: ativa ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: ativa ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'all .15s',
            }}>
              <t.icon size={14}/>{t.label}
            </button>
          )
        })}
      </div>

      {tab === 'agenda' && (
        <AbaAgenda salas={salas} turmas={turmas} professores={professores}
          alunosPorTurma={alunosPorTurma} showToast={showToast}/>
      )}
      {tab === 'salas' && (
        <AbaSalas salas={salas} carregarSalas={carregarSalas} showToast={showToast}/>
      )}

      {toast && (
        <div className={`toast ${toast.tipo === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
