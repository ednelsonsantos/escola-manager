import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

// ── helpers ──────────────────────────────────────────────────────────────────
export function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
export function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
export function today() {
  return new Date().toISOString().split('T')[0]
}
export function newId(list) {
  return list.length ? Math.max(...list.map(x => x.id)) + 1 : 1
}

// ── seed data ─────────────────────────────────────────────────────────────────
const SEED_PROFESSORES = [
  { id: 1, nome: 'James Wilson',    idioma: 'Inglês',   email: 'james@escola.com',  telefone: '(11) 91111-1111', ativo: true },
  { id: 2, nome: 'Carmen López',    idioma: 'Espanhol', email: 'carmen@escola.com', telefone: '(11) 92222-2222', ativo: true },
  { id: 3, nome: 'Marie Dupont',    idioma: 'Francês',  email: 'marie@escola.com',  telefone: '(11) 93333-3333', ativo: true },
  { id: 4, nome: 'Klaus Fischer',   idioma: 'Alemão',   email: 'klaus@escola.com',  telefone: '(11) 94444-4444', ativo: true },
  { id: 5, nome: 'Marco Rossi',     idioma: 'Italiano', email: 'marco@escola.com',  telefone: '(11) 95555-5555', ativo: true },
]

const SEED_TURMAS = [
  { id: 1, codigo: 'ING-B1', idioma: 'Inglês',   nivel: 'Básico',         professorId: 1, horario: 'Seg/Qua 18h', vagas: 15, ativa: true },
  { id: 2, codigo: 'ING-I1', idioma: 'Inglês',   nivel: 'Intermediário',  professorId: 1, horario: 'Ter/Qui 19h', vagas: 15, ativa: true },
  { id: 3, codigo: 'ING-A1', idioma: 'Inglês',   nivel: 'Avançado',       professorId: 1, horario: 'Seg/Qua 20h', vagas: 12, ativa: true },
  { id: 4, codigo: 'ESP-B1', idioma: 'Espanhol', nivel: 'Básico',         professorId: 2, horario: 'Ter/Qui 18h', vagas: 15, ativa: true },
  { id: 5, codigo: 'ESP-I1', idioma: 'Espanhol', nivel: 'Intermediário',  professorId: 2, horario: 'Sex 14h',     vagas: 12, ativa: true },
  { id: 6, codigo: 'FRA-B1', idioma: 'Francês',  nivel: 'Básico',         professorId: 3, horario: 'Seg/Qua 17h', vagas: 10, ativa: true },
  { id: 7, codigo: 'ALE-B1', idioma: 'Alemão',   nivel: 'Básico',         professorId: 4, horario: 'Sáb 9h',     vagas: 10, ativa: true },
  { id: 8, codigo: 'ITA-B1', idioma: 'Italiano', nivel: 'Básico',         professorId: 5, horario: 'Sáb 11h',    vagas: 10, ativa: true },
]

// ALTERADO: diaVencimento agora é por aluno (campo diaVencimento em cada aluno)
const SEED_ALUNOS = [
  { id:1,  nome:'Ana Carolina Silva',    email:'ana.silva@email.com',    telefone:'(11) 98765-4321', turmaId:3, mensalidade:320, status:'Ativo',   dataMatricula:'2024-02-10', dataNasc:'1998-05-12', obs:'', diaVencimento:10 },
  { id:2,  nome:'Bruno Ferreira Costa',  email:'bruno.costa@email.com',  telefone:'(11) 91234-5678', turmaId:5, mensalidade:280, status:'Ativo',   dataMatricula:'2024-01-15', dataNasc:'2000-11-30', obs:'Responsável financeiro diferente', diaVencimento:15 },
  { id:3,  nome:'Carla Mendes Oliveira', email:'carla.oliveira@email.com',telefone:'(11) 99876-5432', turmaId:1, mensalidade:250, status:'Ativo',   dataMatricula:'2024-03-01', dataNasc:'2005-07-22', obs:'', diaVencimento:10 },
  { id:4,  nome:'Diego Santos Lima',     email:'diego.lima@email.com',   telefone:'(11) 97654-3210', turmaId:6, mensalidade:300, status:'Inativo', dataMatricula:'2023-11-20', dataNasc:'1995-02-14', obs:'Trancou matrícula', diaVencimento:10 },
  { id:5,  nome:'Eduarda Pinheiro',      email:'eduarda.p@email.com',    telefone:'(11) 96543-2109', turmaId:2, mensalidade:280, status:'Ativo',   dataMatricula:'2024-02-28', dataNasc:'2003-09-08', obs:'', diaVencimento:5 },
  { id:6,  nome:'Felipe Rodrigues',      email:'felipe.r@email.com',     telefone:'(11) 95432-1098', turmaId:7, mensalidade:320, status:'Ativo',   dataMatricula:'2024-01-08', dataNasc:'1999-04-17', obs:'', diaVencimento:10 },
  { id:7,  nome:'Gabriela Torres',       email:'gabi.torres@email.com',  telefone:'(11) 94321-0987', turmaId:5, mensalidade:280, status:'Ativo',   dataMatricula:'2023-10-15', dataNasc:'2001-12-03', obs:'', diaVencimento:20 },
  { id:8,  nome:'Henrique Almeida',      email:'henrique.a@email.com',   telefone:'(11) 93210-9876', turmaId:3, mensalidade:320, status:'Ativo',   dataMatricula:'2024-03-10', dataNasc:'1997-06-25', obs:'', diaVencimento:10 },
  { id:9,  nome:'Isabela Cunha',         email:'isa.cunha@email.com',    telefone:'(11) 92109-8765', turmaId:8, mensalidade:300, status:'Ativo',   dataMatricula:'2024-02-20', dataNasc:'2004-01-19', obs:'', diaVencimento:10 },
  { id:10, nome:'João Pedro Vieira',     email:'joao.vieira@email.com',  telefone:'(11) 91098-7654', turmaId:1, mensalidade:250, status:'Ativo',   dataMatricula:'2024-01-30', dataNasc:'2006-08-11', obs:'Menor de idade', diaVencimento:10 },
  { id:11, nome:'Larissa Moura',         email:'larissa.m@email.com',    telefone:'(11) 90987-6543', turmaId:4, mensalidade:250, status:'Inativo', dataMatricula:'2023-09-05', dataNasc:'2002-03-28', obs:'', diaVencimento:10 },
  { id:12, nome:'Matheus Carvalho',      email:'matheus.c@email.com',    telefone:'(11) 89876-5432', turmaId:2, mensalidade:280, status:'Ativo',   dataMatricula:'2024-03-05', dataNasc:'1996-10-07', obs:'', diaVencimento:10 },
  { id:13, nome:'Natália Fernandes',     email:'nati.f@email.com',       telefone:'(11) 88765-4321', turmaId:4, mensalidade:250, status:'Ativo',   dataMatricula:'2024-03-15', dataNasc:'2007-05-14', obs:'Menor de idade', diaVencimento:10 },
  { id:14, nome:'Otávio Mendonça',       email:'otavio.m@email.com',     telefone:'(11) 87654-3210', turmaId:6, mensalidade:300, status:'Ativo',   dataMatricula:'2024-01-22', dataNasc:'1993-07-31', obs:'', diaVencimento:10 },
  { id:15, nome:'Paula Rocha',           email:'paula.r@email.com',      telefone:'(11) 86543-2109', turmaId:3, mensalidade:320, status:'Ativo',   dataMatricula:'2024-02-14', dataNasc:'1990-11-05', obs:'', diaVencimento:10 },
]

// Gera pagamentos dos últimos 6 meses para cada aluno ativo
function mesRelativo(mesesAtras) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - mesesAtras)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

// ALTERADO: usa diaVencimento do próprio aluno
function gerarPagamentos() {
  const pgs = []
  let id = 1
  const meses = Array.from({length:7}, (_,i) => mesRelativo(6 - i))
  SEED_ALUNOS.filter(a => a.status === 'Ativo').forEach(aluno => {
    const dia = String(aluno.diaVencimento || 10).padStart(2, '0')
    meses.forEach((mes, mi) => {
      const venc = `${mes}-${dia}`
      let status = 'Pago'
      let dataPgto = `${mes}-${String(Math.floor(Math.random()*9)+1).padStart(2,'0')}`
      if (mi === meses.length - 1) {
        if ([2,7,11].includes(aluno.id))    { status = 'Atrasado'; dataPgto = null }
        else if ([9,14].includes(aluno.id)) { status = 'Pendente'; dataPgto = null }
        else                                { status = 'Pago' }
      }
      pgs.push({ id: id++, alunoId: aluno.id, valor: aluno.mensalidade, vencimento: venc, status, dataPgto, mes })
    })
  })
  return pgs
}

const SEED_PAGAMENTOS = gerarPagamentos()

export function mesAtualDinamico() { return mesRelativo(0) }

export function calcularIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc  = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

export function mesLabel(mes) {
  if (!mes) return ''
  const [y, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m,10)-1]}/${y.slice(2)}`
}

function diasAPartirDeHoje(dias) {
  const d = new Date(); d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}
const SEED_EVENTOS = [
  { id:1, titulo:'Reunião de professores',    data:diasAPartirDeHoje(3),  hora:'19:00', tipo:'reuniao',   desc:'Pauta: planejamento do semestre',  turmaId:null },
  { id:2, titulo:'Prova de nivelamento ING',  data:diasAPartirDeHoje(7),  hora:'10:00', tipo:'prova',     desc:'Sala principal',                   turmaId:3    },
  { id:3, titulo:'Feriado nacional',          data:diasAPartirDeHoje(15), hora:'',      tipo:'feriado',   desc:'',                                 turmaId:null },
  { id:4, titulo:'Apresentação oral ESP-I1',  data:diasAPartirDeHoje(10), hora:'18:00', tipo:'atividade', desc:'Apresentações em espanhol',         turmaId:5    },
  { id:5, titulo:'Vencimento mensalidades',   data:diasAPartirDeHoje(5),  hora:'',      tipo:'financeiro',desc:'Dia de vencimento padrão',          turmaId:null },
  { id:6, titulo:'Início de novas turmas',    data:diasAPartirDeHoje(20), hora:'08:00', tipo:'turma',     desc:'Novas turmas do semestre',          turmaId:null },
]

// ALTERADO: removido diaVencimento global; adicionado descontoAntecipacao e jurosAtraso
const DEFAULT_SETTINGS = {
  escola: { nome: 'Escola de Idiomas', cnpj: '', telefone: '', email: '', endereco: '', cidade: '' },
  financeiro: { multaAtraso: 10, jurosAtraso: 2, descontoAntecipacao: 5, moeda: 'BRL', pixChave: '', pixTipo: 'email', pixQrCode: '' },
  sistema: { idioma: 'pt-BR', notificacoes: true, backupAuto: false },
  aparencia: { tema: 'dark', accentColor: '#63dcaa', fontSize: 'normal' },
}

// ── context ───────────────────────────────────────────────────────────────────
const Ctx = createContext(null)

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback } catch { return fallback }
}
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

function inicializarDados() {
  const jaIniciou = localStorage.getItem('em_inicializado')
  if (jaIniciou) return
  if (localStorage.getItem('em_alunos')      === null) saveLS('em_alunos',    SEED_ALUNOS)
  if (localStorage.getItem('em_turmas')      === null) saveLS('em_turmas',    SEED_TURMAS)
  if (localStorage.getItem('em_profs')       === null) saveLS('em_profs',     SEED_PROFESSORES)
  if (localStorage.getItem('em_pags')        === null) saveLS('em_pags',      SEED_PAGAMENTOS)
  if (localStorage.getItem('em_eventos')     === null) saveLS('em_eventos',   SEED_EVENTOS)
  if (localStorage.getItem('em_settings')    === null) saveLS('em_settings',  DEFAULT_SETTINGS)
  localStorage.setItem('em_inicializado', '1')
}

inicializarDados()

export function AppProvider({ children, user = null, onLogout = null }) {
  const [alunos,      setAlunosRaw]    = useState(() => loadLS('em_alunos',    []))
  const [turmas,      setTurmasRaw]    = useState(() => loadLS('em_turmas',    []))
  const [professores, setProfRaw]      = useState(() => loadLS('em_profs',     []))
  const [pagamentos,  setPagsRaw]      = useState(() => loadLS('em_pags',      []))
  const [eventos,     setEventosRaw]   = useState(() => loadLS('em_eventos',   []))
  const [settings,    setSettingsRaw]  = useState(() => loadLS('em_settings',  DEFAULT_SETTINGS))
  const [toast,       setToast]        = useState(null)

  const setAlunos      = v => { setAlunosRaw(v);      saveLS('em_alunos', v) }
  const setTurmas      = v => { setTurmasRaw(v);      saveLS('em_turmas', v) }
  const setProfessores = v => { setProfRaw(v);        saveLS('em_profs',  v) }
  const setPagamentos  = v => { setPagsRaw(v);        saveLS('em_pags',   v) }
  const setEventos     = v => { setEventosRaw(v);     saveLS('em_eventos',v) }
  const setSettings    = v => { setSettingsRaw(v);    saveLS('em_settings',v) }

  function registrarLog(modulo, acao, entidadeNome = '', detalhe = '', nivel = 'info') {
    try {
      const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
      window.electronAPI?.registrarLog?.({
        usuarioId: u.id || null,
        usuarioLogin: u.login || 'sistema',
        modulo, acao, entidadeNome, detalhe, nivel,
      })
    } catch {}
  }

  const showToast = useCallback((msg, type='success') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(null), 3200)
  }, [])

  // ── Backup automático ─────────────────────────────────────────────────────────
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onBeforeClose) return

    const handleBeforeClose = async () => {
      const backupAtivo = (() => {
        try { return JSON.parse(localStorage.getItem('em_settings') || '{}')?.sistema?.backupAuto } catch { return false }
      })()

      if (!backupAtivo) { api.backupSkip(); return }

      try {
        const dados = {
          alunos:      JSON.parse(localStorage.getItem('em_alunos')   || '[]'),
          turmas:      JSON.parse(localStorage.getItem('em_turmas')   || '[]'),
          professores: JSON.parse(localStorage.getItem('em_profs')    || '[]'),
          pagamentos:  JSON.parse(localStorage.getItem('em_pags')     || '[]'),
          eventos:     JSON.parse(localStorage.getItem('em_eventos')  || '[]'),
          settings:    JSON.parse(localStorage.getItem('em_settings') || '{}'),
          exportadoEm: new Date().toISOString(),
          versao:      '5.5.2',
        }
        const json = JSON.stringify(dados, null, 2)
        await api.backupSalvar(json)
      } catch (e) {
        console.error('[BackupAuto] Erro ao salvar:', e)
      } finally {
        api.backupDone()
      }
    }

    api.onBeforeClose(handleBeforeClose)
  }, [])

  // ── ALUNOS CRUD ──
  const addAluno = (data) => {
    const list = [...alunos, { ...data, id: newId(alunos) }]
    setAlunos(list); showToast('Aluno cadastrado com sucesso!'); registrarLog('alunos','criar',data.nome,`Aluno cadastrado: ${data.nome}`)
  }
  const updateAluno = (id, data) => {
    setAlunos(alunos.map(a => a.id === id ? { ...a, ...data } : a))
    showToast('Aluno atualizado!')
    registrarLog('alunos','editar',data.nome||String(id),`Aluno editado: ID ${id}`)
  }
  const deleteAluno = (id) => {
    setAlunos(alunos.filter(a => a.id !== id))
    showToast('Aluno removido.', 'info')
    registrarLog('alunos','excluir',String(id),`Aluno ID ${id} removido`,'aviso')
  }

  // ── TURMAS CRUD ──
  const addTurma = (data) => {
    const list = [...turmas, { ...data, id: newId(turmas) }]
    setTurmas(list); showToast('Turma criada!')
  }
  const updateTurma = (id, data) => {
    setTurmas(turmas.map(t => t.id === id ? { ...t, ...data } : t))
    showToast('Turma atualizada!')
  }
  const deleteTurma = (id) => {
    setTurmas(turmas.filter(t => t.id !== id))
    showToast('Turma removida.', 'info')
  }

  // ── PROFESSORES CRUD ──
  const addProfessor = (data) => {
    const list = [...professores, { ...data, id: newId(professores) }]
    setProfessores(list); showToast('Professor cadastrado!')
  }
  const updateProfessor = (id, data) => {
    setProfessores(professores.map(p => p.id === id ? { ...p, ...data } : p))
    showToast('Professor atualizado!')
  }
  const deleteProfessor = (id) => {
    setProfessores(professores.filter(p => p.id !== id))
    showToast('Professor removido.', 'info')
  }

  // ── PAGAMENTOS ──

  /**
   * registrarPagamento — confirma recebimento.
   * NOVO: se dataPgto < vencimento, aplica desconto de antecipação automaticamente.
   */
  const registrarPagamento = (id, dataPgto = null) => {
    const pgto = pagamentos.find(p => p.id === id)
    if (!pgto) return

    const dataEfetiva = dataPgto || today()
    const desconto    = settings?.financeiro?.descontoAntecipacao ?? 5 // % padrão

    let valorFinal       = pgto.valor
    let valorDesconto    = 0
    let valorOriginalPgto = pgto.valorOriginal ?? pgto.valor // usa original se já tinha encargo

    // Caso 1 — antecipado: pagou antes do vencimento → aplica desconto
    if (dataEfetiva < pgto.vencimento && desconto > 0) {
      valorDesconto = Math.round(valorOriginalPgto * (desconto / 100) * 100) / 100
      valorFinal    = Math.round((valorOriginalPgto - valorDesconto) * 100) / 100
    }

    // Caso 2 — atrasado: pagou depois do vencimento → recalcula encargos com data real
    let encargosFinais = { valorMulta: 0, valorJuros: 0 }
    if (dataEfetiva > pgto.vencimento) {
      const enc = calcularEncargos(valorOriginalPgto, pgto.vencimento, dataEfetiva)
      encargosFinais = { valorMulta: enc.valorMulta, valorJuros: enc.valorJuros }
      valorFinal     = enc.valorTotal
    }

    setPagamentos(pagamentos.map(p =>
      p.id === id
        ? {
            ...p,
            status:        'Pago',
            dataPgto:      dataEfetiva,
            valor:         valorFinal,
            valorOriginal: p.valorOriginal ?? p.valor,
            valorDesconto: valorDesconto > 0 ? valorDesconto : undefined,
            // Grava encargos finais calculados com a data real do pagamento
            valorMulta:    encargosFinais.valorMulta  > 0 ? encargosFinais.valorMulta  : undefined,
            valorJuros:    encargosFinais.valorJuros  > 0 ? encargosFinais.valorJuros  : undefined,
            diasAtraso:    dataEfetiva > pgto.vencimento
              ? Math.floor((new Date(dataEfetiva) - new Date(pgto.vencimento + 'T00:00:00')) / 86400000)
              : undefined,
          }
        : p
    ))
    showToast(
      valorDesconto > 0
        ? `Pagamento registrado com desconto de ${formatBRL(valorDesconto)}! 🎉`
        : dataEfetiva > pgto.vencimento && (encargosFinais.valorMulta + encargosFinais.valorJuros) > 0
          ? `Pagamento registrado com encargos de ${formatBRL(encargosFinais.valorMulta + encargosFinais.valorJuros)}.`
          : 'Pagamento registrado!'
    )
    registrarLog('financeiro','registrar_pagamento','','Pagamento confirmado: ID '+id)
  }

  const updatePagamento = (id, dados) => {
    setPagamentos(pagamentos.map(p => p.id === id ? { ...p, ...dados } : p))
    showToast('Pagamento atualizado!'); registrarLog('financeiro','editar_pagamento','','Pagamento editado: ID '+id)
  }
  const deletePagamento = (id) => {
    setPagamentos(pagamentos.filter(p => p.id !== id))
    showToast('Lançamento removido.', 'info'); registrarLog('financeiro','excluir_pagamento','','Lançamento removido: ID '+id,'aviso')
  }
  const addPagamento = (data) => {
    const list = [...pagamentos, { ...data, id: newId(pagamentos) }]
    setPagamentos(list); showToast('Pagamento lançado!')
  }

  /**
   * gerarMensalidades — ALTERADO: usa diaVencimento do próprio aluno.
   * Cada aluno tem seu dia de vencimento individual (campo diaVencimento).
   * Fallback para dia 10 se o campo não estiver definido.
   */
  const gerarMensalidades = (mes) => {
    const ativos = alunos.filter(a => a.status === 'Ativo')
    const novos  = ativos
      .filter(a => !pagamentos.find(p => p.alunoId === a.id && p.mes === mes))
      .map(a => {
        const dia  = String(a.diaVencimento || 10).padStart(2, '0')
        const venc = `${mes}-${dia}`
        return {
          id: newId([...pagamentos, ...ativos]),
          alunoId: a.id,
          valor: a.mensalidade,
          vencimento: venc,
          status: 'Pendente',
          dataPgto: null,
          mes,
        }
      })
    if (novos.length === 0) { showToast('Mensalidades já geradas para este mês.', 'warning'); return }
    setPagamentos([...pagamentos, ...novos])
    showToast(`${novos.length} mensalidades geradas!`)
    registrarLog('financeiro','gerar_mensalidades','',`${novos.length} mensalidades geradas para ${mes}`)
  }

  // ── EVENTOS CRUD ──
  const addEvento    = d => { setEventos([...eventos,{...d,id:newId(eventos)}]); showToast('Evento criado!') }
  const updateEvento = (id,d) => { setEventos(eventos.map(e=>e.id===id?{...e,...d}:e)); showToast('Evento atualizado!') }
  const deleteEvento = id => { setEventos(eventos.filter(e=>e.id!==id)); showToast('Evento removido.','info') }

  // ── ENCARGOS ─────────────────────────────────────────────────────────────────
  /**
   * calcularEncargos — multa fixa no 1º dia + juros diários a partir do 2º dia.
   *
   * Regras:
   *   - Dia 1 de atraso : multa fixa (multaAtraso %)
   *   - Dia 2 em diante : juros diários = valorOriginal × (jurosAtraso% / 30) × (dias - 1)
   *   - Os dois encargos são independentes e se somam
   *
   * Aceita dataReferencia opcional (string YYYY-MM-DD) para calcular com uma
   * data específica — usado ao confirmar pagamento com data retroativa/futura.
   *
   * Retorna: { valorTotal, valorMulta, valorJuros, dias }
   */
  function calcularEncargos(valorOriginal, vencimento, dataReferencia = null) {
    const multa  = settings?.financeiro?.multaAtraso    ?? 10  // % fixa, 1x
    const juros  = settings?.financeiro?.jurosAtraso    ?? 2   // % ao mês

    const ref  = dataReferencia
      ? new Date(dataReferencia + 'T00:00:00')
      : new Date()
    const venc = new Date(vencimento + 'T00:00:00')
    const dias = Math.max(0, Math.floor((ref - venc) / (1000 * 60 * 60 * 24)))

    if (dias <= 0) return { valorTotal: valorOriginal, valorMulta: 0, valorJuros: 0, dias: 0 }

    // Multa: aplicada a partir do dia 1 (sempre que há atraso)
    const valorMulta = Math.round(valorOriginal * (multa / 100) * 100) / 100

    // Juros diários: só a partir do dia 2 (dias - 1 para excluir o dia da multa)
    const diasJuros  = Math.max(0, dias - 1)
    const valorJuros = Math.round(valorOriginal * (juros / 100) * (diasJuros / 30) * 100) / 100

    const valorTotal = Math.round((valorOriginal + valorMulta + valorJuros) * 100) / 100

    return { valorTotal, valorMulta, valorJuros, dias }
  }

  /**
   * marcarAtrasados — aplica multa fixa nos pendentes vencidos do mês.
   * Preserva valorOriginal para não acumular multa em cliques repetidos.
   */
  const marcarAtrasados = (mes) => {
    const hoje = today()
    let count = 0
    const updated = pagamentos.map(p => {
      if (p.mes === mes && p.status === 'Pendente' && p.vencimento < hoje) {
        count++
        const valorBase = p.valorOriginal ?? p.valor // nunca recalcula sobre valor já corrigido
        const enc = calcularEncargos(valorBase, p.vencimento)
        return {
          ...p,
          status:        'Atrasado',
          valorOriginal: valorBase,
          valor:         enc.valorTotal,
          valorMulta:    enc.valorMulta,
          valorJuros:    enc.valorJuros,
          diasAtraso:    enc.dias,
        }
      }
      return p
    })
    setPagamentos(updated)
    count > 0
      ? showToast(`${count} pagamento(s) marcado(s) como atrasado.`, 'warning')
      : showToast('Nenhum pendente vencido.', 'info')
  }

  // ── EXPORT ──
  const exportJSON = (tipo) => {
    let dados, nome
    if (tipo === 'alunos')     { dados = alunos;     nome = 'alunos.json' }
    if (tipo === 'pagamentos') { dados = pagamentos; nome = 'pagamentos.json' }
    if (tipo === 'completo')   { dados = { alunos, turmas, professores, pagamentos, eventos, settings }; nome = 'escola-backup.json' }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = nome; a.click()
    URL.revokeObjectURL(url)
    showToast(`Exportado: ${nome}`)
    registrarLog('sistema','exportar',nome,`Backup JSON exportado: ${nome}`)
  }

  const exportCSV = (tipo) => {
    let rows = [], nome

    if (tipo === 'alunos') {
      nome = 'alunos.csv'
      rows = [['ID','Nome','Email','Telefone','Turma','Idioma','Nível','Mensalidade (R$)','Dia Venc.','Status','Situação Fin.','Data Matrícula','Observações']]
      alunos.forEach(a => {
        const t   = turmas.find(t => t.id === a.turmaId)
        const pg  = pagamentos.find(p => p.alunoId === a.id && p.mes === mesAtualDinamico())
        const sit = pg?.status || 'Sem pgto'
        rows.push([
          a.id, a.nome, a.email||'', a.telefone||'',
          t?.codigo||'', t?.idioma||'', t?.nivel||'',
          a.mensalidade, a.diaVencimento||10, a.status, sit,
          a.dataMatricula||'', a.obs||''
        ])
      })
    }

    if (tipo === 'pagamentos') {
      nome = 'pagamentos.csv'
      rows = [['ID','Aluno','Turma','Mês','Valor (R$)','Original (R$)','Multa (R$)','Desconto (R$)','Vencimento','Data Pagamento','Status']]
      pagamentos.forEach(p => {
        const a = alunos.find(al => al.id === p.alunoId)
        const t = turmas.find(t => t.id === a?.turmaId)
        rows.push([
          p.id, a?.nome||'', t?.codigo||'',
          p.mes, p.valor,
          p.valorOriginal||p.valor,
          p.valorMulta||0,
          p.valorDesconto||0,
          p.vencimento||'', p.dataPgto||'', p.status
        ])
      })
    }

    if (tipo === 'turmas') {
      nome = 'turmas.csv'
      rows = [['Código','Idioma','Nível','Professor','Horário','Vagas','Alunos Matriculados','Ocupação (%)','Status']]
      turmas.forEach(t => {
        const prof = professores.find(p => p.id === t.professorId)
        const mat  = alunos.filter(a => a.turmaId === t.id && a.status === 'Ativo').length
        const ocup = t.vagas ? Math.round(mat / t.vagas * 100) : 0
        rows.push([
          t.codigo, t.idioma, t.nivel,
          prof?.nome||'', t.horario||'',
          t.vagas, mat, ocup,
          t.ativa ? 'Ativa' : 'Inativa'
        ])
      })
    }

    if (tipo === 'professores') {
      nome = 'professores.csv'
      rows = [['ID','Nome','Idioma','Email','Telefone','Turmas','Alunos','Status']]
      professores.forEach(p => {
        const tProf = turmas.filter(t => t.professorId === p.id)
        const alProf = tProf.reduce((s,t) => s + alunos.filter(a => a.turmaId === t.id && a.status === 'Ativo').length, 0)
        rows.push([
          p.id, p.nome, p.idioma||'',
          p.email||'', p.telefone||'',
          tProf.length, alProf,
          p.ativo ? 'Ativo' : 'Inativo'
        ])
      })
    }

    if (tipo === 'financeiro') {
      nome = 'relatorio-financeiro.csv'
      const meses = Array.from({length:7}, (_,i) => mesRelativo(6 - i))
      rows = [['Mês','Receita (R$)','Qtd Pagos','Qtd Atrasados','Qtd Pendentes','Total Cobranças','Taxa Recebimento (%)']]
      meses.forEach(m => {
        const pgM    = pagamentos.filter(p => p.mes === m)
        const pagos  = pgM.filter(p => p.status === 'Pago')
        const atras  = pgM.filter(p => p.status === 'Atrasado')
        const pend   = pgM.filter(p => p.status === 'Pendente')
        const receita = pagos.reduce((s, p) => s + p.valor, 0)
        const taxa    = pgM.length ? Math.round(pagos.length / pgM.length * 100) : 0
        rows.push([m, receita.toFixed(2), pagos.length, atras.length, pend.length, pgM.length, taxa])
      })
    }

    if (!rows.length) { showToast('Nenhum dado para exportar.', 'warning'); return }

    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(`Exportado: ${nome}`)
  }

  // ── SETTINGS ──
  const updateSettings = (section, data) => {
    // Deep merge com DEFAULT_SETTINGS garante que campos novos (ex: idioma)
    // existam mesmo em instâncias com localStorage de versões anteriores
    const sectionDefault = DEFAULT_SETTINGS[section] || {}
    const next = { ...settings, [section]: { ...sectionDefault, ...settings[section], ...data } }
    setSettings(next); showToast('Configurações salvas!')
  }

  const resetData = () => {
    setAlunos(SEED_ALUNOS)
    setTurmas(SEED_TURMAS)
    setProfessores(SEED_PROFESSORES)
    setPagamentos(SEED_PAGAMENTOS)
    setEventos(SEED_EVENTOS)
    showToast('Dados de demonstração carregados.', 'info')
    registrarLog('sistema', 'reset_demo', '', 'Dados redefinidos para dados de demonstração', 'aviso')
  }

  const limparTudo = () => {
    setAlunosRaw([])
    setTurmasRaw([])
    setProfRaw([])
    setPagsRaw([])
    setEventosRaw([])
    saveLS('em_alunos',  [])
    saveLS('em_turmas',  [])
    saveLS('em_profs',   [])
    saveLS('em_pags',    [])
    saveLS('em_eventos', [])
    showToast('Sistema limpo. Pronto para uso real!', 'info')
    registrarLog('sistema', 'limpar_tudo', '', 'Todos os dados removidos — sistema limpo para uso real', 'aviso')
  }

  const restaurarBackup = (dados) => {
    try {
      if (!dados || typeof dados !== 'object') return { ok: false, erro: 'Arquivo inválido — não é um JSON de backup.' }

      const temAlunos   = Array.isArray(dados.alunos)
      const temTurmas   = Array.isArray(dados.turmas)
      const temProfs    = Array.isArray(dados.professores)
      const temPags     = Array.isArray(dados.pagamentos)
      const temEventos  = Array.isArray(dados.eventos)

      if (!temAlunos && !temTurmas && !temProfs) {
        return { ok: false, erro: 'Arquivo não parece ser um backup do Escola Manager. Campos esperados não encontrados.' }
      }

      if (temAlunos)   setAlunos(dados.alunos)
      if (temTurmas)   setTurmas(dados.turmas)
      if (temProfs)    setProfessores(dados.professores)
      if (temPags)     setPagamentos(dados.pagamentos)
      if (temEventos)  setEventos(dados.eventos)

      if (dados.settings && typeof dados.settings === 'object') {
        const temaAtual = settings.aparencia?.tema
        const settingsRestauradas = { ...dados.settings }
        if (temaAtual) settingsRestauradas.aparencia = { ...(settingsRestauradas.aparencia || {}), tema: temaAtual }
        setSettings(settingsRestauradas)
      }

      const stats = {
        alunos:      dados.alunos?.length      ?? 0,
        turmas:      dados.turmas?.length      ?? 0,
        professores: dados.professores?.length ?? 0,
        pagamentos:  dados.pagamentos?.length  ?? 0,
        eventos:     dados.eventos?.length     ?? 0,
        exportadoEm: dados.exportadoEm || null,
        versao:      dados.versao      || '—',
      }

      registrarLog('sistema', 'restaurar_backup', '', `Backup restaurado — ${stats.alunos} alunos, ${stats.turmas} turmas, ${stats.pagamentos} pagamentos`, 'aviso')
      showToast('Backup restaurado com sucesso!', 'success')
      return { ok: true, stats }
    } catch (e) {
      return { ok: false, erro: `Erro ao restaurar: ${e.message}` }
    }
  }

  const tema = settings.aparencia?.tema || 'dark'

  return (
    <Ctx.Provider value={{
      alunos, addAluno, updateAluno, deleteAluno,
      turmas, addTurma, updateTurma, deleteTurma,
      professores, addProfessor, updateProfessor, deleteProfessor,
      pagamentos, registrarPagamento, updatePagamento, deletePagamento, addPagamento, gerarMensalidades, marcarAtrasados,
      eventos, addEvento, updateEvento, deleteEvento,
      settings, updateSettings, resetData, limparTudo, restaurarBackup, calcularEncargos,
      exportJSON, exportCSV,
      user, onLogout,
      tema, showToast, toast
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
