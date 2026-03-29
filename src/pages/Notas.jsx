/**
 * Notas.jsx — Ata de Resultados e Notas (v5.10)
 *
 * Lançamento de notas por turma + período.
 * Grid editável inline, cálculo automático de média/conceito,
 * exportação de ata em PDF via handler pdf:gerar existente.
 *
 * Tabela: notas (aluno_ls_id, turma_ls_id, periodo, nota_parcial,
 *                nota_final, nota_recuperacao, conceito, obs)
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  BookOpen, Download, RefreshCw, Search, ChevronDown,
  CheckCircle, AlertTriangle, FileText, Users, Award,
  TrendingUp, TrendingDown, Minus, Save, X, Info,
  GraduationCap, Printer,
} from 'lucide-react'
import { formatDate } from '../context/AppContext.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

function hoje() { return new Date().toISOString().split('T')[0] }

// Calcula conceito (A/B/C/D/E) a partir da nota final (0–10)
function calcularConceito(media) {
  if (media === null || media === undefined || media === '') return ''
  const n = Number(media)
  if (isNaN(n)) return ''
  if (n >= 9)  return 'A'
  if (n >= 7)  return 'B'
  if (n >= 5)  return 'C'
  if (n >= 3)  return 'D'
  return 'E'
}

// Cor do conceito
function corConceito(conceito) {
  return { A: '#63dcaa', B: '#5b9cf6', C: '#f5c542', D: '#f97316', E: '#f2617a' }[conceito] || 'var(--text-3)'
}

// Calcula média ponderada: se tiver recuperação, usa max(media_base, recuperacao)
function calcularMedia(parcial, final, recuperacao) {
  const p = parcial   !== '' && parcial   !== null ? Number(parcial)   : null
  const f = final     !== '' && final     !== null ? Number(final)     : null
  const r = recuperacao !== '' && recuperacao !== null ? Number(recuperacao) : null

  if (p === null && f === null) return null
  // Média simples entre parcial e final
  const vals = [p, f].filter(v => v !== null)
  const media = vals.reduce((s, v) => s + v, 0) / vals.length
  // Se tiver recuperação e ela for maior que a média, usa a recuperação (capped em 5 ou na nota)
  if (r !== null) return Math.max(media, r)
  return media
}

// Formata nota para exibição
function fmtNota(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  if (isNaN(num)) return '—'
  return num % 1 === 0 ? String(num) : num.toFixed(1)
}

const PERIODOS = ['1º Bimestre','2º Bimestre','3º Bimestre','4º Bimestre','Semestral','Anual','Mensal']

// ── Geração do HTML da ata para PDF ──────────────────────────────────────────
function gerarHTMLAta({ turma, periodo, alunos, notas, escola, dataGeracao }) {
  const rows = alunos.map(a => {
    const n = notas.find(n => String(n.aluno_ls_id) === String(a.id)) || {}
    const media = calcularMedia(n.nota_parcial, n.nota_final, n.nota_recuperacao)
    const conc  = n.conceito || calcularConceito(media)
    return { ...a, ...n, media, conc }
  })

  const aprovados   = rows.filter(r => r.media !== null && r.media >= 5).length
  const reprovados  = rows.filter(r => r.media !== null && r.media < 5).length
  const semNota     = rows.filter(r => r.media === null).length
  const mediaGeral  = rows.filter(r => r.media !== null).length > 0
    ? (rows.filter(r => r.media !== null).reduce((s, r) => s + r.media, 0) / rows.filter(r => r.media !== null).length).toFixed(1)
    : '—'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 32px; font-size: 13px; }
  .header { text-align: center; margin-bottom: 28px; border-bottom: 2px solid #111; padding-bottom: 16px; }
  .header h1 { font-size: 20px; font-weight: 800; letter-spacing: -.3px; margin-bottom: 4px; }
  .header h2 { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 4px; }
  .header p  { font-size: 12px; color: #555; }
  .meta { display: flex; gap: 32px; margin-bottom: 20px; }
  .meta-item { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #888; }
  .meta-value { font-size: 13px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #111; color: #fff; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
  td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .nota { font-weight: 700; text-align: center; }
  .conceito { font-weight: 800; font-size: 14px; text-align: center; }
  .conceito-A { color: #059669; }
  .conceito-B { color: #2563eb; }
  .conceito-C { color: #d97706; }
  .conceito-D { color: #ea580c; }
  .conceito-E { color: #dc2626; }
  .aprovado   { color: #059669; font-weight: 700; }
  .reprovado  { color: #dc2626; font-weight: 700; }
  .summary { display: flex; gap: 16px; margin-bottom: 28px; }
  .summary-card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; text-align: center; }
  .summary-num  { font-size: 22px; font-weight: 800; }
  .summary-lbl  { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; }
  .assinatura { text-align: center; min-width: 200px; }
  .assinatura-linha { border-top: 1px solid #111; margin-bottom: 6px; padding-top: 4px; font-size: 11px; color: #555; }
</style>
</head>
<body>
  <div class="header">
    <h1>${escola || 'Escola Manager'}</h1>
    <h2>Ata de Resultados — ${periodo}</h2>
    <p>Turma: ${turma?.codigo || '—'} · ${turma?.idioma || ''} · Nível: ${turma?.nivel || '—'}</p>
  </div>

  <div class="meta">
    <div class="meta-item"><span class="meta-label">Período</span><span class="meta-value">${periodo}</span></div>
    <div class="meta-item"><span class="meta-label">Turma</span><span class="meta-value">${turma?.codigo || '—'}</span></div>
    <div class="meta-item"><span class="meta-label">Idioma</span><span class="meta-value">${turma?.idioma || '—'}</span></div>
    <div class="meta-item"><span class="meta-label">Total de alunos</span><span class="meta-value">${alunos.length}</span></div>
    <div class="meta-item"><span class="meta-label">Data de emissão</span><span class="meta-value">${dataGeracao}</span></div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="summary-num" style="color:#059669">${aprovados}</div><div class="summary-lbl">Aprovados</div></div>
    <div class="summary-card"><div class="summary-num" style="color:#dc2626">${reprovados}</div><div class="summary-lbl">Reprovados</div></div>
    <div class="summary-card"><div class="summary-num" style="color:#6b7280">${semNota}</div><div class="summary-lbl">Sem nota</div></div>
    <div class="summary-card"><div class="summary-num">${mediaGeral}</div><div class="summary-lbl">Média geral</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Aluno</th>
        <th style="text-align:center">Nota Parcial</th>
        <th style="text-align:center">Nota Final</th>
        <th style="text-align:center">Recuperação</th>
        <th style="text-align:center">Média</th>
        <th style="text-align:center">Conceito</th>
        <th style="text-align:center">Situação</th>
        <th>Observação</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${r.nome}</strong></td>
          <td class="nota">${fmtNota(r.nota_parcial)}</td>
          <td class="nota">${fmtNota(r.nota_final)}</td>
          <td class="nota">${fmtNota(r.nota_recuperacao)}</td>
          <td class="nota" style="font-size:14px">${r.media !== null ? Number(r.media).toFixed(1) : '—'}</td>
          <td class="conceito conceito-${r.conc}">${r.conc || '—'}</td>
          <td style="text-align:center">
            ${r.media === null ? '<span style="color:#6b7280">—</span>'
              : r.media >= 5
                ? '<span class="aprovado">✓ Aprovado</span>'
                : '<span class="reprovado">✗ Reprovado</span>'}
          </td>
          <td style="font-size:11px;color:#555">${r.obs || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div class="assinatura">
      <div class="assinatura-linha">Coordenador(a) Pedagógico(a)</div>
    </div>
    <div class="assinatura">
      <div class="assinatura-linha">Professor(a) Responsável</div>
    </div>
    <div class="assinatura">
      <div class="assinatura-linha">Diretor(a)</div>
    </div>
  </div>
</body>
</html>`
}

// ── Célula de nota editável ───────────────────────────────────────────────────
function CelulaInput({ value, onChange, placeholder = '—', disabled = false }) {
  const [editing, setEditing] = useState(false)
  const [local,   setLocal]   = useState(value ?? '')
  const ref = useRef(null)

  useEffect(() => { setLocal(value ?? '') }, [value])

  function commit() {
    setEditing(false)
    const v = local.trim()
    if (v === '') { onChange(null); return }
    const n = Number(v)
    if (isNaN(n) || n < 0 || n > 10) { setLocal(value ?? ''); return }
    onChange(Math.round(n * 10) / 10)
  }

  if (disabled) {
    return (
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>
        {fmtNota(value)}
      </div>
    )
  }

  return editing ? (
    <input
      ref={ref}
      autoFocus
      type="number" min="0" max="10" step="0.1"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setLocal(value ?? ''); setEditing(false) } }}
      style={{
        width: '100%', border: '2px solid var(--accent)', borderRadius: 6,
        padding: '4px 6px', textAlign: 'center', fontSize: 13, fontWeight: 700,
        background: 'var(--bg-input)', color: 'var(--text-1)', outline: 'none',
      }}
    />
  ) : (
    <div
      onClick={() => setEditing(true)}
      title="Clique para editar"
      style={{
        textAlign: 'center', fontSize: 13, fontWeight: 700,
        color: value !== null && value !== '' ? 'var(--text-1)' : 'var(--text-4)',
        cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
        border: '1.5px dashed transparent',
        transition: 'all .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none' }}
    >
      {value !== null && value !== '' ? fmtNota(value) : placeholder}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Notas() {
  const [turmas,      setTurmas]      = useState([])
  const [alunos,      setAlunos]      = useState([])
  const [notas,       setNotas]       = useState([])   // notas do período atual
  const [turmaSel,    setTurmaSel]    = useState('')
  const [periodoSel,  setPeriodoSel]  = useState(PERIODOS[0])
  const [busca,       setBusca]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [salvando,    setSalvando]    = useState(false)
  const [alteracoes,  setAlteracoes]  = useState({})   // { alunoId: { nota_parcial, nota_final, ... } }
  const [toast,       setToast]       = useState(null)
  const [gerandoPDF,  setGerandoPDF]  = useState(false)
  const [escola,      setEscola]      = useState('')

  function showToast(msg, tipo = 'success') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3200)
  }

  // Carrega turmas + identidade no mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.turmasListar({}).catch(() => []),
      window.electronAPI.getIdentidade().catch(() => ({})),
    ]).then(([tr, id]) => {
      setTurmas(tr || [])
      setEscola(id?.nome_escola || 'Escola Manager')
      if (tr?.length > 0) setTurmaSel(String(tr[0].id))
    })
  }, [])

  // Carrega alunos e notas quando turma ou período muda
  const carregar = useCallback(async () => {
    if (!turmaSel) return
    setLoading(true)
    setAlteracoes({})
    try {
      const [al, nt] = await Promise.all([
        window.electronAPI.alunosListar({ turmaId: Number(turmaSel), status: 'Ativo' }).catch(() => []),
        window.electronAPI.notasListar({ turma_id: Number(turmaSel), periodo: periodoSel }).catch(() => []),
      ])
      setAlunos((al || []).sort((a, b) => a.nome.localeCompare(b.nome)))
      setNotas(nt || [])
    } catch {}
    setLoading(false)
  }, [turmaSel, periodoSel])

  useEffect(() => { carregar() }, [carregar])

  // Mescla notas salvas com alterações pendentes
  const notasEfetivas = useMemo(() => {
    const mapa = {}
    notas.forEach(n => { mapa[String(n.aluno_ls_id)] = { ...n } })
    Object.entries(alteracoes).forEach(([aid, delta]) => {
      mapa[aid] = { ...(mapa[aid] || { aluno_ls_id: Number(aid) }), ...delta }
    })
    return mapa
  }, [notas, alteracoes])

  function atualizarNota(alunoId, campo, valor) {
    const aid = String(alunoId)
    setAlteracoes(prev => ({
      ...prev,
      [aid]: { ...(prev[aid] || {}), [campo]: valor },
    }))
  }

  // Alunos filtrados pela busca
  const alunosFiltrados = useMemo(() => {
    if (!busca) return alunos
    const q = busca.toLowerCase()
    return alunos.filter(a => a.nome.toLowerCase().includes(q))
  }, [alunos, busca])

  // Estatísticas do período
  const stats = useMemo(() => {
    const rows = alunos.map(a => {
      const n    = notasEfetivas[String(a.id)] || {}
      const media = calcularMedia(n.nota_parcial, n.nota_final, n.nota_recuperacao)
      return { media }
    })
    const comNota    = rows.filter(r => r.media !== null)
    const aprovados  = comNota.filter(r => r.media >= 5).length
    const reprovados = comNota.filter(r => r.media < 5).length
    const mediaGeral = comNota.length > 0
      ? comNota.reduce((s, r) => s + r.media, 0) / comNota.length
      : null
    return { aprovados, reprovados, semNota: alunos.length - comNota.length, mediaGeral }
  }, [alunos, notasEfetivas])

  const temAlteracoes = Object.keys(alteracoes).length > 0

  // Salvar todas as alterações
  async function handleSalvar() {
    if (!temAlteracoes) return
    setSalvando(true)
    const req = getReq()
    const turma = turmas.find(t => String(t.id) === String(turmaSel))
    try {
      const promises = Object.entries(alteracoes).map(([alunoId, delta]) => {
        const aluno = alunos.find(a => String(a.id) === alunoId)
        const notaExistente = notas.find(n => String(n.aluno_ls_id) === alunoId)
        const dados = {
          aluno_ls_id:      Number(alunoId),
          aluno_nome:       aluno?.nome || '',
          turma_ls_id:      Number(turmaSel),
          turma_codigo:     turma?.codigo || '',
          periodo:          periodoSel,
          ...delta,
        }
        if (notaExistente?.id) {
          return window.electronAPI.notasEditar(notaExistente.id, dados, req)
        }
        return window.electronAPI.notasCriar(dados, req)
      })
      const resultados = await Promise.all(promises)
      const erros = resultados.filter(r => !r?.ok)
      if (erros.length > 0) {
        showToast(`${erros.length} nota(s) não salvas. Tente novamente.`, 'error')
      } else {
        showToast(`${promises.length} nota(s) salvas com sucesso`, 'success')
        setAlteracoes({})
        carregar()
      }
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message, 'error')
    }
    setSalvando(false)
  }

  // Gerar ata PDF
  async function handleGerarPDF() {
    if (!turmaSel) return
    setGerandoPDF(true)
    // Salva pendências antes de gerar
    if (temAlteracoes) await handleSalvar()

    const turma = turmas.find(t => String(t.id) === String(turmaSel))
    const html  = gerarHTMLAta({
      turma,
      periodo:      periodoSel,
      alunos,
      notas:        Object.entries(notasEfetivas).map(([aid, n]) => ({ ...n, aluno_ls_id: aid })),
      escola,
      dataGeracao:  new Date().toLocaleDateString('pt-BR'),
    })

    try {
      const res = await window.electronAPI.pdfGerar({
        html,
        titulo:      `Ata de Notas — ${turma?.codigo} — ${periodoSel}`,
        nomeArquivo: `ata-notas-${turma?.codigo || 'turma'}-${periodoSel.replace(/\s/g,'-')}.pdf`,
        pageSize:    'A4',
        landscape:   true,
      })
      if (res?.ok) showToast('PDF gerado com sucesso!', 'success')
      else if (!res?.cancelado) showToast(res?.erro || 'Erro ao gerar PDF', 'error')
    } catch (e) {
      showToast('Erro ao gerar PDF: ' + e.message, 'error')
    }
    setGerandoPDF(false)
  }

  // Exportar CSV
  function handleExportarCSV() {
    if (!alunos.length) return
    const turma = turmas.find(t => String(t.id) === String(turmaSel))
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const linhas = [
      ['#','Aluno','Nota Parcial','Nota Final','Recuperação','Média','Conceito','Situação','Observação'].map(q).join(','),
      ...alunos.map((a, i) => {
        const n    = notasEfetivas[String(a.id)] || {}
        const media = calcularMedia(n.nota_parcial, n.nota_final, n.nota_recuperacao)
        const conc  = n.conceito || calcularConceito(media)
        const sit   = media === null ? '' : media >= 5 ? 'Aprovado' : 'Reprovado'
        return [
          i + 1, a.nome,
          n.nota_parcial ?? '', n.nota_final ?? '', n.nota_recuperacao ?? '',
          media !== null ? Number(media).toFixed(1) : '',
          conc, sit, n.obs || '',
        ].map(q).join(',')
      })
    ]
    const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `notas-${turma?.codigo || 'turma'}-${periodoSel}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const turma = turmas.find(t => String(t.id) === String(turmaSel))

  return (
    <div className="fade-up">

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total de alunos', value: alunos.length,      icon: Users,       color: '#5b9cf6' },
          { label: 'Aprovados',       value: stats.aprovados,    icon: TrendingUp,  color: '#63dcaa' },
          { label: 'Reprovados',      value: stats.reprovados,   icon: TrendingDown,color: '#f2617a' },
          { label: 'Sem nota',        value: stats.semNota,      icon: Minus,       color: '#f5c542' },
          {
            label: 'Média geral',
            value: stats.mediaGeral !== null ? Number(stats.mediaGeral).toFixed(1) : '—',
            icon:  Award,
            color: stats.mediaGeral === null ? '#6b7280'
              : stats.mediaGeral >= 7 ? '#63dcaa'
              : stats.mediaGeral >= 5 ? '#f5c542'
              : '#f2617a',
          },
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

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Seletor de turma */}
        <select className="select" style={{ fontWeight: 600, height: 36, minWidth: 200 }}
          value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
          <option value="">Selecionar turma</option>
          {turmas.filter(t => t.ativa).sort((a,b) => a.codigo.localeCompare(b.codigo)).map(t => (
            <option key={t.id} value={t.id}>{t.codigo} — {t.idioma}</option>
          ))}
        </select>

        {/* Seletor de período */}
        <select className="select" style={{ height: 36, minWidth: 160 }}
          value={periodoSel} onChange={e => setPeriodoSel(e.target.value)}>
          {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }}/>
          <input className="input" style={{ paddingLeft: 30, height: 36 }} placeholder="Buscar aluno…"
            value={busca} onChange={e => setBusca(e.target.value)}/>
        </div>

        {/* Ações */}
        <button className="btn btn-secondary btn-sm" onClick={carregar} title="Atualizar">
          <RefreshCw size={13}/>
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleExportarCSV} title="Exportar CSV">
          <Download size={13}/><span style={{ fontSize: 12, marginLeft: 3 }}>CSV</span>
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleGerarPDF} disabled={gerandoPDF || !turmaSel} title="Gerar Ata PDF">
          <Printer size={13}/>
          <span style={{ fontSize: 12, marginLeft: 3 }}>{gerandoPDF ? 'Gerando…' : 'Ata PDF'}</span>
        </button>

        {/* Salvar alterações */}
        {temAlteracoes && (
          <button className="btn btn-primary btn-sm" onClick={handleSalvar} disabled={salvando}>
            <Save size={13}/>
            <span style={{ fontSize: 12, marginLeft: 3 }}>
              {salvando ? 'Salvando…' : `Salvar (${Object.keys(alteracoes).length})`}
            </span>
          </button>
        )}
      </div>

      {/* ── Aviso de alterações pendentes ── */}
      {temAlteracoes && (
        <div className="alert alert-info" style={{ marginBottom: 14 }}>
          <Info size={14}/>
          Você tem <strong>{Object.keys(alteracoes).length}</strong> nota(s) alterada(s) não salvas. Clique em "Salvar" para confirmar.
        </div>
      )}

      {/* ── Tabela de notas ── */}
      {!turmaSel ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <GraduationCap size={40} style={{ opacity: .2, marginBottom: 12, color: 'var(--text-3)' }}/>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Selecione uma turma para lançar as notas.</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          <RefreshCw size={24} style={{ opacity: .4, animation: 'spin 1s linear infinite' }}/>
          <p style={{ marginTop: 10, fontSize: 13 }}>Carregando…</p>
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Users size={40} style={{ opacity: .2, marginBottom: 12 }}/>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
            {alunos.length === 0 ? 'Nenhum aluno ativo nesta turma.' : 'Nenhum resultado para a busca.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>

          {/* Header da tabela */}
          <div style={{
            padding: '10px 18px',
            background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={14} style={{ color: 'var(--accent)' }}/>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {turma?.codigo} — {turma?.idioma}
              </span>
              <span className="badge bg-blue">{periodoSel}</span>
              <span className="badge bg-gray">{alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Clique em qualquer nota para editar · 0 a 10
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 32 }}>#</th>
                <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>ALUNO</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 110 }}>NOTA PARCIAL</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 110 }}>NOTA FINAL</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 110 }}>RECUPERAÇÃO</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 90 }}>MÉDIA</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 80 }}>CONCEITO</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, width: 100 }}>SITUAÇÃO</th>
                <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>OBSERVAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno, idx) => {
                const n      = notasEfetivas[String(aluno.id)] || {}
                const media  = calcularMedia(n.nota_parcial, n.nota_final, n.nota_recuperacao)
                const conc   = n.conceito || calcularConceito(media)
                const corConc = corConceito(conc)
                const pendente = !!alteracoes[String(aluno.id)]

                return (
                  <tr key={aluno.id}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: pendente ? 'var(--accent-dim)' : 'transparent',
                      transition: 'background .1s',
                    }}
                  >
                    {/* # */}
                    <td style={{ padding: '8px 18px', fontSize: 12, color: 'var(--text-3)' }}>
                      {idx + 1}
                      {pendente && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>●</span>}
                    </td>

                    {/* Aluno */}
                    <td style={{ padding: '8px 18px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{aluno.nome}</div>
                    </td>

                    {/* Nota Parcial */}
                    <td style={{ padding: '6px 14px' }}>
                      <CelulaInput
                        value={n.nota_parcial ?? null}
                        placeholder="—"
                        onChange={v => atualizarNota(aluno.id, 'nota_parcial', v)}
                      />
                    </td>

                    {/* Nota Final */}
                    <td style={{ padding: '6px 14px' }}>
                      <CelulaInput
                        value={n.nota_final ?? null}
                        placeholder="—"
                        onChange={v => atualizarNota(aluno.id, 'nota_final', v)}
                      />
                    </td>

                    {/* Recuperação */}
                    <td style={{ padding: '6px 14px' }}>
                      <CelulaInput
                        value={n.nota_recuperacao ?? null}
                        placeholder="—"
                        onChange={v => atualizarNota(aluno.id, 'nota_recuperacao', v)}
                      />
                    </td>

                    {/* Média — calculada automaticamente */}
                    <td style={{ padding: '6px 14px', textAlign: 'center' }}>
                      <div style={{
                        fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800,
                        color: media === null ? 'var(--text-4)'
                          : media >= 7 ? '#63dcaa'
                          : media >= 5 ? '#f5c542'
                          : '#f2617a',
                      }}>
                        {media !== null ? Number(media).toFixed(1) : '—'}
                      </div>
                    </td>

                    {/* Conceito */}
                    <td style={{ padding: '6px 14px', textAlign: 'center' }}>
                      {conc ? (
                        <span style={{
                          fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 900,
                          color: corConc,
                          background: corConc + '18',
                          border: `1.5px solid ${corConc}40`,
                          borderRadius: 6, padding: '2px 10px',
                          display: 'inline-block',
                        }}>{conc}</span>
                      ) : <span style={{ color: 'var(--text-4)', fontSize: 13 }}>—</span>}
                    </td>

                    {/* Situação */}
                    <td style={{ padding: '6px 14px', textAlign: 'center' }}>
                      {media === null
                        ? <span style={{ fontSize: 11, color: 'var(--text-4)' }}>—</span>
                        : media >= 5
                          ? <span style={{ fontSize: 11, fontWeight: 700, color: '#63dcaa', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                              <CheckCircle size={12}/> Aprovado
                            </span>
                          : <span style={{ fontSize: 11, fontWeight: 700, color: '#f2617a', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                              <AlertTriangle size={12}/> Reprovado
                            </span>
                      }
                    </td>

                    {/* Observação */}
                    <td style={{ padding: '6px 18px' }}>
                      <input
                        className="input"
                        style={{ fontSize: 11, height: 30, padding: '4px 8px' }}
                        placeholder="Observação…"
                        value={n.obs || ''}
                        onChange={e => atualizarNota(aluno.id, 'obs', e.target.value)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Rodapé com resumo */}
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-hover)',
            display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text-3)',
          }}>
            <span><strong style={{ color: 'var(--text-1)' }}>{alunos.length}</strong> aluno{alunos.length !== 1 ? 's' : ''}</span>
            <span>Aprovados: <strong style={{ color: '#63dcaa' }}>{stats.aprovados}</strong></span>
            <span>Reprovados: <strong style={{ color: '#f2617a' }}>{stats.reprovados}</strong></span>
            <span>Sem nota: <strong style={{ color: 'var(--text-2)' }}>{stats.semNota}</strong></span>
            {stats.mediaGeral !== null && (
              <span style={{ marginLeft: 'auto' }}>
                Média geral: <strong style={{
                  fontFamily: "'Syne',sans-serif", fontSize: 14,
                  color: stats.mediaGeral >= 7 ? '#63dcaa' : stats.mediaGeral >= 5 ? '#f5c542' : '#f2617a',
                }}>{Number(stats.mediaGeral).toFixed(1)}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.tipo === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
