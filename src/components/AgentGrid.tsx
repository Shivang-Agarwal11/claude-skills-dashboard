import { useState, useMemo } from 'react'
import type { Agent } from '../types'

interface Props {
  items: Agent[]
  loading: boolean
  kind: 'agent' | 'command'
}

interface DetailModalProps {
  item: Agent
  kind: 'agent' | 'command'
  onClose: () => void
}

function DetailModal({ item, kind, onClose }: DetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720, width: '90vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {kind === 'agent' ? '⚙ AGENT' : '/ COMMAND'}: {item.name}
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {item.description && (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
              {item.description}
            </p>
          )}
          {item.tools.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>TOOLS</div>
              <div className="chip-row">
                {item.tools.map(t => (
                  <span key={t} className="chip" style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>DEFINITION</div>
            <pre style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 12,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              overflow: 'auto',
              maxHeight: 400,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--ink-2)',
            }}>{item.body.trim()}</pre>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  )
}

function AgentCard({ item, index, kind, onClick }: { item: Agent; index: number; kind: 'agent' | 'command'; onClick: () => void }) {
  const desc = (item.description || '').replace(/\n/g, ' ').trim()
  const truncated = desc.length > 130 ? desc.slice(0, 130) + '…' : desc

  return (
    <div className="skill-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <span className="skill-card-index">{String(index).padStart(3, '0')}</span>
      <div className="skill-card-header">
        <div className="skill-card-title-row">
          <span
            className="health-dot"
            style={{ background: '#818cf8' }}
            title={kind === 'agent' ? 'Agent' : 'Command'}
          />
          <span className="skill-name">{item.name}</span>
          <span
            className="badge-invocable"
            style={{ background: kind === 'agent' ? 'rgba(129,140,248,0.15)' : 'rgba(52,211,153,0.15)', color: kind === 'agent' ? '#818cf8' : '#34d399', borderColor: kind === 'agent' ? 'rgba(129,140,248,0.3)' : 'rgba(52,211,153,0.3)' }}
          >
            {kind === 'agent' ? 'agent' : '/cmd'}
          </span>
        </div>
        <div className="skill-card-actions">
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onClick() }} title="View">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>
      <p className="skill-description">
        {truncated || <em className="muted">No description</em>}
      </p>
      {item.tools.length > 0 && (
        <div className="chip-row">
          {item.tools.slice(0, 5).map(t => (
            <span key={t} className="chip" style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>{t}</span>
          ))}
          {item.tools.length > 5 && (
            <span className="chip chip-more">+{item.tools.length - 5}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function AgentGrid({ items, loading, kind }: Props) {
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState<Agent | null>(null)

  const filtered = useMemo(() => {
    if (!query) return [...items].sort((a, b) => a.name.localeCompare(b.name))
    const q = query.toLowerCase()
    return items
      .filter(item => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, query])

  const label = kind === 'agent' ? 'AGENTS' : 'COMMANDS'
  const placeholder = kind === 'agent' ? 'SEARCH AGENTS BY NAME OR DESCRIPTION...' : 'SEARCH COMMANDS BY NAME OR DESCRIPTION...'

  return (
    <div className="skill-grid-container">
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-prefix">&gt;_</span>
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-input"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="results-count">
        {loading
          ? `■ LOADING ${label}...`
          : `■ DISPLAYING ${filtered.length} / ${items.length} ${label}`}
      </div>
      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skill-card skeleton" />
          ))}
        </div>
      ) : (
        <div className="skill-grid">
          {filtered.map((item, i) => (
            <AgentCard
              key={item.name}
              item={item}
              index={i + 1}
              kind={kind}
              onClick={() => setViewing(item)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">NO RECORDS MATCH QUERY</div>
          )}
        </div>
      )}
      {viewing && <DetailModal item={viewing} kind={kind} onClose={() => setViewing(null)} />}
    </div>
  )
}
