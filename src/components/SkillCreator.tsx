import { useState } from 'react'
import type { Skill } from '../types'
import { ALL_TOOLS } from '../constants'

interface Props {
  onCreate: (skill: Partial<Skill> & { name: string }) => Promise<void>
  onClose: () => void
}

interface Template {
  id: string
  label: string
  description: string
  tools: string[]
  triggers: string[]
  body: string
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from scratch',
    tools: [],
    triggers: [],
    body: '',
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Web research and synthesis',
    tools: ['WebSearch', 'Read', 'Write'],
    triggers: ['research', 'find information about', 'look up'],
    body: '## Workflow\n\n1. Search for the topic\n2. Read relevant pages\n3. Synthesize findings\n4. Write a summary\n',
  },
  {
    id: 'code-review',
    label: 'Code Review',
    description: 'Review diffs and suggest improvements',
    tools: ['Read', 'Bash', 'Grep'],
    triggers: ['review this', 'review my code', 'check this code'],
    body: '## What to check\n\n- Correctness and logic\n- Security vulnerabilities\n- Performance issues\n- Code style\n',
  },
  {
    id: 'debug',
    label: 'Debug',
    description: 'Investigate and fix errors',
    tools: ['Bash', 'Read', 'Grep', 'Edit'],
    triggers: ['debug', 'fix this error', 'why is this failing', 'investigate'],
    body: '## Debug Process\n\n1. Read the error message\n2. Find the relevant code\n3. Identify root cause\n4. Apply fix\n5. Verify fix works\n',
  },
  {
    id: 'deploy',
    label: 'Deploy',
    description: 'Build and deploy workflows',
    tools: ['Bash', 'Read'],
    triggers: ['deploy', 'ship this', 'build and deploy'],
    body: '## Deploy Checklist\n\n1. Run tests\n2. Build artifact\n3. Deploy to environment\n4. Verify deployment\n',
  },
]

export function SkillCreator({ onCreate, onClose }: Props) {
  const [step, setStep] = useState<'template' | 'form'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  const [newTrigger, setNewTrigger] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl)
    setDescription(tpl.description)
    setTools(tpl.tools)
    setTriggers(tpl.triggers)
    setStep('form')
  }

  const toggleTool = (t: string) =>
    setTools(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const addTrigger = () => {
    const v = newTrigger.trim()
    if (v && !triggers.includes(v)) { setTriggers(p => [...p, v]); setNewTrigger('') }
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('NAME IS REQUIRED'); return }
    if (!/^[a-z0-9-]+$/.test(name.trim())) {
      setError('INVALID NAME: USE LOWERCASE LETTERS, NUMBERS, HYPHENS ONLY')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onCreate({
        name: name.trim(),
        description,
        'allowed-tools': tools,
        triggers,
        body: selectedTemplate.body || undefined,
      })
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'INITIALIZATION FAILED')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'template' ? 'CHOOSE TEMPLATE' : 'INIT NEW SKILL'}
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {step === 'template' && (
          <div className="modal-body">
            <div className="template-grid">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  className="template-card"
                  onClick={() => applyTemplate(tpl)}
                >
                  <span className="template-label">{tpl.label}</span>
                  <span className="template-desc">{tpl.description}</span>
                  {tpl.tools.length > 0 && (
                    <span className="template-tools">{tpl.tools.join(', ')}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="modal-body">
            <div className="form-sections">
              {error && <div className="error-banner">{error}</div>}

              {selectedTemplate.id !== 'blank' && (
                <div className="template-badge-row">
                  <span className="template-active-badge">Template: {selectedTemplate.label}</span>
                  <button className="btn-link" onClick={() => setStep('template')}>Change</button>
                </div>
              )}

              <div className="form-row">
                <label className="form-label">SKILL IDENTIFIER <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value.toLowerCase())}
                  placeholder="my-skill-name"
                  spellCheck={false}
                  autoFocus
                />
                <span className="form-hint">
                  LOWERCASE + HYPHENS ONLY · INVOKED AS /{name || 'skill-name'}
                </span>
              </div>

              <div className="form-row">
                <label className="form-label">DESCRIPTION</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What does this skill do and when should it be invoked?"
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
                    placeholder='E.G. "DEBUG THIS", "FIX THIS BUG"'
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
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={step === 'form' ? () => setStep('template') : onClose}>
            {step === 'form' ? '← BACK' : 'CANCEL'}
          </button>
          {step === 'form' && (
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'INITIALIZING...' : '+ INIT SKILL'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
