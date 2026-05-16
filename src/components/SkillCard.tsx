import type { Skill } from '../types'
import { toolMeta } from '../constants'
import { Tooltip } from './Tooltip'

interface ConflictDetail {
  trigger: string
  sharedWith: string[]
}

interface Props {
  skill: Skill
  index: number
  onEdit: (skill: Skill) => void
  onDelete: (name: string) => void
  conflictDetails?: ConflictDetail[]
  allSkills: Skill[]
}

interface HealthInfo {
  color: string
  label: string
  missing: string[]
}

function skillHealth(skill: Skill): HealthInfo {
  const missing: string[] = []
  if (!skill.description || !skill.description.trim()) missing.push('description')
  if ((skill['allowed-tools'] || []).length === 0) missing.push('allowed tools')
  if ((skill.triggers || []).length === 0) missing.push('trigger phrases')
  if (!skill.body || skill.body.trim().length < 20) missing.push('skill body content')

  if (missing.length === 0) return { color: '#22c55e', label: 'Complete', missing: [] }
  if (missing.length <= 2) return { color: '#f59e0b', label: 'Incomplete', missing }
  return { color: '#ef4444', label: 'Minimal', missing }
}

function HealthTooltip({ health }: { health: HealthInfo }) {
  return (
    <div className="tooltip-content">
      <div className="tooltip-row">
        <span className="tooltip-dot" style={{ background: health.color }} />
        <strong>{health.label}</strong>
      </div>
      {health.missing.length === 0
        ? <p className="tooltip-line tooltip-ok">All fields present</p>
        : <>
            <p className="tooltip-line tooltip-warn">Missing:</p>
            <ul className="tooltip-list">
              {health.missing.map(m => <li key={m}>{m}</li>)}
            </ul>
          </>
      }
    </div>
  )
}

function ConflictTooltip({ details, onJump }: { details: ConflictDetail[]; onJump: (name: string) => void }) {
  return (
    <div className="tooltip-content">
      <div className="tooltip-row">
        <span style={{ color: '#f59e0b', fontSize: 13 }}>⚠</span>
        <strong>Trigger Conflict</strong>
      </div>
      <p className="tooltip-line tooltip-warn">These phrases are shared with other skills:</p>
      <ul className="tooltip-list">
        {details.map(c => (
          <li key={c.trigger}>
            <span className="tooltip-trigger">"{c.trigger}"</span>
            <span className="tooltip-shared"> → also in </span>
            {c.sharedWith.map((name, i) => (
              <span key={name}>
                {i > 0 && <span className="tooltip-shared">, </span>}
                <button
                  className="tooltip-jump-btn"
                  onClick={e => { e.stopPropagation(); onJump(name) }}
                >
                  {name}
                </button>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function descriptionText(skill: Skill): string {
  const raw = (skill.description || '').replace(/\n/g, ' ').trim()
  return raw.length > 130 ? raw.slice(0, 130) + '…' : raw
}

export function SkillCard({ skill, index, onEdit, onDelete, conflictDetails: conflictDetailsProp, allSkills }: Props) {
  const tools = Array.isArray(skill['allowed-tools']) ? skill['allowed-tools'] : []
  const triggers = Array.isArray(skill.triggers) ? skill.triggers : []
  const isInvocable = !!skill['user-invocable']
  const health = skillHealth(skill)

  const conflictDetails = conflictDetailsProp && conflictDetailsProp.length > 0 ? conflictDetailsProp : undefined

  const handleJump = (name: string) => {
    const target = allSkills.find(s => s.name === name)
    if (target) onEdit(target)
  }

  return (
    <div className="skill-card" onClick={() => onEdit(skill)} style={{ cursor: 'pointer' }}>
      <span className="skill-card-index">{String(index).padStart(3, '0')}</span>

      {/* Header */}
      <div className="skill-card-header">
        <div className="skill-card-title-row">
          <Tooltip content={<HealthTooltip health={health} />}>
            <span className="health-dot" style={{ background: health.color }} />
          </Tooltip>
          <span className="skill-name">{skill.name}</span>
          {skill.version && <span className="skill-version">{skill.version}</span>}
          {isInvocable && <span className="badge-invocable">/{skill.name}</span>}
          {conflictDetails && (
            <Tooltip interactive content={<ConflictTooltip details={conflictDetails} onJump={handleJump} />}>
              <span className="badge-conflict">⚠ CONFLICT</span>
            </Tooltip>
          )}
        </div>
        <div className="skill-card-actions">
          <button className="icon-btn" onClick={e => { e.stopPropagation(); onEdit(skill) }} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="icon-btn icon-btn-danger" onClick={e => { e.stopPropagation(); onDelete(skill.name) }} title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="skill-description">
        {descriptionText(skill) || <em className="muted">No description</em>}
      </p>

      {/* Tools */}
      {tools.length > 0 && (
        <div className="chip-row">
          {tools.map(t => {
            const m = toolMeta(t)
            return (
              <span
                key={t}
                className="chip"
                style={{
                  background: m.bg,
                  color: m.text,
                  borderColor: m.border,
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {t}
              </span>
            )
          })}
        </div>
      )}

      {/* Triggers */}
      {triggers.length > 0 && (
        <div className="chip-row">
          {triggers.slice(0, 4).map((t, i) => (
            <span key={i} className="chip chip-trigger" style={{ fontSize: '11px' }}>{t}</span>
          ))}
          {triggers.length > 4 && (
            <span className="chip chip-more">+{triggers.length - 4}</span>
          )}
        </div>
      )}

      {/* Extra files */}
      {skill.files.length > 0 && (
        <div className="skill-files">
          {skill.files.slice(0, 3).map(f => (
            <span key={f} className="file-badge">{f}</span>
          ))}
          {skill.files.length > 3 && <span className="file-badge">+{skill.files.length - 3}</span>}
        </div>
      )}
    </div>
  )
}
