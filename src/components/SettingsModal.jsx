import React, { useState } from 'react'
import { THEMES, PARTICLE_TYPES, CUSTOM_COLOR_FIELDS, applyTheme } from '../themes.js'

const api = window.tavern

export default function SettingsModal({ settings, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    preset: settings?.apiBaseUrl || '',
    apiBaseUrl: settings?.apiBaseUrl || '',
    apiKey: settings?.apiKey || '',
    model: settings?.model || '',
    comfyuiUrl: settings?.comfyuiUrl || 'http://127.0.0.1:8188',
    comfyuiStartCmd: settings?.comfyuiStartCmd || 'python main.py',
    comfyuiWorkDir: settings?.comfyuiWorkDir || 'C:\\Users\\Frankgao\\ComfyUI_windows',
    claudeBin: settings?.claudeBin || 'claude',
    theme: settings?.theme || { name: 'deep-tavern', particles: 'none', particleDensity: 60, customColors: {} },
    quickReplies: (settings?.quickReplies || ['继续', '然后呢', '再来一次']).join('，'),
  }))
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  const providers = settings?.presetProviders || []
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const pickPreset = (name) => {
    const p = providers.find((x) => x.name === name)
    if (!p) return
    set('apiBaseUrl', p.baseUrl)
    setForm((f) => ({ ...f, preset: p.baseUrl }))
  }

  const fetchModels = async () => {
    setLoadingModels(true)
    setTestMsg('')
    try {
      await api.settings.update({ apiBaseUrl: form.apiBaseUrl, apiKey: form.apiKey })
      const list = await api.llm.listModels()
      setModels(list)
      if (!list.length) setTestMsg('没有拿到模型，可能是 API 不支持 /models 接口')
    } catch (err) {
      setTestMsg('获取失败：' + err.message)
    } finally {
      setLoadingModels(false)
    }
  }

  const testConn = async () => {
    setTestMsg('测试中…')
    try {
      await api.settings.update({ apiBaseUrl: form.apiBaseUrl, apiKey: form.apiKey, model: form.model })
      const list = await api.llm.listModels()
      setModels(list)
      setTestMsg(`连接成功，拿到 ${list.length} 个模型`)
    } catch (err) {
      setTestMsg('连接失败：' + err.message)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.settings.update({
        apiBaseUrl: form.apiBaseUrl,
        apiKey: form.apiKey,
        model: form.model,
        comfyuiUrl: form.comfyuiUrl,
        comfyuiStartCmd: form.comfyuiStartCmd,
        comfyuiWorkDir: form.comfyuiWorkDir,
        claudeBin: form.claudeBin,
        theme: form.theme,
        quickReplies: form.quickReplies.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      })
      onSaved()
    } catch (err) {
      alert('保存失败：' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">设置</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="param-title">对话 API（OpenAI 兼容）</div>
          <label className="field">
            <span>服务商预设</span>
            <select value={form.preset} onChange={(e) => pickPreset(e.target.value)}>
              <option value="">选择预设…</option>
              {providers.map((p) => (
                <option key={p.name} value={p.baseUrl}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>API 地址（base_url）</span>
            <input value={form.apiBaseUrl} onChange={(e) => set('apiBaseUrl', e.target.value)} placeholder="https://api.deepseek.com/v1" />
          </label>
          <label className="field">
            <span>API Key</span>
            <input type="password" value={form.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder="sk-…" />
          </label>
          <label className="field">
            <span>模型</span>
            <div className="model-row">
              <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="deepseek-chat" list="model-list" />
              <datalist id="model-list">
                {models.map((m) => <option key={m} value={m} />)}
              </datalist>
              <button className="ghost-btn" onClick={fetchModels} disabled={loadingModels}>{loadingModels ? '获取中…' : '拉取模型列表'}</button>
              <button className="ghost-btn" onClick={testConn}>测试连接</button>
            </div>
          </label>
          {testMsg && <div className="test-msg">{testMsg}</div>}

          <div className="param-title">ComfyUI（可选，远程生图）</div>
          <label className="field">
            <span>电脑端 ComfyUI 地址</span>
            <input value={form.comfyuiUrl} onChange={(e) => set('comfyuiUrl', e.target.value)} placeholder="http://192.168.1.100:8188" />
          </label>
          <div className="theme-note">
            手机和电脑连同一 WiFi 时可用。电脑端 ComfyUI 需加参数启动：python main.py --enable-cors-header="*"
          </div>
          {!window.tavern.isMobile && (
            <>
              <label className="field">
                <span>启动命令（离线时自动运行）</span>
                <input value={form.comfyuiStartCmd} onChange={(e) => set('comfyuiStartCmd', e.target.value)} placeholder="python main.py" />
              </label>
              <label className="field">
                <span>启动目录（ComfyUI 所在文件夹）</span>
                <input value={form.comfyuiWorkDir} onChange={(e) => set('comfyuiWorkDir', e.target.value)} placeholder="C:\Users\Frankgao\ComfyUI_windows" />
              </label>

              <div className="param-title">Claude Code（AI 配图）</div>
              <label className="field">
                <span>claude 命令位置</span>
                <input value={form.claudeBin} onChange={(e) => set('claudeBin', e.target.value)} placeholder="claude" />
              </label>
            </>
          )}

          <div className="param-title">快捷回复</div>
          <label className="field">
            <span>聊天输入框上方的快捷话术（逗号分隔，点击即发送）</span>
            <input value={form.quickReplies} onChange={(e) => set('quickReplies', e.target.value)} placeholder="继续，然后呢，再来一次" />
          </label>

          <div className="param-title">外观主题</div>
          <div className="theme-grid">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                className={`theme-card ${form.theme.name === key ? 'active' : ''}`}
                onClick={() => {
                  const next = { ...form.theme, name: key }
                  setForm((f) => ({ ...f, theme: next }))
                  applyTheme(next)
                }}
              >
                <span className="theme-swatch" style={{ background: t.vars['--bg'] }}>
                  <i style={{ background: t.vars['--accent'] }} />
                  <i style={{ background: t.vars['--accent2'] }} />
                </span>
                <b>{t.label}</b>
                <div className="theme-desc">{t.desc}</div>
              </button>
            ))}
          </div>

          <div className="param-title">粒子特效</div>
          <div className="particle-row">
            {Object.entries(PARTICLE_TYPES).map(([key, p]) => (
              <button
                key={key}
                className={`particle-chip ${form.theme.particles === key ? 'active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, theme: { ...f.theme, particles: key } }))}
              >
                <b>{p.label}</b>
                <div>{p.desc}</div>
              </button>
            ))}
          </div>
          {form.theme.particles !== 'none' && (
            <label className="field">
              <span>粒子密度（{form.theme.particleDensity}）</span>
              <input
                type="range" min="20" max="150"
                value={form.theme.particleDensity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, theme: { ...f.theme, particleDensity: parseInt(e.target.value) } }))
                }
              />
            </label>
          )}

          <div className="param-title">聊天背景</div>
          <div className="chatbg-row">
            <button
              className="ghost-btn"
              onClick={async () => {
                const img = await api.image.upload()
                if (img) {
                  const chatBg = { ...(form.theme.chatBg || {}), image: img.path }
                  setForm((f) => ({ ...f, theme: { ...f.theme, chatBg } }))
                }
              }}
            >🖼️ 选择背景图</button>
            {form.theme.chatBg?.image && (
              <button
                className="ghost-btn"
                onClick={() =>
                  setForm((f) => ({ ...f, theme: { ...f.theme, chatBg: { ...f.theme.chatBg, image: '' } } }))
                }
              >清除背景</button>
            )}
          </div>
          {form.theme.chatBg?.image && (
            <>
              <label className="field">
                <span>背景明暗（越暗文字越清楚）({Math.round((form.theme.chatBg.dim ?? 0.85) * 100)}%)</span>
                <input
                  type="range" min="0" max="0.95" step="0.05"
                  value={form.theme.chatBg.dim ?? 0.85}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, theme: { ...f.theme, chatBg: { ...f.theme.chatBg, dim: parseFloat(e.target.value) } } }))
                  }
                />
              </label>
              <label className="field">
                <span>背景模糊（px）({form.theme.chatBg.blur || 0}px)</span>
                <input
                  type="range" min="0" max="20" step="1"
                  value={form.theme.chatBg.blur || 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, theme: { ...f.theme, chatBg: { ...f.theme.chatBg, blur: parseInt(e.target.value) } } }))
                  }
                />
              </label>
            </>
          )}

          <div className="param-title">自定义颜色（选中「樱花」等预设后再改）</div>
          <div className="custom-colors">
            {CUSTOM_COLOR_FIELDS.map((f) => {
              const val = form.theme.customColors?.[f.key] || THEMES[form.theme.name]?.vars?.[f.var] || ''
              return (
                <label key={f.key} className="color-row">
                  <span>{f.label}</span>
                  <input
                    type="color"
                    value={val}
                    onChange={(e) => {
                      const customColors = { ...(form.theme.customColors || {}), [f.key]: e.target.value }
                      const next = { ...form.theme, name: 'custom', customColors }
                      setForm((f2) => ({ ...f2, theme: next }))
                      applyTheme(next)
                    }}
                  />
                </label>
              )
            })}
          </div>
          <div className="theme-note">主题保存后立即生效，可在设置里随时改回来</div>
        </div>

        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose}>取消</button>
          <button className="primary-btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}
