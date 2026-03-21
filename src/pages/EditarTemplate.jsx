/**
 * EditarTemplate.jsx
 * Tela para criar ou editar um template de contrato.
 * Rotas: /contratos/template/novo  e  /contratos/template/editar/:id
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Upload, FileText, Plus, X,
  AlertCircle, Info, Eye, CheckCircle, Trash2
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import {
  templateStorage, detectarVariaveis, VARIAVEIS
} from '../utils/contratoUtils.js'

// Grupos para exibir as variáveis de forma organizada
const GRUPOS = ['Escola','Aluno','Endereço','Responsável','Curso','Financeiro','Assinatura','Campos Livres']

export default function EditarTemplate() {
  const nav    = useNavigate()
  const { id } = useParams()
  const isNovo = !id

  const { turmas, professores, showToast } = useApp()

  const [form, setForm] = useState({
    nome:        '',
    descricao:   '',
    vinculo:     'todos',
    docxBase64:  '',
    docxNome:    '',
    camposLivres: [], // array de { key, label }
  })
  const [erros,          setErros]         = useState({})
  const [salvando,       setSalvando]      = useState(false)
  const [varDetectadas,  setVarDetectadas] = useState([]) // variáveis encontradas no DOCX
  const [detectando,     setDetectando]    = useState(false)
  const [novoLabel,      setNovoLabel]     = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (!isNovo && id) {
      const t = templateStorage.listar().find(t => String(t.id) === String(id))
      if (t) {
        setForm({ ...t })
        if (t.docxBase64) detectarVars(t.docxBase64)
      }
    }
  }, [id, isNovo])

  function f(k, v) {
    setForm(x => ({ ...x, [k]: v }))
    if (erros[k]) setErros(e => ({ ...e, [k]: '' }))
  }

  // ── Upload do DOCX ────────────────────────────────────────────────────────
  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(docx|doc)$/i)) {
      showToast('Selecione um arquivo .docx ou .doc', 'warning')
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      f('docxBase64', base64)
      f('docxNome',   file.name)
      await detectarVars(base64)
    }
    reader.readAsDataURL(file)
  }

  async function detectarVars(base64) {
    setDetectando(true)
    const vars = await detectarVariaveis(base64)
    setVarDetectadas(vars)
    setDetectando(false)
  }

  // ── Campos livres ─────────────────────────────────────────────────────────
  function adicionarCampoLivre() {
    const label = novoLabel.trim()
    if (!label) return
    const key = `campo_livre_${form.camposLivres.length + 1}`
    if (form.camposLivres.length >= 5) {
      showToast('Máximo de 5 campos livres.', 'warning')
      return
    }
    f('camposLivres', [...form.camposLivres, { key, label }])
    setNovoLabel('')
  }

  function removerCampoLivre(idx) {
    const list = form.camposLivres.filter((_, i) => i !== idx)
    // Renumera as chaves
    f('camposLivres', list.map((c, i) => ({ ...c, key: `campo_livre_${i+1}` })))
  }

  // ── Validação e salvar ────────────────────────────────────────────────────
  function validar() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (!form.docxBase64)  e.docx = 'Faça upload do arquivo DOCX'
    return e
  }

  function salvar() {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }
    setSalvando(true)
    if (isNovo) {
      templateStorage.adicionar(form)
      showToast('Template criado com sucesso!')
    } else {
      templateStorage.atualizar(Number(id), form)
      showToast('Template atualizado!')
    }
    nav('/contratos')
  }

  // ── Vinculação ────────────────────────────────────────────────────────────
  const opcVinculo = [
    { value: 'todos',   label: 'Todos os alunos' },
    ...turmas.filter(t => t.ativa).map(t => ({
      value: `turma:${t.id}`,
      label: `Turma ${t.codigo} — ${t.idioma}`,
    })),
    ...professores.filter(p => p.ativo).map(p => ({
      value: `professor:${p.id}`,
      label: `Professor ${p.nome}`,
    })),
  ]

  // ── Variáveis reconhecidas vs não mapeadas ────────────────────────────────
  const varsConhecidas   = varDetectadas.filter(v => VARIAVEIS.some(vv => vv.key === v))
  const varsDesconhecidas= varDetectadas.filter(v => !VARIAVEIS.some(vv => vv.key === v))

  return (
    <div className="fade-up" style={{ maxWidth:900, margin:'0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => nav('/contratos')} style={{ padding:'8px 12px' }}>
          <ArrowLeft size={16}/> Voltar
        </button>
        <div style={{ flex:1 }}>
          <div style={{
            fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800,
            color:'var(--text-1)', letterSpacing:-.3,
          }}>
            {isNovo ? 'Novo Template' : 'Editar Template'}
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {isNovo ? 'Faça upload do contrato DOCX e configure as variáveis' : `Editando: ${form.nome}`}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => nav('/contratos')}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{ minWidth:130 }}>
          {salvando
            ? <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#0d1a12', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
            : <><Save size={14}/> {isNovo ? 'Criar Template' : 'Salvar'}</>
          }
        </button>
      </div>

      {Object.keys(erros).length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom:16 }}>
          <AlertCircle size={15}/>
          <span>Corrija os campos destacados antes de salvar.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>

        {/* ── COLUNA ESQUERDA ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Identificação */}
          <div className="card" style={{ padding:'20px 22px' }}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:16, display:'flex', alignItems:'center', gap:7,
            }}>
              <FileText size={14} style={{ color:'var(--accent)' }}/> Identificação
            </div>
            <div className="form-grid">
              <div className="field form-full">
                <label>Nome do Template *</label>
                <input className="input" placeholder="Ex: Contrato Básico Inglês 2025"
                  value={form.nome} onChange={e => f('nome', e.target.value)}
                  style={{ borderColor: erros.nome ? 'var(--red)' : '' }}/>
                {erros.nome && <span style={{ fontSize:11, color:'var(--red)' }}>{erros.nome}</span>}
              </div>
              <div className="field form-full">
                <label>Descrição <span style={{ color:'var(--text-3)', fontWeight:400 }}>(opcional)</span></label>
                <input className="input" placeholder="Ex: Contrato padrão para alunos de inglês básico"
                  value={form.descricao} onChange={e => f('descricao', e.target.value)}/>
              </div>
              <div className="field form-full">
                <label>Vinculação</label>
                <select className="select" value={form.vinculo} onChange={e => f('vinculo', e.target.value)}>
                  {opcVinculo.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span className="input-hint">
                  Define para quais alunos este template será sugerido ao gerar contratos.
                </span>
              </div>
            </div>
          </div>

          {/* Upload DOCX */}
          <div className="card" style={{ padding:'20px 22px' }}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:12, display:'flex', alignItems:'center', gap:7,
            }}>
              <Upload size={14} style={{ color:'var(--blue)' }}/> Arquivo do Contrato
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${erros.docx ? 'var(--red)' : form.docxBase64 ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius:10, padding:'28px 20px', textAlign:'center',
                cursor:'pointer', transition:'all .2s',
                background: form.docxBase64 ? 'var(--accent-dim)' : 'var(--bg-hover)',
              }}
              onMouseEnter={e => { if (!form.docxBase64) e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { if (!form.docxBase64) e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <input ref={fileRef} type="file" accept=".docx,.doc"
                onChange={handleUpload} style={{ display:'none' }}/>
              {form.docxBase64 ? (
                <div>
                  <CheckCircle size={28} style={{ color:'var(--accent)', marginBottom:8 }}/>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--accent)' }}>
                    {form.docxNome}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>
                    Clique para trocar o arquivo
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={28} style={{ color:'var(--text-3)', marginBottom:8 }}/>
                  <div style={{ fontSize:14, fontWeight:500, color:'var(--text-2)' }}>
                    Clique para fazer upload
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>
                    Formatos aceitos: .docx · .doc
                  </div>
                </div>
              )}
            </div>
            {erros.docx && <span style={{ fontSize:11, color:'var(--red)', marginTop:4, display:'block' }}>{erros.docx}</span>}

            {/* Variáveis detectadas */}
            {detectando && (
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:12, textAlign:'center' }}>
                Analisando variáveis do documento...
              </div>
            )}
            {!detectando && varDetectadas.length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:8 }}>
                  Variáveis encontradas no documento ({varDetectadas.length}):
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {varsConhecidas.map(v => (
                    <span key={v} style={{
                      fontSize:11, padding:'3px 8px', borderRadius:6,
                      background:'var(--accent-dim)', color:'var(--accent)',
                      border:'1px solid var(--border-accent)',
                    }}>
                      {`{{${v}}}`}
                    </span>
                  ))}
                  {varsDesconhecidas.map(v => (
                    <span key={v} style={{
                      fontSize:11, padding:'3px 8px', borderRadius:6,
                      background:'var(--yel-dim)', color:'var(--yellow)',
                      border:'1px solid rgba(245,197,66,.3)',
                    }} title="Variável não reconhecida pelo sistema — será mantida em branco">
                      {`{{${v}}}`} ⚠️
                    </span>
                  ))}
                </div>
                {varsDesconhecidas.length > 0 && (
                  <div style={{ fontSize:11, color:'var(--yellow)', marginTop:6 }}>
                    Variáveis em amarelo não são reconhecidas e ficarão em branco no PDF.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Campos livres */}
          <div className="card" style={{ padding:'20px 22px' }}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:8, display:'flex', alignItems:'center', gap:7,
            }}>
              <Plus size={14} style={{ color:'var(--text-3)' }}/> Campos Livres Personalizados
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:14 }}>
              Campos preenchidos manualmente ao gerar cada contrato.
              Use <code style={{ background:'var(--bg-hover)', padding:'1px 4px', borderRadius:4 }}>{'{{campo_livre_1}}'}</code> até{' '}
              <code style={{ background:'var(--bg-hover)', padding:'1px 4px', borderRadius:4 }}>{'{{campo_livre_5}}'}</code> no DOCX.
            </div>

            {form.camposLivres.map((c, i) => (
              <div key={c.key} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'8px 10px', marginBottom:6,
                background:'var(--bg-hover)', borderRadius:8,
                border:'1px solid var(--border)',
              }}>
                <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
                  {`{{${c.key}}}`}
                </span>
                <span style={{ flex:1, fontSize:13, color:'var(--text-1)' }}>{c.label}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => removerCampoLivre(i)}>
                  <X size={11}/>
                </button>
              </div>
            ))}

            {form.camposLivres.length < 5 && (
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input
                  className="input"
                  placeholder="Ex: Preço total, Semestre, Nº de parcelas..."
                  value={novoLabel}
                  onChange={e => setNovoLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') adicionarCampoLivre() }}
                  style={{ flex:1 }}
                />
                <button className="btn btn-secondary" onClick={adicionarCampoLivre}>
                  <Plus size={14}/> Adicionar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── COLUNA DIREITA: referência de variáveis ── */}
        <div style={{ position:'sticky', top:16 }}>
          <div className="card" style={{ padding:'18px 20px' }}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
              color:'var(--text-1)', marginBottom:14,
            }}>
              📋 Variáveis Disponíveis
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:12 }}>
              Copie e cole no seu DOCX exatamente como mostrado.
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:16, maxHeight:560, overflowY:'auto' }}>
              {GRUPOS.map(grupo => {
                const vars = VARIAVEIS.filter(v => v.grupo === grupo)
                if (!vars.length) return null
                return (
                  <div key={grupo}>
                    <div style={{
                      fontSize:10, fontWeight:700, color:'var(--text-3)',
                      textTransform:'uppercase', letterSpacing:.8, marginBottom:6,
                    }}>{grupo}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {vars.map(v => {
                        const detectada = varDetectadas.includes(v.key)
                        return (
                          <div key={v.key} style={{
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            padding:'4px 8px', borderRadius:6,
                            background: detectada ? 'var(--accent-dim)' : 'var(--bg-hover)',
                            border: `1px solid ${detectada ? 'var(--border-accent)' : 'var(--border)'}`,
                          }}>
                            <span style={{
                              fontSize:11, fontFamily:"'DM Mono',monospace",
                              color: detectada ? 'var(--accent)' : 'var(--text-2)',
                            }}>
                              {`{{${v.key}}}`}
                            </span>
                            <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:6 }}>
                              {v.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
