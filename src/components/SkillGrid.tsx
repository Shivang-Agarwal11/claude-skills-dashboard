import { useState, useMemo, useEffect, useRef } from 'react'
import type { Skill } from '../types'
import { SkillCard } from './SkillCard'
import { ALL_TOOLS } from '../constants'

type SortKey = 'name' | 'health-asc' | 'health-desc' | 'conflicts'

function healthScore(skill: Skill): number {
  let score = 0
  if (skill.description?.trim()) score++
  if ((skill['allowed-tools'] || []).length > 0) score++
  if ((skill.triggers || []).length > 0) score++
  if (skill.body && skill.body.trim().length >= 20) score++
  return score
}

interface Props {
  skills: Skill[]
  loading: boolean
  onEdit: (skill: Skill) => void
  onDelete: (name: string) => void
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name',        label: 'NAME' },
  { key: 'health-desc', label: 'HEALTH ↓' },
  { key: 'health-asc',  label: 'HEALTH ↑' },
  { key: 'conflicts',   label: 'CONFLICTS' },
]

export function SkillGrid({ skills, loading, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [filterTool, setFilterTool] = useState<string | null>(null)
  const [filterInvocable, setFilterInvocable] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>(() =>
    (localStorage.getItem('skills-sort') as SortKey) || 'name'
  )
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => searchInputRef.current?.focus()
    window.addEventListener('focus-search', handler)
    return () => window.removeEventListener('focus-search', handler)
  }, [])

  useEffect(() => {
    localStorage.setItem('skills-sort', sortKey)
  }, [sortKey])

  const conflictMap = useMemo(() => {
    const triggerMap = new Map<string, string[]>()
    for (const s of skills) {
      for (const t of (s.triggers || [])) {
        const key = t.toLowerCase().trim()
        const existing = triggerMap.get(key) || []
        triggerMap.set(key, [...existing, s.name])
      }
    }
    const result = new Map<string, { trigger: string; sharedWith: string[] }[]>()
    for (const [trigger, names] of triggerMap.entries()) {
      if (names.length > 1) {
        for (const name of names) {
          const others = names.filter(n => n !== name)
          const existing = result.get(name) || []
          result.set(name, [...existing, { trigger, sharedWith: others }])
        }
      }
    }
    return result
  }, [skills])

  const filtered = useMemo(() => {
    const base = skills.filter(s => {
      if (query) {
        const q = query.toLowerCase()
        const inName = s.name.toLowerCase().includes(q)
        const inDesc = (s.description || '').toLowerCase().includes(q)
        const inTrigger = (s.triggers || []).some(t => t.toLowerCase().includes(q))
        if (!inName && !inDesc && !inTrigger) return false
      }
      if (filterTool && !(s['allowed-tools'] || []).includes(filterTool)) return false
      if (filterInvocable && !s['user-invocable']) return false
      return true
    })

    return [...base].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'health-asc') return healthScore(a) - healthScore(b)
      if (sortKey === 'health-desc') return healthScore(b) - healthScore(a)
      if (sortKey === 'conflicts') {
        const aHas = conflictMap.has(a.name) ? 1 : 0
        const bHas = conflictMap.has(b.name) ? 1 : 0
        if (bHas !== aHas) return bHas - aHas
        return a.name.localeCompare(b.name)
      }
      return 0
    })
  }, [skills, query, filterTool, filterInvocable, sortKey, conflictMap])

  return (
    <div className="skill-grid-container">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-prefix">&gt;_</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="SEARCH SKILLS BY NAME, DESCRIPTION, TRIGGER..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-input"
            spellCheck={false}
          />
        </div>
        <div className="toolbar-right">
          <div className="sort-group">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`sort-btn ${sortKey === opt.key ? 'active' : ''}`}
                onClick={() => setSortKey(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            FILTERS
          </button>
        </div>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="filter-row">
          <span className="filter-label">TOOL:</span>
          <button
            className={`filter-chip ${filterTool === null ? 'active' : ''}`}
            onClick={() => setFilterTool(null)}
          >ALL</button>
          {ALL_TOOLS.map(t => (
            <button
              key={t}
              className={`filter-chip ${filterTool === t ? 'active' : ''}`}
              onClick={() => setFilterTool(t === filterTool ? null : t)}
            >{t}</button>
          ))}
          <label className="filter-invocable">
            <input
              type="checkbox"
              checked={filterInvocable}
              onChange={e => setFilterInvocable(e.target.checked)}
            />
            INVOCABLE ONLY
          </label>
        </div>
      )}

      {/* Count */}
      <div className="results-count">
        {loading
          ? '■ LOADING REGISTRY...'
          : `■ DISPLAYING ${filtered.length} / ${skills.length} ENTRIES`
        }
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skill-card skeleton" />
          ))}
        </div>
      ) : (
        <div className="skill-grid">
          {filtered.map((skill, i) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              index={i + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              conflictDetails={conflictMap.get(skill.name)}
              allSkills={skills}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">NO RECORDS MATCH QUERY</div>
          )}
        </div>
      )}
    </div>
  )
}
