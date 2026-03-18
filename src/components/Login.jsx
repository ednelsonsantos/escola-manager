import React, { useState } from 'react'
import { Eye, EyeOff, Lock, User, AlertCircle, Shield, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import TitleBar from './TitleBar.jsx'

export default function Login() {
  const { login, identidade } = useAuth()
  const [loginInput, setLoginInput] = useState('')
  const [senha,      setSenha]      = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [erro,       setErro]       = useState('')
  const [loading,    setLoading]    = useState(false)

  const nomeEscola = identidade?.nome_escola || 'Escola Manager'
  const slogan     = identidade?.slogan      || 'Sistema de Gestão Escolar'
  const logo       = identidade?.logo_base64 || ''

  async function handleSubmit(e) {
    e.preventDefault()
    if (!loginInput || !senha) { setErro('Preencha todos os campos.'); return }
    setLoading(true)
    const res = await login(loginInput, senha)
    if (!res.ok) { setErro(res.erro || 'Credenciais inválidas'); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-app)',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '24px 16px',
    }}>
      {/* Barra de título com controles de janela — fixa no topo */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      }}>
        <TitleBar showTitle={true}/>
      </div>

      {/* Espaço para a barra de título */}
      <div style={{ height: 38, flexShrink: 0 }}/>

      {/* Blobs decorativos */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-8%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)',
        }}/>
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-8%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--blu-dim) 0%, transparent 70%)',
        }}/>
      </div>

      {/* Conteúdo principal */}
      <div style={{
        width: 'min(420px, 94vw)',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeUp .4s ease',
      }}>
        {/* Logo / Nome */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {logo
            ? <img src={logo} alt="Logo" style={{
                height: 64, maxWidth: 200, objectFit: 'contain',
                margin: '0 auto 12px', display: 'block',
              }}/>
            : <div style={{
                width: 60, height: 60,
                background: 'linear-gradient(135deg, var(--accent), var(--blue))',
                borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 14px',
                boxShadow: '0 8px 24px var(--accent-glow)',
              }}>🎓</div>
          }
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 22, fontWeight: 800,
            color: 'var(--text-1)', letterSpacing: -.5,
          }}>
            {nomeEscola}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {slogan}
          </div>
        </div>

        {/* Card de login */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '26px 26px 22px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 16, fontWeight: 700,
            color: 'var(--text-1)', marginBottom: 18,
          }}>
            Entrar no sistema
          </div>

          <form onSubmit={handleSubmit}>
            {/* Usuário */}
            <div style={{ marginBottom: 13 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: .6, color: 'var(--text-3)', display: 'block', marginBottom: 5,
              }}>Usuário</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-3)',
                }}/>
                <input
                  className="input"
                  value={loginInput}
                  onChange={e => { setLoginInput(e.target.value); setErro('') }}
                  placeholder="Digite seu usuário"
                  autoFocus
                  autoComplete="username"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Senha */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: .6, color: 'var(--text-3)', display: 'block', marginBottom: 5,
              }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-3)',
                }}/>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErro('') }}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 11, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 12px',
                background: 'var(--red-dim)',
                border: '1px solid rgba(242,97,122,.2)',
                borderRadius: 8, marginBottom: 14,
                fontSize: 13, color: 'var(--red)',
              }}>
                <AlertCircle size={14}/>{erro}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: 42, fontSize: 14 }}
              disabled={loading}
            >
              {loading
                ? <span style={{
                    display: 'inline-block', width: 16, height: 16,
                    border: '2px solid rgba(0,0,0,.3)',
                    borderTopColor: '#0d1a12',
                    borderRadius: '50%',
                    animation: 'spin .7s linear infinite',
                  }}/>
                : 'Entrar'
              }
            </button>
          </form>

          {/* Acesso demo */}
          <div style={{
            marginTop: 16, padding: '11px',
            background: 'var(--bg-hover)', borderRadius: 9,
            fontSize: 12, color: 'var(--text-3)',
          }}>
            <strong style={{ color: 'var(--text-2)' }}>Acesso demo:</strong><br/>
            Usuário: <code style={{ color: 'var(--accent)' }}>demo</code>
            {' · '}
            Senha: <code style={{ color: 'var(--accent)' }}>demo</code>
          </div>
        </div>

        {/* ── BADGE de licença + autor ── */}
        <div style={{
          marginTop: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* Licença */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--border-accent)',
            borderRadius: 20,
            fontSize: 11.5, fontWeight: 600, color: 'var(--accent)',
          }}>
            <Shield size={12}/>
            Software Livre · GPL-3.0 · Free to Use Forever
          </div>

          {/* Autor */}
          <div style={{
            fontSize: 12,
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            Feito com
            <Heart size={11} style={{ color: 'var(--red)', fill: 'var(--red)' }}/>
            por
            <strong style={{ color: 'var(--text-2)' }}>Ednelson Santos</strong>
            &nbsp;·&nbsp; v5.5.2
          </div>
        </div>
      </div>
    </div>
  )
}
