import React from 'react'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger=false }){
  if(!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(2,6,23,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ width:480, background:'#fff', borderRadius:8, padding:20 }}>
        <h3 style={{ marginTop:0 }}>{title}</h3>
        <div style={{ marginBottom:16, color:'#111' }}>{message}</div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn primary" style={{ background: danger ? '#b91c1c' : undefined }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
