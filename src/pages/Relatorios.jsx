import React, { useState, useRef, useEffect } from 'react'
import PizZip from 'pizzip'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip, Filler, Legend
} from 'chart.js'
import {
  FileText, Download, TrendingUp, TrendingDown, Users,
  DollarSign, BookOpen, BarChart2, ChevronDown, FileSpreadsheet,
  FileJson, FileDown, RefreshCw, ChevronRight, UserCheck
} from 'lucide-react'
import { useApp, formatBRL, formatDate, mesLabel, mesAtualDinamico } from '../context/AppContext.jsx'
import { gerarHTMLRelatorioFinanceiro, gerarHTMLRelatorioAlunos, gerarPDF } from '../utils/pdfUtils.js'

Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Filler, Legend)

// ── Componente de menu de exportação ─────────────────────────────────────────
function ExportMenu({ itens }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClick(action) {
    action()
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ gap: 6 }}
      >
        <Download size={13}/>
        Exportar
        <ChevronDown size={12} style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 280, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: 'var(--shadow-lg)', zIndex: 100,
          overflow: 'hidden', animation: 'fadeUp .15s ease',
        }}>
          <div style={{ padding: '8px 12px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--text-3)' }}>
            Exportar esta aba
          </div>
          {itens.map((item, i) => (
            <button
              key={i}
              onClick={() => handleClick(item.action)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '9px 12px', background: 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: item.label.includes('JSON') ? 'var(--pur-dim)' : 'var(--accent-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.label.includes('JSON')
                  ? <FileJson size={13} style={{ color: 'var(--purple)' }}/>
                  : <FileSpreadsheet size={13} style={{ color: 'var(--accent)' }}/>
                }
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const MESES_7 = Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-(6-i)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
const CORES   = ['#63dcaa','#5b9cf6','#f5c542','#f2617a','#a78bfa','#f97316','#14b8a6']

export default function Relatorios() {
  const { alunos, turmas, professores, pagamentos, tema, exportJSON, exportCSV } = useApp()
  const [tab, setTab] = useState('financeiro')
  const [expandido, setExpandido] = useState(null) // id do aluno expandido na aba rematrículas

  const isDark = tema === 'dark'
  const gc     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const tc     = isDark ? '#b0bcd4' : '#374151'
  const tbg    = isDark ? '#13161f' : '#f8f9fc'
  const tbrd   = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const ttit   = isDark ? '#edf0f9' : '#111827'
  const tbody  = isDark ? '#b0bcd4' : '#374151'

  const baseTooltip = { backgroundColor:tbg, borderColor:tbrd, borderWidth:1, titleColor:ttit, bodyColor:tbody, padding:12 }

  // ── FINANCEIRO ──
  const receitaMensal = MESES_7.map(m =>
    pagamentos.filter(p=>p.mes===m&&p.status==='Pago').reduce((s,p)=>s+p.valor,0)
  )
  const inadMensal = MESES_7.map(m =>
    pagamentos.filter(p=>p.mes===m&&p.status==='Atrasado').length
  )
  const totalRecebido = receitaMensal.reduce((s,v)=>s+v,0)
  const mediaRecebido = Math.round(totalRecebido / MESES_7.length)
  const melhorMes     = MESES_7[receitaMensal.indexOf(Math.max(...receitaMensal))]

  const receitaBarData = {
    labels: MESES_7.map(mesLabel),
    datasets:[
      {
        label:'Receita',
        data: receitaMensal,
        backgroundColor: receitaMensal.map((_,i)=> i===receitaMensal.length-1 ? 'rgba(99,220,170,0.85)':'rgba(99,220,170,0.3)'),
        borderRadius:6, borderSkipped:false,
      }
    ]
  }
  const receitaBarOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip, callbacks:{label:ctx=>` ${formatBRL(ctx.parsed.y)}`}} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11},callback:v=>`R$${(v/1000).toFixed(0)}k`}, border:{display:false} }
    }
  }

  const inadLineData = {
    labels: MESES_7.map(mesLabel),
    datasets:[{
      label:'Inadimplentes',
      data: inadMensal,
      borderColor:'#f2617a', backgroundColor:'rgba(242,97,122,0.08)',
      borderWidth:2, pointRadius:4, fill:true, tension:.4,
      pointBackgroundColor:'#f2617a',
    }]
  }
  const inadLineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11},stepSize:1}, border:{display:false}, min:0 }
    }
  }

  // Ticket médio por mês
  const ticketMedio = MESES_7.map(m => {
    const pg = pagamentos.filter(p=>p.mes===m&&p.status==='Pago')
    return pg.length ? Math.round(pg.reduce((s,p)=>s+p.valor,0)/pg.length) : 0
  })
  const ticketLineData = {
    labels: MESES_7.map(mesLabel),
    datasets:[{
      label:'Ticket médio',
      data: ticketMedio,
      borderColor:'#5b9cf6', backgroundColor:'rgba(91,156,246,0.08)',
      borderWidth:2, pointRadius:3, fill:true, tension:.4,
      pointBackgroundColor:'#5b9cf6',
    }]
  }

  // ── ALUNOS ──
  const ativosMes = MESES_7.map(m => {
    // todos que matricularam antes ou durante o mês e ainda ativos
    return alunos.filter(a => a.dataMatricula <= m+'-31').length
  })
  const alunosLineData = {
    labels: MESES_7.map(mesLabel),
    datasets:[{
      label:'Alunos',
      data: ativosMes,
      borderColor:'#63dcaa', backgroundColor:'rgba(99,220,170,0.08)',
      borderWidth:2, pointRadius:3, fill:true, tension:.4,
      pointBackgroundColor:'#63dcaa',
    }]
  }
  const alunosLineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11}}, border:{display:false}, min:0 }
    }
  }

  // Status alunos
  const statusCount = {
    Ativo:   alunos.filter(a=>a.status==='Ativo').length,
    Inativo: alunos.filter(a=>a.status==='Inativo').length,
    Trancado:alunos.filter(a=>a.status==='Trancado').length,
  }
  const statusDonut = {
    labels:['Ativo','Inativo','Trancado'],
    datasets:[{ data:[statusCount.Ativo,statusCount.Inativo,statusCount.Trancado], backgroundColor:['#63dcaa','#f2617a','#f5c542'], borderWidth:0, hoverOffset:4 }]
  }
  const donutOpts = {
    responsive:true, maintainAspectRatio:false, cutout:'70%',
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} }
  }

  // Por idioma
  const idiomaMap = {}
  alunos.filter(a=>a.status==='Ativo').forEach(a => {
    const t = turmas.find(t=>t.id===a.turmaId)
    if (t) idiomaMap[t.idioma] = (idiomaMap[t.idioma]||0)+1
  })
  const idiomaLabels = Object.keys(idiomaMap)
  const idiomaDonut = {
    labels: idiomaLabels,
    datasets:[{ data:idiomaLabels.map(i=>idiomaMap[i]), backgroundColor:CORES.slice(0,idiomaLabels.length), borderWidth:0, hoverOffset:4 }]
  }

  // ── CURSOS ──
  const cursosStats = turmas.filter(t=>t.ativa).map(t => {
    const matriculados = alunos.filter(a=>a.turmaId===t.id&&a.status==='Ativo').length
    const receita      = matriculados * (alunos.find(a=>a.turmaId===t.id)?.mensalidade||0)
    const ocup         = Math.round(matriculados/t.vagas*100)
    return { ...t, matriculados, receita, ocup }
  }).sort((a,b)=>b.matriculados-a.matriculados)

  const cursoBarData = {
    labels: cursosStats.map(c=>c.codigo),
    datasets:[{
      label:'Alunos',
      data: cursosStats.map(c=>c.matriculados),
      backgroundColor: CORES.slice(0,cursosStats.length),
      borderRadius:6, borderSkipped:false,
    }]
  }
  const cursoBarOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{...baseTooltip} },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tc,font:{size:11}}, border:{display:false} },
      y:{ grid:{color:gc}, ticks:{color:tc,font:{size:11},stepSize:1}, border:{display:false}, min:0 }
    }
  }

  const profStats = professores.filter(p=>p.ativo).map(p => {
    const tProf = turmas.filter(t=>t.professorId===p.id&&t.ativa)
    const aProf = tProf.reduce((s,t)=>s+alunos.filter(a=>a.turmaId===t.id&&a.status==='Ativo').length,0)
    return { ...p, turmasCount:tProf.length, alunosCount:aProf }
  }).sort((a,b)=>b.alunosCount-a.alunosCount)

  // ── REMATRÍCULAS ──
  // Um aluno é considerado rematriculado se tiver um campo rematricula* no objeto
  // OU se inferirmos pelo histórico de pagamentos (gap de meses sem pagamento).
  // Como o localStorage não tem campo explícito de rematrícula, detectamos via:
  //   1. Mudança de turma  → campo turmaAnteriorId presente
  //   2. Reativação        → status voltou a Ativo e tem campo dataReativacao
  //   3. Renovação         → dataMatricula mais recente que a primeira cobrança registrada
  const rematriculas = alunos.map(aluno => {
    const pgAluno    = pagamentos.filter(p => p.alunoId === aluno.id).sort((a,b) => a.mes.localeCompare(b.mes))
    const turmaAtual = turmas.find(t => t.id === aluno.turmaId)

    const eventos = []

    // Tipo 1 — Mudança de turma (campo turmaAnteriorId)
    if (aluno.turmaAnteriorId && aluno.turmaAnteriorId !== aluno.turmaId) {
      const turmaAnt = turmas.find(t => t.id === aluno.turmaAnteriorId)
      eventos.push({
        tipo:          'mudanca_turma',
        label:         'Mudança de turma',
        cor:           '#5b9cf6',
        turmaAnterior: turmaAnt ? `${turmaAnt.codigo} — ${turmaAnt.idioma} ${turmaAnt.nivel}` : `ID ${aluno.turmaAnteriorId}`,
        turmaAtual:    turmaAtual ? `${turmaAtual.codigo} — ${turmaAtual.idioma} ${turmaAtual.nivel}` : '—',
        data:          aluno.dataRematricula || aluno.dataMatricula || '—',
      })
    }

    // Tipo 2 — Reativação (campo dataReativacao ou status voltou a Ativo)
    if (aluno.dataReativacao) {
      eventos.push({
        tipo:          'reativacao',
        label:         'Reativação de matrícula',
        cor:           '#63dcaa',
        turmaAnterior: '(Inativo/Trancado)',
        turmaAtual:    turmaAtual ? `${turmaAtual.codigo} — ${turmaAtual.idioma} ${turmaAtual.nivel}` : '—',
        data:          aluno.dataReativacao,
      })
    }

    // Tipo 3 — Renovação: gap de 2+ meses sem pagamento seguido de pagamentos novos
    if (pgAluno.length >= 2) {
      for (let i = 1; i < pgAluno.length; i++) {
        const [yA, mA] = pgAluno[i-1].mes.split('-').map(Number)
        const [yB, mB] = pgAluno[i].mes.split('-').map(Number)
        const diffMeses = (yB - yA) * 12 + (mB - mA)
        if (diffMeses >= 2) {
          eventos.push({
            tipo:          'renovacao',
            label:         'Renovação de matrícula',
            cor:           '#a78bfa',
            turmaAnterior: `Sem pagamento por ${diffMeses} meses`,
            turmaAtual:    turmaAtual ? `${turmaAtual.codigo} — ${turmaAtual.idioma} ${turmaAtual.nivel}` : '—',
            data:          pgAluno[i].mes + '-01',
          })
          break // só registrar o primeiro gap encontrado
        }
      }
    }

    if (!eventos.length) return null

    return {
      aluno,
      turmaAtual,
      eventos,
      pagamentos: pgAluno,
      totalPago:  pgAluno.filter(p=>p.status==='Pago').reduce((s,p)=>s+p.valor,0),
    }
  }).filter(Boolean).sort((a,b) => {
    // Ordena pela data do evento mais recente
    const dataA = a.eventos[0]?.data || ''
    const dataB = b.eventos[0]?.data || ''
    return dataB.localeCompare(dataA)
  })

  // ── Gerador XLSX via PizZip (sem dependências extras) ────────────────────────
  // XLSX é um ZIP contendo XMLs. Montamos os 3 arquivos mínimos obrigatórios
  // + 3 worksheets (Resumo, Detalhado, Pagamentos) e entregamos o buffer ao main.

  function xmlEsc(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  function xlsxNum(v)  { return `<c t="n"><v>${Number(v)||0}</v></c>` }
  function xlsxStr(v)  { return `<c t="inlineStr"><is><t>${xmlEsc(v)}</t></is></c>` }
  function xlsxMoeda(v){ return `<c t="n" s="1"><v>${Number(v)||0}</v></c>` }  // s="1" = formato moeda

  function buildRow(cells) { return `<row>${cells.join('')}</row>` }

  function buildSheet(rows) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows.join('')}</sheetData>
</worksheet>`
  }

  function gerarXLSX(dados) {
    const zip = new PizZip()

    // ── [Content_Types].xml ──────────────────────────────────────────────────
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"            ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"   ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml"   ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml"   ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"              ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml"       ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`)

    // ── _rels/.rels ──────────────────────────────────────────────────────────
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)

    // ── xl/_rels/workbook.xml.rels ───────────────────────────────────────────
    zip.folder('xl').folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"    Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"    Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"    Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"       Target="styles.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`)

    // ── xl/workbook.xml ──────────────────────────────────────────────────────
    zip.folder('xl').file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Resumo"     sheetId="1" r:id="rId1"/>
    <sheet name="Detalhado"  sheetId="2" r:id="rId2"/>
    <sheet name="Pagamentos" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`)

    // ── xl/styles.xml — define formato moeda (s="1") ─────────────────────────
    zip.folder('xl').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;R$&quot;#,##0.00"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0"   fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0"   fontId="1" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`)

    // ── xl/sharedStrings.xml (vazio — usamos inlineStr) ──────────────────────
    zip.folder('xl').file('sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`)

    // ── ABA 1: Resumo ────────────────────────────────────────────────────────
    const total       = dados.length
    const mudancas    = dados.filter(r => r.eventos.some(e => e.tipo === 'mudanca_turma')).length
    const reativacoes = dados.filter(r => r.eventos.some(e => e.tipo === 'reativacao')).length
    const renovacoes  = dados.filter(r => r.eventos.some(e => e.tipo === 'renovacao')).length
    const geradoEm    = new Date().toLocaleString('pt-BR')

    const rowsResumo = [
      buildRow([xlsxStr('Relatório de Rematrículas — Escola Manager')]),
      buildRow([xlsxStr(`Gerado em: ${geradoEm}`)]),
      buildRow([]),
      buildRow([xlsxStr('Indicador'), xlsxStr('Quantidade')]),
      buildRow([xlsxStr('Total rematriculados'),  xlsxNum(total)]),
      buildRow([xlsxStr('Mudanças de turma'),     xlsxNum(mudancas)]),
      buildRow([xlsxStr('Reativações'),           xlsxNum(reativacoes)]),
      buildRow([xlsxStr('Renovações'),            xlsxNum(renovacoes)]),
    ]
    zip.folder('xl').folder('worksheets').file('sheet1.xml', buildSheet(rowsResumo))

    // ── ABA 2: Detalhado ─────────────────────────────────────────────────────
    const rowsDet = [
      buildRow([
        xlsxStr('Aluno'), xlsxStr('Status'), xlsxStr('Turma Atual'),
        xlsxStr('Tipo de Evento'), xlsxStr('De (origem)'), xlsxStr('Para (destino)'),
        xlsxStr('Data do Evento'), xlsxStr('Total Pago (R$)'), xlsxStr('Qtd Pagamentos'),
      ]),
    ]
    for (const r of dados) {
      for (const ev of r.eventos) {
        rowsDet.push(buildRow([
          xlsxStr(r.alunoNome),
          xlsxStr(r.alunoStatus),
          xlsxStr(r.turmaAtual),
          xlsxStr(ev.label),
          xlsxStr(ev.turmaAnterior),
          xlsxStr(ev.turmaAtual),
          xlsxStr(ev.data && ev.data !== '—' ? ev.data : ''),
          xlsxMoeda(r.totalPago),
          xlsxNum(r.qtdPagamentos),
        ]))
      }
    }
    // linha de total
    rowsDet.push(buildRow([]))
    rowsDet.push(buildRow([
      xlsxStr(`TOTAL — ${dados.length} aluno(s)`), xlsxStr(''), xlsxStr(''),
      xlsxStr(''), xlsxStr(''), xlsxStr(''), xlsxStr(''),
      xlsxMoeda(dados.reduce((s, r) => s + r.totalPago, 0)),
      xlsxNum(dados.reduce((s, r) => s + r.qtdPagamentos, 0)),
    ]))
    zip.folder('xl').folder('worksheets').file('sheet2.xml', buildSheet(rowsDet))

    // ── ABA 3: Pagamentos ────────────────────────────────────────────────────
    const rowsPag = [
      buildRow([
        xlsxStr('Aluno'), xlsxStr('Mês'), xlsxStr('Vencimento'),
        xlsxStr('Valor (R$)'), xlsxStr('Status'), xlsxStr('Data Pgto'),
      ]),
    ]
    for (const r of dados) {
      for (const p of r.pagamentosLista || []) {
        rowsPag.push(buildRow([
          xlsxStr(r.alunoNome),
          xlsxStr(p.mes),
          xlsxStr(p.vencimento),
          xlsxMoeda(p.valor),
          xlsxStr(p.status),
          xlsxStr(p.dataPgto || ''),
        ]))
      }
    }
    zip.folder('xl').folder('worksheets').file('sheet3.xml', buildSheet(rowsPag))

    // ── Gera buffer ──────────────────────────────────────────────────────────
    const u8 = zip.generate({ type: 'uint8array', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    return Array.from(u8) // serializa para IPC (Uint8Array não passa pelo contextBridge)
  }

  // Monta payload serializado de rematrículas para enviar ao main process
  function buildPayloadRematriculas() {
    return rematriculas.map(r => ({
      alunoNome:       r.aluno.nome,
      alunoStatus:     r.aluno.status,
      turmaAtual:      r.turmaAtual ? `${r.turmaAtual.codigo} — ${r.turmaAtual.idioma} ${r.turmaAtual.nivel}` : '—',
      eventos:         r.eventos,
      totalPago:       r.totalPago,
      qtdPagamentos:   r.pagamentos.length,
      pagamentosLista: r.pagamentos.map(p => ({
        mes:        p.mes,
        vencimento: p.vencimento,
        valor:      p.valor,
        status:     p.status,
        dataPgto:   p.dataPgto || '',
      })),
    }))
  }

  async function exportarRematriculas(formato) {
    const api = window.electronAPI
    if (!api?.relatorioExportarRematriculas) return
    const dados = buildPayloadRematriculas()
    if (!dados.length) return

    let buffer = null
    if (formato === 'xlsx' || formato === 'xls') {
      try { buffer = gerarXLSX(dados) }
      catch (e) { console.error('[XLSX] Erro ao gerar:', e); return }
    }

    const res = await api.relatorioExportarRematriculas({ formato, dados: { buffer, dados } })
    if (res?.ok)              console.log('[Export] Rematrículas salvas em:', res.path)
    else if (!res?.cancelado) console.error('[Export] Erro:', res?.erro)
  }

  // Configuração dos exports por aba
  async function handlePDFFinanceiro() {
    const mesS   = mesAtualDinamico()
    const mesL   = mesLabel(mesS)
    const html   = gerarHTMLRelatorioFinanceiro({ mes:mesS, mesLabel:mesL, pagamentos, alunos, turmas, settings:{}  })
    const res    = await gerarPDF({ html, nomeArquivo:`relatorio-financeiro-${mesS}.pdf`, titulo:`Relatório Financeiro ${mesL}` })
    if (res?.ok && !res?.fallback) exportJSON && showToast?.('PDF salvo!')
  }
  async function handlePDFAlunos() {
    const html = gerarHTMLRelatorioAlunos({ alunos, turmas, pagamentos })
    await gerarPDF({ html, nomeArquivo:'relatorio-alunos.pdf', titulo:'Relatório de Alunos' })
  }

  const EXPORT_CONFIG = {
    financeiro: [
      { label: 'Relatório Financeiro (PDF)',   action: handlePDFFinanceiro,            desc: 'PDF com KPIs e tabela detalhada' },
      { label: 'Relatório Financeiro (CSV)',  action: () => exportCSV('financeiro'),  desc: 'Resumo mensal de receitas' },
      { label: 'Pagamentos detalhados (CSV)', action: () => exportCSV('pagamentos'),  desc: 'Todas as cobranças' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),   desc: 'Todos os dados do sistema' },
    ],
    alunos: [
      { label: 'Relatório de Alunos (PDF)',    action: handlePDFAlunos,                desc: 'PDF com lista e situação financeira' },
      { label: 'Lista de alunos (CSV)',        action: () => exportCSV('alunos'),      desc: 'Cadastro completo com situação financeira' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),   desc: 'Todos os dados do sistema' },
    ],
    cursos: [
      { label: 'Turmas (CSV)',                 action: () => exportCSV('turmas'),      desc: 'Turmas, ocupação e professores' },
      { label: 'Professores (CSV)',            action: () => exportCSV('professores'), desc: 'Lista de professores e turmas' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),   desc: 'Todos os dados do sistema' },
    ],
    rematriculas: [
      { label: 'Rematrículas (XLSX)',          action: () => exportarRematriculas('xlsx'), desc: 'Planilha com 3 abas: Resumo, Detalhado e Pagamentos' },
      { label: 'Rematrículas (XLS)',           action: () => exportarRematriculas('xls'),  desc: 'Formato compatível com Excel antigo' },
      { label: 'Rematrículas (CSV)',           action: () => exportarRematriculas('csv'),  desc: 'Texto separado por vírgulas, abre em qualquer planilha' },
      { label: 'Backup completo (JSON)',       action: () => exportJSON('completo'),       desc: 'Todos os dados do sistema' },
    ],
  }

  return (
    <div className="fade-up">
      {/* TABS + EXPORT */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div className="tabs" style={{margin:0}}>
          <button className={`tab${tab==='financeiro'?' active':''}`} onClick={()=>setTab('financeiro')}><DollarSign size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Financeiro</button>
          <button className={`tab${tab==='alunos'?' active':''}`} onClick={()=>setTab('alunos')}><Users size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Alunos</button>
          <button className={`tab${tab==='cursos'?' active':''}`} onClick={()=>setTab('cursos')}><BookOpen size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Cursos</button>
          <button className={`tab${tab==='rematriculas'?' active':''}`} onClick={()=>{ setTab('rematriculas'); setExpandido(null) }}><UserCheck size={13} style={{marginRight:5,verticalAlign:'middle'}}/>Rematrículas</button>
        </div>

        {/* Export dropdown */}
        <ExportMenu itens={EXPORT_CONFIG[tab]}/>
      </div>

      {/* ── FINANCEIRO ── */}
      {tab==='financeiro' && (
        <div>
          {/* KPIs */}
          <div className="stat-grid" style={{marginBottom:16}}>
            <div className="stat-card sc-green">
              <div className="stat-icon si-green"><TrendingUp/></div>
              <div className="stat-label">Total 7 meses</div>
              <div className="stat-value" style={{fontSize:20}}>{formatBRL(totalRecebido)}</div>
              <div className="stat-change ch-neutral">Receita acumulada</div>
            </div>
            <div className="stat-card sc-blue">
              <div className="stat-icon si-blue"><DollarSign/></div>
              <div className="stat-label">Média mensal</div>
              <div className="stat-value" style={{fontSize:20}}>{formatBRL(mediaRecebido)}</div>
              <div className="stat-change ch-neutral">Média dos últimos 7 meses</div>
            </div>
            <div className="stat-card sc-yellow">
              <div className="stat-icon si-yellow"><BarChart2/></div>
              <div className="stat-label">Melhor mês</div>
              <div className="stat-value" style={{fontSize:20}}>{mesLabel(melhorMes)}</div>
              <div className="stat-change ch-up">{formatBRL(Math.max(...receitaMensal))}</div>
            </div>
            <div className="stat-card sc-red">
              <div className="stat-icon si-red"><TrendingDown/></div>
              <div className="stat-label">Inadimplência média</div>
              <div className="stat-value" style={{fontSize:20}}>{(inadMensal.reduce((s,v)=>s+v,0)/MESES_7.length).toFixed(1)}</div>
              <div className="stat-change ch-neutral">alunos/mês em atraso</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:14}}>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Receita Mensal</div><div className="chart-sub">Últimos 7 meses</div></div></div>
              <div style={{height:200}}><Bar data={receitaBarData} options={receitaBarOpts}/></div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Inadimplência</div><div className="chart-sub">Alunos em atraso por mês</div></div></div>
              <div style={{height:200}}><Line data={inadLineData} options={inadLineOpts}/></div>
            </div>
          </div>

          <div className="chart-card" style={{marginBottom:14}}>
            <div className="chart-head"><div><div className="chart-title">Ticket Médio por Mês</div><div className="chart-sub">Valor médio pago por aluno</div></div></div>
            <div style={{height:160}}><Line data={ticketLineData} options={{...receitaBarOpts, plugins:{...receitaBarOpts.plugins,tooltip:{...baseTooltip,callbacks:{label:ctx=>` ${formatBRL(ctx.parsed.y)}`}}}}}/></div>
          </div>

          {/* Tabela resumo por mês */}
          <div className="tbl-wrap">
            <div className="tbl-top"><span className="tbl-title">Resumo por Mês</span></div>
            <table>
              <thead><tr>
                <th>Mês</th><th>Receita</th><th>Qtd Pagos</th><th>Qtd Atrasados</th><th>Ticket Médio</th><th>Taxa Receb.</th>
              </tr></thead>
              <tbody>
                {MESES_7.map((m,i)=>{
                  const pagos    = pagamentos.filter(p=>p.mes===m&&p.status==='Pago')
                  const atrasados= pagamentos.filter(p=>p.mes===m&&p.status==='Atrasado').length
                  const total    = pagamentos.filter(p=>p.mes===m).length
                  const taxa     = total ? Math.round(pagos.length/total*100) : 0
                  return (
                    <tr key={m}>
                      <td className="td-name">{mesLabel(m)}</td>
                      <td className="td-mono" style={{color:'var(--accent)'}}>{formatBRL(receitaMensal[i])}</td>
                      <td>{pagos.length}</td>
                      <td style={{color:atrasados>0?'var(--red)':'var(--text-2)'}}>{atrasados}</td>
                      <td>{formatBRL(ticketMedio[i])}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:5,background:'var(--bg-hover)',borderRadius:99,overflow:'hidden',minWidth:60}}>
                            <div style={{height:'100%',width:`${taxa}%`,background:taxa>80?'var(--accent)':taxa>50?'var(--yellow)':'var(--red)',borderRadius:99}}/>
                          </div>
                          <span style={{fontSize:12,color:'var(--text-2)',minWidth:32}}>{taxa}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ALUNOS ── */}
      {tab==='alunos' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Evolução de Matrículas</div><div className="chart-sub">Total de alunos por mês</div></div></div>
              <div style={{height:200}}><Line data={alunosLineData} options={alunosLineOpts}/></div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Status</div><div className="chart-sub">Distribuição atual</div></div></div>
              <div style={{height:120,display:'flex',justifyContent:'center'}}><Doughnut data={statusDonut} options={donutOpts}/></div>
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:5}}>
                {[['Ativo','#63dcaa'],['Inativo','#f2617a'],['Trancado','#f5c542']].map(([s,c])=>(
                  <div key={s} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-2)',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:2,background:c,display:'inline-block'}}/>{s}</div>
                    <strong style={{color:'var(--text-1)'}}>{statusCount[s]||0}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Por Idioma</div><div className="chart-sub">Alunos ativos</div></div></div>
              <div style={{height:120,display:'flex',justifyContent:'center'}}><Doughnut data={idiomaDonut} options={donutOpts}/></div>
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:5}}>
                {idiomaLabels.map((id,i)=>(
                  <div key={id} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text-2)',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:2,background:CORES[i],display:'inline-block'}}/>{id}</div>
                    <strong style={{color:'var(--text-1)'}}>{idiomaMap[id]}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela de alunos com métricas */}
          <div className="tbl-wrap">
            <div className="tbl-top">
              <span className="tbl-title">Lista de Alunos com Métricas</span>
              <button className="btn btn-secondary btn-sm" onClick={()=>exportCSV('alunos')}><Download size={13}/> CSV</button>
            </div>
            <table>
              <thead><tr><th>Aluno</th><th>Turma</th><th>Mensalidade</th><th>Total Pago</th><th>Meses Atraso</th><th>Status</th></tr></thead>
              <tbody>
                {alunos.map(a=>{
                  const t     = turmas.find(t=>t.id===a.turmaId)
                  const pgA   = pagamentos.filter(p=>p.alunoId===a.id)
                  const pago  = pgA.filter(p=>p.status==='Pago').reduce((s,p)=>s+p.valor,0)
                  const atras = pgA.filter(p=>p.status==='Atrasado').length
                  return (
                    <tr key={a.id}>
                      <td className="td-name">{a.nome}</td>
                      <td>{t?<span className="badge bg-blue">{t.codigo}</span>:'—'}</td>
                      <td className="td-mono">{formatBRL(a.mensalidade)}</td>
                      <td className="td-mono" style={{color:'var(--accent)'}}>{formatBRL(pago)}</td>
                      <td style={{color:atras>0?'var(--red)':'var(--text-2)'}}>{atras>0?`${atras} mês/meses`:'—'}</td>
                      <td>{a.status==='Ativo'?<span className="badge bg-green">Ativo</span>:<span className="badge bg-gray">{a.status}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CURSOS ── */}
      {tab==='cursos' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Alunos por Turma</div><div className="chart-sub">Matrículas ativas</div></div></div>
              <div style={{height:220}}><Bar data={cursoBarData} options={cursoBarOpts}/></div>
            </div>
            <div className="chart-card">
              <div className="chart-head"><div><div className="chart-title">Desempenho por Professor</div><div className="chart-sub">Turmas e alunos atribuídos</div></div></div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
                {profStats.map((p,i)=>(
                  <div key={p.id} className="prog-item" style={{marginBottom:0}}>
                    <div className="prog-head">
                      <div className="prog-name" style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:CORES[i%CORES.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>
                          {p.nome.split(' ').map(x=>x[0]).slice(0,2).join('')}
                        </div>
                        {p.nome}
                      </div>
                      <div className="prog-val">{p.alunosCount} alunos · {p.turmasCount} turmas</div>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{width:`${(p.alunosCount/Math.max(...profStats.map(x=>x.alunosCount),1))*100}%`,background:CORES[i%CORES.length]}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tbl-wrap">
            <div className="tbl-top"><span className="tbl-title">Resumo por Turma</span></div>
            <table>
              <thead><tr><th>Turma</th><th>Idioma</th><th>Nível</th><th>Professor</th><th>Horário</th><th>Alunos</th><th>Vagas</th><th>Ocupação</th><th>Receita/mês</th></tr></thead>
              <tbody>
                {cursosStats.map(c=>{
                  const prof = professores.find(p=>p.id===c.professorId)
                  const receitaT = alunos.filter(a=>a.turmaId===c.id&&a.status==='Ativo').reduce((s,a)=>s+a.mensalidade,0)
                  return (
                    <tr key={c.id}>
                      <td><span className="badge bg-blue">{c.codigo}</span></td>
                      <td className="td-name">{c.idioma}</td>
                      <td><span className="badge bg-gray">{c.nivel}</span></td>
                      <td>{prof?.nome||'—'}</td>
                      <td className="td-muted">{c.horario}</td>
                      <td><strong style={{color:'var(--text-1)'}}>{c.matriculados}</strong></td>
                      <td>{c.vagas}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1,height:5,background:'var(--bg-hover)',borderRadius:99,overflow:'hidden',minWidth:50}}>
                            <div style={{height:'100%',width:`${c.ocup}%`,background:c.ocup>80?'var(--red)':c.ocup>50?'var(--yellow)':'var(--accent)',borderRadius:99}}/>
                          </div>
                          <span style={{fontSize:12,color:'var(--text-2)',minWidth:32}}>{c.ocup}%</span>
                        </div>
                      </td>
                      <td className="td-mono" style={{color:'var(--accent)'}}>{formatBRL(receitaT)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REMATRÍCULAS ── */}
      {tab==='rematriculas' && (
        <div>
          {/* KPIs */}
          <div className="stat-grid" style={{marginBottom:16}}>
            <div className="stat-card sc-green">
              <div className="stat-icon si-green"><UserCheck/></div>
              <div className="stat-label">Total rematriculados</div>
              <div className="stat-value" style={{fontSize:24}}>{rematriculas.length}</div>
              <div className="stat-change ch-neutral">alunos com evento detectado</div>
            </div>
            <div className="stat-card sc-blue">
              <div className="stat-icon si-blue"><RefreshCw/></div>
              <div className="stat-label">Mudanças de turma</div>
              <div className="stat-value" style={{fontSize:24}}>
                {rematriculas.filter(r=>r.eventos.some(e=>e.tipo==='mudanca_turma')).length}
              </div>
              <div className="stat-change ch-neutral">alunos que mudaram de nível</div>
            </div>
            <div className="stat-card sc-yellow">
              <div className="stat-icon si-yellow"><Users/></div>
              <div className="stat-label">Reativações</div>
              <div className="stat-value" style={{fontSize:24}}>
                {rematriculas.filter(r=>r.eventos.some(e=>e.tipo==='reativacao')).length}
              </div>
              <div className="stat-change ch-neutral">voltaram de Inativo/Trancado</div>
            </div>
            <div className="stat-card" style={{background:'var(--pur-dim)',border:'1px solid rgba(167,139,250,.2)'}}>
              <div className="stat-icon" style={{background:'rgba(167,139,250,.15)'}}><BookOpen style={{color:'var(--purple)'}}/></div>
              <div className="stat-label">Renovações</div>
              <div className="stat-value" style={{fontSize:24}}>
                {rematriculas.filter(r=>r.eventos.some(e=>e.tipo==='renovacao')).length}
              </div>
              <div className="stat-change ch-neutral">retornaram após gap de pagamento</div>
            </div>
          </div>

          {rematriculas.length === 0 ? (
            <div className="empty" style={{paddingTop:48}}>
              <UserCheck size={44} style={{opacity:.2}}/>
              <p>Nenhuma rematrícula detectada.</p>
              <small>Rematrículas são identificadas por mudança de turma, reativação de status ou gap de pagamentos.</small>
            </div>
          ) : (
            <div className="tbl-wrap">
              <div className="tbl-top">
                <span className="tbl-title">{rematriculas.length} aluno{rematriculas.length!==1?'s':''} rematriculado{rematriculas.length!==1?'s':''}</span>
                <span style={{fontSize:12,color:'var(--text-3)'}}>Clique em um aluno para ver o histórico de pagamentos</span>
              </div>

              {rematriculas.map(({ aluno, turmaAtual, eventos, pagamentos: pgAluno, totalPago }) => {
                const aberto   = expandido === aluno.id
                const iniciais = aluno.nome.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()

                return (
                  <div key={aluno.id} style={{borderBottom:'1px solid var(--border)'}}>
                    {/* Linha principal — clicável */}
                    <div
                      onClick={() => setExpandido(aberto ? null : aluno.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:14,
                        padding:'13px 16px', cursor:'pointer',
                        background: aberto ? 'var(--accent-dim)' : 'transparent',
                        transition:'background .15s',
                      }}
                      onMouseEnter={e=>{ if(!aberto) e.currentTarget.style.background='var(--bg-hover)' }}
                      onMouseLeave={e=>{ if(!aberto) e.currentTarget.style.background='transparent' }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width:36, height:36, borderRadius:'50%', flexShrink:0,
                        background:'var(--accent)', color:'var(--bg-app)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700,
                      }}>{iniciais}</div>

                      {/* Nome + badges de evento */}
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:14, fontWeight:600, color:'var(--text-1)', marginBottom:4}}>
                          {aluno.nome}
                        </div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:5}}>
                          {eventos.map((ev,i) => (
                            <span key={i} style={{
                              fontSize:11, fontWeight:600,
                              color:ev.cor, background:`${ev.cor}18`,
                              border:`1px solid ${ev.cor}40`,
                              borderRadius:5, padding:'2px 7px',
                            }}>{ev.label}</span>
                          ))}
                        </div>
                      </div>

                      {/* Turma atual + status */}
                      <div style={{textAlign:'right', flexShrink:0}}>
                        {turmaAtual
                          ? <span className="badge bg-blue">{turmaAtual.codigo}</span>
                          : <span style={{fontSize:12,color:'var(--text-3)'}}>Sem turma</span>
                        }
                        <div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>
                          {aluno.status==='Ativo'
                            ? <span style={{color:'var(--accent)'}}>● Ativo</span>
                            : <span style={{color:'var(--text-3)'}}>{aluno.status}</span>
                          }
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight size={16} style={{
                        color:'var(--text-3)', flexShrink:0,
                        transition:'transform .2s',
                        transform: aberto ? 'rotate(90deg)' : 'none',
                      }}/>
                    </div>

                    {/* Painel expandido */}
                    {aberto && (
                      <div style={{
                        padding:'0 16px 16px 66px',
                        background:'var(--accent-dim)',
                        borderTop:'1px solid var(--border)',
                      }}>
                        {/* Linha do tempo de eventos */}
                        <div style={{paddingTop:14, marginBottom:16}}>
                          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.7px',color:'var(--text-3)',marginBottom:10}}>
                            Histórico de rematrícula
                          </div>
                          {eventos.map((ev,i) => (
                            <div key={i} style={{
                              display:'flex', alignItems:'flex-start', gap:10,
                              marginBottom: i < eventos.length-1 ? 10 : 0,
                            }}>
                              <div style={{
                                width:8, height:8, borderRadius:'50%', marginTop:5, flexShrink:0,
                                background:ev.cor, boxShadow:`0 0 0 3px ${ev.cor}28`,
                              }}/>
                              <div>
                                <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)'}}>
                                  {ev.label}
                                  <span style={{marginLeft:8,fontSize:11,color:'var(--text-3)',fontWeight:400}}>
                                    {ev.data && ev.data !== '—' ? formatDate(ev.data) : '—'}
                                  </span>
                                </div>
                                <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>
                                  <span style={{color:'var(--red)'}}>De:</span> {ev.turmaAnterior}
                                  <span style={{margin:'0 8px',color:'var(--border)'}}>→</span>
                                  <span style={{color:'var(--accent)'}}>Para:</span> {ev.turmaAtual}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Histórico de pagamentos */}
                        <div>
                          <div style={{
                            fontSize:11, fontWeight:700, textTransform:'uppercase',
                            letterSpacing:'.7px', color:'var(--text-3)', marginBottom:10,
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                          }}>
                            <span>Histórico de pagamentos</span>
                            <span style={{color:'var(--accent)',fontWeight:600,textTransform:'none',fontSize:12}}>
                              Total pago: {formatBRL(totalPago)}
                            </span>
                          </div>
                          {pgAluno.length === 0 ? (
                            <div style={{fontSize:12,color:'var(--text-3)'}}>Sem pagamentos registrados.</div>
                          ) : (
                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:6}}>
                              {pgAluno.slice().reverse().slice(0,12).map(p => (
                                <div key={p.id} style={{
                                  padding:'8px 10px', borderRadius:8,
                                  background:'var(--bg-card)', border:'1px solid var(--border)',
                                  display:'flex', justifyContent:'space-between', alignItems:'center',
                                }}>
                                  <div>
                                    <div style={{fontSize:12,fontWeight:600,color:'var(--text-1)'}}>{mesLabel(p.mes)}</div>
                                    <div style={{fontSize:10,color:'var(--text-3)'}}>Venc: {formatDate(p.vencimento)}</div>
                                  </div>
                                  <div style={{textAlign:'right'}}>
                                    <div style={{fontSize:12,fontWeight:700,fontFamily:"'Syne',sans-serif",color:'var(--text-1)'}}>{formatBRL(p.valor)}</div>
                                    {p.status==='Pago'     && <span className="badge bg-green"  style={{fontSize:9}}>Pago</span>}
                                    {p.status==='Atrasado' && <span className="badge bg-red"    style={{fontSize:9}}>Atrasado</span>}
                                    {p.status==='Pendente' && <span className="badge bg-yellow" style={{fontSize:9}}>Pendente</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {pgAluno.length > 12 && (
                            <div style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>
                              Exibindo os 12 mais recentes de {pgAluno.length} pagamentos no total.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
