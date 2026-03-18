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
  listarPerfis:  ()              => ipcRenderer.invoke('db:listarPerfis'),
  criarPerfil:   (dados, req)    => ipcRenderer.invoke('db:criarPerfil',   dados, req),
  editarPerfil:  (id, dados, req)=> ipcRenderer.invoke('db:editarPerfil',  id, dados, req),
  deletarPerfil: (id, req)       => ipcRenderer.invoke('db:deletarPerfil', id, req),

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
  backupSalvar:          (json)  => ipcRenderer.invoke('backup:salvar',          json),
  backupListar:          ()      => ipcRenderer.invoke('backup:listar'),
  backupAbrirPasta:      ()      => ipcRenderer.send('backup:abrirPasta'),
  backupSelecionarArquivo: ()    => ipcRenderer.invoke('backup:selecionarArquivo'),

  // Frequência (chamada / presença)
  freqListarAulas:            (filtros)           => ipcRenderer.invoke('freq:listarAulas',            filtros),
  freqCriarAula:              (dados, req)        => ipcRenderer.invoke('freq:criarAula',              dados, req),
  freqEditarAula:             (id, dados, req)    => ipcRenderer.invoke('freq:editarAula',             id, dados, req),
  freqDeletarAula:            (id, req)           => ipcRenderer.invoke('freq:deletarAula',            id, req),
  freqGetPresencas:           (aulaId)            => ipcRenderer.invoke('freq:getPresencas',           aulaId),
  freqSalvarPresencas:        (aulaId, lista, req)=> ipcRenderer.invoke('freq:salvarPresencas',        aulaId, lista, req),
  freqEstatisticasFrequencia: (turmaLsId)         => ipcRenderer.invoke('freq:estatisticasFrequencia', turmaLsId),

  // PDF — geração nativa via Electron printToPDF
  pdfGerar: (opcoes) => ipcRenderer.invoke('pdf:gerar', opcoes),

  // WhatsApp — abre wa.me no navegador padrão com mensagem pré-preenchida
  whatsappAbrir: (numero, mensagem) => ipcRenderer.invoke('whatsapp:abrir', numero, mensagem),

  // Evento do main → renderer: disparado antes de fechar a janela
  onBeforeClose: (cb) => ipcRenderer.on('app:before-close', cb),
  backupDone:    ()   => ipcRenderer.send('backup:done'),
  backupSkip:    ()   => ipcRenderer.send('backup:skip'),

  // Info
  dbInfo: () => ipcRenderer.invoke('db:info'),
})
