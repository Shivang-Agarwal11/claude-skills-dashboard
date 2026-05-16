import { useState, useEffect, useMemo } from 'react'
import { marked } from 'marked'
import type { Skill } from '../types'
import { ALL_TOOLS } from '../constants'

// Configure marked for safe rendering
marked.setOptions({ breaks: true })

interface Props {
  skill: Skill
  onSave: (name: string, updated: Partial<Skill>) => Promise<void>
  onRename: (name: string, newName: string) => Promise<void>
  onClose: () => void
}

export function SkillEditor({ skill, onSave, onRename, onClose }: Props) {
  const [description, setDescription] = useState(skill.description || '')
  const [tools, setTools] = useState<string[]>(skill['allowed-tools'] || [])
  const [triggers, setTriggers] = useState<string[]>(skill.triggers || [])
  const [version, setVersion] = useState(skill.version || '1.0.0')
  const [body, setBody] = useState(skill.body || '')
  const [userInvocable, setUserInvocable] = useState(!!skill['user-invocable'])
  const [saving, setSaving] = useState(false)
  const [newTrigger, setNewTrigger] = useState('')
  const [customTool, setCustomTool] = useState('')
  const [tab, setTab] = useState<'meta' | 'body'>('meta')
  const [bodyMode, setBodyMode] = useState<'edit' | 'preview'>('edit')
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(skill.name)
  const [renameError, setRenameError] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  useEffect(() => {
    setDescription(skill.description || '')
    setTools(skill['allowed-tools'] || [])
    setTriggers(skill.triggers || [])
    setVersion(skill.version || '1.0.0')
    setBody(skill.body || '')
    setUserInvocable(!!skill['user-invocable'])
    setNewName(skill.name)
    setRenaming(false)
    setRenameError('')
  }, [skill])

  const renderedBody = useMemo(() => {
    if (bodyMode !== 'preview') return ''
    try {
      return marked.parse(body) as string
    } catch {
      return '<p><em>Failed to render markdown</em></p>'
    }
  }, [body, bodyMode])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(skill.name, { name: skill.name, version, description, 'allowed-tools': tools, triggers, body, 'user-invocable': userInvocable || undefined })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === skill.name) { setRenaming(false); return }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      setRenameError('Lowercase letters, numbers, hyphens only')
      return
    }
    setRenameLoading(true)
    setRenameError('')
    try {
      await onRename(skill.name, trimmed)
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Rename failed'
      setRenameError(msg)
    } finally {
      setRenameLoading(false)
    }
  }

  const toggleTool = (t: string) =>
    setTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const addTrigger = () => {
    const v = newTrigger.trim()
    if (v && !triggers.includes(v)) { setTriggers(p => [...p, v]); setNewTrigger('') }
  }

  const addCustomTool = () => {
    const v = customTool.trim()
    if (v && !tools.includes(v)) { setTools(p => [...p, v]); setCustomTool('') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-area">
            <span className="modal-title-label">EDIT SKILL</span>
            {renaming ? (
              <div className="rename-row">
                <input
                  className="form-input rename-input"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setRenameError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenaming(false); setNewName(skill.name) } }}
                  autoFocus
                  spellCheck={false}
                />
                <button className="btn btn-primary rename-confirm-btn" onClick={handleRename} disabled={renameLoading}>
                  {renameLoading ? '…' : 'OK'}
                </button>
                <button className="icon-btn" onClick={() => { setRenaming(false); setNewName(skill.name); setRenameError('') }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                {renameError && <span className="rename-error">{renameError}</span>}
              </div>
            ) : (
              <div className="rename-row">
                <code className="modal-skill-name">{skill.name}</code>
                <button className="rename-trigger-btn" onClick={() => setRenaming(true)} title="Rename skill">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  RENAME
                </button>
              </div>
            )}
          </div>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'meta' ? 'active' : ''}`} onClick={() => setTab('meta')}>
            METADATA
          </button>
          <button className={`modal-tab ${tab === 'body' ? 'active' : ''}`} onClick={() => setTab('body')}>
            SKILL.MD BODY
          </button>
          {tab === 'body' && (
            <div className="body-mode-toggle">
              <button
                className={`body-mode-btn ${bodyMode === 'edit' ? 'active' : ''}`}
                onClick={() => setBodyMode('edit')}
              >
                EDIT
              </button>
              <button
                className={`body-mode-btn ${bodyMode === 'preview' ? 'active' : ''}`}
                onClick={() => setBodyMode('preview')}
              >
                PREVIEW
              </button>
            </div>
          )}
        </div>

        <div className="modal-body">
          {tab === 'meta' && (
            <div className="form-sections">
              <div className="form-row">
                <label className="form-label">VERSION</label>
                <input className="form-input" value={version} onChange={e => setVersion(e.target.value)} style={{ width: 140 }} />
              </div>

              <div className="form-row">
                <label className="form-label">INVOCABLE AS SLASH COMMAND</label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={userInvocable}
                    onChange={e => setUserInvocable(e.target.checked)}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-text">
                    {userInvocable
                      ? <><code>/{skill.name}</code> — available as a slash command</>
                      : 'Only invocable via trigger phrases'}
                  </span>
                </label>
              </div>

              <div className="form-row">
                <label className="form-label">DESCRIPTION</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what this skill does and when to invoke it..."
                />
              </div>

              <div className="form-row">
                <label className="form-label">ALLOWED TOOLS</label>
                <div className="tools-grid">
                  {ALL_TOOLS.map(t => (
                    <button key={t} className={`tool-toggle ${tools.includes(t) ? 'active' : ''}`} onClick={() => toggleTool(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="inline-add" style={{ marginTop: 8 }}>
                  <input
                    className="form-input"
                    placeholder="CUSTOM TOOL..."
                    value={customTool}
                    onChange={e => setCustomTool(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomTool()}
                  />
                  <button className="icon-btn" onClick={addCustomTool}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">TRIGGER PHRASES</label>
                <div className="trigger-list">
                  {triggers.map((t, i) => (
                    <div key={i} className="trigger-item">
                      <span style={{ fontSize: 12 }}>{t}</span>
                      <button className="icon-btn icon-btn-sm" onClick={() => setTriggers(p => p.filter((_, j) => j !== i))}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="inline-add">
                  <input
                    className="form-input"
                    placeholder="ADD TRIGGER PHRASE..."
                    value={newTrigger}
                    onChange={e => setNewTrigger(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTrigger()}
                  />
                  <button className="icon-btn" onClick={addTrigger}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'body' && bodyMode === 'edit' && (
            <div className="form-row" style={{ flex: 1 }}>
              <textarea
                className="form-textarea code-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={24}
                spellCheck={false}
                placeholder="Write the skill instructions here in Markdown..."
              />
            </div>
          )}

          {tab === 'body' && bodyMode === 'preview' && (
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'WRITING...' : 'COMMIT CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}
