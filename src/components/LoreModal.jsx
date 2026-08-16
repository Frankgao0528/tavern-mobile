import React, { useState } from 'react'

const api = window.tavern

/**
 * 世界书 + 会话设定弹窗
 * - 世界书：关键词命中的设定注入对话（不影响时零消耗）
 * - 会话设定：自定义系统提示词
 */
export default function LoreModal({ session, onClose, onSaved }) {
  const [tab, setTab] = useState('lore')
  const [entries, setEntries] = useState(
    (session.lorebook || []).map((e) => ({ ...e }))
  )
  const [customPrompt, setCustomPrompt] = useState(session.customPrompt || '')
  const [saving, setSaving] = useState(false)

  const updateEntry = (id, fields) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...fields } : e)))
  const addEntry = () =>
    setEntries((es) => [...es, { id: 'e' + Date.now().toString(36), keywords: '', content: '', enabled: true }])
  const removeEntry = (id) => setEntries((es) => es.filter((e) => e.id !== id))

  const save = async () => {
    setSaving(true)
    try {
      await api.sessions.update(session.id, {
        lorebook: entries.filter((e) => e.keywords.trim() || e.content.trim()),
        customPrompt,
      })
      onSaved()
      onClose()
    } catch (err) {
      alert('保存失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal lore-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📖 世界书与设定</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="sidebar-tabs lore-tabs">
          <button className={`tab ${tab === 'lore' ? 'active' : ''}`} onClick={() => setTab('lore')}>世界书</button>
          <button className={`tab ${tab === 'prompt' ? 'active' : ''}`} onClick={() => setTab('prompt')}>会话设定</button>
        </div>

        <div className="modal-body">
          {tab === 'lore' ? (
            <>
              <div className="lore-tip">
                写一些世界观设定，每条挂上关键词。聊天提到关键词时，相关设定会自动注入（不提到就完全不占资源）。
              </div>
              {entries.length === 0 && <div className="list-empty">还没有世界书条目，点下面添加</div>}
              {entries.map((e) => (
                <div key={e.id} className="lore-entry">
                  <div className="lore-entry-top">
                    <input
                      className="lore-keywords"
                      placeholder="触发关键词（逗号分隔，如：酒馆,掌柜）"
                      value={e.keywords}
                      onChange={(ev) => updateEntry(e.id, { keywords: ev.target.value })}
                    />
                    <label className="lore-enabled">
                      <input
                        type="checkbox"
                        checked={e.enabled !== false}
                        onChange={(ev) => updateEntry(e.id, { enabled: ev.target.checked })}
                      />
                      启用
                    </label>
                    <button className="del-btn" onClick={() => removeEntry(e.id)}>✕</button>
                  </div>
                  <textarea
                    className="lore-content"
                    rows={3}
                    placeholder="设定内容（世界观、人物、地点、规则……）"
                    value={e.content}
                    onChange={(ev) => updateEntry(e.id, { content: ev.target.value })}
                  />
                </div>
              ))}
              <button className="add-btn lore-add" onClick={addEntry}>＋ 添加条目</button>
            </>
          ) : (
            <label className="field">
              <span>自定义系统提示词（附加给模型的额外指令，留空不使用）</span>
              <textarea
                rows={6}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="例如：永远用第一人称回复；剧情中穿插环境描写；回复不超过 150 字……"
              />
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose}>取消</button>
          <button className="primary-btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}
