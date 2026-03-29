/**
 * Estoque.jsx — Controle de Estoque e Material Didático (v5.11)
 *
 * Funcionalidades:
 *  - Cadastro de itens (livros, apostilas, materiais, uniformes, etc.)
 *  - Movimentações: entrada, saída e ajuste de inventário
 *  - KPIs: total de itens, itens abaixo do mínimo, valor total do estoque
 *  - Histórico de movimentações por item
 *  - Alerta visual para itens com estoque crítico (quantidade ≤ mínimo)
 *
 * Rota: /estoque
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Package, Plus, Pencil, Trash2, RefreshCw, Search, X,
  ArrowUpCircle, ArrowDownCircle, SlidersHorizontal,
  AlertTriangle, TrendingUp, TrendingDown, Archive,
  ChevronDown, ChevronUp, History, Save, Filter,
} from 'lucide-react'
import { formatBRL } from '../context/AppContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

const CATEGORIAS = ['Livro', 'Apostila', 'Material de Escritório', 'Uniforme', 'Equipamento', 'Outro']
const UNIDADES   = ['unid', 'cx', 'pacote', 'resma', 'par', 'kit', 'rolo']
const MOTIVOS_ENTRADA = ['Compra', 'Devolução de aluno', 'Doação', 'Ajuste de inventário']
const MOTIVOS_SAIDA   = ['Empréstimo para aluno', 'Venda', 'Uso interno', 'Descarte', 'Perda', 'Ajuste de inventário']

function getReq() {
  try {
    const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
    return { userId: u.id, userLogin: u.login || 'sistema' }
  } catch { return { userLogin: 'sistema' } }
}

// ── Modal de criar/editar item ────────────────────────────────────────────────
function ModalItem({ item, onSave, onClose }) {
  const isNovo = !item?.id
  const [form, setForm] = useState({
    nome:       item?.nome        || '',
    categoria:  item?.categoria   || 'Livro',
    descricao:  item?.descricao   || '',
    unidade:    item?.unidade     || 'unid',
    quantidade: item?.quantidade  ?? 0,
    minimo:     item?.minimo      ?? 0,
    precoCusto: item?.preco_custo ?? 0,
    precoVenda: item?.preco_venda ?? 0,
    codigo:     item?.codigo      || '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function f(k, v) { setForm(x => ({ ...x, [k]: v })) }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    setSalvando(true); setErro('')
    const api = window.electronAPI
    const req = getReq()
    let res
    if (isNovo) res = await api?.estoqueCriar(form, req)
    else        res = await api?.estoqueEditar(item.id, form, req)
    setSalvando(false)
    if (res?.ok) onSave()
    else setErro(res?.erro || 'Erro ao salvar')
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 'min(520px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{isNovo ? 'Novo Item' : 'Editar Item'}</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {erro && <div style={{ background:'var(--red-dim)', color:'var(--red)', padding:'8px 12px', borderRadius:7, fontSize:12 }}>{erro}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field" style={{ gridColumn:'1/-1' }}>
              <label>Nome *</label>
              <input className="input" value={form.nome} onChange={e => f('nome', e.target.value)} placeholder="Ex: Livro de Inglês — Starter"/>
            </div>
            <div className="field">
              <label>Categoria</label>
              <select className="input" value={form.categoria} onChange={e => f('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Unidade</label>
              <select className="input" value={form.unidade} onChange={e => f('unidade', e.target.value)}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Quantidade inicial</label>
              <input className="input" type="number" min="0" value={form.quantidade} onChange={e => f('quantidade', e.target.value)}/>
            </div>
            <div className="field">
              <label>Estoque mínimo</label>
              <input className="input" type="number" min="0" value={form.minimo} onChange={e => f('minimo', e.target.value)}/>
            </div>
            <div className="field">
              <label>Preço de custo (R$)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.precoCusto} onChange={e => f('precoCusto', e.target.value)}/>
            </div>
            <div className="field">
              <label>Preço de venda (R$)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.precoVenda} onChange={e => f('precoVenda', e.target.value)}/>
            </div>
            <div className="field">
              <label>Código / SKU</label>
              <input className="input" value={form.codigo} onChange={e => f('codigo', e.target.value)} placeholder="Opcional"/>
            </div>
            <div className="field" style={{ gridColumn:'1/-1' }}>
              <label>Descrição</label>
              <textarea className="textarea" style={{ minHeight:56 }} value={form.descricao} onChange={e => f('descricao', e.target.value)} placeholder="Detalhes adicionais (edição, série, etc.)"/>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? <RefreshCw size={13} style={{ animation:'spin .7s linear infinite' }}/> : <Save size={13}/>}
            {salvando ? ' Salvando...' : ' Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Modal de movimentação ─────────────────────────────────────────────────────
function ModalMovimento({ item, tipoInicial, alunos, onSave, onClose }) {
  const [form, setForm] = useState({
    tipo:       tipoInicial || 'entrada',
    quantidade: 1,
    motivo:     '',
    alunoLsId:  '',
    data:       new Date().toISOString().split('T')[0],
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function f(k, v) { setForm(x => ({ ...x, [k]: v })) }

  const motivos = form.tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA

  async function salvar() {
    if (form.quantidade <= 0) { setErro('Quantidade deve ser maior que zero'); return }
    setSalvando(true); setErro('')
    const alunoSel = alunos.find(a => String(a.id) === String(form.alunoLsId))
    const dados = {
      itemId:    item.id,
      tipo:      form.tipo,
      quantidade: Number(form.quantidade),
      motivo:    form.motivo,
      alunoLsId: form.alunoLsId || null,
      alunoNome: alunoSel?.nome || '',
      data:      form.data,
    }
    const res = await window.electronAPI?.estoqueMovimentar(dados, getReq())
    setSalvando(false)
    if (res?.ok) onSave(res.novaQuantidade)
    else setErro(res?.erro || 'Erro ao registrar movimentação')
  }

  const corTipo = form.tipo === 'entrada' ? 'var(--accent)' : form.tipo === 'saida' ? 'var(--red)' : 'var(--yellow)'

  return createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width:'min(440px,96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Movimentar Estoque — {item.nome}</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {erro && <div style={{ background:'var(--red-dim)', color:'var(--red)', padding:'8px 12px', borderRadius:7, fontSize:12 }}>{erro}</div>}

          {/* Tipo */}
          <div style={{ display:'flex', gap:6 }}>
            {[
              { v:'entrada', label:'Entrada', icon:<ArrowUpCircle size={14}/>, cor:'var(--accent)' },
              { v:'saida',   label:'Saída',   icon:<ArrowDownCircle size={14}/>, cor:'var(--red)' },
              { v:'ajuste',  label:'Ajuste',  icon:<SlidersHorizontal size={14}/>, cor:'var(--yellow)' },
            ].map(t => (
              <button
                key={t.v}
                onClick={() => f('tipo', t.v)}
                style={{
                  flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                  padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
                  border: `2px solid ${form.tipo === t.v ? t.cor : 'var(--border)'}`,
                  background: form.tipo === t.v ? `color-mix(in srgb, ${t.cor} 15%, transparent)` : 'transparent',
                  color: form.tipo === t.v ? t.cor : 'var(--text-2)',
                  transition:'all .15s',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field">
              <label>{form.tipo === 'ajuste' ? 'Nova quantidade total' : 'Quantidade'}</label>
              <input className="input" type="number" min={form.tipo === 'ajuste' ? 0 : 1} value={form.quantidade} onChange={e => f('quantidade', e.target.value)}/>
            </div>
            <div className="field">
              <label>Data</label>
              <input className="input" type="date" value={form.data} onChange={e => f('data', e.target.value)}/>
            </div>
            <div className="field" style={{ gridColumn:'1/-1' }}>
              <label>Motivo</label>
              <select className="input" value={form.motivo} onChange={e => f('motivo', e.target.value)}>
                <option value="">Selecione...</option>
                {motivos.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            {form.tipo === 'saida' && (
              <div className="field" style={{ gridColumn:'1/-1' }}>
                <label>Aluno (opcional)</label>
                <select className="input" value={form.alunoLsId} onChange={e => f('alunoLsId', e.target.value)}>
                  <option value="">— Nenhum —</option>
                  {alunos.filter(a => a.status === 'Ativo').map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Resumo */}
          <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--bg-hover)', fontSize:12 }}>
            <span style={{ color:'var(--text-2)' }}>Estoque atual: </span>
            <strong style={{ color:'var(--text-1)' }}>{item.quantidade} {item.unidade}</strong>
            {form.tipo !== 'ajuste' && form.quantidade > 0 && (
              <>
                <span style={{ color:'var(--text-3)', margin:'0 6px' }}>→</span>
                <strong style={{ color: corTipo }}>
                  {form.tipo === 'entrada'
                    ? item.quantidade + form.quantidade
                    : Math.max(0, item.quantidade - form.quantidade)
                  } {item.unidade}
                </strong>
              </>
            )}
            {form.tipo === 'ajuste' && (
              <>
                <span style={{ color:'var(--text-3)', margin:'0 6px' }}>→</span>
                <strong style={{ color: corTipo }}>{form.quantidade} {item.unidade}</strong>
              </>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? <RefreshCw size={13} style={{ animation:'spin .7s linear infinite' }}/> : <Save size={13}/>}
            {salvando ? ' Salvando...' : ' Confirmar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Estoque() {
  const [itens,      setItens]      = useState([])
  const [resumo,     setResumo]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [busca,      setBusca]      = useState('')
  const [filtCat,    setFiltCat]    = useState('')
  const [soBaixo,    setSoBaixo]    = useState(false)
  const [modalItem,  setModalItem]  = useState(null)   // null | 'novo' | item
  const [modalMov,   setModalMov]   = useState(null)   // null | { item, tipo }
  const [confirmDel, setConfirmDel] = useState(null)
  const [expandido,  setExpandido]  = useState(null)   // id do item expandido (histórico)
  const [historico,  setHistorico]  = useState([])
  const [loadHist,   setLoadHist]   = useState(false)
  const [toast,      setToast]      = useState('')
  const [alunos,     setAlunos]     = useState([])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  const carregar = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.estoqueListar) return
    setLoading(true)
    const [lista, res] = await Promise.all([
      api.estoqueListar({ somenteAtivos: true, somenteAbaixoMinimo: soBaixo }),
      api.estoqueResumo(),
    ])
    setItens(lista || [])
    setResumo(res  || null)
    setLoading(false)
  }, [soBaixo])

  useEffect(() => { carregar() }, [carregar])

  // Carrega alunos para o modal de movimentação
  useEffect(() => {
    window.electronAPI?.alunosListar({}).then(l => setAlunos(l || [])).catch(() => {})
  }, [])

  async function carregarHistorico(itemId) {
    if (expandido === itemId) { setExpandido(null); setHistorico([]); return }
    setExpandido(itemId); setLoadHist(true)
    const lista = await window.electronAPI?.estoqueMovimentos({ itemId }) || []
    setHistorico(lista)
    setLoadHist(false)
  }

  async function deletar() {
    const res = await window.electronAPI?.estoqueDeletar(confirmDel.id, getReq())
    setConfirmDel(null)
    if (res?.ok) { showToast('Item excluído.'); carregar() }
    else showToast('Erro ao excluir item.')
  }

  const categorias = useMemo(() => [...new Set(itens.map(i => i.categoria).filter(Boolean))].sort(), [itens])

  const itensFiltrados = useMemo(() => {
    let l = itens
    if (filtCat) l = l.filter(i => i.categoria === filtCat)
    if (busca)   l = l.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()) || i.codigo?.includes(busca))
    return l
  }, [itens, filtCat, busca])

  const itensCriticos = useMemo(() => itens.filter(i => i.quantidade <= i.minimo), [itens])

  function badgeCritico(item) {
    if (item.quantidade === 0) return { label:'SEM ESTOQUE', cor:'var(--red)' }
    if (item.quantidade <= item.minimo) return { label:'ESTOQUE BAIXO', cor:'var(--yellow)' }
    return null
  }

  return (
    <div className="fade-up" style={{ maxWidth:1100, margin:'0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:10, padding:'10px 18px', fontSize:13, color:'var(--text-1)',
          boxShadow:'0 4px 16px rgba(0,0,0,.3)', zIndex:9999, pointerEvents:'none',
        }}>{toast}</div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Itens cadastrados', valor: resumo?.total ?? itens.length, icon:<Package size={18}/>, cor:'var(--accent)' },
          { label:'Estoque crítico',   valor: resumo?.abaixo ?? itensCriticos.length, icon:<AlertTriangle size={18}/>, cor:'var(--yellow)' },
          { label:'Valor em estoque',  valor: formatBRL(resumo?.valorTotal ?? 0), icon:<TrendingUp size={18}/>, cor:'var(--blue)', isStr:true },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`color-mix(in srgb, ${k.cor} 15%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', color:k.cor, flexShrink:0 }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:'var(--text-1)', lineHeight:1 }}>
                {k.isStr ? k.valor : k.valor}
              </div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
          <input
            className="input" style={{ paddingLeft:30 }}
            placeholder="Buscar item ou código..."
            value={busca} onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select className="input" style={{ width:'auto' }} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          className={`btn ${soBaixo ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setSoBaixo(v => !v)}
          title="Mostrar apenas itens com estoque baixo"
        >
          <Filter size={13}/> Estoque crítico
        </button>
        <button className="btn btn-secondary btn-sm" onClick={carregar} title="Recarregar">
          <RefreshCw size={13} style={loading ? { animation:'spin .7s linear infinite' } : {}}/>
        </button>
        <button className="btn btn-primary" onClick={() => setModalItem('novo')}>
          <Plus size={14}/> Novo Item
        </button>
      </div>

      {/* Lista */}
      <div className="card" style={{ overflow:'hidden', padding:0 }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>
            <RefreshCw size={28} style={{ animation:'spin .7s linear infinite' }}/>
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="empty" style={{ padding:48 }}>
            <Archive size={42} style={{ opacity:.25 }}/>
            <p>{busca || filtCat || soBaixo ? 'Nenhum item encontrado para este filtro.' : 'Nenhum item cadastrado ainda.'}</p>
            {!busca && !filtCat && !soBaixo && (
              <button className="btn btn-primary btn-sm" onClick={() => setModalItem('novo')}>
                <Plus size={13}/> Cadastrar primeiro item
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Item', 'Categoria', 'Qtd.', 'Mínimo', 'Vlr. Custo', 'Vlr. Venda', ''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map(item => {
                const badge   = badgeCritico(item)
                const aberto  = expandido === item.id
                return (
                  <React.Fragment key={item.id}>
                    <tr style={{ borderBottom:'1px solid var(--border)', background: aberto ? 'var(--bg-hover)' : 'transparent' }}>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ fontWeight:500, fontSize:13, color:'var(--text-1)' }}>{item.nome}</div>
                        {item.codigo && <div style={{ fontSize:11, color:'var(--text-3)' }}>#{item.codigo}</div>}
                        {badge && (
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:.4, padding:'1px 5px', borderRadius:3, background:`color-mix(in srgb, ${badge.cor} 18%, transparent)`, color:badge.cor, border:`1px solid ${badge.cor}`, marginTop:3, display:'inline-block' }}>
                            {badge.label}
                          </span>
                        )}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-2)' }}>{item.categoria || '—'}</td>
                      <td style={{ padding:'11px 14px', fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color: badge ? badge.cor : 'var(--text-1)' }}>
                        {item.quantidade} <span style={{ fontSize:10, fontWeight:400, color:'var(--text-3)' }}>{item.unidade}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-3)' }}>{item.minimo} {item.unidade}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-2)' }}>{item.preco_custo > 0 ? formatBRL(item.preco_custo) : '—'}</td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-2)' }}>{item.preco_venda > 0 ? formatBRL(item.preco_venda) : '—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
                          <button className="btn btn-secondary btn-xs" title="Entrada" onClick={() => setModalMov({ item, tipo:'entrada' })}>
                            <ArrowUpCircle size={12} style={{ color:'var(--accent)' }}/>
                          </button>
                          <button className="btn btn-secondary btn-xs" title="Saída" onClick={() => setModalMov({ item, tipo:'saida' })}>
                            <ArrowDownCircle size={12} style={{ color:'var(--red)' }}/>
                          </button>
                          <button className="btn btn-secondary btn-xs" title="Histórico" onClick={() => carregarHistorico(item.id)}>
                            <History size={12}/>
                            {aberto ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                          </button>
                          <button className="btn btn-secondary btn-xs" title="Editar" onClick={() => setModalItem(item)}>
                            <Pencil size={12}/>
                          </button>
                          <button className="btn btn-danger btn-xs" title="Excluir" onClick={() => setConfirmDel(item)}>
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Histórico inline */}
                    {aberto && (
                      <tr>
                        <td colSpan={7} style={{ padding:'0 14px 14px', background:'var(--bg-hover)' }}>
                          <div style={{ borderTop:'1px solid var(--border)', paddingTop:10 }}>
                            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:.4, marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
                              <History size={12}/> Histórico de movimentações
                            </div>
                            {loadHist ? (
                              <div style={{ color:'var(--text-3)', fontSize:12 }}>
                                <RefreshCw size={12} style={{ animation:'spin .7s linear infinite' }}/> Carregando...
                              </div>
                            ) : historico.length === 0 ? (
                              <div style={{ color:'var(--text-3)', fontSize:12 }}>Nenhuma movimentação registrada.</div>
                            ) : (
                              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:220, overflowY:'auto' }}>
                                {historico.map(m => {
                                  const cor = m.tipo === 'entrada' ? 'var(--accent)' : m.tipo === 'saida' ? 'var(--red)' : 'var(--yellow)'
                                  const sinal = m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '−' : '='
                                  return (
                                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', borderRadius:7, background:'var(--bg-card)', fontSize:12 }}>
                                      <span style={{ fontWeight:700, color:cor, minWidth:24 }}>{sinal}{Math.abs(m.quantidade)}</span>
                                      <span style={{ color:'var(--text-2)', flex:1 }}>{m.motivo || m.tipo}</span>
                                      {m.aluno_nome && <span style={{ color:'var(--text-3)' }}>{m.aluno_nome}</span>}
                                      <span style={{ color:'var(--text-3)', flexShrink:0 }}>{m.data}</span>
                                      <span style={{ color:'var(--text-3)', flexShrink:0, fontSize:10 }}>{m.criado_por}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modais */}
      {modalItem && (
        <ModalItem
          item={modalItem === 'novo' ? null : modalItem}
          onSave={() => { setModalItem(null); carregar(); showToast(modalItem === 'novo' ? 'Item cadastrado!' : 'Item atualizado!') }}
          onClose={() => setModalItem(null)}
        />
      )}

      {modalMov && (
        <ModalMovimento
          item={modalMov.item}
          tipoInicial={modalMov.tipo}
          alunos={alunos}
          onSave={(novaQtd) => {
            setItens(prev => prev.map(i => i.id === modalMov.item.id ? { ...i, quantidade: novaQtd } : i))
            setModalMov(null)
            carregar()
            showToast('Movimentação registrada!')
          }}
          onClose={() => setModalMov(null)}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          danger
          title="Excluir item"
          msg={`Deseja excluir "${confirmDel.nome}"? Todo o histórico de movimentações será perdido.`}
          onConfirm={deletar}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
