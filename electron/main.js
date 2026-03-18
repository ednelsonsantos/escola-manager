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
      contextIsolation: true,   // obrigatório para contextBridge
      nodeIntegration:  false,
      sandbox:          false,  // necessário para require() no preload
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
  win.on('close', (e) => {
    if (closeReady) return
    e.preventDefault()
    win.webContents.send('app:before-close')
  })

  ipcMain.once('backup:done', () => { closeReady = true; win.close() })
  ipcMain.once('backup:skip', () => { closeReady = true; win.close() })
}

// Nenhum flag extra — os defaults do Electron 29 são corretos para contextIsolation

app.whenReady().then(() => {
  try { db.init() } catch (e) { console.error('[Main] DB init error:', e.message) }
  createWindow()
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
// Salva o JSON de backup em %APPDATA%\Escola Manager\backups\
ipcMain.handle('backup:salvar', (_, jsonString) => {
  try {
    const dir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    // Nome com data/hora: escola-backup-2025-01-14T10-30.json
    const ts   = new Date().toISOString().replace(/:/g,'-').split('.')[0]
    const file = path.join(dir, `escola-backup-${ts}.json`)
    fs.writeFileSync(file, jsonString, 'utf8')

    // Mantém apenas os últimos 10 backups automáticos
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

// Lista backups disponíveis
ipcMain.handle('backup:listar', () => {
  try {
    const dir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => {
        const fp   = path.join(dir, f)
        const stat = fs.statSync(fp)
        return { nome: f, tamanho: stat.size, data: stat.mtime.toISOString() }
      })
  } catch { return [] }
})

// Abre a pasta de backups no Explorer
ipcMain.on('backup:abrirPasta', () => {
  const dir = path.join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  require('electron').shell.openPath(dir)
})

// Abre diálogo para o usuário escolher um arquivo JSON de backup e retorna o conteúdo
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
ipcMain.handle('freq:listarAulas',            (_, filtros)      => safe(() => db.listarAulas(filtros||{}), []))
ipcMain.handle('freq:criarAula',              (_, dados, req)   => safe(() => db.criarAula(dados, req||{}), { ok:false }))
ipcMain.handle('freq:editarAula',             (_, id, dados, req) => safe(() => db.editarAula(id, dados, req||{}), { ok:false }))
ipcMain.handle('freq:deletarAula',            (_, id, req)      => safe(() => db.deletarAula(id, req||{}), { ok:false }))
ipcMain.handle('freq:getPresencas',           (_, aulaId)       => safe(() => db.getPresencas(aulaId), []))
ipcMain.handle('freq:salvarPresencas',        (_, aulaId, lista, req) => safe(() => db.salvarPresencas(aulaId, lista, req||{}), { ok:false }))
ipcMain.handle('freq:estatisticasFrequencia', (_, turmaLsId)    => safe(() => db.estatisticasFrequencia(turmaLsId), { totalAulas:0, alunos:[] }))

// ── PDF Generation via Electron printToPDF ────────────────────────────────────
ipcMain.handle('pdf:gerar', async (_, opcoes) => {
  try {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { ok: false, erro: 'Janela não encontrada' }

    // Abre a janela oculta de impressão com o HTML enviado
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    })

    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(opcoes.html)}`)

    // Aguarda render completo
    await new Promise(r => setTimeout(r, 600))

    const pdfBuffer = await pdfWin.webContents.printToPDF({
      printBackground:     true,
      pageSize:            opcoes.pageSize    || 'A4',
      landscape:           opcoes.landscape   || false,
      marginType:          opcoes.marginType  || 0,  // 0=default, 1=none, 2=minimum
      scaleFactor:         opcoes.scaleFactor || 100,
    })

    pdfWin.close()

    // Diálogo para escolher onde salvar
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

// ── WhatsApp — abrir link wa.me no navegador padrão ──────────────────────────
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
