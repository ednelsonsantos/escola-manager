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

function mesRelativo(mesesAtras) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - mesesAtras)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

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

// ALTERADO: removido diaVencimento global; adicionado descontoAntecipacao e jurosAtraso
const DEFAULT_SETTINGS = {
  escola: { nome: 'Escola de Idiomas', cnpj: '', telefone: '', email: '', endereco: '', cidade: '' },
  financeiro: { multaAtraso: 10, jurosAtraso: 2, descontoAntecipacao: 5, moeda: 'BRL', pixChave: '', pixTipo: 'email', pixQrCode: '' },
  sistema: { idioma: 'pt-BR', notificacoes: true, backupAuto: false, migradoSQLite: false },
  aparencia: { tema: 'dark', accentColor: '#63dcaa', fontSize: 'normal' },
}

// ── context ───────────────────────────────────────────────────────────────────
const Ctx = createContext(null)

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback } catch { return fallback }
}
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }


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
        const migrado = (() => {
          try { return JSON.parse(localStorage.getItem('em_settings') || '{}')?.sistema?.migradoSQLite } catch { return false }
        })()

        let professoresBackup = JSON.parse(localStorage.getItem('em_profs')    || '[]')
        let turmasBackup      = JSON.parse(localStorage.getItem('em_turmas')   || '[]')
        let alunosBackup      = JSON.parse(localStorage.getItem('em_alunos')   || '[]')
        let pagamentosBackup  = JSON.parse(localStorage.getItem('em_pags')     || '[]')
        let eventosBackup     = JSON.parse(localStorage.getItem('em_eventos')  || '[]')

        if (migrado && api.professoresListar) {
          try {
            const [profs, turms, aluns, pags, evts] = await Promise.all([
              api.professoresListar({}),
              api.turmasListar({}),
              api.alunosListar({}),
              api.pagListar({}),
              api.evtListar({}),
            ])
            if (profs?.length) professoresBackup = profs
            if (turms?.length) turmasBackup      = turms
            if (aluns?.length) alunosBackup      = aluns
            if (pags?.length)  pagamentosBackup  = pags
            if (evts?.length)  eventosBackup     = evts
          } catch (e) {
            console.warn('[BackupAuto] Fallback para localStorage:', e.message)
          }
        }

        const dados = {
          alunos:      alunosBackup,
          turmas:      turmasBackup,
          professores: professoresBackup,
          pagamentos:  pagamentosBackup,
          eventos:     eventosBackup,
          settings:    JSON.parse(localStorage.getItem('em_settings') || '{}'),
          exportadoEm: new Date().toISOString(),
          versao:      '5.15.0',
          migradoSQLite: migrado || false,
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

  // ── Carrega dados do SQLite quando migradoSQLite=true ──────────────────────
  useEffect(() => {
    const migrado = settings?.sistema?.migradoSQLite
    if (!migrado) return
    const api = window.electronAPI
    if (!api) return

    async function carregarDoSQLite() {
      try {
        const [profs, turms, aluns, pags, evts] = await Promise.all([
          api.professoresListar({}),
          api.turmasListar({}),
          api.alunosListar({}),
          api.pagListar({}),
          api.evtListar({}),
        ])
        const turmasNorm = turms.map(t => ({
          ...t,
          professorId: t.professor_id ?? t.professorId ?? null,
        }))
        setProfRaw(profs)
        setTurmasRaw(turmasNorm)
        setAlunosRaw(aluns)
        setPagsRaw(pags)
        setEventosRaw(evts)
      } catch (e) {
        console.error('[AppContext] Erro ao carregar SQLite:', e)
      }
    }

    carregarDoSQLite()
  }, [settings?.sistema?.migradoSQLite])

  // Helper: monta req de auditoria a partir da sessão atual
  function getReq() {
    try {
      const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
      return { userId: u.id || null, userLogin: u.login || 'sistema' }
    } catch { return {} }
  }
  // ── ALUNOS CRUD ──
  // Quando migradoSQLite=true, escritas vão para o SQLite e atualizam o estado
  // local imediatamente (optimistic update) para a UI não piscar.
  const addAluno = async (data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.alunosCriar(data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao cadastrar aluno.', 'error'); return }
      const novo = await window.electronAPI?.alunosGet(res.id)
      if (novo) setAlunosRaw(v => [...v, novo])
      showToast('Aluno cadastrado com sucesso!')
      registrarLog('alunos', 'criar', data.nome, `Aluno cadastrado: ${data.nome}`)
    } else {
      const list = [...alunos, { ...data, id: newId(alunos) }]
      setAlunos(list); showToast('Aluno cadastrado com sucesso!')
      registrarLog('alunos', 'criar', data.nome, `Aluno cadastrado: ${data.nome}`)
    }
  }
  const updateAluno = async (id, data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.alunosEditar(id, data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao atualizar aluno.', 'error'); return }
      setAlunosRaw(v => v.map(a => a.id === id ? { ...a, ...data } : a))
      showToast('Aluno atualizado!')
    } else {
      setAlunos(alunos.map(a => a.id === id ? { ...a, ...data } : a))
      showToast('Aluno atualizado!')
      registrarLog('alunos', 'editar', data.nome || String(id), `Aluno editado: ID ${id}`)
    }
  }
  const deleteAluno = async (id) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.alunosDeletar(id, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao remover aluno.', 'error'); return }
      setAlunosRaw(v => v.filter(a => a.id !== id))
      showToast('Aluno removido.', 'info')
    } else {
      setAlunos(alunos.filter(a => a.id !== id))
      showToast('Aluno removido.', 'info')
      registrarLog('alunos', 'excluir', String(id), `Aluno ID ${id} removido`, 'aviso')
    }
  }

  // ── TURMAS CRUD ──
  const addTurma = async (data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.turmasCriar(data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao criar turma.', 'error'); return }
      const turms = await window.electronAPI?.turmasListar({})
      if (turms) setTurmasRaw(turms.map(t => ({ ...t, professorId: t.professor_id ?? t.professorId ?? null })))
      showToast('Turma criada!')
    } else {
      const list = [...turmas, { ...data, id: newId(turmas) }]
      setTurmas(list); showToast('Turma criada!')
    }
  }
  const updateTurma = async (id, data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.turmasEditar(id, data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao atualizar turma.', 'error'); return }
      const turms = await window.electronAPI?.turmasListar({})
      if (turms) setTurmasRaw(turms.map(t => ({ ...t, professorId: t.professor_id ?? t.professorId ?? null })))
      showToast('Turma atualizada!')
    } else {
      setTurmas(turmas.map(t => t.id === id ? { ...t, ...data } : t))
      showToast('Turma atualizada!')
    }
  }
  const deleteTurma = async (id) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.turmasDeletar(id, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao remover turma.', 'error'); return }
      setTurmasRaw(v => v.filter(t => t.id !== id))
      showToast('Turma removida.', 'info')
    } else {
      setTurmas(turmas.filter(t => t.id !== id))
      showToast('Turma removida.', 'info')
    }
  }

  // ── PROFESSORES CRUD ──
  const addProfessor = async (data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.professoresCriar(data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao cadastrar professor.', 'error'); return }
      const profs = await window.electronAPI?.professoresListar({})
      if (profs) setProfRaw(profs)
      showToast('Professor cadastrado!')
    } else {
      const list = [...professores, { ...data, id: newId(professores) }]
      setProfessores(list); showToast('Professor cadastrado!')
    }
  }
  const updateProfessor = async (id, data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.professoresEditar(id, data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao atualizar professor.', 'error'); return }
      setProfRaw(v => v.map(p => p.id === id ? { ...p, ...data } : p))
      showToast('Professor atualizado!')
    } else {
      setProfessores(professores.map(p => p.id === id ? { ...p, ...data } : p))
      showToast('Professor atualizado!')
    }
  }
  const deleteProfessor = async (id) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.professoresDeletar(id, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao remover professor.', 'error'); return }
      setProfRaw(v => v.filter(p => p.id !== id))
      showToast('Professor removido.', 'info')
    } else {
      setProfessores(professores.filter(p => p.id !== id))
      showToast('Professor removido.', 'info')
    }
  }

  // ── PAGAMENTOS ──

  const registrarPagamento = async (id, dataPgto = null) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.pagRegistrar(id, dataPgto, settings.financeiro, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao registrar pagamento.', 'error'); return }
      const pags = await window.electronAPI?.pagListar({})
      if (pags) setPagsRaw(pags)
      const msg = res.valorDesconto > 0
        ? `Pagamento registrado com desconto de ${formatBRL(res.valorDesconto)}! 🎉`
        : (res.valorMulta + res.valorJuros) > 0
          ? `Pagamento registrado com encargos de ${formatBRL(res.valorMulta + res.valorJuros)}.`
          : 'Pagamento registrado!'
      showToast(msg)
      return
    }
    // ── localStorage ──
    const pgto = pagamentos.find(p => p.id === id)
    if (!pgto) return

    const dataEfetiva = dataPgto || today()
    const desconto    = settings?.financeiro?.descontoAntecipacao ?? 5

    let valorFinal       = pgto.valor
    let valorDesconto    = 0
    let valorOriginalPgto = pgto.valorOriginal ?? pgto.valor

    if (dataEfetiva < pgto.vencimento && desconto > 0) {
      valorDesconto = Math.round(valorOriginalPgto * (desconto / 100) * 100) / 100
      valorFinal    = Math.round((valorOriginalPgto - valorDesconto) * 100) / 100
    }

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

  const updatePagamento = async (id, dados) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.pagEditar(id, dados, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao atualizar pagamento.', 'error'); return }
      const pags = await window.electronAPI?.pagListar({})
      if (pags) setPagsRaw(pags)
      showToast('Pagamento atualizado!')
      return
    }
    setPagamentos(pagamentos.map(p => p.id === id ? { ...p, ...dados } : p))
    showToast('Pagamento atualizado!'); registrarLog('financeiro','editar_pagamento','','Pagamento editado: ID '+id)
  }

  const deletePagamento = async (id) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.pagDeletar(id, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao remover pagamento.', 'error'); return }
      setPagsRaw(v => v.filter(p => p.id !== id))
      showToast('Lançamento removido.', 'info')
      return
    }
    setPagamentos(pagamentos.filter(p => p.id !== id))
    showToast('Lançamento removido.', 'info'); registrarLog('financeiro','excluir_pagamento','','Lançamento removido: ID '+id,'aviso')
  }

  const gerarMensalidades = async (mes) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.pagGerarMensalidades(mes, settings.financeiro, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao gerar mensalidades.', 'error'); return }
      if (res.gerados === 0) { showToast('Mensalidades já geradas para este mês.', 'warning'); return }
      const pags = await window.electronAPI?.pagListar({})
      if (pags) setPagsRaw(pags)
      showToast(`${res.gerados} mensalidades geradas!`)
      return
    }
    const ativos = alunos.filter(a => a.status === 'Ativo')
    const novos  = ativos
      .filter(a => !pagamentos.find(p => p.alunoId === a.id && p.mes === mes))
      .map(a => {
        const dia  = String(a.diaVencimento || 10).padStart(2, '0')
        const venc = `${mes}-${dia}`
        return { id: newId([...pagamentos, ...ativos]), alunoId: a.id, valor: a.mensalidade, vencimento: venc, status: 'Pendente', dataPgto: null, mes }
      })
    if (novos.length === 0) { showToast('Mensalidades já geradas para este mês.', 'warning'); return }
    setPagamentos([...pagamentos, ...novos])
    showToast(`${novos.length} mensalidades geradas!`)
    registrarLog('financeiro','gerar_mensalidades','',`${novos.length} mensalidades geradas para ${mes}`)
  }

  const addPagamento = async (data) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.pagCriar(data, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao lançar pagamento.', 'error'); return }
      const pags = await window.electronAPI?.pagListar({})
      if (pags) setPagsRaw(pags)
      showToast('Pagamento lançado!')
      return
    }
    const list = [...pagamentos, { ...data, id: newId(pagamentos) }]
    setPagamentos(list); showToast('Pagamento lançado!')
  }

  // ── EVENTOS CRUD ──
  const addEvento = async (d) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.evtCriar(d, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao criar evento.', 'error'); return }
      const evts = await window.electronAPI?.evtListar({})
      if (evts) setEventosRaw(evts)
      showToast('Evento criado!')
      return
    }
    setEventos([...eventos, { ...d, id: newId(eventos) }]); showToast('Evento criado!')
  }
  const updateEvento = async (id, d) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.evtEditar(id, d, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao atualizar evento.', 'error'); return }
      const evts = await window.electronAPI?.evtListar({})
      if (evts) setEventosRaw(evts)
      showToast('Evento atualizado!')
      return
    }
    setEventos(eventos.map(e => e.id === id ? { ...e, ...d } : e)); showToast('Evento atualizado!')
  }
  const deleteEvento = async (id) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.evtDeletar(id, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao remover evento.', 'error'); return }
      setEventosRaw(v => v.filter(e => e.id !== id)); showToast('Evento removido.', 'info')
      return
    }
    setEventos(eventos.filter(e => e.id !== id)); showToast('Evento removido.', 'info')
  }

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

  const marcarAtrasados = async (mes) => {
    if (settings?.sistema?.migradoSQLite) {
      const res = await window.electronAPI?.pagMarcarAtrasados(mes, settings.financeiro, getReq())
      if (!res?.ok) { showToast(res?.erro || 'Erro ao marcar atrasados.', 'error'); return }
      const pags = await window.electronAPI?.pagListar({})
      if (pags) setPagsRaw(pags)
      res.marcados > 0
        ? showToast(`${res.marcados} pagamento(s) marcado(s) como atrasado.`, 'warning')
        : showToast('Nenhum pendente vencido.', 'info')
      return
    }
    const hoje = today()
    let count = 0
    const updated = pagamentos.map(p => {
      if (p.mes === mes && p.status === 'Pendente' && p.vencimento < hoje) {
        count++
        const valorBase = p.valorOriginal ?? p.valor
        const enc = calcularEncargos(valorBase, p.vencimento)
        return { ...p, status: 'Atrasado', valorOriginal: valorBase, valor: enc.valorTotal, valorMulta: enc.valorMulta, valorJuros: enc.valorJuros, diasAtraso: enc.dias }
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
    if (tipo === 'completo')   {
      dados = {
        alunos, turmas, professores, pagamentos, eventos, settings,
        exportadoEm:   new Date().toISOString(),
        versao:        '5.15.0',
        migradoSQLite: settings?.sistema?.migradoSQLite || false,
      }
      nome = 'escola-backup.json'
    }
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

  const resetData = async () => {
    if (settings?.sistema?.migradoSQLite) {
      await window.electronAPI?.limparDadosMigrados(getReq())
      updateSettings('sistema', { migradoSQLite: false })
    }
    setAlunosRaw([]);     saveLS('em_alunos',  [])
    setTurmasRaw([]);     saveLS('em_turmas',  [])
    setProfRaw([]);       saveLS('em_profs',   [])
    setPagsRaw([]);       saveLS('em_pags',    [])
    setEventosRaw([]);    saveLS('em_eventos', [])
    showToast('Sistema limpo. Pronto para novo cadastro.', 'info')
    registrarLog('sistema', 'reset_demo', '', 'Dados resetados manualmente', 'aviso')
  }

  const limparTudo = async () => {
    // Se migrado, remove os dados do SQLite primeiro
    if (settings?.sistema?.migradoSQLite) {
      await window.electronAPI?.limparDadosMigrados(getReq())
      updateSettings('sistema', { migradoSQLite: false })
    }
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

  const restaurarBackup = async (dados) => {
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

      // Se migrado, limpa SQLite e reseta o flag antes de restaurar no localStorage.
      // O usuário pode re-migrar em Configurações → Dados após a restauração.
      if (settings?.sistema?.migradoSQLite) {
        await window.electronAPI?.limparDadosMigrados(getReq())
      }

      if (temAlunos)   setAlunos(dados.alunos)
      if (temTurmas)   setTurmas(dados.turmas)
      if (temProfs)    setProfessores(dados.professores)
      if (temPags)     setPagamentos(dados.pagamentos)
      if (temEventos)  setEventos(dados.eventos)

      if (dados.settings && typeof dados.settings === 'object') {
        const temaAtual = settings.aparencia?.tema
        const settingsRestauradas = { ...dados.settings, sistema: { ...(dados.settings.sistema || {}), migradoSQLite: false } }
        if (temaAtual) settingsRestauradas.aparencia = { ...(settingsRestauradas.aparencia || {}), tema: temaAtual }
        setSettings(settingsRestauradas)
      } else {
        // Garante que o flag de migração é resetado mesmo sem seção de settings no backup
        updateSettings('sistema', { migradoSQLite: false })
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
      showToast('Backup restaurado! Re-migre para SQLite em Configurações → Dados se desejar.', 'success')
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
