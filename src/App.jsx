import React, { useEffect, useState, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatArea from './components/ChatArea.jsx'
import ParamPanel from './components/ParamPanel.jsx'
import CharacterEditor from './components/CharacterEditor.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import NewSessionModal from './components/NewSessionModal.jsx'
import ImagePanel from './components/ImagePanel.jsx'
import ParticleField from './components/ParticleField.jsx'
import { applyTheme } from './themes.js'

const api = window.tavern

export default function App() {
  const [characters, setCharacters] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [settings, setSettings] = useState(null)
  const [activeTab, setActiveTab] = useState('sessions')

  const [showSettings, setShowSettings] = useState(false)
  const [editingChar, setEditingChar] = useState(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [showImagePanel, setShowImagePanel] = useState(false)
  const [comfyOnline, setComfyOnline] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 流式消息实时更新：messageStream 里存 {sessionId, messageId, content}
  const [streams, setStreams] = useState({})
  const [streamingSession, setStreamingSession] = useState(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null

  const refreshAll = useCallback(async () => {
    const [cs, ss, st] = await Promise.all([
      api.characters.list(),
      api.sessions.list(),
      api.settings.get(),
    ])
    setCharacters(cs)
    setSessions(ss)
    setSettings(st)
  }, [])

  useEffect(() => {
    refreshAll()
    api.comfy.online().then(setComfyOnline).catch(() => setComfyOnline(false))
  }, [refreshAll])

  // 应用主题
  useEffect(() => {
    if (settings?.theme) applyTheme(settings.theme)
  }, [settings?.theme])

  // 流式事件监听
  useEffect(() => {
    const unsubs = [
      api.llm.onDelta(({ sessionId, messageId, delta, isReasoning }) => {
        setStreamingSession(sessionId)
        setStreams((prev) => {
          const key = `${sessionId}:${messageId}`
          const prevEntry = prev[key] || { sessionId, messageId, content: '', thinking: '' }
          const entry = { ...prevEntry }
          if (isReasoning) entry.thinking += delta
          else entry.content += delta
          return { ...prev, [key]: entry }
        })
      }),
      api.llm.onDone(({ sessionId, messageId }) => {
        setStreams((prev) => {
          const next = { ...prev }
          delete next[`${sessionId}:${messageId}`]
          return next
        })
        setStreamingSession((s) => (s === sessionId ? null : s))
        refreshAll()
      }),
      api.llm.onError(({ sessionId }) => {
        setStreamingSession((s) => (s === sessionId ? null : s))
        refreshAll()
      }),
      api.llm.onStopped(({ sessionId }) => {
        setStreamingSession((s) => (s === sessionId ? null : s))
        refreshAll()
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [refreshAll])

  const openSession = (id) => {
    setActiveSessionId(id)
    setActiveTab('sessions')
  }

  const deleteCharacter = async (id) => {
    await api.characters.remove(id)
    refreshAll()
  }

  const deleteSession = async (id) => {
    await api.sessions.remove(id)
    if (activeSessionId === id) setActiveSessionId(null)
    refreshAll()
  }

  const toggleComfy = async () => {
    const r = await api.comfy.ensure()
    setComfyOnline(!!r.ok)
    if (!r.ok) alert(r.message || 'ComfyUI 启动失败')
  }

  const charactersMap = {}
  characters.forEach((c) => (charactersMap[c.id] = c))

  return (
    <div className="app">
      <ParticleField
        type={settings?.theme?.particles || 'none'}
        density={settings?.theme?.particleDensity || 60}
      />
      <button className="menu-btn app-menu-btn" onClick={() => setSidebarOpen(true)} title="菜单">☰</button>
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        open={sidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        characters={characters}
        sessions={sessions}
        activeSessionId={activeSessionId}
        openSession={(id) => {
          openSession(id)
          setSidebarOpen(false)
        }}
        onCreateCharacter={() => {
          setEditingChar({})
          setSidebarOpen(false)
        }}
        onEditCharacter={(c) => {
          setEditingChar(c)
          setSidebarOpen(false)
        }}
        onDeleteCharacter={deleteCharacter}
        onNewSession={() => {
          setShowNewSession(true)
          setSidebarOpen(false)
        }}
        onDeleteSession={deleteSession}
        onOpenSettings={() => {
          setShowSettings(true)
          setSidebarOpen(false)
        }}
        comfyOnline={comfyOnline}
        onToggleComfy={toggleComfy}
        onClose={() => setSidebarOpen(false)}
      />

      {activeSession ? (
        <ChatArea
          session={activeSession}
          charactersMap={charactersMap}
          streams={streams}
          streaming={streamingSession === activeSession.id}
          onRefresh={refreshAll}
          onOpenImagePanel={() => setShowImagePanel(true)}
          onStop={() => api.llm.stopChat(activeSession.id)}
          globalChatBg={settings?.theme?.chatBg}
          quickReplies={settings?.quickReplies}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      ) : (
        <div className="empty-chat">
          <div className="empty-logo">🏮</div>
          <div className="empty-title">念念酒馆</div>
          <div className="empty-sub">选择一个会话，或创建新的角色开始聊天</div>
        </div>
      )}

      <ParamPanel
        session={activeSession}
        charactersMap={charactersMap}
        onUpdateSession={async (fields) => {
          if (activeSessionId) await api.sessions.update(activeSessionId, fields)
          refreshAll()
        }}
      />

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false)
            refreshAll()
          }}
        />
      )}

      {editingChar && (
        <CharacterEditor
          key={editingChar.id || 'new'}
          character={editingChar.id ? editingChar : null}
          onClose={() => setEditingChar(null)}
          onSaved={() => {
            setEditingChar(null)
            refreshAll()
          }}
        />
      )}

      {showNewSession && (
        <NewSessionModal
          characters={characters}
          onClose={() => setShowNewSession(false)}
          onCreated={(sid) => {
            setShowNewSession(false)
            refreshAll()
            openSession(sid)
          }}
        />
      )}

      {showImagePanel && activeSession && (
        <ImagePanel
          session={activeSession}
          charactersMap={charactersMap}
          characterTags={charactersMap[activeSession.characterIds?.[0]]?.avatarPrompt || ''}
          onClose={() => setShowImagePanel(false)}
          onAttach={async (imagePath) => {
            await api.sessions.addMessage(activeSession.id, {
              role: 'assistant',
              characterId: '',
              content: '',
              image: imagePath,
            })
            refreshAll()
          }}
        />
      )}
    </div>
  )
}
