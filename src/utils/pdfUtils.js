/**
 * pdfUtils.js — Gerador de PDFs via Electron printToPDF
 *
 * Usa CSS inline completo para garantir que o PDF seja fiel
 * (printToPDF renderiza como Chromium headless).
 */

// ── Estilos base compartilhados ───────────────────────────────────────────────
const CSS_BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    color: #1a1e2c;
    background: #fff;
    line-height: 1.5;
  }
  .page { padding: 20mm 18mm; }
  h1 { font-size: 18pt; font-weight: 700; letter-spacing: -0.5px; }
  h2 { font-size: 13pt; font-weight: 700; margin-bottom: 6px; }
  h3 { font-size: 11pt; font-weight: 600; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0faf5; color: #25a26e; font-size: 8pt; font-weight: 700;
       text-transform: uppercase; letter-spacing: 0.6px; padding: 7px 10px; border-bottom: 2px solid #25a26e; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 10.5pt; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 8.5pt; font-weight: 600; }
  .badge-green  { background: #d1fae5; color: #065f46; }
  .badge-red    { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-gray   { background: #f3f4f6; color: #4b5563; }
  .badge-blue   { background: #dbeafe; color: #1e40af; }
  .divider { border: none; border-top: 1px solid #eee; margin: 14px 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            padding-bottom: 14px; margin-bottom: 18px; border-bottom: 2px solid #25a26e; }
  .logo-area h1 { color: #25a26e; }
  .logo-area p { color: #6b7280; font-size: 10pt; margin-top: 2px; }
  .meta { text-align: right; font-size: 9.5pt; color: #6b7280; }
  .meta strong { color: #1a1e2c; }
  .section { margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi { background: #f0faf5; border-radius: 8px; padding: 12px 14px; }
  .kpi-label { font-size: 8.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; }
  .kpi-value { font-size: 16pt; font-weight: 700; color: #25a26e; margin-top: 2px; }
  .kpi-sub   { font-size: 8pt; color: #9ca3af; margin-top: 1px; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #eee;
            font-size: 8.5pt; color: #9ca3af; display: flex; justify-content: space-between; }
  .prog-bar { background: #e5e7eb; border-radius: 4px; height: 6px; margin-top: 3px; }
  .prog-fill { height: 6px; border-radius: 4px; background: #25a26e; }
`

function agora() {
  return new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}
function dataHoje() {
  return new Date().toLocaleDateString('pt-BR')
}
function brl(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}
function wrap(body, titulo, escola = 'Escola Manager') {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>${titulo}</title>
    <style>${CSS_BASE}</style>
  </head><body><div class="page">${body}</div></body></html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BOLETO / COBRANÇA INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────
export function gerarHTMLBoleto({ pagamento, aluno, turma, escola, settings }) {
  const nomeEscola  = escola || 'Escola Manager'
  const diaVenc     = settings?.financeiro?.diaVencimento || 10
  const temEncargos = pagamento.valorOriginal && pagamento.valorOriginal !== pagamento.valor

  const body = `
    <div class="header">
      <div class="logo-area">
        <h1>${nomeEscola}</h1>
        <p>Documento de Cobrança · Ref.: ${pagamento.mes}</p>
      </div>
      <div class="meta">
        <strong>Emitido em:</strong> ${agora()}<br/>
        <strong>Vencimento:</strong> ${pagamento.vencimento || `Dia ${diaVenc}/${pagamento.mes?.split('-')[1]}/${pagamento.mes?.split('-')[0]}`}<br/>
        <strong>Nº:</strong> ${String(pagamento.id).padStart(6, '0')}
      </div>
    </div>

    <div class="section">
      <h2>Dados do Aluno</h2>
      <table>
        <tr><td><strong>Nome</strong></td><td>${aluno?.nome || '—'}</td>
            <td><strong>E-mail</strong></td><td>${aluno?.email || '—'}</td></tr>
        <tr><td><strong>Telefone</strong></td><td>${aluno?.telefone || '—'}</td>
            <td><strong>Turma</strong></td><td>${turma ? `${turma.codigo} — ${turma.idioma} ${turma.nivel}` : '—'}</td></tr>
      </table>
    </div>

    <div class="section">
      <h2>Detalhes do Pagamento</h2>
      <table>
        <thead><tr><th>Descrição</th><th>Referência</th><th>Vencimento</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>
          <tr>
            <td>Mensalidade — ${turma?.idioma || 'Curso de Idiomas'} ${turma?.nivel || ''}</td>
            <td>${pagamento.mes}</td>
            <td>${pagamento.vencimento || '—'}</td>
            <td style="text-align:right; font-weight:600">${brl(pagamento.valorOriginal || pagamento.valor)}</td>
          </tr>
          ${temEncargos ? `
          <tr>
            <td style="color:#991b1b">Multa por atraso</td>
            <td colspan="2" style="color:#6b7280; font-size:9pt">${pagamento.diasAtraso || 0} dias em atraso</td>
            <td style="text-align:right; color:#991b1b">+ ${brl(pagamento.valorMulta)}</td>
          </tr>
          <tr>
            <td style="color:#991b1b">Juros (${settings?.financeiro?.jurosAtraso || 2}% a.m.)</td>
            <td colspan="2"></td>
            <td style="text-align:right; color:#991b1b">+ ${brl(pagamento.valorJuros)}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div style="margin-top:12px; padding:12px 14px; background:${pagamento.status==='Atrasado'?'#fee2e2':'#f0faf5'}; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:9pt; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px">Total a Pagar</div>
          <div style="font-size:22pt; font-weight:700; color:${pagamento.status==='Atrasado'?'#991b1b':'#25a26e'}">${brl(pagamento.valor)}</div>
        </div>
        <div>
          <span class="badge badge-${pagamento.status==='Pago'?'green':pagamento.status==='Atrasado'?'red':'yellow'}">
            ${pagamento.status}
          </span>
          ${pagamento.dataPgto ? `<div style="font-size:9pt; color:#6b7280; margin-top:4px">Pago em: ${pagamento.dataPgto}</div>` : ''}
        </div>
      </div>
    </div>

    ${pagamento.obs ? `<div class="section"><h3>Observações</h3><p style="color:#6b7280; font-size:10pt">${pagamento.obs}</p></div>` : ''}

    ${(settings?.financeiro?.pixChave || settings?.financeiro?.pixQrCode) ? `
    <div style="margin-top:16px; padding:14px 16px; background:#f0faf5; border:1.5px solid #25a26e;
                border-radius:8px; display:flex; align-items:center; gap:16px;">
      ${settings?.financeiro?.pixQrCode
        ? `<img src="${settings.financeiro.pixQrCode}" alt="QR Code Pix"
             style="width:90px; height:90px; object-fit:contain; flex-shrink:0;
                    border:1px solid #d1fae5; border-radius:6px; background:#fff; padding:4px;"/>`
        : ''}
      <div>
        <div style="font-size:10pt; font-weight:700; color:#065f46; margin-bottom:4px;">
          💚 Pagamento via Pix
        </div>
        ${settings?.financeiro?.pixChave ? `
        <div style="font-size:9.5pt; color:#374151; margin-bottom:2px;">
          <span style="color:#6b7280;">
            ${settings.financeiro.pixTipo === 'email'    ? 'E-mail'
            : settings.financeiro.pixTipo === 'cpf'      ? 'CPF'
            : settings.financeiro.pixTipo === 'cnpj'     ? 'CNPJ'
            : settings.financeiro.pixTipo === 'telefone' ? 'Telefone'
            : 'Chave'}:
          </span>
          <strong style="font-size:10.5pt; letter-spacing:0.3px;">
            ${settings.financeiro.pixChave}
          </strong>
        </div>
        <div style="font-size:8.5pt; color:#6b7280;">
          Abra o app do seu banco → Pix → Pagar → Cole ou escaneie a chave acima
        </div>` : ''}
      </div>
    </div>` : ''}

    <div style="margin-top:14px; padding:12px; border:2px dashed #e5e7eb; border-radius:8px; font-size:9pt; color:#6b7280; text-align:center;">
      Em caso de dúvidas, entre em contato com a escola. Este documento não tem valor de recibo bancário.
    </div>

    <div class="footer">
      <span>${nomeEscola} · Documento gerado em ${agora()}</span>
      <span>Escola Manager v5.5.3 · Software Livre GPL-3.0</span>
    </div>
  `
  return wrap(body, `Cobrança — ${aluno?.nome} — ${pagamento.mes}`, nomeEscola)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RELATÓRIO FINANCEIRO MENSAL
// ─────────────────────────────────────────────────────────────────────────────
export function gerarHTMLRelatorioFinanceiro({ mes, mesLabel, pagamentos, alunos, turmas, settings }) {
  const pgMes       = pagamentos.filter(p => p.mes === mes)
  const pagos       = pgMes.filter(p => p.status === 'Pago')
  const atrasados   = pgMes.filter(p => p.status === 'Atrasado')
  const pendentes   = pgMes.filter(p => p.status === 'Pendente')
  const totalPago   = pagos.reduce((s,p) => s+p.valor, 0)
  const totalAtraso = atrasados.reduce((s,p) => s+p.valor, 0)
  const totalPend   = pendentes.reduce((s,p) => s+p.valor, 0)
  const txReceb     = pgMes.length ? Math.round(pagos.length / pgMes.length * 100) : 0

  const linhas = pgMes.map(p => {
    const a = alunos.find(al => al.id === p.alunoId)
    const t = turmas.find(t  => t.id  === a?.turmaId)
    const badge = p.status === 'Pago' ? 'green' : p.status === 'Atrasado' ? 'red' : 'yellow'
    return `<tr>
      <td>${a?.nome || '—'}</td>
      <td>${t?.codigo || '—'}</td>
      <td>${p.vencimento || '—'}</td>
      <td>${p.dataPgto || '—'}</td>
      <td style="text-align:right; font-weight:600">${brl(p.valor)}</td>
      <td style="text-align:center"><span class="badge badge-${badge}">${p.status}</span></td>
    </tr>`
  }).join('')

  const body = `
    <div class="header">
      <div class="logo-area">
        <h1>Relatório Financeiro</h1>
        <p>Referência: ${mesLabel} · Gerado em ${agora()}</p>
      </div>
      <div class="meta">
        <strong>Total de cobranças:</strong> ${pgMes.length}<br/>
        <strong>Taxa de recebimento:</strong> ${txReceb}%
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Recebido</div>
        <div class="kpi-value">${brl(totalPago)}</div>
        <div class="kpi-sub">${pagos.length} pagamentos</div>
      </div>
      <div class="kpi" style="background:#fef2f2">
        <div class="kpi-label" style="color:#991b1b">Em Atraso</div>
        <div class="kpi-value" style="color:#991b1b">${brl(totalAtraso)}</div>
        <div class="kpi-sub">${atrasados.length} inadimplentes</div>
      </div>
      <div class="kpi" style="background:#fefce8">
        <div class="kpi-label" style="color:#854d0e">Pendente</div>
        <div class="kpi-value" style="color:#854d0e">${brl(totalPend)}</div>
        <div class="kpi-sub">${pendentes.length} aguardando</div>
      </div>
      <div class="kpi" style="background:#eff6ff">
        <div class="kpi-label" style="color:#1e40af">Potencial Total</div>
        <div class="kpi-value" style="color:#1e40af">${brl(totalPago+totalAtraso+totalPend)}</div>
        <div class="kpi-sub">${pgMes.length} cobranças</div>
      </div>
    </div>

    <div class="section">
      <h2>Detalhamento por Aluno</h2>
      <table>
        <thead><tr>
          <th>Aluno</th><th>Turma</th><th>Vencimento</th><th>Pagamento</th>
          <th style="text-align:right">Valor</th><th style="text-align:center">Status</th>
        </tr></thead>
        <tbody>${linhas || '<tr><td colspan="6" style="text-align:center; color:#9ca3af">Nenhum registro</td></tr>'}</tbody>
      </table>
    </div>

    <div class="footer">
      <span>Relatório gerado em ${agora()}</span>
      <span>Escola Manager v5.4 · GPL-3.0</span>
    </div>
  `
  return wrap(body, `Relatório Financeiro — ${mesLabel}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RELATÓRIO DE FREQUÊNCIA
// ─────────────────────────────────────────────────────────────────────────────
export function gerarHTMLRelatorioFrequencia({ turma, stats, alunosDaTurma }) {
  const linhas = (stats?.alunos || []).map(a => {
    const faltas = a.total_aulas - a.total_presentes
    const pct    = a.percentual || 0
    const cor    = pct >= 75 ? '#065f46' : pct >= 50 ? '#854d0e' : '#991b1b'
    const badge  = pct >= 75 ? 'green'   : pct >= 50 ? 'yellow'  : 'red'
    return `<tr>
      <td>${a.aluno_nome}</td>
      <td style="text-align:center">${a.total_presentes}</td>
      <td style="text-align:center">${faltas}</td>
      <td style="text-align:center"><strong style="color:${cor}">${pct}%</strong></td>
      <td style="width:120px">
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%; background:${cor}"></div></div>
        <span class="badge badge-${badge}" style="font-size:7.5pt; margin-top:3px; display:inline-block">
          ${pct >= 75 ? 'Regular' : pct >= 50 ? 'Atenção' : 'Crítico'}
        </span>
      </td>
    </tr>`
  }).join('')

  const semRegistro = (alunosDaTurma || [])
    .filter(a => !(stats?.alunos||[]).find(s => s.aluno_ls_id === a.id))
    .map(a => `<tr style="opacity:0.5">
      <td>${a.nome}</td>
      <td colspan="3" style="text-align:center; color:#9ca3af">Sem registros</td>
      <td></td>
    </tr>`).join('')

  const body = `
    <div class="header">
      <div class="logo-area">
        <h1>Relatório de Frequência</h1>
        <p>${turma?.codigo} — ${turma?.idioma} ${turma?.nivel} · Gerado em ${agora()}</p>
      </div>
      <div class="meta">
        <strong>Total de aulas:</strong> ${stats?.totalAulas || 0}<br/>
        <strong>Alunos:</strong> ${alunosDaTurma?.length || 0}
      </div>
    </div>

    <div class="kpi-grid" style="grid-template-columns: repeat(3,1fr)">
      <div class="kpi">
        <div class="kpi-label">Total de Aulas</div>
        <div class="kpi-value">${stats?.totalAulas || 0}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Com freq. regular (≥75%)</div>
        <div class="kpi-value">${(stats?.alunos||[]).filter(a=>a.percentual>=75).length}</div>
      </div>
      <div class="kpi" style="background:#fef2f2">
        <div class="kpi-label" style="color:#991b1b">Freq. crítica (&lt;50%)</div>
        <div class="kpi-value" style="color:#991b1b">${(stats?.alunos||[]).filter(a=>a.percentual<50).length}</div>
      </div>
    </div>

    <div class="section">
      <h2>Frequência por Aluno</h2>
      <table>
        <thead><tr>
          <th>Aluno</th>
          <th style="text-align:center">Presenças</th>
          <th style="text-align:center">Faltas</th>
          <th style="text-align:center">Frequência</th>
          <th>Progresso</th>
        </tr></thead>
        <tbody>${linhas}${semRegistro}</tbody>
      </table>
    </div>

    <div style="margin-top:12px; padding:10px 14px; background:#f0faf5; border-radius:8px; font-size:9pt; color:#6b7280;">
      <strong style="color:#065f46">Legenda:</strong>
      Regular ≥75% · Atenção 50–74% · Crítico &lt;50%
    </div>

    <div class="footer">
      <span>Relatório gerado em ${agora()}</span>
      <span>Escola Manager v5.4 · GPL-3.0</span>
    </div>
  `
  return wrap(body, `Frequência — ${turma?.codigo}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RELATÓRIO GERAL DE ALUNOS
// ─────────────────────────────────────────────────────────────────────────────
export function gerarHTMLRelatorioAlunos({ alunos, turmas, pagamentos }) {
  const ativos   = alunos.filter(a => a.status === 'Ativo')
  const inativos = alunos.filter(a => a.status !== 'Ativo')
  const mesAtual = new Date().toISOString().slice(0,7)

  const linhas = alunos.map(a => {
    const t   = turmas.find(t => t.id === a.turmaId)
    const pg  = pagamentos.find(p => p.alunoId === a.id && p.mes === mesAtual)
    const sit = pg?.status || '—'
    const badgeSit = sit === 'Pago' ? 'green' : sit === 'Atrasado' ? 'red' : sit === 'Pendente' ? 'yellow' : 'gray'
    const badgeStatus = a.status === 'Ativo' ? 'green' : 'gray'
    return `<tr>
      <td>${a.nome}</td>
      <td>${a.email || '—'}</td>
      <td>${a.telefone || '—'}</td>
      <td><span class="badge badge-blue">${t?.codigo || '—'}</span></td>
      <td style="text-align:right">${brl(a.mensalidade)}</td>
      <td style="text-align:center"><span class="badge badge-${badgeStatus}">${a.status}</span></td>
      <td style="text-align:center"><span class="badge badge-${badgeSit}">${sit}</span></td>
    </tr>`
  }).join('')

  const body = `
    <div class="header">
      <div class="logo-area">
        <h1>Relatório de Alunos</h1>
        <p>Gerado em ${agora()}</p>
      </div>
      <div class="meta">
        <strong>Total:</strong> ${alunos.length} alunos<br/>
        <strong>Ativos:</strong> ${ativos.length} · <strong>Inativos:</strong> ${inativos.length}
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Total de Alunos</div>
        <div class="kpi-value">${alunos.length}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Ativos</div>
        <div class="kpi-value">${ativos.length}</div>
      </div>
      <div class="kpi" style="background:#fef2f2">
        <div class="kpi-label" style="color:#991b1b">Inadimplentes</div>
        <div class="kpi-value" style="color:#991b1b">
          ${pagamentos.filter(p=>p.mes===mesAtual&&p.status==='Atrasado').length}
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Receita Potencial/mês</div>
        <div class="kpi-value">${brl(ativos.reduce((s,a)=>s+a.mensalidade,0))}</div>
      </div>
    </div>

    <div class="section">
      <h2>Lista Completa</h2>
      <table>
        <thead><tr>
          <th>Nome</th><th>E-mail</th><th>Telefone</th><th>Turma</th>
          <th style="text-align:right">Mensalidade</th>
          <th style="text-align:center">Status</th>
          <th style="text-align:center">Sit. Fin.</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>

    <div class="footer">
      <span>Relatório gerado em ${agora()}</span>
      <span>Escola Manager v5.4 · GPL-3.0</span>
    </div>
  `
  return wrap(body, 'Relatório de Alunos')
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HELPER: gerar e salvar PDF via IPC
// ─────────────────────────────────────────────────────────────────────────────
export async function gerarPDF({ html, nomeArquivo, titulo, landscape = false }) {
  const api = window.electronAPI
  if (!api?.pdfGerar) {
    // Fallback: abre janela de impressão do browser
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
    return { ok: true, fallback: true }
  }
  return await api.pdfGerar({ html, nomeArquivo, titulo, landscape })
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HELPER: enviar cobrança via WhatsApp
// ─────────────────────────────────────────────────────────────────────────────
export async function enviarWhatsApp({ telefone, aluno, pagamento, nomeEscola }) {
  const api = window.electronAPI
  if (!telefone) return { ok: false, erro: 'Telefone não cadastrado para este aluno.' }

  const valor = Number(pagamento.valor).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
  const msg = [
    `Olá, *${aluno.nome}*! 👋`,
    ``,
    `Aqui é a *${nomeEscola || 'Escola Manager'}*.`,
    ``,
    `📋 *Cobrança de Mensalidade*`,
    `• Referência: ${pagamento.mes}`,
    `• Valor: *${valor}*`,
    `• Vencimento: ${pagamento.vencimento || '—'}`,
    `• Status: ${pagamento.status}`,
    pagamento.status === 'Atrasado'
      ? `⚠️ Seu pagamento está em atraso. Por favor, regularize o quanto antes.`
      : ``,
    ``,
    `Em caso de dúvidas, entre em contato conosco.`,
    `Obrigado! 🙏`,
  ].filter(l => l !== undefined).join('\n')

  if (api?.whatsappAbrir) {
    return await api.whatsappAbrir(telefone, msg)
  }

  // Fallback: abre wa.me no próprio browser
  const tel = telefone.replace(/\D/g, '')
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
  return { ok: true, fallback: true }
}
