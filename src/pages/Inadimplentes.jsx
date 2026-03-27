/**
 * Inadimplentes.jsx
 * Listagem de alunos com pagamentos atrasados ou pendentes vencidos.
 * Permite enviar recado individual ou em lote via módulo de Recados.
 * Rota: /financeiro/inadimplentes  (ou embutido na página Financeiro)
 */
import React, { useState, useMemo } from 'react'
import { AlertTriangle, MessageSquare, Phone, CheckCircle, Filter, RefreshCw, Send, X } from 'lucide-react'
import { useApp, formatBRL, formatDate, today } from '../context/AppContext.jsx'

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function mesLabel(mes) {
  if (!mes) return '—'
  const [y, m] = mes.split('-')
  return `${MESES_LABEL[parseInt(m,10)-1]}/${y.slice(2)}`
}

export default function Inadimplentes() {
  const { alunos, turmas, pagamentos, marcarAtrasados, calcularEncargos, showToast } = useApp()

  const [filtroPeriodo, setFiltroPeriodo] = useState('todos') // 'todos' | '30' | '60' | '90'
  const [selecionados,  setSelecionados]  = useState(new Set())
  const [enviando,      setEnviando]      = useState(false)
  const [enviados,      setEnviados]      = useState(new Set()) // ids já notificados nesta sessão

  // ── Monta lista de inadimplentes ────────────────────────────────────────────
  const inadimplentes = useMemo(() => {
    const hoje = today()
    const resultado = []

    alunos.filter(a => a.status === 'Ativo').forEach(a => {
      // Pega todos os pagamentos atrasados/pendentes vencidos deste aluno
      const pgsAtraso = pagamentos.filter(p =>
        p.alunoId === a.id &&
        (p.status === 'Atrasado' || (p.status === 'Pendente' && p.vencimento < hoje))
      )
      if (!pgsAtraso.length) return

      // Total em aberto com encargos recalculados na hora
      let totalEmAberto = 0
      const detalhes = pgsAtraso.map(p => {
        const valorBase = p.valorOriginal ?? p.valor
        const enc       = calcularEncargos(valorBase, p.vencimento, hoje)
        const diasAtraso = Math.floor((new Date(hoje) - new Date(p.vencimento + 'T00:00:00')) / 86400000)
        totalEmAberto  += enc.valorTotal
        return { ...p, valorAtualizado: enc.valorTotal, diasAtraso, enc }
      })

      // Ordenar por data de vencimento mais antiga
      detalhes.sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      const diasMaisAntigo = detalhes[0]?.diasAtraso || 0

      const turma = turmas.find(t => t.id === a.turmaId)
      resultado.push({ aluno: a, turma, pagamentos: detalhes, totalEmAberto, diasMaisAntigo, qtdParcelas: detalhes.length })
    })

    // Ordenar por dias de atraso (mais antigo primeiro)
    resultado.sort((a, b) => b.diasMaisAntigo - a.diasMaisAntigo)
    return resultado
  }, [alunos, turmas, pagamentos, calcularEncargos])

  // Aplica filtro de período
  const lista = useMemo(() => {
    if (filtroPeriodo === 'todos') return inadimplentes
    const dias = Number(filtroPeriodo)
    return inadimplentes.filter(x => x.diasMaisAntigo >= dias)
  }, [inadimplentes, filtroPeriodo])

  // Totais
  const totalGeral = lista.reduce((s, x) => s + x.totalEmAberto, 0)

  // ── Seleção ─────────────────────────────────────────────────────────────────
  function toggleSel(id) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleTodos() {
    if (selecionados.size === lista.length) setSelecionados(new Set())
    else setSelecionados(new Set(lista.map(x => x.aluno.id)))
  }

  // ── Enviar recado de cobrança ────────────────────────────────────────────────
  async function enviarRecados(ids) {
    setEnviando(true)
    const api    = window.electronAPI
    const u      = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    const req    = { userId: u.id || null, userLogin: u.login || 'sistema' }
    let enviados = 0

    for (const id of ids) {
      const item = lista.find(x => x.aluno.id === id)
      if (!item) continue

      const parcelas = item.pagamentos.map(p =>
        `• ${mesLabel(p.mes)} — venc. ${formatDate(p.vencimento)} — ${formatBRL(p.valorAtualizado)} (${p.diasAtraso}d atraso)`
      ).join('\n')

      const mensagem =
        `Olá! Identificamos pendências financeiras em seu cadastro:\n\n${parcelas}\n\n` +
        `Total em aberto: ${formatBRL(item.totalEmAberto)}\n\n` +
        `Por favor, entre em contato para regularizar sua situação. Obrigado!`

      try {
        await api?.recadosSalvar({
          titulo:          `Cobrança — ${item.qtdParcelas} parcela(s) em atraso`,
          mensagem,
          remetente_tipo:  'secretaria',
          remetente_id:    u.id || 0,
          remetente_nome:  u.nome || u.login || 'Secretaria',
          prioridade:      item.diasMaisAntigo > 60 ? 'urgente' : 'importante',
          destinatarios:   [{ tipo: 'aluno', referencia_id: item.aluno.id, referencia_nome: item.aluno.nome }],
          enviar_agora:    true,
        }, req)
        enviados++
        setEnviados(prev => new Set([...prev, id]))
      } catch (e) {
        console.error('[Inadimplentes] recado:', e)
      }
    }

    setEnviando(false)
    setSelecionados(new Set())
    showToast(`${enviados} recado(s) de cobrança enviado(s)!`)
  }

  function abrirWhatsApp(item) {
    const tel  = item.aluno.respTelefone || item.aluno.telefone
    if (!tel) { showToast('Aluno sem telefone cadastrado.', 'warning'); return }
    const msg =
      `Olá${item.aluno.respNome ? ' ' + item.aluno.respNome : ''}! Temos ${item.qtdParcelas} parcela(s) em aberto ` +
      `totalizando ${formatBRL(item.totalEmAberto)}. Entre em contato para regularizar. Obrigado!`
    window.electronAPI?.whatsappAbrir(tel, msg)
  }

  const corDias = (dias) => dias > 90 ? 'var(--red)' : dias > 30 ? 'var(--yellow)' : 'var(--text-2)'

  return (
    <div className="fade-up">

      {/* ── KPIs ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Inadimplentes',     val: lista.length,                              unit:'alunos',   cor:'var(--red)' },
          { label:'Total em aberto',   val: formatBRL(totalGeral),                     unit:'',         cor:'var(--red)' },
          { label:'Média por aluno',   val: lista.length ? formatBRL(totalGeral/lista.length) : '—', unit:'', cor:'var(--yellow)' },
          { label:'Parcelas em atraso',val: lista.reduce((s,x)=>s+x.qtdParcelas,0),   unit:'parcelas', cor:'var(--text-1)' },
        ].map(k => (
          <div key={k.label} className="card" style={{padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>{k.label}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:k.cor}}>
              {k.val}{k.unit && <span style={{fontSize:12,fontWeight:400,marginLeft:4,color:'var(--text-3)'}}>{k.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar" style={{marginBottom:14}}>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Filter size={13} style={{color:'var(--text-3)'}}/>
          {[
            { val:'todos', label:'Todos' },
            { val:'30',    label:'30+ dias' },
            { val:'60',    label:'60+ dias' },
            { val:'90',    label:'90+ dias' },
          ].map(f => (
            <button key={f.val}
              className={`btn btn-sm ${filtroPeriodo===f.val?'btn-primary':'btn-ghost'}`}
              onClick={()=>setFiltroPeriodo(f.val)}
            >{f.label}</button>
          ))}
        </div>

        <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
          {selecionados.size > 0 && (
            <>
              <span style={{fontSize:12,color:'var(--text-3)',alignSelf:'center'}}>
                {selecionados.size} selecionado(s)
              </span>
              <button className="btn btn-primary btn-sm" disabled={enviando}
                onClick={() => enviarRecados([...selecionados])}>
                <Send size={13}/> {enviando ? 'Enviando...' : 'Enviar recado'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSelecionados(new Set())}>
                <X size={13}/>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tabela ── */}
      {lista.length === 0 ? (
        <div className="empty">
          <CheckCircle size={40} style={{color:'var(--accent)'}}/>
          <p>Nenhum inadimplente {filtroPeriodo!=='todos'?`com ${filtroPeriodo}+ dias de atraso`:''} 🎉</p>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th style={{width:36}}>
                  <input type="checkbox"
                    checked={selecionados.size === lista.length && lista.length > 0}
                    onChange={toggleTodos}
                    style={{accentColor:'var(--accent)'}}/>
                </th>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Parcelas</th>
                <th>Dias atraso</th>
                <th>Total em aberto</th>
                <th style={{width:120}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(item => {
                const { aluno, turma, pagamentos: pgs, totalEmAberto, diasMaisAntigo, qtdParcelas } = item
                const jaEnviado = enviados.has(aluno.id)
                return (
                  <tr key={aluno.id} style={{opacity: jaEnviado ? .7 : 1}}>
                    <td>
                      <input type="checkbox"
                        checked={selecionados.has(aluno.id)}
                        onChange={()=>toggleSel(aluno.id)}
                        style={{accentColor:'var(--accent)'}}/>
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div style={{
                          width:30,height:30,borderRadius:'50%',flexShrink:0,
                          background: diasMaisAntigo>90?'var(--red)':diasMaisAntigo>30?'#e8a020':'var(--yellow)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:10,fontWeight:700,color:'#fff',fontFamily:"'Syne',sans-serif",
                        }}>
                          {aluno.nome.split(' ').slice(0,2).map(x=>x[0]).join('')}
                        </div>
                        <div>
                          <div style={{fontWeight:500,color:'var(--text-1)',fontSize:13}}>{aluno.nome}</div>
                          <div style={{fontSize:11,color:'var(--text-3)'}}>
                            {aluno.respNome ? `Resp: ${aluno.respNome}` : aluno.email || '—'}
                          </div>
                        </div>
                        {jaEnviado && (
                          <span className="badge bg-green" style={{fontSize:9,marginLeft:4}}>Notificado</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {turma
                        ? <span className="badge bg-blue" style={{fontSize:11}}>{turma.codigo}</span>
                        : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>
                      }
                    </td>
                    <td>
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        {pgs.map(p => (
                          <div key={p.id} style={{fontSize:11,color:'var(--text-2)',display:'flex',gap:6,alignItems:'center'}}>
                            <span style={{color:'var(--text-3)'}}>{mesLabel(p.mes)}</span>
                            <span style={{color:corDias(p.diasAtraso),fontWeight:500}}>{formatBRL(p.valorAtualizado)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontWeight:700, fontSize:13,
                        color: corDias(diasMaisAntigo),
                      }}>
                        {diasMaisAntigo}d
                      </span>
                    </td>
                    <td>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:'var(--red)'}}>
                        {formatBRL(totalEmAberto)}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-ghost btn-xs" title="Enviar recado de cobrança"
                          disabled={enviando}
                          onClick={()=>enviarRecados([aluno.id])}>
                          <MessageSquare size={12}/>
                        </button>
                        <button className="btn btn-ghost btn-xs" title="WhatsApp"
                          style={{color:'#25d366'}}
                          onClick={()=>abrirWhatsApp(item)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
