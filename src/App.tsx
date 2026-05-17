import { useState, useEffect, useCallback, useRef } from 'react'
import { SkillGrid } from './components/SkillGrid'
import { SkillEditor } from './components/SkillEditor'
import { SkillCreator } from './components/SkillCreator'
import { McpServers } from './components/McpServers'
import { Plugins } from './components/Plugins'
import { useSkills, useMcpServers, usePlugins } from './hooks/useData'
import type { Skill } from './types'

type Tab = 'skills' | 'mcp' | 'plugins'

function useAppVersion() {
  const [version, setVersion] = useState('…')
  useEffect(() => {
    fetch('/api/info').then(r => r.json()).then(d => setVersion(d.version || '?')).catch(() => setVersion('?'))
  }, [])
  return version
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark] as const
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toISOString().slice(0, 19).replace('T', ' '))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(0, 19).replace('T', ' ')), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="live-clock">{time} UTC</span>
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        transition: 'transform 0.5s ease',
        transform: spinning ? 'rotate(360deg)' : 'none',
      }}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">KEYBOARD SHORTCUTS</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="shortcut-table">
            {[
              ['N', 'New skill'],
              ['/', 'Focus search'],
              ['D', 'Toggle dark mode'],
              ['Esc', 'Close modal'],
              ['?', 'Show this help'],
            ].map(([key, label]) => (
              <div key={key} className="shortcut-row">
                <kbd className="kbd">{key}</kbd>
                <span className="shortcut-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { skills, loading, error: skillsError, updateSkill, createSkill, deleteSkill, renameSkill, refetch } = useSkills()
  const { servers, health: mcpHealth, loading: mcpLoading, error: mcpError, addServer, removeServer } = useMcpServers()
  const { plugins, loading: pluginsLoading, error: pluginsError, removePlugin } = usePlugins()
  const [dark, setDark] = useDarkMode()
  const appVersion = useAppVersion()

  const [tab, setTab] = useState<Tab>('skills')
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const isModalOpen = !!(editingSkill || creating || deleteConfirm || showHelp)

  const handleRefresh = () => {
    setSpinning(true)
    refetch().finally(() => setTimeout(() => setSpinning(false), 500))
  }

  const handleDelete = async (name: string) => {
    if (deleteConfirm !== name) { setDeleteConfirm(name); return }
    await deleteSkill(name)
    setDeleteConfirm(null)
  }

  const closeAll = useCallback(() => {
    setEditingSkill(null)
    setCreating(false)
    setDeleteConfirm(null)
    setShowHelp(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (e.key === 'Escape') {
        closeAll()
        return
      }

      if (inInput) return

      if (e.key === 'n' || e.key === 'N') {
        if (!isModalOpen && tab === 'skills') setCreating(true)
      } else if (e.key === '/') {
        e.preventDefault()
        // SkillGrid owns the search input — dispatch a custom event to focus it
        window.dispatchEvent(new CustomEvent('focus-search'))
      } else if (e.key === 'd' || e.key === 'D') {
        setDark(v => !v)
      } else if (e.key === '?') {
        setShowHelp(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isModalOpen, tab, closeAll, setDark])

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-mark">Skills</span>
            <span className="logo-sub">Control Panel</span>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${tab === 'skills' ? 'active' : ''}`}
              onClick={() => setTab('skills')}
            >
              Skills
              <span className="nav-count">{skills.length}</span>
            </button>
            <button
              className={`nav-tab ${tab === 'mcp' ? 'active' : ''}`}
              onClick={() => setTab('mcp')}
            >
              MCP Servers
              <span className="nav-count">{Object.keys(servers).length}</span>
            </button>
            <button
              className={`nav-tab ${tab === 'plugins' ? 'active' : ''}`}
              onClick={() => setTab('plugins')}
            >
              Plugins
              <span className="nav-count">{plugins.length}</span>
            </button>
          </nav>
        </div>

        <div className="header-right">
          {tab === 'skills' && (
            <button className="hdr-btn hdr-btn-primary" onClick={() => setCreating(true)}>
              + New Skill
            </button>
          )}
          <button
            className="hdr-btn hdr-btn-icon"
            onClick={() => setDark(v => !v)}
            title={dark ? 'Light mode (D)' : 'Dark mode (D)'}
          >
            {dark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button className="hdr-btn hdr-btn-icon" onClick={handleRefresh} title="Refresh">
            <RefreshIcon spinning={spinning} />
          </button>
          <button className="hdr-btn hdr-btn-icon" onClick={() => setShowHelp(true)} title="Keyboard shortcuts (?)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
          <div className="hdr-btn" style={{ cursor: 'default', gap: 0 }}>
            <LiveClock />
          </div>
        </div>
      </header>

      {/* ── Status strip ── */}
      <div className="status-strip">
        <div className="status-item">
          <div className="status-dot" />
          System online
        </div>
        <div className="status-item">
          <div className={`status-dot ${loading ? 'amber' : ''}`} />
          {loading ? 'Loading…' : `${skills.length} skills`}
        </div>
        <div className="status-item">
          <div className="status-dot" />
          {Object.keys(servers).length} MCP servers
        </div>
        <div className="status-item">
          <div className={`status-dot ${pluginsLoading ? 'amber' : ''}`} />
          {pluginsLoading ? 'Loading…' : `${plugins.length} plugins`}
        </div>
        <div className="status-item">
          <div className="status-dot" />
          ~/.claude/skills
        </div>
        <span className="status-ticker">v{appVersion}</span>
      </div>

      {/* ── Error banner ── */}
      {(skillsError || mcpError || pluginsError) && (
        <div className="error-strip">
          {skillsError && <span>■ SKILLS: {skillsError}</span>}
          {mcpError && <span>■ MCP: {mcpError}</span>}
          {pluginsError && <span>■ PLUGINS: {pluginsError}</span>}
        </div>
      )}

      {/* ── Main ── */}
      <main className="app-main">
        {tab === 'skills' && (
          <SkillGrid skills={skills} loading={loading} onEdit={setEditingSkill} onDelete={handleDelete} />
        )}
        {tab === 'mcp' && (
          <McpServers servers={servers} health={mcpHealth} loading={mcpLoading} onAdd={addServer} onRemove={removeServer} />
        )}
        {tab === 'plugins' && (
          <Plugins plugins={plugins} loading={pluginsLoading} error={pluginsError} removePlugin={removePlugin} />
        )}
      </main>

      {/* ── Modals ── */}
      {editingSkill && (
        <SkillEditor skill={editingSkill} onSave={updateSkill} onRename={renameSkill} onClose={() => setEditingSkill(null)} />
      )}

      {creating && (
        <SkillCreator onCreate={createSkill} onClose={() => setCreating(false)} />
      )}

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete skill?</h2>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Permanently delete <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 13 }}>{deleteConfirm}</code> and all associated files?
                <br />
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>This cannot be undone.</span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
