const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Janela
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow:    () => ipcRenderer.send('close-window'),

  // Auth
  login: (login, senha) => ipcRenderer.invoke('db:login', login, senha),

  // Usuários (req = { userId, userLogin } para auditoria)
  listarUsuarios:      ()                => ipcRenderer.invoke('db:listarUsuarios'),
  criarUsuario:        (dados, req)      => ipcRenderer.invoke('db:criarUsuario',        dados, req),
  editarUsuario:       (id, dados, req)  => ipcRenderer.invoke('db:editarUsuario',       id, dados, req),
  deletarUsuario:      (id, req)         => ipcRenderer.invoke('db:deletarUsuario',       id, req),
  alterarSenhaPropria: (id, sa, sn)      => ipcRenderer.invoke('db:alterarSenhaPropria', id, sa, sn),

  // Perfis
  listarPerfis:  ()               => ipcRenderer.invoke('db:listarPerfis'),
  criarPerfil:   (dados, req)     => ipcRenderer.invoke('db:criarPerfil',   dados, req),
  editarPerfil:  (id, dados, req) => ipcRenderer.invoke('db:editarPerfil',  id, dados, req),
  deletarPerfil: (id, req)        => ipcRenderer.invoke('db:deletarPerfil', id, req),

  // Identidade visual
  getIdentidade:    ()         => ipcRenderer.invoke('db:getIdentidade'),
  salvarIdentidade: (d, req)   => ipcRenderer.invoke('db:salvarIdentidade', d, req),
  selecionarLogo:   ()         => ipcRenderer.invoke('dialog:selecionarLogo'),

  // Audit Log
  listarLogs:       (filtros)  => ipcRenderer.invoke('db:listarLogs',       filtros),
  limparLogs:       (dias)     => ipcRenderer.invoke('db:limparLogs',       dias),
  estatisticasLogs: ()         => ipcRenderer.invoke('db:estatisticasLogs'),
  registrarLog:     (dados)    => ipcRenderer.invoke('db:registrarLog',     dados),

  // Backup automático
  backupSalvar:           (json) => ipcRenderer.invoke('backup:salvar',           json),
  backupListar:           ()     => ipcRenderer.invoke('backup:listar'),
  backupAbrirPasta:       ()     => ipcRenderer.send('backup:abrirPasta'),
  backupSelecionarArquivo: ()    => ipcRenderer.invoke('backup:selecionarArquivo'),

  // Frequência (chamada / presença)
  freqListarAulas:            (filtros)            => ipcRenderer.invoke('freq:listarAulas',            filtros),
  freqCriarAula:              (dados, req)         => ipcRenderer.invoke('freq:criarAula',              dados, req),
  freqEditarAula:             (id, dados, req)     => ipcRenderer.invoke('freq:editarAula',             id, dados, req),
  freqDeletarAula:            (id, req)            => ipcRenderer.invoke('freq:deletarAula',            id, req),
  freqGetPresencas:           (aulaId)             => ipcRenderer.invoke('freq:getPresencas',           aulaId),
  freqSalvarPresencas:        (aulaId, lista, req) => ipcRenderer.invoke('freq:salvarPresencas',        aulaId, lista, req),
  freqEstatisticasFrequencia: (turmaLsId)          => ipcRenderer.invoke('freq:estatisticasFrequencia', turmaLsId),

  // Recados (v5.6)
  // req = { userId, userLogin } para auditoria
  recadosListar:     (filtros, req)  => ipcRenderer.invoke('recados:listar',     filtros, req),
  recadosParaAluno:  (params)        => ipcRenderer.invoke('recados:paraAluno',  params),
  recadosNaoLidos:   (params)        => ipcRenderer.invoke('recados:naoLidos',   params),
  recadosSalvar:     (dados, req)    => ipcRenderer.invoke('recados:salvar',     dados, req),
  recadosEnviar:     (dados, req)    => ipcRenderer.invoke('recados:enviar',     dados, req),
  recadosMarcarLido: (dados)         => ipcRenderer.invoke('recados:marcarLido', dados),
  recadosExcluir:    (dados, req)    => ipcRenderer.invoke('recados:excluir',    dados, req),

  // PDF — geração nativa via Electron printToPDF
  pdfGerar: (opcoes) => ipcRenderer.invoke('pdf:gerar', opcoes),

  // Relatórios — exportação
  relatorioExportarRematriculas: (dados) => ipcRenderer.invoke('relatorio:exportarRematriculas', dados),

  // Professores (v6 — SQLite)
  professoresListar:      (filtros)          => ipcRenderer.invoke('professores:listar',       filtros),
  professoresCriar:       (dados, req)       => ipcRenderer.invoke('professores:criar',        dados, req),
  professoresEditar:      (id, dados, req)   => ipcRenderer.invoke('professores:editar',       id, dados, req),
  professoresDeletar:     (id, req)          => ipcRenderer.invoke('professores:deletar',      id, req),
  professoresCargaHoraria:(filtros)          => ipcRenderer.invoke('professores:cargaHoraria', filtros),

  // Alunos (v6 — SQLite)
  alunosListar:  (filtros)          => ipcRenderer.invoke('alunos:listar',  filtros),
  alunosGet:     (id)               => ipcRenderer.invoke('alunos:get',     id),
  alunosCriar:   (dados, req)       => ipcRenderer.invoke('alunos:criar',   dados, req),
  alunosEditar:  (id, dados, req)   => ipcRenderer.invoke('alunos:editar',  id, dados, req),
  alunosDeletar: (id, req)          => ipcRenderer.invoke('alunos:deletar', id, req),

  // Turmas (v6 — SQLite)
  turmasListar:  (filtros)          => ipcRenderer.invoke('turmas:listar',  filtros),
  turmasCriar:   (dados, req)       => ipcRenderer.invoke('turmas:criar',   dados, req),
  turmasEditar:  (id, dados, req)   => ipcRenderer.invoke('turmas:editar',  id, dados, req),
  turmasDeletar: (id, req)          => ipcRenderer.invoke('turmas:deletar', id, req),

  // Fluxo de Caixa (v5.8)
  fcListar:          (filtros)        => ipcRenderer.invoke('fc:listar',          filtros),
  fcResumoMensal:    (filtros)        => ipcRenderer.invoke('fc:resumoMensal',    filtros),
  fcResumoCategoria: (filtros)        => ipcRenderer.invoke('fc:resumoCategoria', filtros),
  fcCriar:           (dados, req)     => ipcRenderer.invoke('fc:criar',           dados, req),
  fcEditar:          (id, dados, req) => ipcRenderer.invoke('fc:editar',          id, dados, req),
  fcDeletar:         (id, req)        => ipcRenderer.invoke('fc:deletar',         id, req),

  // Notas / Ata de Resultados (v5.10)
  notasListar:  (filtros)        => ipcRenderer.invoke('notas:listar',  filtros),
  notasCriar:   (dados, req)     => ipcRenderer.invoke('notas:criar',   dados, req),
  notasEditar:  (id, dados, req) => ipcRenderer.invoke('notas:editar',  id, dados, req),
  notasUpsert:  (dados, req)     => ipcRenderer.invoke('notas:upsert',  dados, req),
  notasDeletar: (id, req)        => ipcRenderer.invoke('notas:deletar', id, req),

  // Reserva de Salas (v5.9)
  rsListarSalas:    (filtros)        => ipcRenderer.invoke('rs:listarSalas',    filtros),
  rsCriarSala:      (dados, req)     => ipcRenderer.invoke('rs:criarSala',      dados, req),
  rsEditarSala:     (id, dados, req) => ipcRenderer.invoke('rs:editarSala',     id, dados, req),
  rsDeletarSala:    (id, req)        => ipcRenderer.invoke('rs:deletarSala',    id, req),
  rsListarReservas: (filtros)        => ipcRenderer.invoke('rs:listarReservas', filtros),
  rsCriarReserva:   (dados, req)     => ipcRenderer.invoke('rs:criarReserva',   dados, req),
  rsEditarReserva:  (id, dados, req) => ipcRenderer.invoke('rs:editarReserva',  id, dados, req),
  rsDeletarReserva: (id, req)        => ipcRenderer.invoke('rs:deletarReserva', id, req),

  // Estoque e Material Didático (v5.11)
  estoqueListar:      (filtros)        => ipcRenderer.invoke('estoque:listar',     filtros),
  estoqueGet:         (id)             => ipcRenderer.invoke('estoque:get',        id),
  estoqueCriar:       (dados, req)     => ipcRenderer.invoke('estoque:criar',      dados, req),
  estoqueEditar:      (id, dados, req) => ipcRenderer.invoke('estoque:editar',     id, dados, req),
  estoqueDeletar:     (id, req)        => ipcRenderer.invoke('estoque:deletar',    id, req),
  estoqueMovimentos:  (filtros)        => ipcRenderer.invoke('estoque:movimentos', filtros),
  estoqueMovimentar:  (dados, req)     => ipcRenderer.invoke('estoque:movimentar', dados, req),
  estoqueResumo:      ()               => ipcRenderer.invoke('estoque:resumo'),

  // Certificados (v5.12)
  certListar:  (filtros)    => ipcRenderer.invoke('cert:listar',  filtros),
  certCriar:   (dados, req) => ipcRenderer.invoke('cert:criar',   dados, req),
  certDeletar: (id, req)    => ipcRenderer.invoke('cert:deletar', id, req),
  certResumo:  ()           => ipcRenderer.invoke('cert:resumo'),

  // WhatsApp — abre wa.me no navegador padrão com mensagem pré-preenchida
  whatsappAbrir: (numero, mensagem) => ipcRenderer.invoke('whatsapp:abrir', numero, mensagem),

  // Evento do main → renderer: disparado antes de fechar a janela
  onBeforeClose: (cb) => ipcRenderer.on('app:before-close', cb),
  backupDone:    ()   => ipcRenderer.send('backup:done'),
  backupSkip:    ()   => ipcRenderer.send('backup:skip'),

  // Info
  dbInfo: () => ipcRenderer.invoke('db:info'),
})
