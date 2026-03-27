/**
 * Certificados.jsx — Emissão e Histórico de Certificados (v5.12)
 *
 * Funcionalidades:
 *  - Seleciona turma → lista alunos ativos com checkboxes
 *  - Painel de template: texto livre, carga horária, data de conclusão, 2 linhas de assinatura
 *  - Preview do certificado (HTML renderizado inline)
 *  - Geração individual (PDF por aluno)
 *  - Geração em lote (todos os alunos selecionados num único PDF multi-página)
 *  - Histórico de certificados emitidos com filtros e exclusão
 *
 * PDF gerado via handler pdf:gerar existente (Electron printToPDF).
 * Layout: A4 paisagem com borda dupla, nome em destaque, logo e assinatura.
 *
 * Rota: /cursos/certificados
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Award, Users, RefreshCw, Search, X, Printer, Eye,
  CheckSquare, Square, ChevronDown, ChevronUp, Trash2,
  FileText, History, Settings, Download, AlertTriangle,
} from 'lucide-react'
import { useApp, formatDate } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

function hoje() { return new Date().toISOString().split('T')[0] }

// ── Gerador do HTML do certificado ───────────────────────────────────────────
function gerarHTMLCertificado({ alunoNome, escolaNome, logoBase64, cursoNome, turmaCodigo, cargaHoraria, dataConclusao, textoLivre, assinatura1, assinatura2, localData }) {
  const logoTag = logoBase64
    ? `<img class="logo" src="${logoBase64}" alt="Logo"/>`
    : `<div class="logo-placeholder">${escolaNome.charAt(0)}</div>`

  const textoFinal = (textoLivre || 'concluiu com êxito o curso de [curso], demonstrando dedicação, empenho e comprometimento com o aprendizado.')
    .replace('[curso]', cursoNome || turmaCodigo || 'idiomas')
    .replace('[turma]', turmaCodigo || cursoNome || '')
    .replace('[aluno]', alunoNome)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:297mm;height:210mm;background:#fff;font-family:'Lato',Georgia,serif}
  .page{
    width:297mm;height:210mm;padding:0;
    display:flex;align-items:stretch;justify-content:stretch;
  }
  .cert{
    flex:1;margin:8mm;
    border:5px solid #1a3a5c;
    position:relative;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:10px;padding:14mm 22mm 28mm;
    background:#fff;
  }
  .cert::before{
    content:'';position:absolute;inset:6px;
    border:1.5px solid #c9a44a;pointer-events:none;
  }
  .ornamento-topo,.ornamento-base{
    position:absolute;left:50%;transform:translateX(-50%);
    font-size:18px;color:#c9a44a;letter-spacing:8px;opacity:.7;
  }
  .ornamento-topo{top:12px}
  .ornamento-base{bottom:12px}
  .logo{max-height:60px;max-width:180px;object-fit:contain}
  .logo-placeholder{
    width:60px;height:60px;border-radius:50%;
    background:#1a3a5c;color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-family:'Playfair Display',serif;font-size:28px;font-weight:700;
  }
  .escola-nome{
    font-family:'Playfair Display',serif;font-size:18px;font-weight:700;
    color:#1a3a5c;text-align:center;letter-spacing:.5px;margin-top:2px;
  }
  .divisor{
    width:60px;height:2px;background:linear-gradient(90deg,transparent,#c9a44a,transparent);
    margin:2px 0;
  }
  .titulo-cert{
    font-size:10px;font-weight:300;letter-spacing:5px;
    text-transform:uppercase;color:#888;
  }
  .certifica-txt{font-size:12px;color:#555;margin-top:4px}
  .aluno-nome{
    font-family:'Playfair Display',serif;font-size:32px;font-weight:700;
    color:#1a3a5c;text-align:center;line-height:1.1;
    border-bottom:2px solid #c9a44a;padding-bottom:6px;
    margin:2px 0 4px;
  }
  .texto-livre{
    font-size:11.5px;color:#444;text-align:center;
    line-height:1.65;max-width:420px;
  }
  .detalhes{
    display:flex;gap:32px;margin-top:4px;flex-wrap:wrap;justify-content:center;
  }
  .detalhe{font-size:11px;color:#555}
  .detalhe strong{color:#1a3a5c;font-weight:700}
  .rodape{
    position:absolute;bottom:16mm;
    width:calc(100% - 44mm);
    display:flex;justify-content:space-between;align-items:flex-end;
  }
  .assinatura{display:flex;flex-direction:column;align-items:center;gap:2px}
  .assinatura-linha{
    width:150px;border-top:1px solid #1a3a5c;
    padding-top:5px;font-size:10px;color:#555;text-align:center;
  }
  .data-local{font-size:10px;color:#666;text-align:center;line-height:1.5}
</style>
</head>
<body>
<div class="page">
<div class="cert">
  <div class="ornamento-topo">✦ ✦ ✦</div>
  ${logoTag}
  <div class="escola-nome">${escolaNome}</div>
  <div class="divisor"></div>
  <div class="titulo-cert">Certificado de Conclusão</div>
  <div class="certifica-txt">Certificamos que</div>
  <div class="aluno-nome">${alunoNome}</div>
  <div class="texto-livre">${textoFinal}</div>
  <div class="detalhes">
    ${cursoNome || turmaCodigo ? `<div class="detalhe"><strong>Curso / Turma:</strong> ${cursoNome || turmaCodigo}</div>` : ''}
    ${cargaHoraria ? `<div class="detalhe"><strong>Carga Horária:</strong> ${cargaHoraria}h</div>` : ''}
    ${dataConclusao ? `<div class="detalhe"><strong>Conclusão:</strong> ${dataConclusao}</div>` : ''}
  </div>
  <div class="rodape">
    <div class="assinatura">
      <div class="assinatura-linha">${assinatura1 || 'Diretor(a)'}</div>
    </div>
    <div class="data-local">${localData || ''}</div>
    ${assinatura2 ? `<div class="assinatura"><div class="assinatura-linha">${assinatura2}</div></div>` : '<div></div>'}
  </div>
  <div class="ornamento-base">✦ ✦ ✦</div>
</div>
</div>
</body>
</html>`
}

// HTML multi-página para geração em lote
function gerarHTMLLote(alunos, params) {
  const paginas = alunos.map((nome, i) => {
    const inner = gerarHTMLCertificado({ ...params, alunoNome: nome })
      .replace(/^[\s\S]*?<body[^>]*>/i, '')
      .replace(/<\/body>[\s\S]*$/i, '')
    const pb = i < alunos.length - 1 ? 'style="page-break-after:always"' : ''
    return `<div ${pb}>${inner}</div>`
  })
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:#fff;font-family:'Lato',Georgia,serif}
</style>
</head><body>${paginas.join('\n')}</body></html>`
}

// ── Modal de Preview ──────────────────────────────────────────────────────────
function ModalPreview({ html, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'var(--bg-card)', borderRadius:12, width:'min(900px,96vw)', maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontWeight:600, fontSize:14, color:'var(--text-1)' }}>Preview do Certificado</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:16, background:'#e5e7eb' }}>
          <div style={{ background:'#fff', boxShadow:'0 4px 24px rgba(0,0,0,.18)', borderRadius:4, overflow:'hidden' }}>
            <iframe
              srcDoc={html}
              title="Preview certificado"
              style={{ width:'100%', height:'480px', border:'none', display:'block' }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Certificados() {
  const { alunos: todosAlunos, turmas, professores } = useApp()

  const [tab,          setTab]          = useState('emitir')   // 'emitir' | 'historico'
  const [turmaSel,     setTurmaSel]     = useState('')
  const [busca,        setBusca]        = useState('')
  const [selecionados, setSelecionados] = useState(new Set())
  const [historico,    setHistorico]    = useState([])
  const [resumo,       setResumo]       = useState(null)
  const [loadHist,     setLoadHist]     = useState(false)
  const [gerando,      setGerando]      = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [preview,      setPreview]      = useState(null)  // html string
  const [identidade,   setIdentidade]   = useState(null)
  const [toast,        setToast]        = useState('')
  const [filtHist,     setFiltHist]     = useState({ turmaLsId:'', de:'', ate:'' })

  // Template
  const [tpl, setTpl] = useState({
    textoLivre:    '',
    cargaHoraria:  '',
    dataConclusao: hoje(),
    assinatura1:   'Diretor(a)',
    assinatura2:   '',
    localData:     '',
  })

  function tplF(k, v) { setTpl(x => ({ ...x, [k]: v })) }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  // Carrega identidade da escola (logo + nome)
  useEffect(() => {
    window.electronAPI?.getIdentidade().then(r => setIdentidade(r)).catch(() => {})
  }, [])

  const carregarHistorico = useCallback(async () => {
    setLoadHist(true)
    const [lista, res] = await Promise.all([
      window.electronAPI?.certListar({
        turmaLsId: filtHist.turmaLsId || undefined,
        de:        filtHist.de        || undefined,
        ate:       filtHist.ate       || undefined,
      }).catch(() => []),
      window.electronAPI?.certResumo().catch(() => null),
    ])
    setHistorico(lista || [])
    setResumo(res || null)
    setLoadHist(false)
  }, [filtHist])

  useEffect(() => { carregarHistorico() }, [carregarHistorico])

  // Alunos da turma selecionada
  const turma = turmas.find(t => String(t.id) === String(turmaSel))
  const alunosDaTurma = useMemo(() => {
    if (!turmaSel) return []
    return todosAlunos.filter(a => String(a.turmaId) === String(turmaSel) && a.status === 'Ativo')
  }, [todosAlunos, turmaSel])

  const alunosFiltrados = useMemo(() => {
    if (!busca) return alunosDaTurma
    return alunosDaTurma.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()))
  }, [alunosDaTurma, busca])

  function toggleAluno(id) {
    setSelecionados(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodos() {
    if (selecionados.size === alunosFiltrados.length) setSelecionados(new Set())
    else setSelecionados(new Set(alunosFiltrados.map(a => a.id)))
  }

  // Parâmetros comuns do template
  function getParams() {
    return {
      escolaNome:    identidade?.nome_escola || 'Escola Manager',
      logoBase64:    identidade?.logo_base64 || '',
      cursoNome:     turma?.nome || turma?.codigo || '',
      turmaCodigo:   turma?.codigo || '',
      cargaHoraria:  tpl.cargaHoraria,
      dataConclusao: tpl.dataConclusao ? formatDate(tpl.dataConclusao) : '',
      textoLivre:    tpl.textoLivre,
      assinatura1:   tpl.assinatura1,
      assinatura2:   tpl.assinatura2,
      localData:     tpl.localData,
    }
  }

  // Preview (primeiro selecionado ou primeiro da lista)
  function abrirPreview() {
    const aluno = selecionados.size > 0
      ? alunosDaTurma.find(a => selecionados.has(a.id))
      : alunosDaTurma[0]
    if (!aluno) return
    setPreview(gerarHTMLCertificado({ ...getParams(), alunoNome: aluno.nome }))
  }

  // Gerar certificado individual
  async function gerarIndividual(aluno) {
    setGerando(true)
    const html = gerarHTMLCertificado({ ...getParams(), alunoNome: aluno.nome })
    const api  = window.electronAPI
    const req  = getReq()
    try {
      const res = await api?.pdfGerar({
        html,
        titulo:      `Certificado — ${aluno.nome}`,
        nomeArquivo: `certificado-${aluno.nome.replace(/\s+/g,'-').toLowerCase()}.pdf`,
        pageSize:    'A4',
        landscape:   true,
      })
      if (res?.ok) {
        await api?.certCriar({
          alunoLsId:    aluno.id,
          alunoNome:    aluno.nome,
          turmaLsId:    Number(turmaSel),
          turmaCodigo:  turma?.codigo || '',
          cursoNome:    turma?.nome   || '',
          dataEmissao:  hoje(),
          dataConclusao: tpl.dataConclusao,
          cargaHoraria:  Number(tpl.cargaHoraria || 0),
          textoLivre:   tpl.textoLivre,
          assinatura1:  tpl.assinatura1,
          assinatura2:  tpl.assinatura2,
          localData:    tpl.localData,
        }, req)
        showToast(`Certificado de ${aluno.nome} gerado!`)
        carregarHistorico()
      } else if (!res?.cancelado) showToast(res?.erro || 'Erro ao gerar PDF')
    } catch (e) { showToast('Erro: ' + e.message) }
    setGerando(false)
  }

  // Geração em lote
  async function gerarLote() {
    const sels = alunosDaTurma.filter(a => selecionados.has(a.id))
    if (!sels.length) return
    setGerando(true)
    const params = getParams()
    const html   = gerarHTMLLote(sels.map(a => a.nome), params)
    const api    = window.electronAPI
    const req    = getReq()
    try {
      const res = await api?.pdfGerar({
        html,
        titulo:      `Certificados — ${turma?.codigo} (${sels.length} alunos)`,
        nomeArquivo: `certificados-${(turma?.codigo || 'turma').replace(/\s+/g,'-').toLowerCase()}.pdf`,
        pageSize:    'A4',
        landscape:   true,
      })
      if (res?.ok) {
        // Registra todos no histórico
        await Promise.all(sels.map(a => api?.certCriar({
          alunoLsId:    a.id,
          alunoNome:    a.nome,
          turmaLsId:    Number(turmaSel),
          turmaCodigo:  turma?.codigo || '',
          cursoNome:    turma?.nome   || '',
          dataEmissao:  hoje(),
          dataConclusao: tpl.dataConclusao,
          cargaHoraria:  Number(tpl.cargaHoraria || 0),
          textoLivre:   tpl.textoLivre,
          assinatura1:  tpl.assinatura1,
          assinatura2:  tpl.assinatura2,
          localData:    tpl.localData,
        }, req)))
        showToast(`${sels.length} certificado(s) gerado(s)!`)
        setSelecionados(new Set())
        carregarHistorico()
      } else if (!res?.cancelado) showToast(res?.erro || 'Erro ao gerar PDF')
    } catch (e) { showToast('Erro: ' + e.message) }
    setGerando(false)
  }

  async function deletarCert() {
    const res = await window.electronAPI?.certDeletar(confirmDel.id, getReq())
    setConfirmDel(null)
    if (res?.ok) { showToast('Registro excluído.'); carregarHistorico() }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ maxWidth:1100, margin:'0 auto' }}>

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 18px', fontSize:13, color:'var(--text-1)', boxShadow:'0 4px 16px rgba(0,0,0,.3)', zIndex:9999, pointerEvents:'none' }}>{toast}</div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total emitidos',   valor: resumo?.total   ?? 0, icon:<Award size={18}/>,   cor:'var(--accent)' },
          { label:'Turmas atendidas', valor: resumo?.turmas  ?? 0, icon:<Users size={18}/>,   cor:'var(--blue)'   },
          { label:'Última emissão',   valor: resumo?.ultimaEmissao ? formatDate(resumo.ultimaEmissao) : '—', icon:<FileText size={18}/>, cor:'var(--yellow)', isStr:true },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`color-mix(in srgb, ${k.cor} 15%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', color:k.cor, flexShrink:0 }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'var(--text-1)', lineHeight:1 }}>{k.valor}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[
          { id:'emitir',    label:'Emitir Certificados', icon:<Printer size={13}/> },
          { id:'historico', label:'Histórico',            icon:<History size={13}/> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'9px 16px',
              fontSize:12, fontWeight:600, cursor:'pointer',
              background:'transparent', border:'none',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-2)',
              transition:'all .15s', marginBottom:-1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA EMITIR ── */}
      {tab === 'emitir' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>

          {/* Coluna esquerda — seleção de alunos */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Select turma */}
            <div className="card" style={{ padding:'14px 16px' }}>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.4, display:'block', marginBottom:6 }}>Turma</label>
              <select className="input" value={turmaSel} onChange={e => { setTurmaSel(e.target.value); setSelecionados(new Set()); setBusca('') }}>
                <option value="">— Selecione uma turma —</option>
                {turmas.filter(t => t.status !== 'Encerrada' || true).map(t => (
                  <option key={t.id} value={t.id}>{t.codigo}{t.nome ? ` — ${t.nome}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Lista de alunos */}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ position:'relative', flex:1 }}>
                  <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
                  <input className="input" style={{ paddingLeft:28, fontSize:12 }} placeholder="Buscar aluno..." value={busca} onChange={e => setBusca(e.target.value)} disabled={!turmaSel}/>
                </div>
                {turmaSel && alunosFiltrados.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={toggleTodos} style={{ flexShrink:0, fontSize:11 }}>
                    {selecionados.size === alunosFiltrados.length ? <CheckSquare size={12}/> : <Square size={12}/>}
                    {selecionados.size === alunosFiltrados.length ? ' Desmarcar' : ' Todos'}
                  </button>
                )}
              </div>

              {!turmaSel ? (
                <div className="empty" style={{ padding:36 }}>
                  <Award size={36} style={{ opacity:.2 }}/>
                  <p style={{ fontSize:13 }}>Selecione uma turma para listar os alunos.</p>
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="empty" style={{ padding:36 }}>
                  <Users size={36} style={{ opacity:.2 }}/>
                  <p style={{ fontSize:13 }}>Nenhum aluno ativo nesta turma.</p>
                </div>
              ) : (
                <div style={{ maxHeight:360, overflowY:'auto' }}>
                  {alunosFiltrados.map(a => {
                    const sel = selecionados.has(a.id)
                    return (
                      <div
                        key={a.id}
                        onClick={() => toggleAluno(a.id)}
                        style={{
                          display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                          borderBottom:'1px solid var(--border)', cursor:'pointer',
                          background: sel ? 'var(--accent-dim)' : 'transparent',
                          transition:'background .12s',
                        }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ color: sel ? 'var(--accent)' : 'var(--text-3)', flexShrink:0 }}>
                          {sel ? <CheckSquare size={16}/> : <Square size={16}/>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color: sel ? 'var(--accent)' : 'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nome}</div>
                          {a.email && <div style={{ fontSize:11, color:'var(--text-3)' }}>{a.email}</div>}
                        </div>
                        <button
                          className="btn btn-secondary btn-xs"
                          title="Gerar certificado individual"
                          onClick={e => { e.stopPropagation(); gerarIndividual(a) }}
                          disabled={gerando}
                          style={{ flexShrink:0 }}
                        >
                          <Printer size={11}/>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Rodapé da lista */}
              {selecionados.size > 0 && (
                <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'var(--text-2)', flex:1 }}>{selecionados.size} aluno(s) selecionado(s)</span>
                  <button className="btn btn-secondary btn-sm" onClick={abrirPreview} disabled={!turmaSel}>
                    <Eye size={13}/> Preview
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={gerarLote} disabled={gerando || !turmaSel}>
                    {gerando
                      ? <RefreshCw size={13} style={{ animation:'spin .7s linear infinite' }}/>
                      : <Download size={13}/>
                    }
                    {gerando ? ' Gerando...' : ` Gerar ${selecionados.size} PDF(s)`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita — configurações do template */}
          <div className="card" style={{ padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <Settings size={13} style={{ color:'var(--text-3)' }}/>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.4 }}>Configurações do Certificado</span>
            </div>

            <div className="field">
              <label style={{ fontSize:11 }}>Data de conclusão</label>
              <input className="input" type="date" value={tpl.dataConclusao} onChange={e => tplF('dataConclusao', e.target.value)}/>
            </div>

            <div className="field">
              <label style={{ fontSize:11 }}>Carga horária (horas)</label>
              <input className="input" type="number" min="0" placeholder="Ex: 120" value={tpl.cargaHoraria} onChange={e => tplF('cargaHoraria', e.target.value)}/>
            </div>

            <div className="field">
              <label style={{ fontSize:11 }}>Texto do certificado</label>
              <textarea
                className="textarea" style={{ minHeight:80, fontSize:11 }}
                placeholder="concluiu com êxito o curso de [curso]..."
                value={tpl.textoLivre}
                onChange={e => tplF('textoLivre', e.target.value)}
              />
              <span style={{ fontSize:10, color:'var(--text-3)', marginTop:3, display:'block' }}>
                Use [curso] ou [aluno] como variáveis
              </span>
            </div>

            <div className="field">
              <label style={{ fontSize:11 }}>1ª linha de assinatura</label>
              <input className="input" placeholder="Diretor(a)" value={tpl.assinatura1} onChange={e => tplF('assinatura1', e.target.value)}/>
            </div>

            <div className="field">
              <label style={{ fontSize:11 }}>2ª linha de assinatura (opcional)</label>
              <input className="input" placeholder="Coordenador(a) Pedagógico(a)" value={tpl.assinatura2} onChange={e => tplF('assinatura2', e.target.value)}/>
            </div>

            <div className="field">
              <label style={{ fontSize:11 }}>Local e data (rodapé)</label>
              <input className="input" placeholder={`São Paulo, ${new Date().toLocaleDateString('pt-BR')}`} value={tpl.localData} onChange={e => tplF('localData', e.target.value)}/>
            </div>

            {turmaSel && alunosDaTurma.length > 0 && (
              <button className="btn btn-secondary" style={{ marginTop:4, fontSize:12 }} onClick={abrirPreview}>
                <Eye size={13}/> Visualizar Preview
              </button>
            )}

            {identidade?.nome_escola && (
              <div style={{ fontSize:10, color:'var(--text-3)', textAlign:'center', marginTop:4 }}>
                Escola: <strong style={{ color:'var(--text-2)' }}>{identidade.nome_escola}</strong>
                {identidade.logo_base64 && <span> · Logo configurada ✓</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {tab === 'historico' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Filtros */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <select className="input" style={{ width:'auto' }} value={filtHist.turmaLsId} onChange={e => setFiltHist(f => ({ ...f, turmaLsId: e.target.value }))}>
              <option value="">Todas as turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo}</option>)}
            </select>
            <input className="input" type="date" style={{ width:'auto' }} value={filtHist.de} onChange={e => setFiltHist(f => ({ ...f, de: e.target.value }))} title="De"/>
            <input className="input" type="date" style={{ width:'auto' }} value={filtHist.ate} onChange={e => setFiltHist(f => ({ ...f, ate: e.target.value }))} title="Até"/>
            <button className="btn btn-secondary btn-sm" onClick={carregarHistorico}>
              <RefreshCw size={13} style={loadHist ? { animation:'spin .7s linear infinite' } : {}}/>
            </button>
          </div>

          {/* Tabela */}
          <div className="card" style={{ overflow:'hidden', padding:0 }}>
            {loadHist ? (
              <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>
                <RefreshCw size={28} style={{ animation:'spin .7s linear infinite' }}/>
              </div>
            ) : historico.length === 0 ? (
              <div className="empty" style={{ padding:48 }}>
                <Award size={40} style={{ opacity:.2 }}/>
                <p>Nenhum certificado emitido ainda.</p>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['Aluno', 'Turma / Curso', 'Conclusão', 'Emissão', 'Emitido por', ''].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historico.map(c => (
                    <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 14px', fontWeight:500, fontSize:13, color:'var(--text-1)' }}>{c.aluno_nome}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>
                        <div>{c.turma_codigo}</div>
                        {c.curso_nome && <div style={{ fontSize:11, color:'var(--text-3)' }}>{c.curso_nome}</div>}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{c.data_conclusao ? formatDate(c.data_conclusao) : '—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{formatDate(c.data_emissao)}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-3)' }}>{c.emitido_por}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <button className="btn btn-danger btn-xs" onClick={() => setConfirmDel(c)} title="Excluir registro">
                          <Trash2 size={12}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modais */}
      {preview && <ModalPreview html={preview} onClose={() => setPreview(null)}/>}

      {confirmDel && (
        <ConfirmModal
          danger
          title="Excluir registro"
          msg={`Remover o registro do certificado de "${confirmDel.aluno_nome}"? Isso não apaga o PDF já gerado.`}
          onConfirm={deletarCert}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
