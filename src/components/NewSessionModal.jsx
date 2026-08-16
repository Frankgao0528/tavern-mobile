import React, { useState } from 'react'

const api = window.tavern

export default function NewSessionModal({ characters, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [picked, setPicked] = useState(null)
  const [creating, setCreating] = useState(false)

  const create = async () => {
    setCreating(true)
    try {
      const charId = picked || characters[0]?.id
      if (!charId) {
        alert('请选择参与的角色')
        setCreating(false)
        return
      }
      const sessionName =
        name.trim() || `和${characters.find((c) => c.id === charId)?.name}的对话`
      const s = await api.sessions.create({ name: sessionName, mode: 'single', characterIds: [charId] })
      onCreated(s.id)
    } catch (err) {
      alert('创建失败：' + err.message)
      setCreating(false)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal new-session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">新建会话</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>会话名称（可选，留空自动取名）</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：夜谈、冒险团" />
          </label>

          <div className="param-title">选择角色</div>
          <div className="pick-list">
            {characters.map((c) => (
              <button
                key={c.id}
                className={`pick-item ${picked === c.id ? 'active' : ''}`}
                onClick={() => setPicked(c.id)}
              >
                <span className="pick-avatar">{c.name[0]}</span>
                <span className="pick-name">{c.name}</span>
                {picked === c.id && <span className="pick-check">✓</span>}
              </button>
            ))}
            {characters.length === 0 && <div className="list-empty">还没有角色，先去「角色」页创建一个</div>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose}>取消</button>
          <button className="primary-btn" onClick={create} disabled={creating || !characters.length}>
            {creating ? '创建中…' : '创建会话'}
          </button>
        </div>
      </div>
    </div>
  )
}
