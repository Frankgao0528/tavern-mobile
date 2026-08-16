// 手机版 API 层：实现与电脑版 window.tavern 兼容的接口
// 数据存 IndexedDB，对话走浏览器 fetch 流式，ComfyUI 走远程（局域网）
import { get, set, remove } from './db.js'

const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-v4-flash',
  comfyuiUrl: '',
  presetProviders: [
    { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
    { name: 'Kimi (Moonshot)', baseUrl: 'https://api.moonshot.cn/v1', models: [] },
    { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: [] },
    { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: [] },
    { name: '自定义', baseUrl: '', models: [] },
  ],
  theme: {
    name: 'deep-tavern',
    particles: 'none',
    particleDensity: 60,
    customColors: {},
    chatBg: { image: '', dim: 0.7, blur: 0 },
  },
  quickReplies: ['继续', '然后呢', '再来一次'],
}

let memory = null

async function loadAll() {
  if (memory) return memory
  memory = {
    characters: (await get('characters', [])) || [],
    sessions: (await get('sessions', [])) || [],
    settings: { ...DEFAULT_SETTINGS, ...((await get('settings', {})) || {}) },
  }
  if (memory.settings.theme) {
    memory.settings.theme = { ...DEFAULT_SETTINGS.theme, ...memory.settings.theme }
  }
  return memory
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const persist = () => {
  memory && set('characters', memory.characters)
  memory && set('sessions', memory.sessions)
  memory && set('settings', memory.settings)
}

/* ---------------- 角色 ---------------- */

function listCharacters() {
  return loadAll().then((m) => m.characters)
}
function getCharacter(id) {
  return loadAll().then((m) => m.characters.find((c) => c.id === id) || null)
}
function createCharacter(fields = {}) {
  return loadAll().then((m) => {
    const now = new Date().toISOString()
    const c = {
      id: uid(),
      name: fields.name || '新角色',
      avatar: fields.avatar || '',
      avatarSource: fields.avatarSource || 'none',
      background: fields.background || '',
      personality: fields.personality || '',
      style: fields.style || '',
      greeting: fields.greeting || '',
      exampleDialogs: fields.exampleDialogs || '',
      appearance: fields.appearance || '',
      avatarPrompt: fields.avatarPrompt || '',
      defaultParams: { temperature: 0.9, top_p: 0.9, max_tokens: 2048, ...(fields.defaultParams || {}) },
      createdAt: now,
      updatedAt: now,
    }
    m.characters.push(c)
    persist()
    return c
  })
}
function updateCharacter(id, fields) {
  return loadAll().then((m) => {
    const c = m.characters.find((x) => x.id === id)
    if (!c) return null
    for (const key of ['name', 'avatar', 'avatarSource', 'background', 'personality', 'style', 'greeting', 'exampleDialogs', 'appearance', 'avatarPrompt']) {
      if (fields[key] !== undefined) c[key] = fields[key]
    }
    if (fields.defaultParams) c.defaultParams = { ...c.defaultParams, ...fields.defaultParams }
    c.updatedAt = new Date().toISOString()
    persist()
    return c
  })
}
function deleteCharacter(id) {
  return loadAll().then((m) => {
    m.characters = m.characters.filter((c) => c.id !== id)
    m.sessions.forEach((s) => {
      s.characterIds = s.characterIds.filter((cid) => cid !== id)
      s.messages.forEach((msg) => {
        if (msg.characterId === id) msg.characterId = ''
      })
    })
    persist()
  })
}

/* ---------------- 会话 ---------------- */

function listSessions() {
  return loadAll().then((m) =>
    m.sessions.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  )
}
function getSession(id) {
  return loadAll().then((m) => m.sessions.find((s) => s.id === id) || null)
}
function createSession(fields = {}) {
  return loadAll().then((m) => {
    const now = new Date().toISOString()
    const s = {
      id: uid(),
      name: fields.name || '新会话',
      mode: fields.mode || 'single',
      characterIds: fields.characterIds || [],
      params: { temperature: 0.9, top_p: 0.9, max_tokens: 2048, ...(fields.params || {}) },
      messages: [],
      lorebook: [],
      createdAt: now,
      updatedAt: now,
    }
    m.sessions.push(s)
    persist()
    return s
  })
}
function updateSession(id, fields) {
  return loadAll().then((m) => {
    const s = m.sessions.find((x) => x.id === id)
    if (!s) return null
    for (const key of ['name', 'mode', 'characterIds', 'summary', 'chatBg', 'lorebook', 'customPrompt']) {
      if (fields[key] !== undefined) s[key] = fields[key]
    }
    if (fields.params) s.params = { ...s.params, ...fields.params }
    s.updatedAt = new Date().toISOString()
    persist()
    return s
  })
}
function deleteSession(id) {
  return loadAll().then((m) => {
    m.sessions = m.sessions.filter((s) => s.id !== id)
    persist()
  })
}
function addMessage(sessionId, msg) {
  return loadAll().then((m) => {
    const s = m.sessions.find((x) => x.id === sessionId)
    if (!s) return null
    const message = {
      id: uid(),
      role: msg.role || 'user',
      characterId: msg.characterId || '',
      content: msg.content || '',
      image: msg.image || '',
      createdAt: new Date().toISOString(),
    }
    s.messages.push(message)
    s.updatedAt = message.createdAt
    persist()
    return message
  })
}
function updateMessage(sessionId, messageId, fields) {
  return loadAll().then((m) => {
    const s = m.sessions.find((x) => x.id === sessionId)
    if (!s) return null
    const msg = s.messages.find((x) => x.id === messageId)
    if (!msg) return null
    if (fields.content !== undefined) msg.content = fields.content
    if (fields.thinking !== undefined) msg.thinking = fields.thinking
    if (fields.image !== undefined) msg.image = fields.image
    persist()
    return msg
  })
}
function deleteMessage(sessionId, messageId) {
  return loadAll().then((m) => {
    const s = m.sessions.find((x) => x.id === sessionId)
    if (!s) return null
    s.messages = s.messages.filter((x) => x.id !== messageId)
    persist()
  })
}
function clearSessionMessages(sessionId) {
  return loadAll().then((m) => {
    const s = m.sessions.find((x) => x.id === sessionId)
    if (!s) return null
    s.messages = []
    persist()
  })
}

/* ---------------- 设置 ---------------- */

function getSettings() {
  return loadAll().then((m) => m.settings)
}
function updateSettings(fields) {
  return loadAll().then((m) => {
    for (const key of ['apiBaseUrl', 'apiKey', 'model', 'comfyuiUrl', 'theme', 'quickReplies']) {
      if (fields[key] !== undefined) m.settings[key] = fields[key]
    }
    persist()
    return m.settings
  })
}
function resetSettings() {
  return loadAll().then((m) => {
    m.settings = { ...DEFAULT_SETTINGS }
    persist()
    return m.settings
  })
}

/* ---------------- LLM 流式对话 ---------------- */

function emit(event, detail) {
  window.dispatchEvent(new CustomEvent(event, { detail }))
}

const activeChats = new Map()

// SSE 解析：从 buffer 提取事件（兼容任意 chunk 切割）
function extractJsonFrom(s) {
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

async function streamChat(session, characters, onDelta, signal) {
  const settings = await getSettings()
  if (!settings.apiBaseUrl || !settings.apiKey) throw new Error('还没配置 API 地址和密钥，去设置里填一下')

  // 角色卡 system prompt
  const lines = []
  lines.push('你是一个角色扮演酒馆，现在进入角色扮演模式。')
  lines.push('规则：始终以角色身份说话，不要跳出角色，不要解释你在扮演，不要用「作为AI」之类的表述。')
  if (session.summary) {
    lines.push(`【之前的故事摘要】\n${session.summary}`)
    lines.push('以上是之前剧情的摘要，已发生的事、设定和人物关系都要保持连贯，不要遗忘或矛盾。')
  }
  const loreHits = (session.lorebook || []).filter((e) => e.enabled !== false && e.keywords)
  if (loreHits.length) {
    const recent = session.messages.slice(-6).map((m) => m.content || '').join('\n')
    const hits = loreHits.filter((e) =>
      e.keywords.split(/[,，、]/).map((k) => k.trim()).filter(Boolean).some((k) => recent.includes(k))
    )
    if (hits.length) {
      lines.push('【世界设定·相关条目】')
      hits.forEach((h) => lines.push(h.content))
      lines.push('以上是与当前话题相关的世界设定，请遵守并自然延续这些设定。')
    }
  }
  if (session.customPrompt) lines.push(`【额外指令】\n${session.customPrompt}`)
  const c = characters[0]
  if (c) {
    const card = [`## 角色：${c.name}`]
    if (c.background) card.push(`【背景故事】\n${c.background}`)
    if (c.personality) card.push(`【性格】\n${c.personality}`)
    if (c.style) card.push(`【说话风格】\n${c.style}`)
    if (c.appearance) card.push(`【外貌】\n${c.appearance}`)
    if (c.exampleDialogs) card.push(`【示例对话】\n${c.exampleDialogs}`)
    lines.push('你扮演以下这一个角色：')
    lines.push(card.join('\n\n'))
    lines.push(`现在你就是「${c.name}」。用第一人称说话，完全代入角色。`)
    const anchors = []
    if (c.personality) anchors.push(`性格：${c.personality}`)
    if (c.style) anchors.push(`说话风格：${c.style}`)
    lines.push(`【角色锚点】你永远是这个「${c.name}」。${anchors.join(' ')} 无论剧情如何发展，都要保持这个性格和说话方式，不要偏离。`)
  }
  lines.push('用中文回复，除非角色的设定是其他语言。')
  const system = lines.join('\n\n')

  const messages = session.messages.slice(-40).map((m) =>
    m.role === 'user' ? { role: 'user', content: m.content } : { role: 'assistant', content: m.content }
  )

  const payload = {
    model: settings.model || 'deepseek-chat',
    messages: [{ role: 'system', content: system }, ...messages],
    stream: true,
    temperature: session.params?.temperature ?? 0.9,
    top_p: session.params?.top_p ?? 0.9,
    max_tokens: session.params?.max_tokens ?? 2048,
  }

  const base = settings.apiBaseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API 错误 ${res.status}: ${text.slice(0, 300)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleJson = (json) => {
    if (json === '[DONE]') return
    try {
      const obj = JSON.parse(json)
      const d = obj.choices?.[0]?.delta || {}
      const reasoning = d.reasoning_content || ''
      const content = d.content || ''
      if (reasoning) onDelta({ text: reasoning, isReasoning: true })
      if (content) onDelta({ text: content, isReasoning: false })
    } catch {}
  }

  const drain = () => {
    while (true) {
      const idx = buffer.indexOf('data:')
      if (idx === -1) return
      buffer = buffer.slice(idx)
      const nl = buffer.indexOf('\n')
      const nextIdx = buffer.indexOf('data:', 5)
      let end = buffer.length
      if (nl !== -1) end = Math.min(end, nl)
      if (nextIdx !== -1) end = Math.min(end, nextIdx)
      const candidate = buffer.slice(0, end)
      const json = extractJsonFrom(candidate)
      if (json) {
        handleJson(json)
        buffer = buffer.slice(idx + json.length).replace(/^[\s]*/, '')
        continue
      }
      if (nl === -1 && nextIdx === -1) return
      buffer = buffer.slice(nl !== -1 ? nl + 1 : nextIdx)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    drain()
  }
  if (buffer.trim()) {
    const json = extractJsonFrom(buffer)
    if (json) handleJson(json)
  }
}

async function runChat(sessionId, content, characterId, params) {
  const session = await getSession(sessionId)
  if (!session) throw new Error('会话不存在')
  const assistantMsg = await addMessage(sessionId, {
    role: 'assistant',
    content: '',
    characterId: characterId || session.characterIds?.[0] || '',
  })
  const characters = (session.characterIds || []).map((id) => null) // 下方重新取
  const chars = []
  for (const id of session.characterIds || []) {
    const ch = await getCharacter(id)
    if (ch) chars.push(ch)
  }
  const controller = new AbortController()
  activeChats.set(sessionId, controller)

  let pendingContent = ''
  let pendingThinking = ''
  let flushTimer = null
  const flush = () => {
    if (pendingContent || pendingThinking) {
      updateMessage(sessionId, assistantMsg.id, { content: pendingContent, thinking: pendingThinking })
    }
    flushTimer = null
  }

  try {
    await streamChat(
      { ...session, params: { ...session.params, ...(params || {}) } },
      chars,
      (chunk) => {
        if (chunk.isReasoning) pendingThinking += chunk.text
        else pendingContent += chunk.text
        emit('chat:delta', { sessionId, messageId: assistantMsg.id, delta: chunk.text, isReasoning: !!chunk.isReasoning })
        if (!flushTimer) flushTimer = setTimeout(flush, 500)
      },
      controller.signal
    )
    flush()
    emit('chat:done', { sessionId, messageId: assistantMsg.id })
  } catch (err) {
    flush()
    if (err.name === 'AbortError') {
      const cur = await getSession(sessionId)
      const msg = cur?.messages.find((x) => x.id === assistantMsg.id)
      updateMessage(sessionId, assistantMsg.id, { content: (msg?.content || '') + '\n\n[已停止]' })
      emit('chat:stopped', { sessionId, messageId: assistantMsg.id })
    } else {
      const cur = await getSession(sessionId)
      const msg = cur?.messages.find((x) => x.id === assistantMsg.id)
      updateMessage(sessionId, assistantMsg.id, { content: (msg?.content || '') + `\n\n[出错了] ${err.message}` })
      emit('chat:error', { sessionId, messageId: assistantMsg.id, error: err.message })
    }
  } finally {
    activeChats.delete(sessionId)
  }
  return assistantMsg
}

async function startChat({ sessionId, content, characterId, params }) {
  await addMessage(sessionId, { role: 'user', content, characterId: characterId || '' })
  return runChat(sessionId, content, characterId, params)
}

async function regenerate(sessionId, messageId) {
  const session = await getSession(sessionId)
  if (!session) throw new Error('会话不存在')
  const idx = session.messages.findIndex((m) => m.id === messageId)
  if (idx <= 0) throw new Error('这条消息无法重新生成')
  let userMsg = null
  for (let i = idx - 1; i >= 0; i--) {
    if (session.messages[i].role === 'user') {
      userMsg = session.messages[i]
      break
    }
  }
  if (!userMsg) throw new Error('找不到触发这条回复的消息')
  session.messages = session.messages.slice(0, idx)
  persist()
  return runChat(sessionId, userMsg.content, userMsg.characterId)
}

function stopChat(sessionId) {
  const c = activeChats.get(sessionId)
  if (c) c.abort()
}

function onChatEvent(name, cb) {
  const h = (e) => cb(e.detail)
  window.addEventListener(name, h)
  return () => window.removeEventListener(name, h)
}

/* ---------------- 远程 ComfyUI（局域网调用电脑） ---------------- */

function comfyBase() {
  return loadAll().then((m) => (m.settings.comfyuiUrl || '').replace(/\/+$/, ''))
}

const comfy = {
  online: async () => {
    const base = await comfyBase()
    if (!base) return false
    try {
      const res = await fetch(`${base}/system_stats`, { signal: AbortSignal.timeout(4000) })
      return res.ok
    } catch {
      return false
    }
  },
  ensure: async () => {
    const base = await comfyBase()
    if (!base) return { ok: false, message: '还没配置电脑端 ComfyUI 地址（设置 → ComfyUI 地址）' }
    try {
      const res = await fetch(`${base}/system_stats`, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) return { ok: false, message: `ComfyUI 连接失败（${res.status}），确认电脑已启动且在同一网络` }
      return { ok: true }
    } catch {
      return { ok: false, message: '连不上 ComfyUI：请确认电脑酒馆已启动、手机和电脑在同一 WiFi、ComfyUI 开启了跨域（--enable-cors-header="*"）' }
    }
  },
  models: async () => {
    const base = await comfyBase()
    const res = await fetch(`${base}/object_info`)
    const info = await res.json()
    const loader = info.CheckpointLoaderSimple
    const list = (loader?.input?.required?.ckpt_name?.[0]) || []
    return list
  },
  loras: async () => {
    const base = await comfyBase()
    try {
      const res = await fetch(`${base}/object_info`)
      const info = await res.json()
      return info.LoraLoader?.input?.required?.lora_name?.[0] || []
    } catch {
      return []
    }
  },
  generate: async (opts) => {
    const base = await comfyBase()
    const wf = {}
    wf['4'] = { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: opts.model } }
    wf['6'] = { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 1], text: opts.prompt } }
    wf['7'] = { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 1], text: opts.negative || 'lowres, bad anatomy, bad hands, worst quality, low quality, blurry' } }
    wf['5'] = { class_type: 'EmptyLatentImage', inputs: { batch_size: 1, height: opts.height || 1216, width: opts.width || 832 } }
    wf['8'] = {
      class_type: 'KSampler',
      inputs: {
        cfg: opts.cfg ?? 4.0,
        denoise: 1.0,
        latent_image: ['5', 0],
        model: ['4', 0],
        negative: ['7', 0],
        positive: ['6', 0],
        sampler_name: opts.sampler || 'euler_ancestral',
        scheduler: 'normal',
        seed: opts.seed === undefined ? Math.floor(Math.random() * 1e15) : opts.seed,
        steps: opts.steps || 28,
      },
    }
    wf['9'] = { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['4', 2] } }
    wf['10'] = { class_type: 'SaveImage', inputs: { filename_prefix: 'tavern_m', images: ['9', 0] } }

    const res = await fetch(`${base}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: wf }),
    })
    if (!res.ok) throw new Error(`提交失败 ${res.status}`)
    const submit = await res.json()
    const promptId = submit.prompt_id
    const deadline = Date.now() + 180000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000))
      const hres = await fetch(`${base}/history/${promptId}`)
      if (!hres.ok) continue
      const hist = await hres.json()
      const entry = hist[promptId]
      if (!entry) continue
      if (entry.status?.status_str === 'error') {
        throw new Error('ComfyUI 生成出错，看看电脑端日志')
      }
      const outputs = entry.outputs || {}
      const imgs = Object.values(outputs).flatMap((o) => o.images || [])
      if (imgs.length > 0) {
        const img = imgs[0]
        const vres = await fetch(
          `${base}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`
        )
        if (!vres.ok) throw new Error('图片下载失败')
        const blob = await vres.blob()
        const filename = `rm_${Date.now().toString(36)}.png`
        await set(`images:${filename}`, blob)
        return { path: filename, filename }
      }
    }
    throw new Error('ComfyUI 生成超时')
  },
}

/* ---------------- 图片（IndexedDB 存储） ---------------- */

function imgKey(path) {
  return 'images:' + String(path || '').replace(/\\/g, '/').split('/').pop()
}

const image = {
  readBase64: async (path) => {
    const blob = await get(imgKey(path), null)
    if (!blob) return ''
    return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(blob)
    })
  },
  upload: async () => {
    // 浏览器文件选择
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve(null)
        const ext = (file.name.match(/\.(\w+)$/) || [])[1] || 'png'
        const filename = `up_${Date.now().toString(36)}.${ext}`
        await set(imgKey(filename), file)
        resolve({ path: filename, filename })
      }
      input.click()
    })
  },
  saveFromDataUrl: async ({ dataUrl }) => {
    const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
    if (!m) throw new Error('无效的图片数据')
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[m[1]] || 'png'
    const filename = `up_${Date.now().toString(36)}.${ext}`
    const byteString = atob(m[2])
    const arr = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i)
    await set(imgKey(filename), new Blob([arr], { type: m[1] }))
    return { path: filename, filename }
  },
}

/* ---------------- 角色卡导入/导出（浏览器） ---------------- */

const characters = {
  list: listCharacters,
  get: getCharacter,
  create: createCharacter,
  update: updateCharacter,
  remove: deleteCharacter,
  exportCard: async (id) => {
    const c = await getCharacter(id)
    if (!c) throw new Error('角色不存在')
    const payload = { ...c }
    delete payload.id
    delete payload.createdAt
    delete payload.updatedAt
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${c.name}.json`
    a.click()
    URL.revokeObjectURL(url)
    return { canceled: false, path: '' }
  },
  importCard: async () => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.png'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve({ canceled: true })
        try {
          let obj = null
          let avatar = ''
          if (file.name.toLowerCase().endsWith('.png')) {
            // 读 PNG tEXt 嵌卡
            const buf = new Uint8Array(await file.arrayBuffer())
            obj = extractCharaFromPngBuf(buf)
            avatar = await saveBlob(file)
          } else {
            obj = normalizeCard(JSON.parse(await file.text()))
            if (obj?.avatar) avatar = obj.avatar
          }
          if (!obj) throw new Error('无法解析角色卡文件')
          const isTavern = !!(obj.first_mes || obj.mes_example || obj.extensions)
          const scenario = obj.scenario ? `【场景】\n${obj.scenario}` : ''
          const fields = {
            name: obj.name || '导入角色',
            avatar,
            avatarSource: avatar ? 'upload' : 'none',
            background: [obj.description || obj.background, scenario].filter(Boolean).join('\n\n') || '',
            personality: obj.personality || '',
            style: obj.style || '',
            greeting: obj.first_mes || obj.greeting || '',
            exampleDialogs: obj.mes_example || obj.exampleDialogs || '',
            appearance: obj.appearance || '',
            avatarPrompt: obj.avatarPrompt || '',
            defaultParams: obj.defaultParams,
          }
          // 自动翻译英文角色卡
          let translated = false
          if (isTavern && isMostlyEnglish([fields.background, fields.personality, fields.greeting, fields.exampleDialogs].join(' '))) {
            try {
              const t = await translateFields(fields)
              if (t) {
                fields.background = t.background || fields.background
                fields.personality = t.personality || fields.personality
                fields.style = t.style || fields.style
                fields.greeting = t.greeting || fields.greeting
                fields.exampleDialogs = t.exampleDialogs || fields.exampleDialogs
                fields.appearance = t.appearance || fields.appearance
                translated = true
              }
            } catch {}
          }
          const created = await createCharacter(fields)
          resolve({ canceled: false, character: created, fromTavern: isTavern, translated })
        } catch (e) {
          resolve({ canceled: false, error: e.message })
        }
      }
      input.click()
    })
  },
}

function extractCharaFromPngBuf(buf) {
  if (buf.length < 24) return null
  const sig = Array.from(buf.slice(0, 8))
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!sig.every((v, i) => v === pngSig[i])) return null
  let offset = 8
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  while (offset + 8 <= buf.length) {
    const len = dv.getUint32(offset)
    const type = String.fromCharCode(...buf.slice(offset + 4, offset + 8))
    const data = buf.slice(offset + 8, offset + 8 + len)
    if (type === 'tEXt') {
      const nul = data.indexOf(0)
      if (nul > 0) {
        const keyword = String.fromCharCode(...data.slice(0, nul))
        const text = String.fromCharCode(...data.slice(nul + 1))
        try {
          const parsed = JSON.parse(atob(text))
          const card = normalizeCard(parsed)
          if (card && (card.name || card.description || card.first_mes)) return card
        } catch {}
        if (keyword === 'chara') {
          try {
            const card = normalizeCard(JSON.parse(text))
            if (card) return card
          } catch {}
        }
      }
    }
    if (type === 'IEND') break
    offset += 8 + len + 4
  }
  return null
}

function normalizeCard(obj) {
  if (Array.isArray(obj)) obj = obj[0]
  if (!obj || typeof obj !== 'object') return null
  if (!obj.name && obj.chub_card) obj = obj.chub_card
  if (!obj.name && obj.data) obj = obj.data
  if (Array.isArray(obj)) obj = obj[0]
  return obj && typeof obj === 'object' ? obj : null
}

function isMostlyEnglish(text) {
  const total = (text || '').length
  if (total < 20) return false
  const cjk = (text.match(/[一-鿿぀-ヿ가-힯]/g) || []).length
  return cjk / total < 0.1
}

async function translateFields(fields) {
  const settings = await getSettings()
  if (!settings.apiBaseUrl || !settings.apiKey) return null
  const payload = {
    model: settings.model,
    messages: [
      {
        role: 'system',
        content:
          '你是角色卡翻译器。把用户提供的英文角色卡翻译成简体中文，保持角色扮演的语气、称呼习惯和风格。字段名保持英文不变，只翻译字段内容。只输出翻译后的 JSON 对象，不要输出任何其他文字。',
      },
      { role: 'user', content: JSON.stringify(fields) },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  }
  const base = settings.apiBaseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  })
  if (!res.ok) throw new Error(`翻译失败 ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
  }
  return null
}

async function saveBlob(file) {
  const ext = (file.name.match(/\.(\w+)$/) || [])[1] || 'png'
  const filename = `up_${Date.now().toString(36)}.${ext}`
  await set(imgKey(filename), file)
  return filename
}

/* ---------------- 导出聊天记录（浏览器下载） ---------------- */

const sessions = {
  list: listSessions,
  get: getSession,
  create: createSession,
  update: updateSession,
  remove: deleteSession,
  addMessage,
  updateMessage,
  deleteMessage,
  clear: clearSessionMessages,
  exportChat: async (sessionId) => {
    const s = await getSession(sessionId)
    if (!s) return { canceled: true }
    const chars = []
    for (const id of s.characterIds || []) {
      const ch = await getCharacter(id)
      if (ch) chars.push(ch)
    }
    const lines = [`# ${s.name}`, '']
    s.messages.forEach((m) => {
      const who = m.role === 'user' ? '用户' : m.characterId ? chars.find((c) => c.id === m.characterId)?.name || 'AI' : 'AI'
      const body = m.content || (m.image ? '（图片）' : '')
      if (body) lines.push(`**${who}**`, '', body, '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${s.name}.md`
    a.click()
    URL.revokeObjectURL(url)
    return { canceled: false, path: '' }
  },
}

/* ---------------- 汇总 ---------------- */

const api = {
  characters,
  sessions,
  settings: {
    get: getSettings,
    update: updateSettings,
    reset: resetSettings,
  },
  llm: {
    listModels: async () => {
      const settings = await getSettings()
      if (!settings.apiBaseUrl || !settings.apiKey) throw new Error('未配置 API')
      const base = settings.apiBaseUrl.replace(/\/+$/, '')
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${settings.apiKey}` },
      })
      if (!res.ok) throw new Error(`获取模型列表失败 ${res.status}`)
      const data = await res.json()
      return (data.data || []).map((m) => m.id)
    },
    startChat,
    regenerate,
    stopChat,
    onDelta: (cb) => onChatEvent('chat:delta', cb),
    onDone: (cb) => onChatEvent('chat:done', cb),
    onError: (cb) => onChatEvent('chat:error', cb),
    onStopped: (cb) => onChatEvent('chat:stopped', cb),
  },
  comfy,
  claude: {
    // 手机版无 Claude Code，预留空实现
    genPrompt: async () => {
      throw new Error('手机版暂不支持 AI 配图')
    },
    avatarPrompt: async () => {
      throw new Error('手机版暂不支持描述转换')
    },
  },
  image,
}

window.tavern = api
window.tavern.isMobile = true
export default api
