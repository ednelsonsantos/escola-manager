/**
 * UsuariosContext — CRUD de usuários e perfis via IPC do Electron
 * Usa fallback em localStorage quando rodando sem Electron.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const Ctx = createContext(null)

// ── Perfis fallback (sem Electron) ───────────────────────────────────────────
const PERFIS_FALLBACK = [
  { id:1, nome:'Administrador', desc:'Acesso total',   cor:'#63dcaa',
    perm_dashboard:2, perm_alunos:2, perm_financeiro:2, perm_cursos:2,
    perm_relatorios:2, perm_agenda:2, perm_config:2, perm_usuarios:2 },
  { id:2, nome:'Secretaria',    desc:'Sem configurações', cor:'#5b9cf6',
    perm_dashboard:1, perm_alunos:2, perm_financeiro:2, perm_cursos:1,
    perm_relatorios:1, perm_agenda:2, perm_config:0, perm_usuarios:0 },
  { id:3, nome:'Professor',     desc:'Leitura',         cor:'#f5c542',
    perm_dashboard:1, perm_alunos:1, perm_financeiro:0, perm_cursos:1,
    perm_relatorios:0, perm_agenda:1, perm_config:0, perm_usuarios:0 },
  { id:4, nome:'Financeiro',    desc:'Foco financeiro', cor:'#a78bfa',
    perm_dashboard:1, perm_alunos:1, perm_financeiro:2, perm_cursos:0,
    perm_relatorios:2, perm_agenda:0, perm_config:0, perm_usuarios:0 },
  { id:5, nome:'Visualizador',  desc:'Somente leitura', cor:'#8b949e',
    perm_dashboard:1, perm_alunos:1, perm_financeiro:1, perm_cursos:1,
    perm_relatorios:1, perm_agenda:1, perm_config:0, perm_usuarios:0 },
]

const USUARIOS_FALLBACK = [
  { id:1, login:'admin',      nome:'Administrador', email:'admin@escola.com',  ativo:1, perfil_id:1, perfil_nome:'Administrador', perfil_cor:'#63dcaa', avatar_cor:'#63dcaa' },
  { id:2, login:'secretaria', nome:'Secretaria',    email:'sec@escola.com',    ativo:1, perfil_id:2, perfil_nome:'Secretaria',    perfil_cor:'#5b9cf6', avatar_cor:'#5b9cf6' },
  { id:3, login:'demo',       nome:'Demonstração',  email:'demo@escola.com',   ativo:1, perfil_id:1, perfil_nome:'Administrador', perfil_cor:'#63dcaa', avatar_cor:'#f5c542' },
]

function loadLS(k, fb) { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb } catch { return fb } }
function saveLS(k,v)    { try { localStorage.setItem(k,JSON.stringify(v)) } catch {} }

// Helper to get current user from sessionStorage (avoids circular dep with AuthContext)
function getUser() {
  try { return JSON.parse(sessionStorage.getItem('em_user_v5')) } catch { return null }
}

export function UsuariosProvider({ children }) {
  const [usuarios,  setUsuarios]  = useState([])
  const [perfis,    setPerfis]    = useState([])
  const [loadingU,  setLoadingU]  = useState(true)
  const hasElectron = !!window.electronAPI?.listarUsuarios

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoadingU(true)
    if (hasElectron) {
      const [us, ps] = await Promise.all([
        window.electronAPI.listarUsuarios(),
        window.electronAPI.listarPerfis(),
      ])
      setUsuarios(us || [])
      setPerfis(ps || [])
    } else {
      setUsuarios(loadLS('em_usuarios_v5', USUARIOS_FALLBACK))
      setPerfis(loadLS('em_perfis_v5', PERFIS_FALLBACK))
    }
    setLoadingU(false)
  }

  // ── Toast via AppContext não disponível aqui, retornamos {ok, erro} ─────────
  async function addUsuario(dados) {
    if (hasElectron) {
      const req = { userId: getUser()?.id, userLogin: getUser()?.login }
    const res = await window.electronAPI.criarUsuario(dados, req)
      if (res.ok) await carregar()
      return res
    }
    const existe = usuarios.find(u=>u.login===dados.login.toLowerCase())
    if (existe) return { ok:false, erro:'Login já em uso' }
    const perf = perfis.find(p=>p.id===Number(dados.perfilId))
    const novo = {
      id: Math.max(0,...usuarios.map(u=>u.id))+1,
      login: dados.login.toLowerCase(), nome: dados.nome, email: dados.email||'',
      ativo: 1, perfil_id: Number(dados.perfilId),
      perfil_nome: perf?.nome||'', perfil_cor: perf?.cor||'#63dcaa',
      avatar_cor: dados.avatarCor||'#63dcaa',
    }
    const lista = [...usuarios, novo]
    setUsuarios(lista); saveLS('em_usuarios_v5', lista)
    return { ok: true }
  }

  async function updateUsuario(id, dados) {
    if (hasElectron) {
      const req = { userId: getUser()?.id, userLogin: getUser()?.login }
      const res = await window.electronAPI.editarUsuario(id, dados, req)
      if (res.ok) await carregar()
      return res
    }
    const perf = perfis.find(p=>p.id===Number(dados.perfilId))
    const lista = usuarios.map(u => u.id===id ? {
      ...u, nome:dados.nome, email:dados.email||'',
      ativo: dados.ativo?1:0, perfil_id:Number(dados.perfilId),
      perfil_nome:perf?.nome||u.perfil_nome, perfil_cor:perf?.cor||u.perfil_cor,
      avatar_cor:dados.avatarCor||u.avatar_cor
    } : u)
    setUsuarios(lista); saveLS('em_usuarios_v5', lista)
    return { ok: true }
  }

  async function removeUsuario(id) {
    if (hasElectron) {
      const req = { userId: getUser()?.id, userLogin: getUser()?.login }
    const res = await window.electronAPI.deletarUsuario(id, req)
      if (res.ok) await carregar()
      return res
    }
    const lista = usuarios.filter(u=>u.id!==id)
    setUsuarios(lista); saveLS('em_usuarios_v5', lista)
    return { ok: true }
  }

  async function addPerfil(dados) {
    if (hasElectron) {
      const req = { userId: getUser()?.id, userLogin: getUser()?.login }
    const res = await window.electronAPI.criarPerfil(dados, req)
      if (res.ok) await carregar()
      return res
    }
    const novo = { ...dados, id: Math.max(0,...perfis.map(p=>p.id))+1 }
    const lista = [...perfis, novo]
    setPerfis(lista); saveLS('em_perfis_v5', lista)
    return { ok: true }
  }

  async function updatePerfil(id, dados) {
    if (hasElectron) {
      const req = { userId: getUser()?.id, userLogin: getUser()?.login }
      const res = await window.electronAPI.editarPerfil(id, dados, req)
      if (res.ok) await carregar()
      return res
    }
    const lista = perfis.map(p => p.id===id ? { ...p, ...dados } : p)
    setPerfis(lista); saveLS('em_perfis_v5', lista)
    // atualiza perfil_nome nos usuarios
    const ul = usuarios.map(u => u.perfil_id===id ? { ...u, perfil_nome:dados.nome, perfil_cor:dados.cor } : u)
    setUsuarios(ul); saveLS('em_usuarios_v5', ul)
    return { ok: true }
  }

  async function removePerfil(id) {
    if (hasElectron) {
      const req = { userId: getUser()?.id, userLogin: getUser()?.login }
    const res = await window.electronAPI.deletarPerfil(id, req)
      if (res.ok) await carregar()
      return res
    }
    const uso = usuarios.filter(u=>u.perfil_id===id).length
    if (uso > 0) return { ok:false, erro:`Perfil em uso por ${uso} usuário(s)` }
    const lista = perfis.filter(p=>p.id!==id)
    setPerfis(lista); saveLS('em_perfis_v5', lista)
    return { ok: true }
  }

  async function alterarSenha(id, senhaAtual, novaSenha) {
    if (hasElectron) return window.electronAPI.alterarSenhaPropria(id, senhaAtual, novaSenha)
    return { ok: true } // fallback sem verificação
  }

  return (
    <Ctx.Provider value={{
      usuarios, perfis, loadingU, carregar,
      addUsuario, updateUsuario, removeUsuario,
      addPerfil, updatePerfil, removePerfil,
      alterarSenha,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useUsuarios() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUsuarios must be inside UsuariosProvider')
  return ctx
}
