/**
 * TitleBar.jsx
 * Barra de título personalizada com controles de janela estilo Windows.
 * Funciona tanto no app principal quanto na tela de login.
 *
 * Props:
 *   showTitle  — exibe "Escola Manager" no centro (para login)
 *   compact    — versão menor sem borda inferior (para incorporar em topbar existente)
 */
import React, { useState } from 'react'
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react'

// Ícone de restaurar (dois quadrados sobrepostos)
function IconRestore() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{pointerEvents:'none'}}>
      <rect x="2.5" y="0.5" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.1"/>
      <rect x="0.5" y="2.5" width="7" height="7" rx="0.5" fill="var(--bg-side)" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  )
}

// Ícone de maximizar (quadrado simples)
function IconMaximize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{pointerEvents:'none'}}>
      <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  )
}

export default function TitleBar({ showTitle = false, compact = false }) {
  const [isMaximized, setIsMaximized] = useState(false)

  function handleMinimize() {
    window.electronAPI?.minimizeWindow()
  }

  function handleMaximize() {
    window.electronAPI?.maximizeWindow()
    setIsMaximized(v => !v)
  }

  function handleClose() {
    window.electronAPI?.closeWindow()
  }

  const height = compact ? 38 : 38

  return (
    <div
      className="titlebar"
      style={{
        height,
        borderBottom: compact ? 'none' : '1px solid var(--border)',
      }}
    >
      {/* Área arrastável */}
      <div className="titlebar-drag" style={{
        display: 'flex', alignItems: 'center',
        paddingLeft: showTitle ? 0 : 14,
        justifyContent: showTitle ? 'center' : 'flex-start',
      }}>
        {showTitle && (
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-3)',
            letterSpacing: .3,
            userSelect: 'none',
            WebkitAppRegion: 'drag',
          }}>
            Escola Manager
          </span>
        )}
      </div>

      {/* Controles */}
      <div className="titlebar-controls">
        {/* Minimizar */}
        <button
          className="tbtn"
          title="Minimizar"
          onClick={handleMinimize}
        >
          <Minus size={11} strokeWidth={2}/>
        </button>

        {/* Maximizar / Restaurar */}
        <button
          className="tbtn"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          onClick={handleMaximize}
        >
          {isMaximized ? <IconRestore/> : <IconMaximize/>}
        </button>

        {/* Fechar */}
        <button
          className="tbtn tbtn-close"
          title="Fechar"
          onClick={handleClose}
        >
          <X size={11} strokeWidth={2}/>
        </button>
      </div>
    </div>
  )
}
