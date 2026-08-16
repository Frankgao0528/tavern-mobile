import React from 'react'
import { useOverlay } from './Overlay.jsx'
import Img from './Img.jsx'

const api = window.tavern

export default function Sidebar({
  open = false,
  activeTab, setActiveTab,
  characters, sessions, activeSessionId, openSession,
  onCreateCharacter, onEditCharacter, onDeleteCharacter,
  onNewSession, onDeleteSession, onOpenSettings,
  comfyOnline, onToggleComfy,
  onClose,
}) {
  const overlay = useOverlay()
  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">🏮 念念酒馆</div>
        <div className="sidebar-header-btns">
          <button className="icon-btn" title="设置" onClick={onOpenSettings}>⚙️</button>
          {onClose && <button className="icon-btn" title="收起" onClick={onClose}>✕</button>}
        </div>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`tab ${activeTab === 'characters' ? 'active' : ''}`}
          onClick={() => setActiveTab('characters')}
        >角色</button>
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >会话</button>
      </div>

      <div className="sidebar-list">
        {activeTab === 'characters' ? (
          <>
            <div className="char-actions-row">
              <button className="add-btn" onClick={onCreateCharacter}>＋ 新建角色</button>
              <button
                className="add-btn import-btn"
                onClick={async () => {
                  try {
                    const r = await api.characters.importCard()
                    if (r?.canceled) return
                    overlay.toast(
                      `导入了角色「${r?.character?.name || ''}」${r?.fromTavern ? '（酒馆格式' + (r?.translated ? '，已翻译' : '') + '）' : ''}`,
                      'info'
                    )
                    onEditCharacter(r?.character)
                  } catch (err) {
                    overlay.toast('导入失败：' + err.message, 'error')
                  }
                }}
              >⇅ 导入</button>
            </div>
            {characters.length === 0 && <div className="list-empty">还没有角色，点上面创建一个吧</div>}
            {characters.map((c) => (
              <div key={c.id} className="list-item" onClick={() => onEditCharacter(c)} title="点击编辑角色">
                <Img className="item-avatar" path={c.avatar} alt="" />
                <div className="item-info">
                  <div className="item-name">{c.name}</div>
                  <div className="item-sub">{c.personality?.slice(0, 24) || '暂无设定'}</div>
                </div>
                <button
                  className="del-btn"
                  title="删除角色"
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (await overlay.confirm(`确定删除角色「${c.name}」吗？`)) onDeleteCharacter(c.id)
                  }}
                >✕</button>
              </div>
            ))}
          </>
        ) : (
          <>
            <button className="add-btn" onClick={onNewSession}>＋ 新建会话</button>
            {sessions.length === 0 && <div className="list-empty">还没有会话，点上面开一个吧</div>}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`list-item ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => openSession(s.id)}
              >
                <div className="session-avatars">
                  {(s.characterIds || []).slice(0, 3).map((cid) => (
                    <span key={cid}>{characters.find((c) => c.id === cid)?.name?.[0] || '?'}</span>
                  ))}
                  {!s.characterIds?.length && <span>?</span>}
                </div>
                <div className="item-info">
                  <div className="item-name">{s.name}</div>
                  <div className="item-sub">
                    {s.mode === 'group' ? `群聊 · ${s.characterIds?.length || 0}人` : '单聊'} · {s.messages?.length || 0}条
                  </div>
                </div>
                <button
                  className="del-btn"
                  title="删除会话"
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (await overlay.confirm('确定删除这个会话吗？')) onDeleteSession(s.id)
                  }}
                >✕</button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <button className={`comfy-status ${comfyOnline ? 'online' : 'offline'}`} onClick={onToggleComfy} title="点击检查/启动 ComfyUI">
          <span className="dot" /> ComfyUI {comfyOnline ? '在线' : '离线'}
        </button>
      </div>
    </div>
  )
}
