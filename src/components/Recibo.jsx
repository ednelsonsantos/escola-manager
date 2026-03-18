import React from 'react'
import { X, Printer } from 'lucide-react'
import { formatBRL, formatDate } from '../context/AppContext.jsx'

export default function Recibo({ pagamento, aluno, turma, escola, onClose }) {
  const num = String(pagamento.id).padStart(5, '0')

  function imprimir() {
    const win = window.open('', '_blank', 'width=600,height=700')
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Recibo ${num}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; padding: 32px; color: #111; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
        .escola { font-size: 20px; font-weight: 700; }
        .sub    { font-size: 12px; color: #555; margin-top: 3px; }
        h2      { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px; color: #333; }
        .row    { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #eee; }
        .row strong { font-weight: 600; }
        .valor  { font-size: 20px; font-weight: 700; text-align: center; margin: 20px 0; background: #f5f5f5; padding: 12px; border-radius: 6px; }
        .assinatura { display: flex; gap: 48px; margin-top: 40px; padding-top: 12px; }
        .linha  { flex: 1; border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 11px; color: #555; }
        .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 28px; border-top: 1px solid #eee; padding-top: 10px; }
      </style></head><body>
      <div class="header">
        <div class="escola">${escola || 'Escola de Idiomas'}</div>
        <div class="sub">Recibo de Pagamento</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
        <span>Recibo Nº <strong>${num}</strong></span>
        <span>Data: <strong>${formatDate(pagamento.dataPgto || new Date().toISOString().split('T')[0])}</strong></span>
      </div>
      <h2>Dados do Pagamento</h2>
      <div class="row"><span>Aluno</span><strong>${aluno?.nome || '—'}</strong></div>
      <div class="row"><span>Turma</span><strong>${turma?.codigo || '—'} — ${turma?.idioma || ''}</strong></div>
      <div class="row"><span>Referência</span><strong>${pagamento.mes || '—'}</strong></div>
      <div class="row"><span>Vencimento</span><strong>${formatDate(pagamento.vencimento)}</strong></div>
      <div class="row"><span>Pagamento</span><strong>${formatDate(pagamento.dataPgto)}</strong></div>
      <div class="row"><span>Forma</span><strong>—</strong></div>
      <div class="valor">VALOR RECEBIDO: ${formatBRL(pagamento.valor)}</div>
      <p style="font-size:11px;color:#555;margin-top:8px">
        Declaro ter recebido a quantia acima referente à mensalidade do aluno indicado.
      </p>
      <div class="assinatura">
        <div class="linha">Assinatura do Responsável</div>
        <div class="linha">Assinatura da Escola</div>
      </div>
      <div class="footer">
        ${escola || 'Escola de Idiomas'} · Documento gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 'min(480px,94vw)' }}>
        <div className="modal-head">
          <span className="modal-title">Recibo #{num}</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body">
          {/* Preview */}
          <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 20, marginBottom: 16, fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{escola || 'Escola de Idiomas'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>Recibo de Pagamento</div>
            </div>
            {[
              ['Recibo Nº',  num],
              ['Aluno',      aluno?.nome || '—'],
              ['Turma',      turma ? `${turma.codigo} — ${turma.idioma}` : '—'],
              ['Referência', pagamento.mes || '—'],
              ['Vencimento', formatDate(pagamento.vencimento)],
              ['Pagamento',  formatDate(pagamento.dataPgto)],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text-3)' }}>{k}</span>
                <strong style={{ color:'var(--text-1)' }}>{v}</strong>
              </div>
            ))}
            <div style={{ textAlign:'center', margin:'16px 0', padding:'12px', background:'var(--accent-dim)', borderRadius:8 }}>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:3 }}>VALOR RECEBIDO</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:'var(--accent)' }}>{formatBRL(pagamento.valor)}</div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={imprimir}><Printer size={14}/> Imprimir Recibo</button>
        </div>
      </div>
    </div>
  )
}
