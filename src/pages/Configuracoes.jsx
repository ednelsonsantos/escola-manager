import React, { useState } from 'react'
import { Building2, DollarSign, Monitor, Palette, Database, Save, RefreshCw, Sun, Moon, School, Image, Upload, Trash2, RotateCcw, FolderOpen, CheckCircle, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ConfirmModal } from '../components/Modal.jsx'

const SECTIONS = [
  { id:'identidade', label:'Identidade Visual', icon:Image     },
  { id:'escola',     label:'Escola',            icon:Building2 },
  { id:'financeiro', label:'Financeiro',        icon:DollarSign},
  { id:'aparencia',  label:'Aparência',         icon:Palette   },
  { id:'sistema',    label:'Sistema',           icon:Monitor   },
  { id:'dados',      label:'Dados',             icon:Database  },
]

const ACCENT_COLORS = [
  { val:'#63dcaa', label:'Verde (padrão)' },
  { val:'#5b9cf6', label:'Azul' },
  { val:'#f5c542', label:'Amarelo' },
  { val:'#f2617a', label:'Rosa' },
  { val:'#a78bfa', label:'Roxo' },
  { val:'#f97316', label:'Laranja' },
]

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <span className="toggle-slider"/>
    </label>
  )
}

export default function Configuracoes() {
  const { settings, updateSettings, resetData, limparTudo, restaurarBackup, showToast, exportJSON, exportCSV } = useApp()
  const { identidade, salvarIdentidade, selecionarLogo } = useAuth()
  const [sec,           setSec]          = useState('identidade')
  const [confirm,       setConfirm]      = useState(false)
  const [confirmLimpar, setConfirmLimpar]= useState(false)
  const [confirmRestore,setConfirmRestore]= useState(false) // dados do backup lido, aguarda confirm
  const [backupLido,    setBackupLido]   = useState(null)   // { dados, arquivo, stats }
  const [restoreStatus, setRestoreStatus]= useState(null)   // { ok, stats, erro } após restauração
  const [formE,   setFormE]   = useState({ ...settings.escola })
  const [formF,   setFormF]   = useState({ ...settings.financeiro })
  const [formId,  setFormId]  = useState({ nome_escola: identidade?.nome_escola||'', slogan: identidade?.slogan||'', logo_base64: identidade?.logo_base64||'', logo_nome: identidade?.logo_nome||'' })
  const [salvandoId, setSalvandoId] = useState(false)

  function saveEscola()      { updateSettings('escola',     formE) }
  function saveFinanceiro()  { updateSettings('financeiro', formF) }

  async function handleSelecionarBackup() {
    setRestoreStatus(null)
    const api = window.electronAPI
    if (!api?.backupSelecionarArquivo) {
      // Fallback: input file no browser (fora do Electron)
      const input = document.createElement('input')
      input.type = 'file'; input.accept = '.json'
      input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return
        const texto = await file.text()
        processarBackupTexto(texto, file.name)
      }
      input.click()
      return
    }
    const res = await api.backupSelecionarArquivo()
    if (!res?.ok) return
    processarBackupTexto(res.conteudo, res.arquivo)
  }

  function processarBackupTexto(texto, arquivo) {
    try {
      const dados = JSON.parse(texto)
      const stats = {
        alunos:      dados.alunos?.length      ?? '—',
        turmas:      dados.turmas?.length      ?? '—',
        professores: dados.professores?.length ?? '—',
        pagamentos:  dados.pagamentos?.length  ?? '—',
        eventos:     dados.eventos?.length     ?? '—',
        exportadoEm: dados.exportadoEm || null,
        versao:      dados.versao || '—',
      }
      setBackupLido({ dados, arquivo, stats })
      setConfirmRestore(true)
    } catch {
      showToast('Arquivo inválido — não foi possível ler o JSON.', 'error')
    }
  }

  function handleConfirmarRestore() {
    if (!backupLido) return
    const result = restaurarBackup(backupLido.dados)
    setRestoreStatus(result)
    setConfirmRestore(false)
    setBackupLido(null)
  }

  async function handleSelecionarLogo() {
    const res = await selecionarLogo()
    if (res) setFormId(f=>({...f, logo_base64:res.base64, logo_nome:res.nome}))
  }

  function handleRemoverLogo() { setFormId(f=>({...f, logo_base64:'', logo_nome:''})) }

  async function handleSalvarIdentidade() {
    setSalvandoId(true)
    const res = await salvarIdentidade(formId)
    setSalvandoId(false)
    if (res.ok) showToast('Identidade visual salva!')
    else showToast('Erro ao salvar', 'error')
  }
  function toggleTema()      { updateSettings('aparencia', { tema: settings.aparencia.tema==='dark'?'light':'dark' }) }
  function setAccent(c)      { updateSettings('aparencia', { accentColor: c }) }
  function toggleNotif(v)    { updateSettings('sistema', { notificacoes: v }) }
  function toggleBackup(v)   { updateSettings('sistema', { backupAuto: v }) }

  const tema = settings.aparencia?.tema || 'dark'

  return (
    <div className="fade-up">
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:0,minHeight:500}}>
        {/* MENU */}
        <div style={{borderRight:'1px solid var(--border)',paddingRight:4}}>
          {SECTIONS.map(s=>(
            <button key={s.id} className={`nav-btn${sec===s.id?' active':''}`} style={{marginBottom:2}} onClick={()=>setSec(s.id)}>
              <s.icon size={15}/> {s.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{paddingLeft:28,paddingBottom:32,overflow:'auto'}}>

          {/* IDENTIDADE VISUAL */}
          {sec==='identidade' && (
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Identidade Visual</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Logo, nome e slogan exibidos no sistema e na tela de login</div>

              {/* Preview */}
              <div className="settings-card" style={{marginBottom:14}}>
                <div className="settings-card-title"><Image size={15}/>Pré-visualização</div>
                <div style={{display:'flex',alignItems:'center',gap:16,padding:'16px',background:'var(--bg-hover)',borderRadius:10}}>
                  {formId.logo_base64
                    ? <img src={formId.logo_base64} alt="Logo" style={{height:56,maxWidth:160,objectFit:'contain',borderRadius:8,background:'var(--bg-card)',padding:6}}/>
                    : <div style={{width:56,height:56,background:'linear-gradient(135deg,var(--accent),var(--blue))',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>🎓</div>
                  }
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:'var(--text-1)',letterSpacing:-.3}}>{formId.nome_escola||'Nome da Escola'}</div>
                    <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>{formId.slogan||'Slogan do sistema'}</div>
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <div className="settings-card" style={{marginBottom:14}}>
                <div className="settings-card-title"><Upload size={15}/>Logo da Escola</div>
                <div style={{display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
                  <button className="btn btn-secondary" onClick={handleSelecionarLogo}>
                    <Upload size={14}/> {formId.logo_base64 ? 'Trocar logo' : 'Selecionar logo'}
                  </button>
                  {formId.logo_base64 && (
                    <button className="btn btn-danger" onClick={handleRemoverLogo}>
                      <Trash2 size={14}/> Remover logo
                    </button>
                  )}
                </div>
                {formId.logo_nome && <div style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>Arquivo: {formId.logo_nome}</div>}
                <div style={{fontSize:12,color:'var(--text-3)',marginTop:8}}>
                  Formatos aceitos: PNG, JPG, SVG, WebP · Recomendado: fundo transparente, até 300×100px
                </div>
              </div>

              {/* Nome e slogan */}
              <div className="settings-card">
                <div className="settings-card-title"><School size={15}/>Textos do Sistema</div>
                <div className="form-grid">
                  <div className="field form-full">
                    <label>Nome da Escola (exibido no sistema)</label>
                    <input className="input" placeholder="Ex: Fluent English" value={formId.nome_escola||''} onChange={e=>setFormId(f=>({...f,nome_escola:e.target.value}))}/>
                  </div>
                  <div className="field form-full">
                    <label>Slogan / Subtítulo</label>
                    <input className="input" placeholder="Ex: Sistema de Gestão de Idiomas" value={formId.slogan||''} onChange={e=>setFormId(f=>({...f,slogan:e.target.value}))}/>
                  </div>
                </div>
                <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
                  <button className="btn btn-primary" onClick={handleSalvarIdentidade} disabled={salvandoId}>
                    <Save size={14}/> {salvandoId?'Salvando...':'Salvar Identidade'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ESCOLA */}
          {sec==='escola' && (
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Dados da Escola</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Informações da instituição</div>
              <div className="settings-card">
                <div className="settings-card-title"><School size={15}/>Informações Básicas</div>
                <div className="form-grid">
                  <div className="field form-full"><label>Nome da Escola</label><input className="input" value={formE.nome||''} onChange={e=>setFormE(f=>({...f,nome:e.target.value}))}/></div>
                  <div className="field"><label>CNPJ</label><input className="input" placeholder="00.000.000/0001-00" value={formE.cnpj||''} onChange={e=>setFormE(f=>({...f,cnpj:e.target.value}))}/></div>
                  <div className="field"><label>Telefone</label><input className="input" value={formE.telefone||''} onChange={e=>setFormE(f=>({...f,telefone:e.target.value}))}/></div>
                  <div className="field form-full"><label>E-mail</label><input className="input" type="email" value={formE.email||''} onChange={e=>setFormE(f=>({...f,email:e.target.value}))}/></div>
                  <div className="field form-full"><label>Endereço</label><input className="input" value={formE.endereco||''} onChange={e=>setFormE(f=>({...f,endereco:e.target.value}))}/></div>
                  <div className="field"><label>Cidade</label><input className="input" value={formE.cidade||''} onChange={e=>setFormE(f=>({...f,cidade:e.target.value}))}/></div>
                </div>
                <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
                  <button className="btn btn-primary" onClick={saveEscola}><Save size={14}/> Salvar</button>
                </div>
              </div>
            </div>
          )}

          {/* FINANCEIRO */}
          {sec==='financeiro' && (
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Configurações Financeiras</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Regras de cobrança e vencimentos</div>
              <div className="settings-card">
                <div className="settings-card-title"><DollarSign size={15}/>Cobranças</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Dia de Vencimento</label>
                    <input className="input" type="number" min={1} max={28} value={formF.diaVencimento||10} onChange={e=>setFormF(f=>({...f,diaVencimento:Number(e.target.value)}))}/>
                    <span className="input-hint">Dia do mês para vencimento das mensalidades (1-28) — usado ao gerar mensalidades</span>
                  </div>
                  <div className="field">
                    <label>Juros por Atraso (%)</label>
                    <input className="input" type="number" step="0.1" value={formF.jurosAtraso||2} onChange={e=>setFormF(f=>({...f,jurosAtraso:Number(e.target.value)}))}/>
                    <span className="input-hint">⚠️ Salvo para referência — cálculo automático de juros previsto para v6</span>
                  </div>
                  <div className="field">
                    <label>Multa por Atraso (%)</label>
                    <input className="input" type="number" step="0.1" value={formF.multaAtraso||10} onChange={e=>setFormF(f=>({...f,multaAtraso:Number(e.target.value)}))}/>
                    <span className="input-hint">⚠️ Salvo para referência — cálculo automático de multa previsto para v6</span>
                  </div>
                </div>
                <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
                  <button className="btn btn-primary" onClick={saveFinanceiro}><Save size={14}/> Salvar</button>
                </div>
              </div>
            </div>
          )}

          {/* APARÊNCIA */}
          {sec==='aparencia' && (
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Aparência</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Personalize a interface do sistema</div>

              <div className="settings-card">
                <div className="settings-card-title"><Palette size={15}/>Tema</div>
                <div style={{display:'flex',gap:12}}>
                  {[
                    { val:'dark',  label:'Escuro', icon:Moon,  desc:'Interface com fundo escuro' },
                    { val:'light', label:'Claro',  icon:Sun,   desc:'Interface com fundo claro' },
                  ].map(t=>(
                    <div
                      key={t.val}
                      onClick={()=>updateSettings('aparencia',{tema:t.val})}
                      style={{
                        flex:1, padding:'16px', borderRadius:12, cursor:'pointer',
                        border:`2px solid ${tema===t.val?'var(--accent)':'var(--border)'}`,
                        background: tema===t.val?'var(--accent-dim)':'var(--bg-hover)',
                        transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:8
                      }}
                    >
                      <t.icon size={22} style={{color:tema===t.val?'var(--accent)':'var(--text-3)'}}/>
                      <div style={{fontWeight:600,fontSize:14,color:tema===t.val?'var(--accent)':'var(--text-1)'}}>{t.label}</div>
                      <div style={{fontSize:11,color:'var(--text-3)',textAlign:'center'}}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-title"><Palette size={15}/>Cor de Destaque</div>
                <div className="color-swatches">
                  {ACCENT_COLORS.map(c=>(
                    <div key={c.val} title={c.label}
                      className={`swatch${settings.aparencia?.accentColor===c.val?' selected':''}`}
                      style={{background:c.val}}
                      onClick={()=>setAccent(c.val)}
                    />
                  ))}
                </div>
                <div style={{marginTop:10,fontSize:12,color:'var(--text-3)'}}>
                  A cor de destaque é usada em botões, links ativos e gráficos.
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-title"><Palette size={15}/>Tamanho do Texto</div>
                <div style={{display:'flex',gap:10}}>
                  {[
                    { val:'compacto', label:'Compacto', desc:'88% — mais informações na tela' },
                    { val:'normal',   label:'Normal',   desc:'100% — padrão recomendado' },
                    { val:'grande',   label:'Grande',   desc:'110% — maior legibilidade' },
                  ].map(opt => {
                    const ativo = (settings.aparencia?.fontSize || 'normal') === opt.val
                    return (
                      <div key={opt.val} onClick={()=>updateSettings('aparencia',{fontSize:opt.val})}
                        style={{
                          flex:1, padding:'14px 12px', borderRadius:10, cursor:'pointer',
                          border:`2px solid ${ativo?'var(--accent)':'var(--border)'}`,
                          background: ativo?'var(--accent-dim)':'var(--bg-hover)',
                          transition:'all .2s', textAlign:'center',
                        }}
                      >
                        <div style={{
                          fontWeight:600, marginBottom:4, color:ativo?'var(--accent)':'var(--text-1)',
                          fontSize: opt.val==='compacto'?'11px':opt.val==='grande'?'16px':'13px',
                        }}>{opt.label}</div>
                        <div style={{fontSize:11,color:'var(--text-3)'}}>{opt.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SISTEMA */}
          {sec==='sistema' && (
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Sistema</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Preferências gerais do sistema</div>

              <div className="settings-card">
                <div className="settings-card-title"><Monitor size={15}/>Notificações e Automação</div>
                <div className="toggle-row">
                  <div><div className="toggle-label">Notificações de inadimplência</div><div className="toggle-desc">Exibir alerta na barra lateral quando houver pagamentos atrasados</div></div>
                  <Toggle checked={settings.sistema?.notificacoes??true} onChange={toggleNotif}/>
                </div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Backup automático ao fechar</div>
                    <div className="toggle-desc">
                      Salva um arquivo JSON com todos os dados em{' '}
                      <code style={{fontSize:10,background:'var(--bg-hover)',padding:'1px 5px',borderRadius:4,color:'var(--text-2)'}}>
                        %APPDATA%\Escola Manager\backups\
                      </code>
                      {' '}ao fechar o app. Mantém os últimos 10 backups automaticamente.
                    </div>
                    {settings.sistema?.backupAuto && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{marginTop:8,fontSize:11}}
                        onClick={()=>window.electronAPI?.backupAbrirPasta?.()}
                      >
                        📁 Abrir pasta de backups
                      </button>
                    )}
                  </div>
                  <Toggle checked={settings.sistema?.backupAuto??false} onChange={toggleBackup}/>
                </div>
              </div>

              <div className="settings-card" style={{marginTop:14}}>
                <div className="settings-card-title"><Monitor size={15}/>Informações do Sistema</div>
                {[
                  ['Versão',         'Escola Manager v5.1.1'],
                  ['Ambiente',       'Electron 29 + React 18 + Vite 5'],
                  ['Banco de dados', 'SQLite (better-sqlite3) + localStorage'],
                  ['Licença',        'GNU GPL v3.0 — Free to Use Forever'],
                  ['Desenvolvedor',  'Ednelson Santos'],
                  ['Contato',        'github.com/ednelsonsantos'],
                ].map(([k,v])=>(
                  <div className="detail-row" key={k}>
                    <span className="detail-key">{k}</span>
                    <span className="detail-val" style={{
                      fontSize:13,
                      color: k==='Licença' ? 'var(--accent)' : k==='Desenvolvedor' ? 'var(--text-1)' : 'var(--text-2)',
                      fontWeight: k==='Desenvolvedor' ? 600 : 400,
                    }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="settings-card" style={{marginTop:14, background:'var(--accent-dim)', border:'1px solid var(--border-accent)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:22}}>🎓</span>
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:'var(--text-1)'}}>
                      Escola Manager v5.1.1
                    </div>
                    <div style={{fontSize:12,color:'var(--text-2)',marginTop:2}}>
                      Software livre sob licença GPL-3.0 · Criado por <strong>Ednelson Santos</strong>
                    </div>
                    <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>
                      © 2025 · Uso gratuito para qualquer finalidade · Código-fonte aberto
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DADOS */}
          {sec==='dados' && (
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:4}}>Gerenciamento de Dados</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Exportação, backup e redefinição</div>

              <div className="settings-card">
                <div className="settings-card-title"><Database size={15}/>Exportar Dados</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[
                    ['Exportar Alunos (CSV)',        'Lista de alunos em formato CSV',             ()=>exportCSV('alunos')],
                    ['Exportar Pagamentos (CSV)',     'Histórico de cobranças em CSV',              ()=>exportCSV('pagamentos')],
                    ['Exportar Backup Completo (JSON)','Todos os dados do sistema em JSON',        ()=>exportJSON('completo')],
                  ].map(([label, desc, action])=>(
                    <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontSize:13.5,color:'var(--text-1)',fontWeight:450}}>{label}</div>
                        <div style={{fontSize:11.5,color:'var(--text-3)'}}>{desc}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={action}>Exportar</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RESTAURAR BACKUP ── */}
              <div className="settings-card" style={{marginTop:14}}>
                <div className="settings-card-title"><RotateCcw size={15}/>Restaurar Backup</div>

                {/* Resultado de restauração anterior */}
                {restoreStatus && (
                  <div style={{
                    marginBottom:16, padding:'12px 14px', borderRadius:9,
                    background: restoreStatus.ok ? 'var(--accent-dim)' : 'var(--red-dim)',
                    border: `1px solid ${restoreStatus.ok ? 'var(--border-accent)' : 'rgba(242,97,122,.3)'}`,
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:restoreStatus.ok?8:0}}>
                      {restoreStatus.ok
                        ? <CheckCircle size={15} style={{color:'var(--accent)',flexShrink:0}}/>
                        : <AlertTriangle size={15} style={{color:'var(--red)',flexShrink:0}}/>
                      }
                      <strong style={{fontSize:13,color:restoreStatus.ok?'var(--accent)':'var(--red)'}}>
                        {restoreStatus.ok ? 'Backup restaurado com sucesso!' : restoreStatus.erro}
                      </strong>
                    </div>
                    {restoreStatus.ok && restoreStatus.stats && (
                      <div style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:12,color:'var(--text-2)',paddingLeft:23}}>
                        <span>{restoreStatus.stats.alunos} alunos</span>
                        <span>{restoreStatus.stats.turmas} turmas</span>
                        <span>{restoreStatus.stats.professores} professores</span>
                        <span>{restoreStatus.stats.pagamentos} pagamentos</span>
                        {restoreStatus.stats.exportadoEm && (
                          <span style={{color:'var(--text-3)'}}>
                            Backup de {new Date(restoreStatus.stats.exportadoEm).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div style={{fontSize:13,color:'var(--text-2)',marginBottom:16,lineHeight:1.6}}>
                  Selecione um arquivo <code style={{fontSize:11,background:'var(--bg-hover)',padding:'1px 5px',borderRadius:4,color:'var(--text-2)'}}>escola-backup-*.json</code> gerado pelo sistema.
                  Todos os dados atuais serão <strong>substituídos</strong> pelos dados do backup.
                </div>

                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <button className="btn btn-primary" onClick={handleSelecionarBackup}>
                    <FolderOpen size={14}/> Selecionar arquivo de backup
                  </button>
                  {window.electronAPI?.backupListar && (
                    <button className="btn btn-secondary" onClick={()=>window.electronAPI?.backupAbrirPasta?.()}>
                      📁 Ver pasta de backups
                    </button>
                  )}
                </div>

                <div style={{
                  marginTop:14,padding:'10px 12px',background:'var(--bg-hover)',
                  borderRadius:8,fontSize:11.5,color:'var(--text-3)',lineHeight:1.5,
                }}>
                  <strong style={{color:'var(--text-2)'}}>Dica:</strong> Os backups automáticos ficam em{' '}
                  <code style={{fontSize:10,color:'var(--text-2)'}}>%APPDATA%\Escola Manager\backups\</code>.
                  Você também pode restaurar qualquer backup manual exportado em Exportar Dados acima.
                </div>
              </div>

              <div className="settings-card" style={{marginTop:14, border:'1px solid var(--red-dim)'}}>
                <div className="settings-card-title" style={{color:'var(--red)'}}>⚠️ Zona de Risco</div>
                <div style={{fontSize:13,color:'var(--text-2)',marginBottom:16}}>
                  As ações abaixo são <strong>irreversíveis</strong>. Não podem ser desfeitas.
                </div>

                {/* Ação 1 — Limpar tudo (uso principal) */}
                <div style={{
                  padding:'14px 16px', background:'var(--red-dim)',
                  border:'1px solid rgba(242,97,122,.25)', borderRadius:10, marginBottom:12,
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12}}>
                    <div>
                      <div style={{fontSize:14, fontWeight:600, color:'var(--red)', marginBottom:3}}>
                        🗑️ Limpar todos os dados
                      </div>
                      <div style={{fontSize:12.5, color:'var(--text-2)', lineHeight:1.5}}>
                        Remove <strong>todos</strong> os alunos, turmas, professores, pagamentos e eventos.
                        Deixa o sistema completamente vazio, pronto para uso real da sua escola.
                        As configurações (tema, nome da escola, financeiro) são preservadas.
                      </div>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{flexShrink:0}}
                      onClick={()=>setConfirmLimpar(true)}
                    >
                      Limpar tudo
                    </button>
                  </div>
                </div>

                {/* Ação 2 — Carregar dados demo (uso secundário) */}
                <div style={{
                  padding:'14px 16px', background:'var(--bg-hover)',
                  border:'1px solid var(--border)', borderRadius:10,
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12}}>
                    <div>
                      <div style={{fontSize:14, fontWeight:600, color:'var(--text-1)', marginBottom:3}}>
                        🔄 Carregar dados de demonstração
                      </div>
                      <div style={{fontSize:12.5, color:'var(--text-2)', lineHeight:1.5}}>
                        Substitui todos os dados pelos exemplos de demonstração
                        (15 alunos fictícios, 8 turmas, 5 professores e histórico de pagamentos).
                        Útil para testar o sistema ou treinamento.
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{flexShrink:0}}
                      onClick={()=>setConfirm(true)}
                    >
                      Carregar demo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Limpar tudo */}
      {confirmLimpar && (
        <ConfirmModal
          title="⚠️ Limpar todos os dados"
          msg={
            'Esta ação irá remover PERMANENTEMENTE todos os alunos, turmas, professores, ' +
            'pagamentos e eventos do sistema.\n\n' +
            'Use esta opção para começar do zero com dados reais da sua escola.\n\n' +
            'As configurações do sistema (tema, nome da escola, financeiro) serão mantidas.\n\n' +
            'Esta ação NÃO pode ser desfeita.'
          }
          onConfirm={()=>{ limparTudo(); setConfirmLimpar(false) }}
          onClose={()=>setConfirmLimpar(false)}
          danger
        />
      )}

      {/* Modal: Confirmar restauração */}
      {confirmRestore && backupLido && (
        <ConfirmModal
          title="Confirmar Restauração de Backup"
          msg={
            `Arquivo: ${backupLido.arquivo}\n\n` +
            `Este backup contém:\n` +
            `  • ${backupLido.stats.alunos} alunos\n` +
            `  • ${backupLido.stats.turmas} turmas\n` +
            `  • ${backupLido.stats.professores} professores\n` +
            `  • ${backupLido.stats.pagamentos} pagamentos\n` +
            `  • ${backupLido.stats.eventos} eventos\n` +
            (backupLido.stats.exportadoEm ? `\nGerado em: ${new Date(backupLido.stats.exportadoEm).toLocaleString('pt-BR')}\n` : '') +
            `\nTodos os dados atuais serão SUBSTITUÍDOS. Esta ação não pode ser desfeita.`
          }
          onConfirm={handleConfirmarRestore}
          onClose={()=>{ setConfirmRestore(false); setBackupLido(null) }}
          danger
        />
      )}

      {/* Modal: Carregar demo */}
      {confirm && (
        <ConfirmModal
          title="Carregar dados de demonstração"
          msg="Os dados atuais serão substituídos pelos dados de exemplo (alunos fictícios, turmas e pagamentos de demonstração). Esta ação não pode ser desfeita."
          onConfirm={()=>{ resetData(); setConfirm(false) }}
          onClose={()=>setConfirm(false)}
          danger
        />
      )}
    </div>
  )
}
