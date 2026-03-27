import React, { useState } from 'react'
import { Building2, DollarSign, Monitor, Palette, Database, Save, RefreshCw, Sun, Moon, School, Image, Upload, Trash2, RotateCcw, FolderOpen, CheckCircle, AlertTriangle, ArrowRightLeft, Loader } from 'lucide-react'
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
  const [formF,   setFormF]   = useState({
    multaAtraso: 10, jurosAtraso: 2, descontoAntecipacao: 5,
    pixChave: '', pixTipo: 'email', pixQrCode: '',
    ...settings.financeiro,
  })

  // Preview de encargos — calculado fora do JSX
  const prevBase   = 250
  const prevDias   = 10
  const prevMulta  = Number(formF.multaAtraso)  || 0
  const prevJuros  = Number(formF.jurosAtraso)  || 0
  const prevDesc   = Number(formF.descontoAntecipacao) || 0
  const prevVMulta = Math.round(prevBase * prevMulta / 100 * 100) / 100
  const prevVJuros = Math.round(prevBase * (prevJuros / 100) * ((prevDias - 1) / 30) * 100) / 100
  const prevTotal  = Math.round((prevBase + prevVMulta + prevVJuros) * 100) / 100
  const prevDescV  = Math.round(prevBase * prevDesc / 100 * 100) / 100
  const fmtR = v => `R$ ${Number(v).toFixed(2).replace('.', ',')}`
  const [formId,  setFormId]  = useState({ nome_escola: identidade?.nome_escola||'', slogan: identidade?.slogan||'', logo_base64: identidade?.logo_base64||'', logo_nome: identidade?.logo_nome||'' })
  const [salvandoId, setSalvandoId] = useState(false)

  const [migrando,      setMigrando]      = useState(false)
  const [migracaoLog,   setMigracaoLog]   = useState([])   // linhas de progresso
  const [migracaoFim,   setMigracaoFim]   = useState(null) // { ok, stats } | null
  const [confirmMigrar, setConfirmMigrar] = useState(false)

  async function executarMigracao() {
    setConfirmMigrar(false)
    setMigrando(true)
    setMigracaoFim(null)
    const log = []
    const addLog = (msg, tipo = 'info') => {
      log.push({ msg, tipo, ts: new Date().toLocaleTimeString('pt-BR') })
      setMigracaoLog([...log])
    }

    try {
      const api = window.electronAPI
      const u   = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
      const req = { userId: u.id || null, userLogin: u.login || 'migracao' }

      // ── 1. Ler dados do localStorage ──────────────────────────────────────
      addLog('Lendo dados do localStorage...')
      const professoresLS = JSON.parse(localStorage.getItem('em_profs')  || '[]')
      const turmasLS      = JSON.parse(localStorage.getItem('em_turmas') || '[]')
      const alunosLS      = JSON.parse(localStorage.getItem('em_alunos') || '[]')
      addLog(`  Encontrados: ${professoresLS.length} professores, ${turmasLS.length} turmas, ${alunosLS.length} alunos`)

      // ── 2. Migrar professores ─────────────────────────────────────────────
      addLog('Migrando professores...')
      // Mapeia lsId → novo id SQLite
      const mapProf = {}
      let profOk = 0, profSkip = 0
      for (const p of professoresLS) {
        // Verifica se já foi migrado (listarProfessores retorna por nome+idioma)
        const todos = await api.professoresListar({})
        const jaExiste = todos.find(x =>
          x.nome === p.nome && x.idioma === (p.idioma || '')
        )
        if (jaExiste) {
          mapProf[p.id] = jaExiste.id
          profSkip++
          continue
        }
        const res = await api.professoresCriar({
          nome:     p.nome,
          idioma:   p.idioma    || '',
          email:    p.email     || '',
          telefone: p.telefone  || '',
          ativo:    p.ativo !== false ? 1 : 0,
        }, req)
        if (res.ok) { mapProf[p.id] = res.id; profOk++ }
        else addLog(`  ⚠ Professor "${p.nome}": ${res.erro}`, 'warn')
      }
      addLog(`  Professores: ${profOk} criados, ${profSkip} já existiam`, 'ok')

      // ── 3. Migrar turmas ──────────────────────────────────────────────────
      addLog('Migrando turmas...')
      const mapTurma = {}
      let turmaOk = 0, turmaSkip = 0
      for (const t of turmasLS) {
        const todas = await api.turmasListar({})
        const jaExiste = todas.find(x => x.codigo === (t.codigo || '').toUpperCase())
        if (jaExiste) {
          mapTurma[t.id] = jaExiste.id
          turmaSkip++
          continue
        }
        const res = await api.turmasCriar({
          codigo:      (t.codigo || '').toUpperCase(),
          idioma:      t.idioma      || '',
          nivel:       t.nivel       || 'Básico',
          professorId: mapProf[t.professorId] || null,
          horario:     t.horario     || '',
          vagas:       t.vagas       ?? 15,
          ativa:       t.ativa !== false ? 1 : 0,
        }, req)
        if (res.ok) { mapTurma[t.id] = res.id; turmaOk++ }
        else addLog(`  ⚠ Turma "${t.codigo}": ${res.erro}`, 'warn')
      }
      addLog(`  Turmas: ${turmaOk} criadas, ${turmaSkip} já existiam`, 'ok')

      // ── 4. Migrar alunos ──────────────────────────────────────────────────
      addLog('Migrando alunos...')
      let alunoOk = 0, alunoSkip = 0
      for (const a of alunosLS) {
        // ls_id é a chave idempotente — se já existe, pula
        const todos = await api.alunosListar({})
        const jaExiste = todos.find(x => x.lsId === a.id)
        if (jaExiste) { alunoSkip++; continue }

        const res = await api.alunosCriar({
          lsId:            a.id,
          nome:            a.nome,
          email:           a.email           || '',
          telefone:        a.telefone        || '',
          turmaId:         mapTurma[a.turmaId] || null,
          mensalidade:     a.mensalidade     ?? 0,
          diaVencimento:   a.diaVencimento   ?? 10,
          status:          a.status          || 'Ativo',
          dataNasc:        a.dataNasc        || '',
          dataMatricula:   a.dataMatricula   || '',
          obs:             a.obs             || '',
          respNome:        a.respNome        || '',
          respTelefone:    a.respTelefone    || '',
          respEmail:       a.respEmail       || '',
          respParentesco:  a.respParentesco  || '',
          turmaAnteriorId: a.turmaAnteriorId ? (mapTurma[a.turmaAnteriorId] || null) : null,
          dataRematricula: a.dataRematricula || '',
          dataReativacao:  a.dataReativacao  || '',
        }, req)
        if (res.ok) alunoOk++
        else addLog(`  ⚠ Aluno "${a.nome}": ${res.erro}`, 'warn')
      }
      addLog(`  Alunos: ${alunoOk} criados, ${alunoSkip} já existiam`, 'ok')

      // ── 5. Resultado ──────────────────────────────────────────────────────
      const stats = {
        professores: profOk + profSkip,
        turmas:      turmaOk + turmaSkip,
        alunos:      alunoOk + alunoSkip,
      }
      addLog('Migração concluída com sucesso! ✓', 'ok')
      setMigracaoFim({ ok: true, stats })
      // Ativa o flag — a partir daqui o AppContext lê do SQLite automaticamente
      updateSettings('sistema', { migradoSQLite: true })
    } catch (e) {
      addLog(`Erro inesperado: ${e.message}`, 'error')
      setMigracaoFim({ ok: false, erro: e.message })
    } finally {
      setMigrando(false)
    }
  }

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
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:22}}>Regras de cobrança aplicadas automaticamente</div>

              {/* ── Encargos por Atraso ── */}
              <div className="settings-card" style={{marginBottom:14}}>
                <div className="settings-card-title"><DollarSign size={15}/>Encargos por Atraso</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Multa por Atraso (%)</label>
                    <input className="input" type="number" min={0} max={20} step="0.1"
                      value={formF.multaAtraso ?? 10}
                      onChange={e=>setFormF(f=>({...f,multaAtraso:Number(e.target.value)}))}/>
                    <span className="input-hint">Aplicada uma única vez no 1º dia de atraso</span>
                  </div>
                  <div className="field">
                    <label>Juros por Atraso (% ao mês)</label>
                    <input className="input" type="number" min={0} max={10} step="0.1"
                      value={formF.jurosAtraso ?? 2}
                      onChange={e=>setFormF(f=>({...f,jurosAtraso:Number(e.target.value)}))}/>
                    <span className="input-hint">Proporcional por dia — calculado a partir do 2º dia. Use 0 para desativar.</span>
                  </div>
                </div>

                {/* Preview de simulação */}
                <div style={{
                  marginTop:14, padding:'12px 14px',
                  background:'var(--bg-hover)', borderRadius:9,
                  fontSize:12, color:'var(--text-2)',
                }}>
                  <strong style={{color:'var(--text-1)',display:'block',marginBottom:6}}>
                    Simulação — mensalidade de R$ 250,00 com {prevDias} dias de atraso
                  </strong>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span>Valor original:</span>
                      <strong style={{color:'var(--text-1)'}}>{fmtR(prevBase)}</strong>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span>Multa ({prevMulta}%) — 1º dia:</span>
                      <strong style={{color:'var(--red)'}}>+{fmtR(prevVMulta)}</strong>
                    </div>
                    {prevJuros > 0 && (
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span>Juros ({prevJuros}%/mês × {prevDias - 1}d):</span>
                        <strong style={{color:'var(--red)'}}>+{fmtR(prevVJuros)}</strong>
                      </div>
                    )}
                    <div style={{
                      display:'flex',justifyContent:'space-between',
                      paddingTop:4, borderTop:'1px solid var(--border)', marginTop:2,
                    }}>
                      <span><strong>Total cobrado:</strong></span>
                      <strong style={{color:'var(--accent)'}}>{fmtR(prevTotal)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Desconto por Antecipação ── */}
              <div className="settings-card">
                <div className="settings-card-title"><DollarSign size={15}/>Desconto por Antecipação</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Desconto Antecipação (%)</label>
                    <input className="input" type="number" min={0} max={20} step="0.1"
                      value={formF.descontoAntecipacao ?? 5}
                      onChange={e=>setFormF(f=>({...f,descontoAntecipacao:Number(e.target.value)}))}/>
                    <span className="input-hint">Aplicado automaticamente quando o pagamento é confirmado antes do vencimento. Use 0 para desativar.</span>
                  </div>
                </div>

                {prevDesc > 0 && (
                  <div style={{
                    marginTop:14, padding:'12px 14px',
                    background:'var(--bg-hover)', borderRadius:9,
                    fontSize:12, color:'var(--text-2)',
                  }}>
                    <strong style={{color:'var(--text-1)',display:'block',marginBottom:6}}>
                      Simulação — mensalidade de R$ 250,00 paga antes do vencimento
                    </strong>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span>Valor original:</span>
                        <strong style={{color:'var(--text-1)'}}>{fmtR(prevBase)}</strong>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span>Desconto ({prevDesc}%):</span>
                        <strong style={{color:'var(--accent)'}}>−{fmtR(prevDescV)}</strong>
                      </div>
                      <div style={{
                        display:'flex',justifyContent:'space-between',
                        paddingTop:4, borderTop:'1px solid var(--border)', marginTop:2,
                      }}>
                        <span><strong>Total cobrado:</strong></span>
                        <strong style={{color:'var(--accent)'}}>{fmtR(prevBase - prevDescV)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
                  <button className="btn btn-primary" onClick={saveFinanceiro}><Save size={14}/> Salvar</button>
                </div>
              </div>

              {/* ── Dados para Pagamento via Pix ── */}
              <div className="settings-card">
                <div className="settings-card-title"><DollarSign size={15}/>Pagamento via Pix</div>
                <p style={{fontSize:12,color:'var(--text-3)',marginBottom:14}}>
                  A chave e o QR Code aparecem no boleto/cobrança gerado para o aluno.
                </p>
                <div className="form-grid">
                  <div className="field">
                    <label>Tipo de Chave Pix</label>
                    <select className="input" value={formF.pixTipo||'email'}
                      onChange={e=>setFormF(f=>({...f,pixTipo:e.target.value}))}>
                      <option value="email">E-mail</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Chave Aleatória</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Chave Pix</label>
                    <input className="input"
                      placeholder={
                        formF.pixTipo==='email'    ? 'exemplo@email.com' :
                        formF.pixTipo==='cpf'      ? '000.000.000-00' :
                        formF.pixTipo==='cnpj'     ? '00.000.000/0000-00' :
                        formF.pixTipo==='telefone' ? '(11) 99999-9999' :
                        'Chave aleatória'
                      }
                      value={formF.pixChave||''}
                      onChange={e=>setFormF(f=>({...f,pixChave:e.target.value}))}/>
                    <span className="input-hint">Será exibida no boleto como instrução de pagamento</span>
                  </div>
                </div>

                {/* Upload do QR Code */}
                <div className="field" style={{marginTop:12}}>
                  <label>QR Code do Pix (imagem)</label>
                  <div style={{display:'flex',alignItems:'flex-start',gap:16,marginTop:6}}>
                    {/* Preview do QR Code */}
                    {formF.pixQrCode ? (
                      <div style={{position:'relative',flexShrink:0}}>
                        <img src={formF.pixQrCode} alt="QR Code Pix"
                          style={{width:120,height:120,objectFit:'contain',
                            border:'2px solid var(--border)',borderRadius:10,
                            background:'#fff',padding:6}}/>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{position:'absolute',top:-8,right:-8,
                            background:'var(--red-dim)',border:'1px solid var(--red)',
                            borderRadius:'50%',width:22,height:22,padding:0,
                            display:'flex',alignItems:'center',justifyContent:'center'}}
                          onClick={()=>setFormF(f=>({...f,pixQrCode:''}))}>
                          <Trash2 size={11} style={{color:'var(--red)'}}/>
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width:120,height:120,border:'2px dashed var(--border)',
                        borderRadius:10,display:'flex',flexDirection:'column',
                        alignItems:'center',justifyContent:'center',
                        gap:6,color:'var(--text-3)',fontSize:11,flexShrink:0,
                        background:'var(--bg-hover)',
                      }}>
                        <Upload size={22} style={{opacity:.4}}/>
                        <span style={{textAlign:'center',lineHeight:1.3}}>Nenhum<br/>QR Code</span>
                      </div>
                    )}
                    <div style={{flex:1}}>
                      <p style={{fontSize:12,color:'var(--text-3)',marginBottom:10,lineHeight:1.6}}>
                        Faça uma captura de tela ou exporte o QR Code do seu banco e envie aqui.
                        A imagem aparecerá impressa no boleto ao lado da chave Pix.
                      </p>
                      <label style={{cursor:'pointer'}}>
                        <input type="file" accept="image/*" style={{display:'none'}}
                          onChange={e=>{
                            const file = e.target.files[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => setFormF(f=>({...f,pixQrCode:ev.target.result}))
                            reader.readAsDataURL(file)
                          }}/>
                        <span className="btn btn-secondary btn-sm">
                          <Upload size={13}/> Selecionar imagem
                        </span>
                      </label>
                      <p style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>
                        PNG, JPG ou SVG · Recomendado: 300×300px
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview inline */}
                {(formF.pixChave || formF.pixQrCode) && (
                  <div style={{
                    marginTop:16,padding:'12px 14px',
                    background:'var(--bg-hover)',borderRadius:9,
                    border:'1px solid var(--border)',
                  }}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',
                      textTransform:'uppercase',letterSpacing:.6,marginBottom:10}}>
                      Preview no boleto
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:14}}>
                      {formF.pixQrCode && (
                        <img src={formF.pixQrCode} alt="QR"
                          style={{width:72,height:72,objectFit:'contain',
                            border:'1px solid var(--border)',borderRadius:6,
                            background:'#fff',padding:4,flexShrink:0}}/>
                      )}
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'var(--text-1)',marginBottom:3}}>
                          Pagamento via Pix
                        </div>
                        {formF.pixChave && (
                          <div style={{fontSize:12,color:'var(--text-2)'}}>
                            <span style={{color:'var(--text-3)'}}>
                              {formF.pixTipo==='email'?'E-mail':
                               formF.pixTipo==='cpf'?'CPF':
                               formF.pixTipo==='cnpj'?'CNPJ':
                               formF.pixTipo==='telefone'?'Telefone':'Chave'}:{' '}
                            </span>
                            <strong>{formF.pixChave}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                  ['Versão',         'Escola Manager v5.7.0'],
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
                      Escola Manager v5.7.0
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

              {/* ── MIGRAÇÃO localStorage → SQLite ── */}
              <div className="settings-card" style={{marginTop:14}}>
                <div className="settings-card-title"><ArrowRightLeft size={15}/>Migração localStorage → SQLite</div>

                <div style={{fontSize:13,color:'var(--text-2)',marginBottom:14,lineHeight:1.6}}>
                  Copia os dados de <strong>professores</strong>, <strong>turmas</strong> e <strong>alunos</strong> do
                  armazenamento local (localStorage) para o banco SQLite permanente.
                  A operação é <strong>idempotente</strong> — pode ser executada várias vezes sem duplicar dados.
                </div>

                {/* Resultado da migração */}
                {migracaoFim && (
                  <div style={{
                    marginBottom:14, padding:'12px 14px', borderRadius:9,
                    background: migracaoFim.ok ? 'var(--accent-dim)' : 'var(--red-dim)',
                    border: `1px solid ${migracaoFim.ok ? 'var(--border-accent)' : 'rgba(242,97,122,.3)'}`,
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom: migracaoFim.ok ? 8 : 0}}>
                      {migracaoFim.ok
                        ? <CheckCircle size={15} style={{color:'var(--accent)',flexShrink:0}}/>
                        : <AlertTriangle size={15} style={{color:'var(--red)',flexShrink:0}}/>
                      }
                      <strong style={{fontSize:13,color:migracaoFim.ok?'var(--accent)':'var(--red)'}}>
                        {migracaoFim.ok ? 'Migração concluída com sucesso!' : `Erro: ${migracaoFim.erro}`}
                      </strong>
                    </div>
                    {migracaoFim.ok && migracaoFim.stats && (
                      <div style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:12,color:'var(--text-2)',paddingLeft:23}}>
                        <span>{migracaoFim.stats.professores} professores</span>
                        <span>{migracaoFim.stats.turmas} turmas</span>
                        <span>{migracaoFim.stats.alunos} alunos</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Log de progresso */}
                {migracaoLog.length > 0 && (
                  <div style={{
                    marginBottom:14, padding:'10px 12px',
                    background:'var(--bg-app)', borderRadius:8,
                    border:'1px solid var(--border)',
                    fontFamily:"'DM Mono','Courier New',monospace",
                    fontSize:11.5, maxHeight:200, overflowY:'auto',
                    display:'flex', flexDirection:'column', gap:2,
                  }}>
                    {migracaoLog.map((l, i) => (
                      <div key={i} style={{
                        color: l.tipo==='ok'    ? 'var(--accent)'   :
                               l.tipo==='warn'  ? 'var(--yellow)'   :
                               l.tipo==='error' ? 'var(--red)'      : 'var(--text-2)',
                      }}>
                        <span style={{color:'var(--text-3)',marginRight:8}}>{l.ts}</span>
                        {l.msg}
                      </div>
                    ))}
                    {migrando && (
                      <div style={{color:'var(--text-3)',display:'flex',alignItems:'center',gap:6}}>
                        <span style={{
                          display:'inline-block',width:9,height:9,
                          border:'1.5px solid var(--text-3)',borderTopColor:'var(--accent)',
                          borderRadius:'50%',animation:'spin .7s linear infinite',
                        }}/>
                        Aguardando...
                      </div>
                    )}
                  </div>
                )}

                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <button
                    className="btn btn-primary"
                    disabled={migrando}
                    onClick={() => setConfirmMigrar(true)}
                  >
                    {migrando
                      ? <><Loader size={13} style={{animation:'spin .7s linear infinite'}}/> Migrando...</>
                      : <><ArrowRightLeft size={13}/> Executar migração</>
                    }
                  </button>
                  {migracaoLog.length > 0 && !migrando && (
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => { setMigracaoLog([]); setMigracaoFim(null) }}>
                      Limpar log
                    </button>
                  )}
                </div>

                <div style={{
                  marginTop:12, padding:'9px 11px',
                  background:'var(--bg-hover)', borderRadius:7,
                  fontSize:11.5, color:'var(--text-3)', lineHeight:1.5,
                }}>
                  <strong style={{color:'var(--text-2)'}}>Ordem:</strong> professores → turmas → alunos.
                  IDs originais são preservados via <code style={{fontSize:10,background:'var(--bg-card)',padding:'1px 4px',borderRadius:3}}>ls_id</code>,
                  garantindo que rematrículas e histórico não se percam.
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

      {/* Modal: Confirmar migração */}
      {confirmMigrar && (
        <ConfirmModal
          title="Executar migração localStorage → SQLite"
          msg={
            'O sistema irá copiar professores, turmas e alunos do armazenamento local para o banco SQLite.\n\n' +
            'A operação é segura e idempotente — dados já migrados são ignorados.\n\n' +
            'Os dados originais no localStorage NÃO serão removidos. Você pode continuar ' +
            'usando o sistema normalmente durante e após a migração.\n\n' +
            'Deseja continuar?'
          }
          onConfirm={executarMigracao}
          onClose={() => setConfirmMigrar(false)}
        />
      )}

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
