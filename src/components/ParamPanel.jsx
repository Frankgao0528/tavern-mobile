import React, { useState } from 'react'

export default function ParamPanel({ session, charactersMap, onUpdateSession }) {
  const [open, setOpen] = useState(false)
  if (!session) return null

  const chars = (session.characterIds || []).map((id) => charactersMap[id]).filter(Boolean)
  const p = session.params

  const set = (key, value) => onUpdateSession({ params: { [key]: value } })

  return (
    <div className={`param-panel ${open ? 'open' : ''}`}>
      <button className="param-toggle" onClick={() => setOpen(!open)} title="参数面板">
        {open ? '▸' : '◂'} 参数
      </button>
      {open && (
        <div className="param-body">
          <div className="param-title">会话参数</div>

          <label className="param-row">
            <span>temperature <em>创造力</em></span>
            <input
              type="range" min="0" max="2" step="0.1"
              value={p.temperature ?? 0.9}
              onChange={(e) => set('temperature', parseFloat(e.target.value))}
            />
            <b>{(p.temperature ?? 0.9).toFixed(1)}</b>
          </label>

          <label className="param-row">
            <span>top_p <em>采样范围</em></span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={p.top_p ?? 0.9}
              onChange={(e) => set('top_p', parseFloat(e.target.value))}
            />
            <b>{(p.top_p ?? 0.9).toFixed(2)}</b>
          </label>

          <label className="param-row">
            <span>max_tokens <em>回复上限</em></span>
            <input
              type="range" min="256" max="8192" step="256"
              value={p.max_tokens ?? 2048}
              onChange={(e) => set('max_tokens', parseInt(e.target.value))}
            />
            <b>{p.max_tokens ?? 2048}</b>
          </label>

          <div className="param-title">参与者</div>
          {chars.map((c) => (
            <div className="param-char" key={c.id}>
              <span className="param-char-name">{c.name}</span>
              <span className="param-char-temp">temp {c.defaultParams?.temperature ?? 0.9}</span>
            </div>
          ))}
          {chars.length === 0 && <div className="param-empty">未绑定角色</div>}
        </div>
      )}
    </div>
  )
}
