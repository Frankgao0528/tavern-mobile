import React, { useEffect, useRef, useState } from 'react'
import { useOverlay } from './Overlay.jsx'
import Img from './Img.jsx'
import LoreModal from './LoreModal.jsx'

const api = window.tavern

/** 会话级聊天背景设置弹窗 */
function ChatBgPopup({ chatBg, globalChatBg, onSet, onClose }) {
  const [form, setForm] = useState(() => ({
    image: chatBg?.image || globalChatBg?.image || '',
    dim: chatBg?.dim ?? globalChatBg?.dim ?? 0.7,
    blur: chatBg?.blur ?? globalChatBg?.blur ?? 0,
  }))
  const current = form.image ? form : null

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal chatbg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🖼️ 这个对话的背景</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="chatbg-row">
            <button
              className="ghost-btn"
              onClick={async () => {
                const img = await api.image.upload()
                if (img) setForm((f) => ({ ...f, image: img.path }))
              }}
            >🖼️ 选择背景图</button>
            {form.image && (
              <button className="ghost-btn" onClick={() => setForm((f) => ({ ...f, image: '' }))}>清除</button>
            )}
          </div>
          {form.image && (
            <div className="chatbg-preview">
              <Img path={form.image} alt="" />
            </div>
          )}
          <label className="field">
            <span>背景明暗（越暗文字越清楚）({Math.round((form.dim ?? 0.7) * 100)}%)</span>
            <input
              type="range" min="0" max="0.95" step="0.05"
              value={form.dim ?? 0.7}
              onChange={(e) => setForm((f) => ({ ...f, dim: parseFloat(e.target.value) }))}
            />
          </label>
          <label className="field">
            <span>背景模糊（px）({form.blur || 0}px)</span>
            <input
              type="range" min="0" max="20" step="1"
              value={form.blur || 0}
              onChange={(e) => setForm((f) => ({ ...f, blur: parseInt(e.target.value) }))}
            />
          </label>
          {!current && globalChatBg?.image && (
            <div className="theme-note">当前跟随全局背景，设置后会为这个对话单独生效</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose}>取消</button>
          <button
            className="primary-btn"
            onClick={async () => {
              await onSet({ image: form.image, dim: form.dim, blur: form.blur })
              onClose()
            }}
          >保存</button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, char, isUser, stream, streaming, onRegenerate, onEdit, onDelete }) {
  const content = stream?.content ?? msg.content
  const thinking = stream?.thinking ?? msg.thinking
  const hasContent = content && content.trim().length > 0
  const hasThinking = thinking && thinking.trim().length > 0
  const isThinkingStreaming = streaming && hasThinking && !hasContent
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')

  if (!hasContent && !hasThinking && !msg.image) return null

  const startEdit = () => {
    setEditText(content)
    setEditing(true)
  }
  const saveEdit = async () => {
    if (editText.trim()) await onEdit(editText)
    setEditing(false)
  }

  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-char'}`}>
      {!isUser && (
        <div className="msg-avatar">
          {char ? <Img path={char.avatar} alt="" /> : <span>?</span>}
        </div>
      )}
      <div className="msg-body">
        {!isUser && char && <div className="msg-name">{char.name}</div>}
        {!streaming && !editing && (
          <div className="msg-actions">
            {!isUser && (
              <button title="重新生成" onClick={() => onRegenerate(msg)}>🔄</button>
            )}
            <button title="编辑" onClick={startEdit}>✏️</button>
            <button title="删除" onClick={() => onDelete(msg)}>🗑️</button>
          </div>
        )}
        <div className="msg-bubble">
          {editing ? (
            <div className="msg-edit">
              <textarea
                value={editText}
                rows={Math.max(2, editText.split('\n').length)}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className="msg-edit-btns">
                <button className="primary-btn" onClick={saveEdit}>保存</button>
                <button className="ghost-btn" onClick={() => setEditing(false)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              {hasThinking && (
                <div className={`msg-thinking ${isThinkingStreaming ? 'active' : ''}`}>
                  <div className="thinking-head">🤔 {char?.name || 'AI'} 正在思考…</div>
                  <div className="thinking-text">{thinking}{isThinkingStreaming && <span className="cursor">▍</span>}</div>
                </div>
              )}
              {hasContent && (
                <div className="msg-text">
                  {content}
                  {streaming && <span className="cursor">▍</span>}
                </div>
              )}
              {msg.image && <Img className="msg-img" path={msg.image} alt="生成图" />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** 粗略估算 token 数（中文 1 字符≈1.2，英文 4 字符≈1） */
function estimateTokens(texts) {
  const all = texts.join('\n')
  const cjk = (all.match(/[一-鿿぀-ヿ가-힯]/g) || []).length
  const other = all.length - cjk
  return Math.round(cjk * 1.2 + other / 4)
}

export default function ChatArea({ session, charactersMap, streams, streaming, onRefresh, onOpenImagePanel, onStop, globalChatBg, quickReplies, onOpenSidebar }) {
  // 会话级背景优先，其次全局背景
  const chatBg = session.chatBg?.image ? session.chatBg : globalChatBg
  const approxTokens = estimateTokens(session.messages.map((m) => m.content || ''))
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [composing, setComposing] = useState(false)
  const [showBg, setShowBg] = useState(false)
  const [showLore, setShowLore] = useState(false)
  const bottomRef = useRef(null)
  const overlay = useOverlay()

  const chars = (session.characterIds || []).map((id) => charactersMap[id]).filter(Boolean)
  const group = session.mode === 'group' || chars.length > 1

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages.length, streams])

  // 切换会话时重置输入状态
  useEffect(() => {
    setInput('')
    setSending(false)
  }, [session.id])

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await api.llm.startChat({
        sessionId: session.id,
        content: text,
        params: session.params,
      })
      onRefresh()
    } catch (err) {
      alert('发送失败：' + err.message)
    } finally {
      setSending(false)
    }
  }

  const clearChat = async () => {
    if (!(await overlay.confirm('确定清空这个会话的聊天记录吗？'))) return
    await api.sessions.clear(session.id)
    onRefresh()
  }

  const rename = async () => {
    const name = await overlay.prompt('会话名称：', session.name)
    if (name && name.trim()) {
      await api.sessions.update(session.id, { name: name.trim() })
      onRefresh()
    }
  }

  // 开场白：没有消息且有角色 greeting
  const greeting = !session.messages?.length && chars[0]?.greeting
  const allStreaming = streaming

  return (
    <div className="chat-area">
      <div className="chat-header">
        {onOpenSidebar && (
          <button className="menu-btn" onClick={onOpenSidebar} title="菜单">☰</button>
        )}
        <div className="chat-title">
          <span>{session.name}</span>
          {group && <span className="chat-mode">群聊</span>}
          <span className="token-count" title="当前上下文的 token 估算">
            ≈{approxTokens >= 1000 ? (approxTokens / 1000).toFixed(1) + 'k' : approxTokens} tokens
          </span>
        </div>
        <div className="chat-actions">
          <button className="ghost-btn" title="设置这个对话的背景" onClick={() => setShowBg(false)}>
            <span onClick={(e) => { e.stopPropagation(); setShowBg((v) => !v) }}>🖼️ 背景</span>
          </button>
          <button className="ghost-btn" title="世界书与会话设定" onClick={() => setShowLore(true)}>📖 世界书</button>
          <button
            className="ghost-btn"
            title="导出聊天记录"
            onClick={async () => {
              const r = await api.sessions.exportChat(session.id)
              if (r?.canceled) return
              overlay.toast('已导出到 ' + (r?.path || ''))
            }}
          >⬇️ 导出</button>
          <button className="ghost-btn" onClick={rename}>✏️ 重命名</button>
          <button className="ghost-btn" onClick={clearChat}>🗑️ 清空</button>
        </div>
      </div>

      {showLore && (
        <LoreModal
          session={session}
          onClose={() => setShowLore(false)}
          onSaved={onRefresh}
        />
      )}

      {showBg && (
        <ChatBgPopup
          chatBg={session.chatBg}
          globalChatBg={globalChatBg}
          onSet={async (next) => {
            await api.sessions.update(session.id, { chatBg: next })
            onRefresh()
          }}
          onClose={() => setShowBg(false)}
        />
      )}

      <div className="chat-messages-wrap">
        {chatBg?.image && (
          <div className="chat-bg">
            <Img
              className="chat-bg-img"
              path={chatBg.image}
              style={{ filter: `blur(${chatBg.blur || 0}px)` }}
              alt=""
            />
            <div className="chat-bg-dim" style={{ opacity: chatBg.dim ?? 0.7 }} />
          </div>
        )}
      <div className="chat-messages">
        {session.messages.length === 0 && (
          <div className="chat-welcome">
            <div className="welcome-title">
              {chars.length ? `和${chars.map((c) => c.name).join('、')}的对话` : '空会话'}
            </div>
            {greeting && (
              <button
                className="greeting-btn"
                onClick={async () => {
                  setSending(true)
                  try {
                    await api.sessions.addMessage(session.id, {
                      role: 'assistant',
                      characterId: chars[0].id,
                      content: greeting,
                    })
                    onRefresh()
                  } finally {
                    setSending(false)
                  }
                }}
              >💬 开场白：「{greeting.slice(0, 40)}{greeting.length > 40 ? '…' : ''}」</button>
            )}
          </div>
        )}

        {session.messages.map((m) => {
          const isUser = m.role === 'user'
          const char = !isUser && m.characterId ? charactersMap[m.characterId] : null
          const stream = streams[`${session.id}:${m.id}`]
          return (
            <MessageBubble
              key={m.id}
              msg={m}
              char={char}
              isUser={isUser}
              stream={stream}
              streaming={allStreaming && !!stream}
              onRegenerate={(target) => {
                api.llm.regenerate(session.id, target.id).catch((err) => overlay.toast('重新生成失败：' + err.message, 'error'))
                onRefresh()
              }}
              onEdit={async (text) => {
                await api.sessions.updateMessage(session.id, m.id, { content: text })
                onRefresh()
              }}
              onDelete={async (target) => {
                if (!(await overlay.confirm('删除这条消息？'))) return
                await api.sessions.deleteMessage(session.id, target.id)
                onRefresh()
              }}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>
      </div>

      <div className="chat-input-area">
        {quickReplies?.length > 0 && !sending && (
          <div className="quick-replies">
            {quickReplies.map((q, i) => (
              <button
                key={i}
                className="quick-chip"
                onClick={() => send(q)}
              >{q}</button>
            ))}
          </div>
        )}
        <div className="input-row">
          <textarea
            className="chat-input"
            placeholder={group ? '说点什么…' : '说点什么…'}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => setInput(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={(e) => {
              // 中文输入法确认候选词时的 Enter 不能拦截，否则打不了字
              if (e.key === 'Enter' && !e.shiftKey && !composing) {
                e.preventDefault()
                send()
              }
            }}
          />
          <button className="img-btn" title="ComfyUI 生图" onClick={onOpenImagePanel}>🎨</button>
          {streaming ? (
            <button className="send-btn stop" onClick={onStop}>■ 停止</button>
          ) : (
            <button className="send-btn" onClick={send} disabled={!input.trim()}>发送</button>
          )}
        </div>
      </div>
    </div>
  )
}
