const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')
const db   = require('./database')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1024, minHeight: 680,
    frame: false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
    backgroundColor: '#0d0f14',
    show: false,
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    const devUrl = process.env.VITE_DEV_URL || 'http://localhost:5173'
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
      .catch(err => console.error('[Main] loadFile error:', err.message))
    win.webContents.on('did-fail-load', (_, code, desc, url) => {
      if (code !== -3) console.error('[Renderer] did-fail-load:', code, desc, url)
    })
    win.webContents.on('render-process-gone', (_, details) => {
      console.error('[Renderer] process gone:', details)
    })
  }

  // ── Backup automático ao fechar ──────────────────────────────────────────────
  let closeReady = false
  let closeTimer = null

  function doClose() {
    if (closeReady) return
    closeReady = true
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
    ipcMain.removeListener('backup:done', doClose)
    ipcMain.removeListener('backup:skip', doClose)
    if (!win.isDestroyed()) win.close()
  }

  win.on('close', (e) => {
    if (closeReady) return
    e.preventDefault()
    // Timeout de segurança: fecha em 3s mesmo se o renderer não responder
    // (hot reload em dev pode deixar o renderer sem listener ativo)
    closeTimer = setTimeout(() => {
      console.warn('[Main] Timeout de backup — fechando mesmo assim')
      doClose()
    }, 3000)
    win.webContents.send('app:before-close')
  })

  ipcMain.on('backup:done', doClose)
  ipcMain.on('backup:skip', doClose)
}

app.whenReady().then(() => {
  try { db.init() } catch (e) { console.error('[Main] DB init error:', e.message) }
  createWindow()

  // ── Scheduler: processar recados agendados a cada 60s ─────────────────────
  db.processarRecadosAgendados() // verifica imediatamente no startup
  setInterval(() => {
    try { db.processarRecadosAgendados() } catch {}
  }, 60 * 1000)

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ── Window controls ───────────────────────────────────────────────────────────
ipcMain.on('minimize-window', () => BrowserWindow.getFocusedWindow()?.minimize())
ipcMain.on('maximize-window', () => { const w = BrowserWindow.getFocusedWindow(); w?.isMaximized() ? w.unmaximize() : w.maximize() })
ipcMain.on('close-window',    () => BrowserWindow.getFocusedWindow()?.close())

// ── Safe wrapper ──────────────────────────────────────────────────────────────
function safe(fn, fallback = null) {
  try { return fn() } catch (e) { console.error('[IPC]', e.message); return fallback }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
ipcMain.handle('db:login', (_, login, senha) =>
  safe(() => db.login(login, senha), { ok: false, erro: 'Banco não disponível' }))

// ── Usuários ──────────────────────────────────────────────────────────────────
ipcMain.handle('db:listarUsuarios',      ()               => safe(() => db.listarUsuarios(), []))
ipcMain.handle('db:criarUsuario',        (_, dados, req)  => safe(() => db.criarUsuario(dados, req || {}), { ok:false }))
ipcMain.handle('db:editarUsuario',       (_, id, d, req)  => safe(() => db.editarUsuario(id, d, req || {}), { ok:false }))
ipcMain.handle('db:deletarUsuario',      (_, id, req)     => safe(() => db.deletarUsuario(id, req || {}), { ok:false }))
ipcMain.handle('db:alterarSenhaPropria', (_, id, sa, sn)  => safe(() => db.alterarSenhaPropria(id, sa, sn), { ok:false }))

// ── Perfis ────────────────────────────────────────────────────────────────────
ipcMain.handle('db:listarPerfis',  ()              => safe(() => db.listarPerfis(), []))
ipcMain.handle('db:criarPerfil',   (_, dados, req) => safe(() => db.criarPerfil(dados, req || {}), { ok:false }))
ipcMain.handle('db:editarPerfil',  (_, id, d, req) => safe(() => db.editarPerfil(id, d, req || {}), { ok:false }))
ipcMain.handle('db:deletarPerfil', (_, id, req)    => safe(() => db.deletarPerfil(id, req || {}), { ok:false }))

// ── Identidade visual ─────────────────────────────────────────────────────────
ipcMain.handle('db:getIdentidade',    ()          => safe(() => db.getIdentidade(), {}))
ipcMain.handle('db:salvarIdentidade', (_, d, req) => safe(() => db.salvarIdentidade(d, req || {}), { ok:false }))

// ── Audit Log ─────────────────────────────────────────────────────────────────
ipcMain.handle('db:listarLogs',        (_, filtros) => safe(() => db.listarLogs(filtros || {}), []))
ipcMain.handle('db:limparLogs',        (_, dias)    => safe(() => db.limparLogs(dias), { ok:false }))
ipcMain.handle('db:estatisticasLogs',  ()           => safe(() => db.estatisticasLogs(), {}))
ipcMain.handle('db:registrarLog',      (_, d)       => safe(() => db.registrarLogExterno(d), { ok:false }))

// ── Selecionar logo ───────────────────────────────────────────────────────────
ipcMain.handle('dialog:selecionarLogo', async () => {
  const win    = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win, {
    title: 'Selecionar Logo',
    filters: [{ name: 'Imagens', extensions: ['png','jpg','jpeg','svg','webp'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths.length) return null
  const fp   = result.filePaths[0]
  const ext  = path.extname(fp).toLowerCase().replace('.','')
  const mime = ext==='svg' ? 'image/svg+xml' : `image/${ext==='jpg'?'jpeg':ext}`
  return { base64:`data:${mime};base64,${fs.readFileSync(fp).toString('base64')}`, nome:path.basename(fp) }
})

// ── Info DB ───────────────────────────────────────────────────────────────────
ipcMain.handle('db:info', () => ({ path: db.getDbPath(), disponivel: true }))

// ── Backup automático ─────────────────────────────────────────────────────────
ipcMain.handle('backup:salvar', (_, jsonString) => {
  try {
    const dir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const ts   = new Date().toISOString().replace(/:/g,'-').split('.')[0]
    const file = path.join(dir, `escola-backup-${ts}.json`)
    fs.writeFileSync(file, jsonString, 'utf8')
    const arquivos = fs.readdirSync(dir)
      .filter(f => f.startsWith('escola-backup-') && f.endsWith('.json'))
      .sort()
    if (arquivos.length > 10) {
      arquivos.slice(0, arquivos.length - 10).forEach(f => {
        try { fs.unlinkSync(path.join(dir, f)) } catch {}
      })
    }
    console.log('[Backup] Salvo em:', file)
    return { ok: true, path: file, tamanho: jsonString.length }
  } catch (e) {
    console.error('[Backup] Erro:', e.message)
    return { ok: false, erro: e.message }
  }
})

ipcMain.handle('backup:listar', () => {
  try {
    const dir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort().reverse()
      .map(f => {
        const fp   = path.join(dir, f)
        const stat = fs.statSync(fp)
        return { nome: f, tamanho: stat.size, data: stat.mtime.toISOString() }
      })
  } catch { return [] }
})

ipcMain.on('backup:abrirPasta', () => {
  const dir = path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  require('electron').shell.openPath(dir)
})

ipcMain.handle('backup:selecionarArquivo', async () => {
  const win    = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win, {
    title:       'Selecionar arquivo de backup',
    defaultPath: path.join(app.getPath('userData'), 'backups'),
    filters:     [{ name: 'Backup JSON', extensions: ['json'] }],
    properties:  ['openFile'],
  })
  if (result.canceled || !result.filePaths.length) return null
  try {
    const conteudo = fs.readFileSync(result.filePaths[0], 'utf8')
    return { ok: true, conteudo, arquivo: path.basename(result.filePaths[0]) }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
})

// ── Frequência ────────────────────────────────────────────────────────────────
ipcMain.handle('freq:listarAulas',            (_, filtros)           => safe(() => db.listarAulas(filtros||{}), []))
ipcMain.handle('freq:criarAula',              (_, dados, req)        => safe(() => db.criarAula(dados, req||{}), { ok:false }))
ipcMain.handle('freq:editarAula',             (_, id, dados, req)    => safe(() => db.editarAula(id, dados, req||{}), { ok:false }))
ipcMain.handle('freq:deletarAula',            (_, id, req)           => safe(() => db.deletarAula(id, req||{}), { ok:false }))
ipcMain.handle('freq:getPresencas',           (_, aulaId)            => safe(() => db.getPresencas(aulaId), []))
ipcMain.handle('freq:salvarPresencas',        (_, aulaId, lista, req)=> safe(() => db.salvarPresencas(aulaId, lista, req||{}), { ok:false }))
ipcMain.handle('freq:estatisticasFrequencia', (_, turmaLsId)         => safe(() => db.estatisticasFrequencia(turmaLsId), { totalAulas:0, alunos:[] }))
ipcMain.handle('freq:registrarAusencia',      (_, dados, req)        => safe(() => db.registrarAusenciaProfessor(dados, req||{}), { ok:false }))

// ── Recados (v5.6) ────────────────────────────────────────────────────────────
ipcMain.handle('recados:listar',       (_, f)       => safe(() => db.listarRecados(f||{}), []))
ipcMain.handle('recados:paraAluno',    (_, params)  => safe(() => db.recadosParaAluno(params), []))
ipcMain.handle('recados:naoLidos',     (_, params)  => safe(() => db.contarNaoLidos(params), 0))
ipcMain.handle('recados:salvar',       (_, d, req)  => safe(() => db.salvarRecado(d, req||{}), { ok:false }))
ipcMain.handle('recados:enviar',       (_, d, req)  => safe(() => db.enviarRecado(d, req||{}), { ok:false }))
ipcMain.handle('recados:marcarLido',   (_, d)       => safe(() => db.marcarRecadoLido(d), { ok:false }))
ipcMain.handle('recados:excluir',      (_, d, req)  => safe(() => db.excluirRecado(d, req||{}), { ok:false }))

// ── PDF Generation via Electron printToPDF ────────────────────────────────────
ipcMain.handle('pdf:gerar', async (_, opcoes) => {
  try {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { ok: false, erro: 'Janela não encontrada' }
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(opcoes.html)}`)
    await new Promise(r => setTimeout(r, 600))
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      printBackground: true,
      pageSize:        opcoes.pageSize    || 'A4',
      landscape:       opcoes.landscape   || false,
      marginType:      opcoes.marginType  || 0,
      scaleFactor:     opcoes.scaleFactor || 100,
    })
    pdfWin.close()
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title:       opcoes.titulo || 'Salvar PDF',
      defaultPath: opcoes.nomeArquivo || 'documento.pdf',
      filters:     [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { ok: false, cancelado: true }
    fs.writeFileSync(filePath, pdfBuffer)
    console.log('[PDF] Salvo em:', filePath)
    return { ok: true, path: filePath }
  } catch (e) {
    console.error('[PDF] Erro:', e.message)
    return { ok: false, erro: e.message }
  }
})

// ── Exportar Rematrículas ─────────────────────────────────────────────────────
ipcMain.handle('relatorio:exportarRematriculas', async (_, { formato, dados: payload }) => {
  try {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { ok: false, erro: 'Janela não encontrada' }

    const isCSV  = formato === 'csv'
    const isXLSX = formato === 'xlsx' || formato === 'xls'

    // dados CSV vêm em payload.dados; buffer XLSX vem em payload.buffer
    const dadosCSV = payload.dados  || payload
    const buffer   = payload.buffer || null

    // ── CSV ──────────────────────────────────────────────────────────────────
    if (isCSV) {
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        title:       'Salvar relatório de rematrículas',
        defaultPath: 'rematriculas.csv',
        filters:     [{ name: 'CSV', extensions: ['csv'] }],
      })
      if (canceled || !filePath) return { ok: false, cancelado: true }

      const sep = ','
      const q   = v => `"${String(v ?? '').replace(/"/g, '""')}"`

      const linhas = [
        ['Aluno', 'Status', 'Turma Atual', 'Tipo Evento', 'De', 'Para', 'Data Evento', 'Total Pago (R$)', 'Qtd Pagamentos'].map(q).join(sep)
      ]
      for (const r of dadosCSV) {
        for (const ev of r.eventos) {
          linhas.push([
            r.alunoNome, r.alunoStatus, r.turmaAtual,
            ev.label, ev.turmaAnterior, ev.turmaAtual, ev.data,
            r.totalPago.toFixed(2).replace('.', ','),
            r.qtdPagamentos,
          ].map(q).join(sep))
        }
      }
      fs.writeFileSync(filePath, '\uFEFF' + linhas.join('\r\n'), 'utf8')
      return { ok: true, path: filePath }
    }

    // ── XLSX / XLS ───────────────────────────────────────────────────────────
    if (isXLSX) {
      const ext = formato === 'xls' ? 'xls' : 'xlsx'
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        title:       'Salvar relatório de rematrículas',
        defaultPath: `rematriculas.${ext}`,
        filters:     [{ name: 'Excel', extensions: [ext] }],
      })
      if (canceled || !filePath) return { ok: false, cancelado: true }
      if (!buffer) return { ok: false, erro: 'Buffer não recebido do renderer' }
      fs.writeFileSync(filePath, Buffer.from(buffer))
      console.log('[Export XLSX] Salvo em:', filePath)
      return { ok: true, path: filePath }
    }

    return { ok: false, erro: 'Formato inválido' }
  } catch (e) {
    console.error('[Export Rematrículas]', e.message)
    return { ok: false, erro: e.message }
  }
})

// ── Alunos (v6) ───────────────────────────────────────────────────────────────
ipcMain.handle('alunos:listar',  (_, filtros)        => safe(() => db.listarAlunos(filtros || {}), []))
ipcMain.handle('alunos:get',     (_, id)             => safe(() => db.getAluno(id), null))
ipcMain.handle('alunos:criar',   (_, dados, req)     => safe(() => db.criarAluno(dados, req || {}), { ok: false }))
ipcMain.handle('alunos:editar',  (_, id, dados, req) => safe(() => db.editarAluno(id, dados, req || {}), { ok: false }))
ipcMain.handle('alunos:deletar', (_, id, req)        => safe(() => db.deletarAluno(id, req || {}), { ok: false }))

// ── Turmas (v6) ───────────────────────────────────────────────────────────────
ipcMain.handle('turmas:listar',  (_, filtros)        => safe(() => db.listarTurmas(filtros || {}), []))
ipcMain.handle('turmas:criar',   (_, dados, req)     => safe(() => db.criarTurma(dados, req || {}), { ok: false }))
ipcMain.handle('turmas:editar',  (_, id, dados, req) => safe(() => db.editarTurma(id, dados, req || {}), { ok: false }))
ipcMain.handle('turmas:deletar', (_, id, req)        => safe(() => db.deletarTurma(id, req || {}), { ok: false }))

// ── Professores (v6) ──────────────────────────────────────────────────────────
ipcMain.handle('professores:listar',       (_, filtros)          => safe(() => db.listarProfessores(filtros || {}), []))
ipcMain.handle('professores:criar',        (_, dados, req)       => safe(() => db.criarProfessor(dados, req || {}), { ok: false }))
ipcMain.handle('professores:editar',       (_, id, dados, req)   => safe(() => db.editarProfessor(id, dados, req || {}), { ok: false }))
ipcMain.handle('professores:deletar',      (_, id, req)          => safe(() => db.deletarProfessor(id, req || {}), { ok: false }))
ipcMain.handle('professores:cargaHoraria', (_, filtros)          => safe(() => db.cargaHorariaProfessores(filtros || {}), []))

// ── Fluxo de Caixa (v5.8) ────────────────────────────────────────────────────
ipcMain.handle('fc:listar',          (_, filtros)        => safe(() => db.listarFluxo(filtros || {}), []))
ipcMain.handle('fc:resumoMensal',    (_, filtros)        => safe(() => db.resumoFluxoMensal(filtros || {}), []))
ipcMain.handle('fc:resumoCategoria', (_, filtros)        => safe(() => db.resumoFluxoCategoria(filtros || {}), []))
ipcMain.handle('fc:criar',           (_, dados, req)     => safe(() => db.criarLancamento(dados, req || {}), { ok: false }))
ipcMain.handle('fc:editar',          (_, id, dados, req) => safe(() => db.editarLancamento(id, dados, req || {}), { ok: false }))
ipcMain.handle('fc:deletar',         (_, id, req)        => safe(() => db.deletarLancamento(id, req || {}), { ok: false }))

// ── Notas / Ata de Resultados (v5.10) ────────────────────────────────────────
ipcMain.handle('notas:listar',   (_, filtros)        => safe(() => db.listarNotasPorTurma(filtros || {}), []))
ipcMain.handle('notas:criar',    (_, dados, req)     => safe(() => db.criarNota(dados, req || {}), { ok: false }))
ipcMain.handle('notas:editar',   (_, id, dados, req) => safe(() => db.editarNota(id, dados, req || {}), { ok: false }))
ipcMain.handle('notas:upsert',   (_, dados, req)     => safe(() => db.editarNotaPorChave(dados, req || {}), { ok: false }))
ipcMain.handle('notas:deletar',  (_, id, req)        => safe(() => db.deletarNota(id, req || {}), { ok: false }))

// ── Reserva de Salas (v5.9) ──────────────────────────────────────────────────
ipcMain.handle('rs:listarSalas',    (_, filtros)        => safe(() => db.listarSalas(filtros || {}), []))
ipcMain.handle('rs:criarSala',      (_, dados, req)     => safe(() => db.criarSala(dados, req || {}), { ok: false }))
ipcMain.handle('rs:editarSala',     (_, id, dados, req) => safe(() => db.editarSala(id, dados, req || {}), { ok: false }))
ipcMain.handle('rs:deletarSala',    (_, id, req)        => safe(() => db.deletarSala(id, req || {}), { ok: false }))
ipcMain.handle('rs:listarReservas', (_, filtros)        => safe(() => db.listarReservas(filtros || {}), []))
ipcMain.handle('rs:criarReserva',   (_, dados, req)     => safe(() => db.criarReserva(dados, req || {}), { ok: false }))
ipcMain.handle('rs:editarReserva',  (_, id, dados, req) => safe(() => db.editarReserva(id, dados, req || {}), { ok: false }))
ipcMain.handle('rs:deletarReserva', (_, id, req)        => safe(() => db.deletarReserva(id, req || {}), { ok: false }))

// ── Estoque e Material Didático (v5.11) ───────────────────────────────────────
ipcMain.handle('estoque:listar',       (_, filtros)        => safe(() => db.listarEstoqueItens(filtros || {}), []))
ipcMain.handle('estoque:get',          (_, id)             => safe(() => db.getEstoqueItem(id), null))
ipcMain.handle('estoque:criar',        (_, dados, req)     => safe(() => db.criarEstoqueItem(dados, req || {}), { ok: false }))
ipcMain.handle('estoque:editar',       (_, id, dados, req) => safe(() => db.editarEstoqueItem(id, dados, req || {}), { ok: false }))
ipcMain.handle('estoque:deletar',      (_, id, req)        => safe(() => db.deletarEstoqueItem(id, req || {}), { ok: false }))
ipcMain.handle('estoque:movimentos',   (_, filtros)        => safe(() => db.listarEstoqueMovimentos(filtros || {}), []))
ipcMain.handle('estoque:movimentar',   (_, dados, req)     => safe(() => db.registrarMovimento(dados, req || {}), { ok: false }))
ipcMain.handle('estoque:resumo',       ()                  => safe(() => db.resumoEstoque(), {}))

// ── Certificados (v5.12) ─────────────────────────────────────────────────────
ipcMain.handle('cert:listar',  (_, filtros)    => safe(() => db.listarCertificados(filtros || {}), []))
ipcMain.handle('cert:criar',   (_, dados, req) => safe(() => db.criarCertificado(dados, req || {}), { ok: false }))
ipcMain.handle('cert:deletar', (_, id, req)    => safe(() => db.deletarCertificado(id, req || {}), { ok: false }))
ipcMain.handle('cert:resumo',  ()              => safe(() => db.resumoCertificados(), {}))

// ── WhatsApp ──────────────────────────────────────────────────────────────────
ipcMain.handle('whatsapp:abrir', (_, numero, mensagem) => {
  try {
    const tel = numero.replace(/\D/g, '')
    const url = `https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`
    require('electron').shell.openExternal(url)
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
})
