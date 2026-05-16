import { useState } from 'react'
import type { McpServersMap, McpServer } from '../types'
import type { McpHealthMap } from '../hooks/useData'

interface Props {
  servers: McpServersMap
  health: McpHealthMap
  loading: boolean
  onAdd: (name: string, config: McpServer) => Promise<void>
  onRemove: (name: string) => Promise<void>
}

const HEALTH_DOT: Record<string, { color: string; title: string }> = {
  reachable:   { color: '#22c55e', title: 'Command found on PATH' },
  unreachable: { color: '#ef4444', title: 'Command not found on PATH' },
  unknown:     { color: '#f59e0b', title: 'Status unknown (SSE server)' },
}

function ServerRow({ name, config, healthStatus, onRemove }: {
  name: string
  config: McpServer
  healthStatus?: 'reachable' | 'unreachable' | 'unknown'
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isSSE = config.type === 'sse'

  return (
    <div className="server-row">
      <div className="server-row-header" onClick={() => setExpanded(v => !v)}>
        <div className="server-row-left">
          <span style={{ color: 'var(--phosphor-dim)', opacity: 0.4, fontSize: 10 }}>
            {expanded ? '▼' : '▶'}
          </span>
          {healthStatus && (
            <span
              className="health-dot"
              style={{ background: HEALTH_DOT[healthStatus]?.color ?? '#aaa' }}
              title={HEALTH_DOT[healthStatus]?.title}
            />
          )}
          <svg className="server-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          <span className="server-name">{name}</span>
          <span className="server-type-badge">{isSSE ? 'SSE' : 'stdio'}</span>
          {isSSE && config.url && <span className="server-url">{config.url}</span>}
          {!isSSE && config.command && (
            <span className="server-url">{config.command} {(config.args || []).join(' ')}</span>
          )}
        </div>
        <button
          className="icon-btn icon-btn-danger"
          onClick={e => { e.stopPropagation(); onRemove() }}
          title="Remove"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="server-details">
          {config.command && (
            <div className="detail-row">
              <span className="detail-key">COMMAND</span>
              <code className="detail-val">{config.command}</code>
            </div>
          )}
          {config.args && config.args.length > 0 && (
            <div className="detail-row">
              <span className="detail-key">ARGS</span>
              <code className="detail-val">{config.args.join(' ')}</code>
            </div>
          )}
          {config.url && (
            <div className="detail-row">
              <span className="detail-key">URL</span>
              <code className="detail-val">{config.url}</code>
            </div>
          )}
          {config.env && Object.keys(config.env).length > 0 && (
            <div className="detail-row detail-row-block">
              <span className="detail-key">ENV VARS</span>
              <div className="env-table">
                {Object.entries(config.env).map(([k, v]) => (
                  <div key={k} className="env-row">
                    <code className="env-key">{k}</code>
                    <code className="env-val">{v}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function McpServers({ servers, health, loading, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'stdio' as 'stdio' | 'sse',
    command: '',
    args: '',
    url: '',
    envPairs: [{ key: '', value: '' }],
  })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('SERVER NAME IS REQUIRED'); return }
    const config: McpServer = {}
    if (form.type === 'sse') {
      config.type = 'sse'
      config.url = form.url.trim()
    } else {
      config.command = form.command.trim()
      if (form.args.trim()) config.args = form.args.trim().split(/\s+/)
    }
    const envEntries = form.envPairs.filter(p => p.key.trim())
    if (envEntries.length > 0) {
      config.env = Object.fromEntries(envEntries.map(p => [p.key.trim(), p.value]))
    }
    setAdding(true)
    setError(null)
    try {
      await onAdd(form.name.trim(), config)
      setShowForm(false)
      setForm({ name: '', type: 'stdio', command: '', args: '', url: '', envPairs: [{ key: '', value: '' }] })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'REGISTRATION FAILED')
    } finally {
      setAdding(false)
    }
  }

  const updateEnvPair = (i: number, field: 'key' | 'value', val: string) => {
    setForm(f => {
      const pairs = [...f.envPairs]
      pairs[i] = { ...pairs[i], [field]: val }
      return { ...f, envPairs: pairs }
    })
  }

  return (
    <div className="mcp-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          MCP SERVER REGISTRY
          <span className="count-badge">{Object.keys(servers).length}</span>
        </h2>
        <button className="hdr-btn hdr-btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ CANCEL' : '+ REGISTER SERVER'}
        </button>
      </div>

      {showForm && (
        <div className="add-server-form">
          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-sections">
            <div className="form-row">
              <label className="form-label">SERVER NAME <span className="required">*</span></label>
              <input className="form-input" placeholder="my-mcp-server" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="form-row">
              <label className="form-label">TRANSPORT TYPE</label>
              <div className="radio-group">
                <label>
                  <input type="radio" value="stdio" checked={form.type === 'stdio'} onChange={() => setForm(f => ({ ...f, type: 'stdio' }))} />
                  STDIO
                </label>
                <label>
                  <input type="radio" value="sse" checked={form.type === 'sse'} onChange={() => setForm(f => ({ ...f, type: 'sse' }))} />
                  SSE
                </label>
              </div>
            </div>

            {form.type === 'stdio' ? (
              <>
                <div className="form-row">
                  <label className="form-label">COMMAND</label>
                  <input className="form-input" placeholder="npx" value={form.command}
                    onChange={e => setForm(f => ({ ...f, command: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">ARGS</label>
                  <input className="form-input" placeholder="-y @modelcontextprotocol/server-name" value={form.args}
                    onChange={e => setForm(f => ({ ...f, args: e.target.value }))} />
                </div>
              </>
            ) : (
              <div className="form-row">
                <label className="form-label">URL</label>
                <input className="form-input" placeholder="https://my-server.example.com/sse" value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
            )}

            <div className="form-row">
              <label className="form-label">ENVIRONMENT VARIABLES</label>
              {form.envPairs.map((pair, i) => (
                <div key={i} className="env-input-row">
                  <input className="form-input" placeholder="KEY" value={pair.key}
                    onChange={e => updateEnvPair(i, 'key', e.target.value)} />
                  <input className="form-input" placeholder="VALUE" value={pair.value}
                    onChange={e => updateEnvPair(i, 'value', e.target.value)} />
                  <button className="icon-btn" onClick={() => setForm(f => ({ ...f, envPairs: f.envPairs.filter((_, j) => j !== i) }))}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ marginTop: 4 }}
                onClick={() => setForm(f => ({ ...f, envPairs: [...f.envPairs, { key: '', value: '' }] }))}>
                + ADD ENV VAR
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={adding}>
                {adding ? 'REGISTERING...' : 'REGISTER SERVER'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="server-list">
        {loading ? (
          <div className="loading-text">■ QUERYING SERVER REGISTRY...</div>
        ) : Object.keys(servers).length === 0 ? (
          <div className="empty-state">NO MCP SERVERS REGISTERED</div>
        ) : (
          Object.entries(servers).map(([name, config]) => (
            <ServerRow key={name} name={name} config={config} healthStatus={health[name]} onRemove={() => onRemove(name)} />
          ))
        )}
      </div>
    </div>
  )
}
