/**
 * dev-runner.js
 * Inicia o Vite dev server, detecta a porta real que ele escolheu
 * (pode ser 5173, 5174, etc. dependendo do que estiver livre),
 * e então inicia o Electron apontando para a URL correta.
 *
 * Uso: node dev-runner.js
 */

const { spawn } = require('child_process')
const net       = require('net')

// ── Tenta encontrar a primeira porta livre a partir de 5173 ──────────────────
function portaLivre(inicio = 5173) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(portaLivre(inicio + 1)))
    server.once('listening', () => {
      const porta = server.address().port
      server.close(() => resolve(porta))
    })
    server.listen(inicio)
  })
}

async function main() {
  const porta = await portaLivre(5173)
  const url   = `http://localhost:${porta}`

  console.log(`\n🚀 Iniciando Vite na porta ${porta}...`)

  // Inicia Vite com a porta correta
  const vite = spawn(
    'npx', ['vite', '--port', String(porta), '--no-strictPort'],
    { shell: true, stdio: ['inherit', 'pipe', 'pipe'] }
  )

  let viteReady = false
  let electronProc = null

  function tryStartElectron(text) {
    if (viteReady) return
    // Detecta quando o Vite está pronto (linha "Local: http://...")
    if (text.includes('Local:') || text.includes('ready in') || text.includes('localhost:')) {
      viteReady = true
      console.log(`\n⚡ Vite pronto em ${url} — iniciando Electron...`)
      process.env.VITE_DEV_URL = url
      electronProc = spawn('npx', ['electron', '.'], {
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, VITE_DEV_URL: url },
      })
      electronProc.on('exit', (code) => {
        console.log('\n📦 Electron encerrado. Parando Vite...')
        vite.kill()
        process.exit(code || 0)
      })
    }
  }

  vite.stdout.on('data', (data) => {
    const text = data.toString()
    process.stdout.write(text)
    tryStartElectron(text)
  })

  vite.stderr.on('data', (data) => {
    const text = data.toString()
    // Suprime o aviso de CJS do Vite (apenas informativo)
    if (!text.includes('CJS build of Vite')) process.stderr.write(text)
    tryStartElectron(text)
  })

  vite.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Vite encerrou com código ${code}`)
      if (electronProc) electronProc.kill()
      process.exit(code)
    }
  })

  process.on('SIGINT',  () => { vite.kill(); if (electronProc) electronProc.kill(); process.exit(0) })
  process.on('SIGTERM', () => { vite.kill(); if (electronProc) electronProc.kill(); process.exit(0) })
}

main().catch(err => { console.error(err); process.exit(1) })
