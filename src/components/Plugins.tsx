import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { marked } from 'marked'
import type { Plugin } from '../types'

marked.setOptions({ breaks: true })

interface Props {
  plugins: Plugin[]
  loading: boolean
  error: string | null
  removePlugin: (id: string) => Promise<void>
}

function ScopeBadge({ scope }: { scope: 'user' | 'project' }) {
  const isUser = scope === 'user'
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        padding: '2px 7px',
        border: '1px solid',
        borderColor: isUser ? 'rgba(0,135,90,0.35)' : 'rgba(245,197,24,0.5)',
        borderRadius: 3,
        color: isUser ? 'var(--green)' : '#9a7a00',
        background: isUser ? 'var(--green-bg)' : 'var(--yellow-bg)',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}
    >
      {scope}
    </span>
  )
}

function VersionBadge({ version }: { version: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        padding: '2px 7px',
        border: '1px solid rgba(245,197,24,0.5)',
        borderRadius: 3,
        color: '#9a7a00',
        background: 'var(--yellow-bg)',
        letterSpacing: 0.3,
      }}
    >
      {version}
    </span>
  )
}

function PluginDetailModal({ plugin, onClose, onRemove }: { plugin: Plugin; onClose: () => void; onRemove: (id: string) => Promise<void> }) {
  const [tab, setTab] = useState<'info' | 'readme'>('info')
  const [readmeRaw, setReadmeRaw] = useState<string | null>(null)
  const [readmeLoading, setReadmeLoading] = useState(false)
  const [readmeError, setReadmeError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (tab === 'readme' && readmeRaw === null && !readmeError) {
      setReadmeLoading(true)
      axios
        .get<{ content: string }>(`/api/plugins/${encodeURIComponent(plugin.id)}/readme`)
        .then(r => { setReadmeRaw(r.data.content); setReadmeLoading(false) })
        .catch(() => { setReadmeError('README not available'); setReadmeLoading(false) })
    }
  }, [tab, plugin.id, readmeRaw, readmeError])

  const renderedReadme = useMemo(() => {
    if (!readmeRaw) return ''
    try { return marked.parse(readmeRaw) as string } catch { return '<p><em>Failed to render</em></p>' }
  }, [readmeRaw])

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleting(true)
    try {
      await onRemove(plugin.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-area">
            <span className="modal-title-label">PLUGIN</span>
            <div className="rename-row">
              <code className="modal-skill-name">{plugin.name}</code>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>@{plugin.namespace}</span>
              <VersionBadge version={plugin.version} />
              <ScopeBadge scope={plugin.scope} />
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
            INFO
          </button>
          {plugin.hasReadme && (
            <button className={`modal-tab ${tab === 'readme' ? 'active' : ''}`} onClick={() => setTab('readme')}>
              README
            </button>
          )}
        </div>

        <div className="modal-body">
          {tab === 'info' && (
            <div className="form-sections">
              {plugin.description && (
                <div className="form-row">
                  <label className="form-label">DESCRIPTION</label>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, margin: 0 }}>{plugin.description}</p>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">INSTALL PATH</label>
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--ink-3)',
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                  }}
                >
                  {plugin.installPath}
                </code>
              </div>

              {plugin.scope === 'project' && plugin.projectPath && (
                <div className="form-row">
                  <label className="form-label">PROJECT PATH</label>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', wordBreak: 'break-all' }}>
                    {plugin.projectPath}
                  </code>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">INSTALLED</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{fmt(plugin.installedAt)}</span>
              </div>

              {plugin.lastUpdated && (
                <div className="form-row">
                  <label className="form-label">LAST UPDATED</label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{fmt(plugin.lastUpdated)}</span>
                </div>
              )}

              {plugin.gitCommitSha && (
                <div className="form-row">
                  <label className="form-label">GIT COMMIT</label>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                    {plugin.gitCommitSha.slice(0, 12)}
                  </code>
                </div>
              )}

              {plugin.skills.length > 0 && (
                <div className="form-row">
                  <label className="form-label">SKILLS ({plugin.skills.length})</label>
                  <div className="chip-row" style={{ marginTop: 4 }}>
                    {plugin.skills.map(s => (
                      <span
                        key={s}
                        className="chip"
                        style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          borderColor: 'rgba(0,135,90,0.35)',
                          color: 'var(--green)',
                          background: 'var(--green-bg)',
                        }}
                      >
                        /{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'readme' && (
            <div style={{ flex: 1 }}>
              {readmeLoading && (
                <p style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1 }}>LOADING...</p>
              )}
              {readmeError && (
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{readmeError}</p>
              )}
              {renderedReadme && (
                <div
                  className="markdown-preview"
                  dangerouslySetInnerHTML={{ __html: renderedReadme }}
                />
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className={`btn ${deleteConfirm ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'REMOVING...' : deleteConfirm ? 'CONFIRM REMOVE' : 'UNREGISTER'}
          </button>
          {deleteConfirm && (
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(false)}>CANCEL</button>
          )}
          <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: deleteConfirm ? 0 : 'auto' }}>CLOSE</button>
        </div>
      </div>
    </div>
  )
}

function PluginCard({
  plugin,
  onView,
  onRemove,
}: {
  plugin: Plugin
  onView: (p: Plugin) => void
  onRemove: (id: string) => Promise<void>
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    setDeleting(true)
    try {
      await onRemove(plugin.id)
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="skill-card plugin-card" onClick={() => onView(plugin)} style={{ cursor: 'pointer' }}>
      {/* Header */}
      <div className="skill-card-header">
        <div className="skill-card-title-row">
          <span className="skill-name" style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            {plugin.name}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', fontWeight: 300 }}>
            @{plugin.namespace}
          </span>
          <VersionBadge version={plugin.version} />
          <ScopeBadge scope={plugin.scope} />
        </div>

        <div className="skill-card-actions">
          <button
            className={`icon-btn ${deleteConfirm ? 'icon-btn-danger' : ''}`}
            title={deleteConfirm ? 'Click again to confirm' : 'Unregister plugin'}
            onClick={handleDelete}
            disabled={deleting}
            style={deleteConfirm ? { width: 'auto', padding: '0 8px', fontSize: 10, fontFamily: 'var(--font-mono)', gap: 4 } : {}}
          >
            {deleteConfirm ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                CONFIRM
              </>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Project path */}
      {plugin.scope === 'project' && plugin.projectPath && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
          title={plugin.projectPath}
        >
          {plugin.projectPath}
        </p>
      )}

      {/* Description */}
      {plugin.description && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 6 }}>
          {plugin.description.length > 120 ? plugin.description.slice(0, 120) + '…' : plugin.description}
        </p>
      )}

      {/* Skills chips */}
      {plugin.skills.length > 0 && (
        <div className="chip-row">
          {plugin.skills.slice(0, 4).map(s => (
            <span
              key={s}
              className="chip"
              style={{
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
                borderColor: 'rgba(0,135,90,0.35)',
                color: 'var(--green)',
                background: 'var(--green-bg)',
              }}
            >
              /{s}
            </span>
          ))}
          {plugin.skills.length > 4 && (
            <span className="chip chip-more">+{plugin.skills.length - 4}</span>
          )}
        </div>
      )}

      {/* Installed date */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', marginTop: 'auto', paddingTop: 4 }}>
        installed {new Date(plugin.installedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </p>
    </div>
  )
}

export function Plugins({ plugins, loading, error, removePlugin }: Props) {
  const [viewing, setViewing] = useState<Plugin | null>(null)

  return (
    <div className="skill-grid-container">
      <div className="results-count">
        {loading
          ? '■ LOADING PLUGINS...'
          : `■ ${plugins.length} PLUGIN${plugins.length !== 1 ? 'S' : ''} REGISTERED`}
      </div>

      {error && (
        <div className="error-strip" style={{ marginBottom: 16 }}>
          <span>■ PLUGINS: {error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skill-card skeleton" />
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div className="skill-grid">
          <div className="empty-state">NO PLUGINS INSTALLED</div>
        </div>
      ) : (
        <div className="skill-grid">
          {plugins.map(plugin => (
            <PluginCard
              key={`${plugin.id}:${plugin.scope}:${plugin.installPath}`}
              plugin={plugin}
              onView={setViewing}
              onRemove={removePlugin}
            />
          ))}
        </div>
      )}

      {viewing && (
        <PluginDetailModal
          plugin={viewing}
          onClose={() => setViewing(null)}
          onRemove={removePlugin}
        />
      )}
    </div>
  )
}
