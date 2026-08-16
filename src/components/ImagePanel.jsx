import React, { useEffect, useState } from 'react'
import Img from './Img.jsx'

const api = window.tavern

const SIZES = [
  ['832', '1216'],
  ['1216', '832'],
  ['1024', '1024'],
  ['768', '1152'],
  ['576', '832'],
]

export default function ImagePanel({ session, mode = 'chat', initialPrompt = '', characterTags = '', onClose, onAttach, onAvatar }) {
  const [online, setOnline] = useState(null)
  const [models, setModels] = useState([])
  const [loras, setLoras] = useState([])
  const [model, setModel] = useState('')
  const [lora, setLora] = useState('')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [keepChar, setKeepChar] = useState(!!characterTags)
  const [negative, setNegative] = useState('lowres, bad anatomy, bad hands, worst quality, low quality, blurry')
  const [style, setStyle] = useState('')
  const [width, setWidth] = useState('832')
  const [height, setHeight] = useState('1216')
  const [steps, setSteps] = useState(28)
  const [cfg, setCfg] = useState(4.0)
  const [sampler, setSampler] = useState('euler_ancestral')
  const [seed, setSeed] = useState('')
  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [resultImg, setResultImg] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setStatus('检查 ComfyUI…')
    api.comfy.ensure().then(async (r) => {
      setOnline(!!r.ok)
      if (r.ok) {
        setStatus(r.message || 'ComfyUI 在线')
        const [ms, ls] = await Promise.all([api.comfy.models(), api.comfy.loras()])
        setModels(ms)
        setLoras(ls)
        if (ms.length) setModel(ms[0])
      } else {
        setError(r.message || 'ComfyUI 不可用')
        setStatus('')
      }
    })
  }, [])

  const analyze = async () => {
    setAnalyzing(true)
    setError('')
    try {
      const r = await api.claude.genPrompt(session.id)
      setPrompt(r.prompt || '')
      if (r.negative) setNegative(r.negative)
      if (r.style) setStyle(r.style)
      setStatus('念念分析完剧情了，提示词在上面，可以改')
    } catch (err) {
      setError('分析失败：' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const generate = async () => {
    if (!prompt.trim()) {
      setError('先写提示词（或让念念分析剧情）')
      return
    }
    setBusy(true)
    setError('')
    setStatus('检查 ComfyUI…')
    setResultImg(null)
    try {
      const ensure = await api.comfy.ensure()
      if (!ensure.ok) {
        setError(ensure.message || 'ComfyUI 不可用')
        setStatus('')
        setBusy(false)
        return
      }
      setStatus('生成中，等 ComfyUI 出图…')
      // 角色一致性：剧情生图时自动带上角色外貌标签
      let finalPrompt = prompt.trim()
      if (mode === 'chat' && keepChar && characterTags) {
        finalPrompt = `${finalPrompt}, ${characterTags}`
      }
      const result = await api.comfy.generate({
        model,
        lora: lora || undefined,
        prompt: finalPrompt,
        negative: negative.trim(),
        width: parseInt(width),
        height: parseInt(height),
        steps: parseInt(steps),
        cfg: parseFloat(cfg),
        sampler,
        seed: seed ? parseInt(seed) : undefined,
      })
      setResultImg(result)
      setStatus('出图了！')
    } catch (err) {
      setError('生成失败：' + err.message)
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    if (!resultImg) return
    if (mode === 'avatar' && onAvatar) {
      await onAvatar(resultImg.path, prompt)
    } else {
      await onAttach(resultImg.path)
    }
    onClose()
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal image-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🎨 ComfyUI 生图</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className={`comfy-badge ${online ? 'ok' : 'bad'}`}>
            <span className="dot" /> {online === null ? '检查中…' : online ? 'ComfyUI 在线' : 'ComfyUI 离线'}
          </div>

          <div className="img-toolbar">
            {mode === 'chat' && (
              <button className="primary-btn" onClick={analyze} disabled={analyzing || !online}>
                {analyzing ? '念念在想画面…' : '✨ 让念念理解剧情配图'}
              </button>
            )}
            {style && <div className="style-note">📝 {style}</div>}
          </div>

          <label className="field">
            <span>正向提示词（可手改）</span>
            <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述你想要的画面…" />
          </label>
          <label className="field">
            <span>负向提示词</span>
            <textarea rows={2} value={negative} onChange={(e) => setNegative(e.target.value)} />
          </label>

          <div className="img-params">
            <label className="field">
              <span>模型</span>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="field">
              <span>LoRA（可选）</span>
              <select value={lora} onChange={(e) => setLora(e.target.value)}>
                <option value="">无</option>
                {loras.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="field">
              <span>尺寸</span>
              <select
                value={`${width}x${height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x')
                  setWidth(w)
                  setHeight(h)
                }}
              >
                {SIZES.map(([w, h]) => <option key={w + h} value={`${w}x${h}`}>{w} × {h}</option>)}
              </select>
            </label>
            <label className="field">
              <span>采样器</span>
              <select value={sampler} onChange={(e) => setSampler(e.target.value)}>
                {['euler_ancestral', 'euler', 'dpmpp_2m', 'dpmpp_2m_sde', 'ddim', 'uni_pc', 'heun', 'lcm'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field inline">
              <span>steps</span>
              <input type="number" min="1" max="100" value={steps} onChange={(e) => setSteps(e.target.value)} />
            </label>
            <label className="field inline">
              <span>cfg</span>
              <input type="number" min="1" max="30" step="0.5" value={cfg} onChange={(e) => setCfg(e.target.value)} />
            </label>
            <label className="field inline">
              <span>seed（留空随机）</span>
              <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="随机" />
            </label>
          </div>

          {mode === 'chat' && characterTags && (
            <label className="char-tags-toggle">
              <input type="checkbox" checked={keepChar} onChange={(e) => setKeepChar(e.target.checked)} />
              <span>角色外貌一致性（自动带上「{characterTags.split(',')[0] || '角色'}」标签）</span>
            </label>
          )}

          {error && <div className="error-box">{error}</div>}
          {status && <div className="status-box">{status}</div>}

          {resultImg && (
            <div className="result-box">
              <Img path={resultImg.path} alt="" />
              <button className="primary-btn" onClick={finish}>
                {mode === 'avatar' ? '设为头像' : '插入对话'}
              </button>
              <button className="ghost-btn" onClick={() => setResultImg(null)}>再生成一张</button>
            </div>
          )}

          <button className="primary-btn full" onClick={generate} disabled={busy || !online}>
            {busy ? '生成中…' : '🚀 生成图片'}
          </button>
        </div>
      </div>
    </div>
  )
}
