/**
 * AuthContext — gerencia sessão, permissões e identidade visual
 *
 * Permissões por módulo: 0=sem acesso, 1=somente leitura, 2=edição completa
 * usePermissao(modulo) retorna { podeVer, podeEditar }
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthCtx = createContext(null)

// ── Fallback quando Electron não está disponível (dev web) ────────────────────
const FALLBACK_USER = {
  id: 0, login: 'admin', nome: 'Administrador', perfil_nome: 'Administrador',
  perfil_cor: '#63dcaa',
  perm_dashboard: 2, perm_alunos: 2, perm_financeiro: 2,
  perm_cursos: 2, perm_relatorios: 2, perm_agenda: 2,
  perm_config: 2, perm_usuarios: 2,
}

const FALLBACK_IDENTIDADE = {
  nome_escola: 'Escola Manager', slogan: 'Sistema de Gestão Escolar',
  logo_base64: '', logo_nome: '',
}

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null)
  const [identidade, setIdentidade] = useState(FALLBACK_IDENTIDADE)
  const [loading,    setLoading]    = useState(true)

  // Restaurar sessão
  useEffect(() => {
    try {
      const s = sessionStorage.getItem('em_user_v5')
      if (s) setUser(JSON.parse(s))
    } catch {}
    carregarIdentidade()
    setLoading(false)
  }, [])

  async function carregarIdentidade() {
    if (window.electronAPI?.getIdentidade) {
      const id = await window.electronAPI.getIdentidade()
      if (id) setIdentidade(id)
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function login(loginInput, senha) {
    if (window.electronAPI?.login) {
      const res = await window.electronAPI.login(loginInput, senha)
      if (res.ok) {
        sessionStorage.setItem('em_user_v5', JSON.stringify(res.usuario))
        setUser(res.usuario)
        return { ok: true }
      }
      return { ok: false, erro: res.erro }
    }
    // fallback sem Electron
    const fakes = [
      { login:'admin', senha:'admin123' },
      { login:'secretaria', senha:'sec123' },
      { login:'demo', senha:'demo' },
    ]
    const match = fakes.find(f => f.login === loginInput && f.senha === senha)
    if (match) {
      const u = { ...FALLBACK_USER, login: match.login }
      sessionStorage.setItem('em_user_v5', JSON.stringify(u))
      setUser(u)
      return { ok: true }
    }
    return { ok: false, erro: 'Usuário ou senha inválidos' }
  }

  function logout() {
    sessionStorage.removeItem('em_user_v5')
    setUser(null)
  }

  // ── Permissões ─────────────────────────────────────────────────────────────
  function permissao(modulo) {
    if (!user) return { podeVer: false, podeEditar: false }
    const nivel = user[`perm_${modulo}`] ?? 0
    return {
      podeVer:    nivel >= 1,
      podeEditar: nivel >= 2,
      nivel,
    }
  }

  // ── Identidade visual ──────────────────────────────────────────────────────
  async function salvarIdentidade(dados) {
    if (window.electronAPI?.salvarIdentidade) {
      const u = JSON.parse(sessionStorage.getItem('em_user_v5') || '{}')
      const req = { userId: u.id, userLogin: u.login || 'sistema' }
      const res = await window.electronAPI.salvarIdentidade(dados, req)
      if (res.ok) {
        setIdentidade(d => ({ ...d, ...dados }))
        return { ok: true }
      }
    } else {
      // fallback: localStorage
      const novo = { ...identidade, ...dados }
      setIdentidade(novo)
      try { localStorage.setItem('em_identidade', JSON.stringify(novo)) } catch {}
      return { ok: true }
    }
    return { ok: false }
  }

  async function selecionarLogo() {
    if (window.electronAPI?.selecionarLogo) {
      return await window.electronAPI.selecionarLogo()
    }
    return null
  }

  return (
    <AuthCtx.Provider value={{
      user, loading, login, logout,
      permissao,
      identidade, salvarIdentidade, selecionarLogo, carregarIdentidade,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
