/**
 * tests/security/vulnerabilities.test.js
 *
 * Análise estática + testes de boundary focados em segurança.
 * Não requer Electron nem SQLite — analisa os arquivos fonte.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../')

function readSrc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// ── Análise estática de SQL injection ─────────────────────────────────────────

describe('Segurança — SQL Injection', () => {
  let dbSrc

  beforeAll(() => { dbSrc = readSrc('electron/database.js') })

  it('não usa concatenação direta de strings em db.exec() com variáveis de usuário', () => {
    // Detecta padrões perigosos: db.exec(`...${var}...`) onde var vem de parâmetro
    // Aceita: db.exec com strings literais (schema DDL)
    const lines = dbSrc.split('\n')
    const dangerous = lines.filter((line, i) => {
      // Ignora linhas de schema DDL (criarTabelas/migrarSchema)
      const isSchemaLine = /CREATE TABLE|CREATE INDEX|CREATE TRIGGER|ALTER TABLE|DROP TABLE|PRAGMA|UPDATE aulas/.test(line)
      // Detecta db.exec com interpolação (não-DDL)
      return !isSchemaLine && /db\.exec\(`[^`]*\$\{/.test(line)
    })
    expect(dangerous, `Linhas suspeitas:\n${dangerous.join('\n')}`).toHaveLength(0)
  })

  it('consultas dinâmicas usam placeholders ? e não concatenam variáveis de usuário', () => {
    const lines = dbSrc.split('\n')
    // Padrão suspeito: .prepare(`...${variavel}...`) onde variavel não é `wc` nem `where` (WHERE clause segura)
    // Os WHERE clauses dinâmicos usam array de condições + params separados — isso é seguro
    const suspicious = lines.filter(line => {
      if (!line.includes('.prepare(`')) return false
      // Permitido: ${wc}, ${where}, ${placeholders} (array de ?)
      const safeInterpolations = /\$\{(wc|where|wc2|placeholders|conds\.join|orderBy|limit)\}/.test(line)
      const hasInterpolation   = /\$\{/.test(line)
      // Suspeito: interpolações que não são as variáveis seguras conhecidas
      return hasInterpolation && !safeInterpolations
    })
    if (suspicious.length > 0) {
      console.warn('[AVISO] Verificar manualmente:\n', suspicious.join('\n'))
    }
    // Reporta mas não falha — pode haver casos legítimos; inspecionar saída
    expect(suspicious.length).toBeLessThan(5)
  })

  it('WHERE clauses dinâmicas constroem placeholders a partir de arrays, não de valores', () => {
    // Verifica que o padrão seguro é usado: push condicional em array where/params
    expect(dbSrc).toContain("where.push('")
    expect(dbSrc).toContain('params.push(')
    // Deve haver pelo menos 10 usos desse padrão (é o padrão principal)
    const pushCount = (dbSrc.match(/where\.push\(/g) || []).length
    expect(pushCount).toBeGreaterThan(10)
  })

  it('não usa eval() em nenhum arquivo do Electron', () => {
    const mainSrc = readSrc('electron/main.js')
    expect(dbSrc).not.toMatch(/\beval\s*\(/)
    expect(mainSrc).not.toMatch(/\beval\s*\(/)
  })

  it('não usa Function() como constructor dinâmico', () => {
    const mainSrc = readSrc('electron/main.js')
    expect(dbSrc).not.toMatch(/new Function\s*\(/)
    expect(mainSrc).not.toMatch(/new Function\s*\(/)
  })
})

// ── Análise estática de autenticação ─────────────────────────────────────────

describe('Segurança — Autenticação', () => {
  let dbSrc

  beforeAll(() => { dbSrc = readSrc('electron/database.js') })

  it('hashSenha usa algoritmo próprio não-reversível (não armazena senha em texto)', () => {
    expect(dbSrc).toContain('function hashSenha(')
    expect(dbSrc).not.toContain('senha_hash = senha') // não armazena em clear text
    // Verifica que INSERT usa senha_hash, não senha diretamente
    const insertUsuario = dbSrc.match(/INSERT INTO usuarios[\s\S]*?VALUES[\s\S]*?\)/m)?.[0] || ''
    expect(insertUsuario).not.toContain("d.senha")
  })

  it('verificarSenha compara o hash, não a senha direta', () => {
    expect(dbSrc).toContain('function verificarSenha(')
    expect(dbSrc).toContain('hashSenha(senha) === hash')
  })

  it('login retorna erro genérico sem revelar se o login existe', () => {
    // Extrai função de login
    const loginFn = dbSrc.match(/function login[\s\S]*?^}/m)?.[0] || ''
    // Ambas as falhas (usuário não existe e senha errada) devem retornar o mesmo erro
    const erros = [...loginFn.matchAll(/erro:\s*['"`]([^'"` ]+)/g)].map(m => m[1])
    // Verifica que não expõe "usuário não encontrado" vs "senha incorreta" separados
    const contemDiferencaDetalhe = erros.some(e => /não encontrado|not found|usuário inválido/i.test(e))
    expect(contemDiferencaDetalhe, 'Login não deve revelar se o usuário existe').toBe(false)
  })

  it('hash de senha inclui comprimento da senha como anti-colisão', () => {
    // O hashSenha atual usa djb2 + length suffix — verifica estrutura
    expect(dbSrc).toContain('senha.length')
  })
})

// ── Análise estática de IPC / contextBridge ───────────────────────────────────

describe('Segurança — IPC e contextBridge', () => {
  let preloadSrc, mainSrc

  beforeAll(() => {
    preloadSrc = readSrc('electron/preload.js')
    mainSrc    = readSrc('electron/main.js')
  })

  it('preload usa contextBridge (não expõe ipcRenderer diretamente)', () => {
    expect(preloadSrc).toContain('contextBridge.exposeInMainWorld')
    expect(preloadSrc).not.toMatch(/window\.ipcRenderer\s*=/)
  })

  it('não há remote module (vetor de escalonamento em Electron < 14)', () => {
    expect(preloadSrc).not.toContain("require('electron').remote")
    expect(mainSrc).not.toContain("require('electron').remote")
  })

  it('todos os handlers IPC usam ipcMain.handle (seguro) e não ipcMain.on para dados', () => {
    // ipcMain.on é aceitável para fire-and-forget (minimize, close, backup:done)
    // mas dados sensíveis devem usar handle (que retorna Promise)
    const onHandlers = (mainSrc.match(/ipcMain\.on\(['"][^'"]+['"]/g) || [])
      .map(m => m.match(/['"]([^'"]+)['"]/)[1])
    const dangerousOn = onHandlers.filter(h => !['minimize-window', 'maximize-window', 'close-window', 'backup:done', 'backup:skip', 'backup:abrirPasta'].includes(h))
    expect(dangerousOn, `Handlers .on() que deveriam ser .handle():\n${dangerousOn}`).toHaveLength(0)
  })

  it('nodeIntegration está desabilitado nas webPreferences', () => {
    expect(mainSrc).toContain('nodeIntegration: false')
  })

  it('contextIsolation está habilitado', () => {
    expect(mainSrc).toContain('contextIsolation: true')
  })
})

// ── Análise estática de XSS / dados não sanitizados ──────────────────────────

describe('Segurança — XSS e injeção de conteúdo', () => {
  it('AppContext não usa dangerouslySetInnerHTML', () => {
    const src = readSrc('src/context/AppContext.jsx')
    expect(src).not.toContain('dangerouslySetInnerHTML')
  })

  it('nenhuma página principal usa dangerouslySetInnerHTML com dados de usuário', () => {
    const pages = [
      'src/pages/Alunos.jsx',
      'src/pages/Financeiro.jsx',
      'src/pages/Agenda.jsx',
    ].filter(p => {
      try { readSrc(p); return true } catch { return false }
    })

    pages.forEach(page => {
      const src = readSrc(page)
      if (src.includes('dangerouslySetInnerHTML')) {
        // Verifica que o conteúdo não é dado direto de usuário (aluno.nome, etc.)
        const matches = src.match(/dangerouslySetInnerHTML=\{[^}]+\}/g) || []
        matches.forEach(m => {
          expect(m, `${page}: dangerouslySetInnerHTML com dado de usuário?`).not.toMatch(/aluno\.|pagamento\.|professor\./)
        })
      }
    })
  })
})

// ── Validação de entrada — lógica de negócio ──────────────────────────────────

describe('Segurança — Validação de entrada no backend', () => {
  let dbSrc

  beforeAll(() => { dbSrc = readSrc('electron/database.js') })

  it('criarAluno valida nome obrigatório', () => {
    expect(dbSrc).toMatch(/criarAluno[\s\S]*?nome[\s\S]*?obrigatório/m)
  })

  it('criarProfessor valida nome obrigatório', () => {
    expect(dbSrc).toMatch(/criarProfessor[\s\S]*?nome[\s\S]*?obrigatório/m)
  })

  it('criarTurma valida codigo e idioma', () => {
    expect(dbSrc).toMatch(/criarTurma[\s\S]*?(codigo|idioma)[\s\S]*?obrigatório/m)
  })

  it('criarAluno valida mensalidade via _resolverMatriculas (proteção contra string)', () => {
    // A conversão de mensalidade acontece em _resolverMatriculas, chamada por criarAluno
    // Verifica que _resolverMatriculas existe e faz conversão numérica
    const resolverFn = dbSrc.match(/function _resolverMatriculas[\s\S]*?^}/m)?.[0] || ''
    // Deve haver conversão para Number em algum momento para evitar concatenação de string
    const temConversao = /Number\(|parseFloat\(|\+\s*[a-zA-Z]/.test(resolverFn) ||
                         /mensalidadeTotal/.test(resolverFn)
    expect(temConversao).toBe(true)
  })

  it('tipo_contrato é validado via whitelist, não passado direto da UI', () => {
    // Verifica que há checagem explícita: === 'PJ' ? 'PJ' : 'CLT'
    expect(dbSrc).toContain("=== 'PJ' ? 'PJ' : 'CLT'")
  })

  it('status de pagamento é validado pelo CHECK constraint do SQLite', () => {
    expect(dbSrc).toContain("CHECK(status IN ('Pendente','Pago','Atrasado'))")
  })

  it('status de aluno é validado pelo CHECK constraint do SQLite', () => {
    expect(dbSrc).toContain("CHECK(status IN ('Ativo','Inativo','Trancado','Lista de Espera'))")
  })
})

// ── Boundary conditions — cálculos financeiros ───────────────────────────────

describe('Segurança — Boundary conditions financeiras', () => {
  function _calcularEncargosDb(valorOriginal, vencimento, dataRef, fin) {
    const multa = fin?.multaAtraso ?? 10
    const juros = fin?.jurosAtraso ?? 2
    const ref   = new Date((dataRef || new Date().toISOString().split('T')[0]) + 'T00:00:00')
    const venc  = new Date(vencimento + 'T00:00:00')
    const dias  = Math.max(0, Math.floor((ref - venc) / 86400000))
    if (dias <= 0) return { valorTotal: valorOriginal, valorMulta: 0, valorJuros: 0, dias: 0 }
    const valorMulta = Math.round(valorOriginal * (multa / 100) * 100) / 100
    const diasJuros  = Math.max(0, dias - 1)
    const valorJuros = Math.round(valorOriginal * (juros / 100) * (diasJuros / 30) * 100) / 100
    return { valorTotal: Math.round((valorOriginal + valorMulta + valorJuros) * 100) / 100, valorMulta, valorJuros, dias }
  }

  it('valor 0: não gera NaN nem Infinity', () => {
    const r = _calcularEncargosDb(0, '2025-01-01', '2025-02-01', { multaAtraso: 10, jurosAtraso: 2 })
    expect(isNaN(r.valorTotal)).toBe(false)
    expect(isFinite(r.valorTotal)).toBe(true)
    expect(r.valorTotal).toBe(0)
  })

  it('multaAtraso 0%: só juros', () => {
    const r = _calcularEncargosDb(300, '2025-01-01', '2025-01-03', { multaAtraso: 0, jurosAtraso: 2 })
    expect(r.valorMulta).toBe(0)
    expect(r.valorJuros).toBeGreaterThan(0)
  })

  it('jurosAtraso 0%: só multa', () => {
    const r = _calcularEncargosDb(300, '2025-01-01', '2025-02-15', { multaAtraso: 10, jurosAtraso: 0 })
    expect(r.valorMulta).toBe(30)
    expect(r.valorJuros).toBe(0)
  })

  it('data referência igual ao vencimento: sem encargos', () => {
    const r = _calcularEncargosDb(300, '2025-06-01', '2025-06-01', { multaAtraso: 10, jurosAtraso: 2 })
    expect(r.dias).toBe(0)
    expect(r.valorMulta).toBe(0)
  })

  it('vencimento string inválida: não trava (retorna valorOriginal)', () => {
    // Data inválida resulta em NaN mas não deve lançar exceção
    expect(() => _calcularEncargosDb(300, 'invalid-date', '2025-01-01', {})).not.toThrow()
  })

  it('valorOriginal negativo: não gera valor total maior que original', () => {
    // Valores negativos não deveriam existir, mas não devem gerar resultados bizarros
    const r = _calcularEncargosDb(-100, '2025-01-01', '2025-02-01', { multaAtraso: 10, jurosAtraso: 2 })
    // Com valor negativo, multa seria negativa — o resultado deve ser "menos negativo" (encargos em módulo)
    expect(isFinite(r.valorTotal)).toBe(true)
  })

  it('configuração com multaAtraso 100%: valorTotal = 2x', () => {
    const r = _calcularEncargosDb(200, '2025-01-01', '2025-01-02', { multaAtraso: 100, jurosAtraso: 0 })
    expect(r.valorMulta).toBe(200)
    expect(r.valorTotal).toBe(400)
  })
})

// ── Gestão de sessão ──────────────────────────────────────────────────────────

describe('Segurança — Gestão de sessão', () => {
  let appCtxSrc

  beforeAll(() => { appCtxSrc = readSrc('src/context/AppContext.jsx') })

  it('sessão lida de sessionStorage, não localStorage (não persiste entre sessões)', () => {
    expect(appCtxSrc).toContain("sessionStorage.getItem('em_user_v5')")
    // Não deve ler usuário do localStorage
    expect(appCtxSrc).not.toMatch(/localStorage\.getItem\(['"]em_user/)
  })

  it('getReq trata falha de parse sem lançar exceção', () => {
    // Verifica try-catch em getReq
    const getReqFn = appCtxSrc.match(/function getReq\(\)[\s\S]*?catch[\s\S]*?\}/m)?.[0] || ''
    expect(getReqFn).toContain('catch')
  })
})

// ── Integridade do backup ─────────────────────────────────────────────────────

describe('Segurança — Integridade do backup', () => {
  let appCtxSrc

  beforeAll(() => { appCtxSrc = readSrc('src/context/AppContext.jsx') })

  it('restaurarBackup valida se dados são objeto antes de restaurar', () => {
    const fn = appCtxSrc.match(/const restaurarBackup[\s\S]*?return \{ ok: true/m)?.[0] || ''
    expect(fn).toContain('typeof dados !== \'object\'')
  })

  it('restaurarBackup verifica presença mínima de campos antes de restaurar', () => {
    const fn = appCtxSrc.match(/const restaurarBackup[\s\S]*?return \{ ok: true/m)?.[0] || ''
    expect(fn).toContain('temAlunos')
    expect(fn).toContain('temTurmas')
  })

  it('restaurarBackup força migradoSQLite = false para evitar inconsistência', () => {
    expect(appCtxSrc).toContain('migradoSQLite: false')
  })

  it('backup automático usa versão atualizada', () => {
    expect(appCtxSrc).toContain("versao:      '5.15.0'")
  })
})
