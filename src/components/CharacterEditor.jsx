import React, { useState } from 'react'
import ImagePanel from './ImagePanel.jsx'
import Img from './Img.jsx'

const api = window.tavern

const FIELDS = [
  { key: 'background', label: '背景故事', ph: '这个角色的身世、经历、所处世界……', rows: 4 },
  { key: 'personality', label: '性格', ph: '性格特点、癖好、内心的想法……', rows: 3 },
  { key: 'style', label: '说话风格', ph: '口癖、语气、称呼方式、爱说什么话……', rows: 2 },
  { key: 'exampleDialogs', label: '示例对话', ph: '几个示范对话，教 AI 学会这个角色怎么说话，例如：\n用户：你好呀\n角色：哼，谁要你打招呼', rows: 4 },
  { key: 'appearance', label: '外貌描述', ph: '长相、身材、穿着（以后 ComfyUI 生成头像/配图会用）', rows: 2 },
]

export default function CharacterEditor({ character, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: character?.name || '',
    avatar: character?.avatar || '',
    background: character?.background || '',
    personality: character?.personality || '',
    style: character?.style || '',
    greeting: character?.greeting || '',
    exampleDialogs: character?.exampleDialogs || '',
    appearance: character?.appearance || '',
    avatarPrompt: character?.avatarPrompt || '',
    temperature: character?.defaultParams?.temperature ?? 0.9,
    top_p: character?.defaultParams?.top_p ?? 0.9,
    max_tokens: character?.defaultParams?.max_tokens ?? 2048,
  }))
  const [saving, setSaving] = useState(false)
  const [showAvatarPanel, setShowAvatarPanel] = useState(false)
  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [converting, setConverting] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // 复杂生图：先用 Claude Code 把中文外貌描述转成英文标签，再打开面板
  const openAvatarPanel = async () => {
    if (form.appearance.trim()) {
      setConverting(true)
      try {
        const r = await api.claude.avatarPrompt(form.appearance)
        setAvatarPrompt(r.prompt || '')
      } catch {
        // Claude Code 不可用时兜底：直接用原始描述
        setAvatarPrompt(`1girl, portrait, ${form.appearance}, masterpiece, best quality`)
      } finally {
        setConverting(false)
      }
    }
    setShowAvatarPanel(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      alert('角色名不能为空')
      return
    }
    setSaving(true)
    try {
      const fields = {
        name: form.name.trim(),
        avatar: form.avatar,
        background: form.background,
        personality: form.personality,
        style: form.style,
        greeting: form.greeting,
        exampleDialogs: form.exampleDialogs,
        appearance: form.appearance,
        avatarPrompt: form.avatarPrompt,
        defaultParams: {
          temperature: parseFloat(form.temperature),
          top_p: parseFloat(form.top_p),
          max_tokens: parseInt(form.max_tokens),
        },
      }
      if (character) {
        await api.characters.update(character.id, fields)
      } else {
        await api.characters.create(fields)
      }
      onSaved()
    } catch (err) {
      alert('保存失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async () => {
    const img = await api.image.upload()
    if (img) set('avatar', img.path)
  }


  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal char-editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{character ? '编辑角色' : '新建角色'}</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="editor-top">
            <div className="avatar-box" onClick={uploadAvatar}>
              {form.avatar ? (
                <Img path={form.avatar} alt="" />
              ) : (
                <div className="avatar-placeholder">点这里<br />上传头像</div>
              )}
              {form.avatar && <div className="avatar-edit">换</div>}
            </div>
            <div className="editor-basic">
              <label className="field">
                <span>角色名 *</span>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="给角色起个名字" />
              </label>
              <div className="avatar-btns">
                <button className="ghost-btn" onClick={uploadAvatar}>📁 上传头像</button>
                <button className="ghost-btn" onClick={openAvatarPanel} disabled={converting}>
                  {converting ? '🔄 转换描述中…' : '🎨 AI 生图'}
                </button>
              </div>
            </div>
          </div>

          <label className="field">
            <span>开场白（可选）</span>
            <textarea rows={2} value={form.greeting} onChange={(e) => set('greeting', e.target.value)} placeholder="角色第一次见面时说的话，不填就没有" />
          </label>

          {FIELDS.map((f) => (
            <label className="field" key={f.key}>
              <span>{f.label}（可选）</span>
              <textarea rows={f.rows} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.ph} />
            </label>
          ))}

          <div className="param-title">这个角色的默认对话参数</div>
          <div className="editor-params">
            <label className="field inline">
              <span>temperature</span>
              <input type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => set('temperature', e.target.value)} />
            </label>
            <label className="field inline">
              <span>top_p</span>
              <input type="number" min="0" max="1" step="0.05" value={form.top_p} onChange={(e) => set('top_p', e.target.value)} />
            </label>
            <label className="field inline">
              <span>max_tokens</span>
              <input type="number" min="256" max="8192" step="256" value={form.max_tokens} onChange={(e) => set('max_tokens', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="ghost-btn"
            disabled={!character}
            onClick={async () => {
              const r = await api.characters.exportCard(character.id)
              if (!r?.canceled) overlay.toast('已导出角色卡')
            }}
          >⬇️ 导出</button>
          <button className="ghost-btn" onClick={onClose}>取消</button>
          <button className="primary-btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {showAvatarPanel && (
        <ImagePanel
          mode="avatar"
          session={null}
          initialPrompt={avatarPrompt}
          onClose={() => setShowAvatarPanel(false)}
          onAvatar={async (imgPath, prompt) => {
            set('avatar', imgPath)
            // 记住生成头像用的提示词，作为角色外貌标签供剧情生图保持一致性
            if (prompt) setForm((f) => ({ ...f, avatarPrompt: prompt }))
            setShowAvatarPanel(false)
          }}
        />
      )}
    </div>
  )
}
