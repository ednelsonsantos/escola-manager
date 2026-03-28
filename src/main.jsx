import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider }      from './context/AppContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { UsuariosProvider } from './context/UsuariosContext.jsx'
import App   from './App.jsx'
import Login from './components/Login.jsx'
import './style.css'

// ── ErrorBoundary — evita tela preta silenciosa em produção ──────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('[ErrorBoundary]', e, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        height:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#0d0f14', color:'#f2617a', fontFamily:'monospace',
        padding:32, textAlign:'center', gap:16,
      }}>
        <div style={{fontSize:32}}>⚠️</div>
        <div style={{fontSize:16, fontWeight:700}}>Erro ao inicializar o aplicativo</div>
        <div style={{
          fontSize:12, color:'#8b949e', maxWidth:560,
          background:'#161b22', padding:16, borderRadius:8,
          whiteSpace:'pre-wrap', wordBreak:'break-all', textAlign:'left',
        }}>
          {this.state.error?.message || String(this.state.error)}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop:8, padding:'10px 24px', borderRadius:8,
            background:'#63dcaa', color:'#0d0f14', border:'none',
            cursor:'pointer', fontSize:14, fontWeight:600,
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }
}

function AuthGate() {
  const { user, loading } = useAuth()

  useEffect(() => {
    try {
      const s = localStorage.getItem('em_settings')
      const tema = JSON.parse(s)?.aparencia?.tema || 'dark'
      document.documentElement.setAttribute('data-theme', tema)
    } catch {}
  }, [])

  if (loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-app)'}}>
      <span style={{display:'inline-block',width:28,height:28,border:'3px solid var(--border)',
        borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
    </div>
  )

  if (!user) return <Login/>

  return (
    <HashRouter>
      <AppProvider>
        <UsuariosProvider>
          <App/>
        </UsuariosProvider>
      </AppProvider>
    </HashRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate/>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
