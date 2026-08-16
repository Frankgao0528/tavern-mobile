import React, { createContext, useCallback, useContext, useState } from 'react'

const OverlayContext = createContext(null)
export const useOverlay = () => useContext(OverlayContext)

let toastId = 0

/** 全局提示/确认/输入框系统，替代原生 alert/confirm/prompt（原生弹窗会阻塞渲染进程） */
export default function OverlayProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const [promptState, setPromptState] = useState(null)

  const toast = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts((ts) => [...ts, { id, message, type }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3000)
  }, [])

  const confirm = useCallback(
    (message) =>
      new Promise((resolve) => {
        setConfirmState({ message, resolve })
      }),
    []
  )

  const promptBox = useCallback(
    (message, defaultValue = '') =>
      new Promise((resolve) => {
        setPromptState({ message, defaultValue, resolve })
      }),
    []
  )

  // 覆盖原生弹窗，消灭渲染进程阻塞
  const api = { toast, confirm, prompt: promptBox }
  if (!window.__overlayInstalled) {
    window.__overlayInstalled = true
    window.alert = (m) => api.toast(String(m), 'error')
    window.confirm = (m) => api.confirm(String(m))
    window.prompt = (m, d) => api.prompt(String(m), d)
  }

  return (
    <OverlayContext.Provider value={api}>
      {children}

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>

      {confirmState && (
        <div className="modal-mask">
          <div className="modal confirm-modal">
            <div className="modal-body">
              <div className="confirm-text">{confirmState.message}</div>
            </div>
            <div className="modal-footer">
              <button className="ghost-btn" onClick={() => { confirmState.resolve(false); setConfirmState(null) }}>取消</button>
              <button
                className="primary-btn danger"
                onClick={() => { confirmState.resolve(true); setConfirmState(null) }}
              >确定</button>
            </div>
          </div>
        </div>
      )}

      {promptState && (
        <PromptDialog
          message={promptState.message}
          defaultValue={promptState.defaultValue}
          onDone={(v) => { promptState.resolve(v); setPromptState(null) }}
        />
      )}
    </OverlayContext.Provider>
  )
}

function PromptDialog({ message, defaultValue, onDone }) {
  const [value, setValue] = useState(defaultValue || '')
  return (
    <div className="modal-mask">
      <div className="modal confirm-modal">
        <div className="modal-body">
          <div className="confirm-text">{message}</div>
          <input
            className="prompt-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onDone(value)
            }}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="ghost-btn" onClick={() => onDone(null)}>取消</button>
          <button className="primary-btn" onClick={() => onDone(value)}>确定</button>
        </div>
      </div>
    </div>
  )
}
