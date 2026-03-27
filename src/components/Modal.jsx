import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, size='', onSubmit }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div className={`modal ${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="close-btn" onClick={onClose}><X size={15}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export function ConfirmModal({ title, msg, onConfirm, onClose, danger=false }) {
  return createPortal(
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal" style={{width:'min(400px,92vw)'}}>
        <div className="modal-body" style={{textAlign:'center',paddingTop:28}}>
          <div className="confirm-icon" style={{background: danger ? 'var(--red-dim)' : 'var(--blu-dim)'}}>
            <span style={{fontSize:22}}>{danger ? '⚠️' : '❓'}</span>
          </div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'var(--text-1)',marginBottom:8}}>{title}</div>
          <div style={{fontSize:13.5,color:'var(--text-2)',lineHeight:1.5}}>{msg}</div>
        </div>
        <div className="modal-foot" style={{justifyContent:'center',gap:12}}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger?'btn-danger':'btn-primary'}`} onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
