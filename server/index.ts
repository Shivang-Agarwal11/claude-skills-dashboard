import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import os from 'os'

const app = express()
app.use(cors())
app.use(express.json())

const SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills')
const AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents')
const COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands')
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const IS_PROD = process.env.NODE_ENV === 'production'
const DIST_DIR = path.join(__dirname, '..', 'dist')

// ─── Skill Parsing ───────────────────────────────────────────────────────────

function parseSkillMd(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  try {
    return (yaml.load(match[1]) as Record<string, unknown>) || {}
  } catch {
    return {}
  }
}

function buildSkillMd(frontmatter: Record<string, unknown>, body: string): string {
  const fm = yaml.dump(frontmatter, { lineWidth: 120 })
  return `---\n${fm}---\n${body}`
}

function normalizeTools(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

const SAFE_NAME_RE = /^[a-z0-9-]+$/

function readSkill(dirName: string) {
  const skillPath = path.join(SKILLS_DIR, dirName, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return null
  try {
    const content = fs.readFileSync(skillPath, 'utf-8')
    const fm = parseSkillMd(content)
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/)
    const body = bodyMatch ? bodyMatch[1] : ''
    const files = fs.readdirSync(path.join(SKILLS_DIR, dirName)).filter(f => f !== 'SKILL.md')
    // Always use directory name as canonical name to avoid frontmatter name collisions
    return {
      ...fm,
      name: dirName,
      'allowed-tools': normalizeTools(fm['allowed-tools']),
      triggers: Array.isArray(fm.triggers) ? fm.triggers : [],
      body,
      files,
    }
  } catch {
    return null
  }
}

// ─── Skills Routes ────────────────────────────────────────────────────────────

app.get('/api/skills', (_req, res) => {
  try {
    const entries = fs.readdirSync(SKILLS_DIR)
    const skills = entries
      .filter(e => fs.statSync(path.join(SKILLS_DIR, e)).isDirectory())
      .map(name => readSkill(name))
      .filter(Boolean)
    res.json(skills)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/skills/:name', (req, res) => {
  if (!SAFE_NAME_RE.test(req.params.name)) return res.status(400).json({ error: 'Invalid skill name' })
  const skill = readSkill(req.params.name)
  if (!skill) return res.status(404).json({ error: 'Not found' })
  res.json(skill)
})

app.put('/api/skills/:name', (req, res) => {
  const { name } = req.params
  if (!SAFE_NAME_RE.test(name)) return res.status(400).json({ error: 'Invalid skill name' })
  const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return res.status(404).json({ error: 'Not found' })

  try {
    const { body, ...frontmatter } = req.body
    delete frontmatter.files
    const newContent = buildSkillMd(frontmatter, body || '')
    fs.writeFileSync(skillPath, newContent, 'utf-8')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.post('/api/skills', (req, res) => {
  const { name, description, 'allowed-tools': allowedTools, triggers, version, body } = req.body
  if (!name || !SAFE_NAME_RE.test(name)) {
    return res.status(400).json({ error: 'Invalid skill name (lowercase letters, numbers, hyphens only)' })
  }
  const skillDir = path.join(SKILLS_DIR, name)
  if (fs.existsSync(skillDir)) {
    return res.status(409).json({ error: 'Skill already exists' })
  }
  try {
    fs.mkdirSync(skillDir, { recursive: true })
    const fm: Record<string, unknown> = {
      name,
      version: version || '1.0.0',
      description: description || '',
    }
    if (allowedTools?.length) fm['allowed-tools'] = allowedTools
    if (triggers?.length) fm.triggers = triggers
    const defaultBody = body || `\n# ${name}\n\n## Overview\n\n${description || ''}\n`
    const content = buildSkillMd(fm, defaultBody)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
    res.status(201).json(readSkill(name))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.post('/api/skills/:name/rename', (req, res) => {
  const { name } = req.params
  const { newName } = req.body
  if (!SAFE_NAME_RE.test(name)) return res.status(400).json({ error: 'Invalid skill name' })
  if (!newName || !SAFE_NAME_RE.test(newName)) return res.status(400).json({ error: 'Invalid new name' })
  if (name === newName) return res.json({ ok: true })
  const oldDir = path.join(SKILLS_DIR, name)
  const newDir = path.join(SKILLS_DIR, newName)
  if (!fs.existsSync(oldDir)) return res.status(404).json({ error: 'Not found' })
  if (fs.existsSync(newDir)) return res.status(409).json({ error: 'A skill with that name already exists' })
  try {
    fs.renameSync(oldDir, newDir)
    // Update the name field inside SKILL.md frontmatter
    const skillPath = path.join(newDir, 'SKILL.md')
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf-8')
      const updated = content.replace(/^(---\n[\s\S]*?)name:[ \t]*\S+/m, `$1name: ${newName}`)
      fs.writeFileSync(skillPath, updated, 'utf-8')
    }
    res.json({ ok: true, name: newName })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.delete('/api/skills/:name', (req, res) => {
  const { name } = req.params
  if (!SAFE_NAME_RE.test(name)) return res.status(400).json({ error: 'Invalid skill name' })
  const skillDir = path.join(SKILLS_DIR, name)
  if (!fs.existsSync(skillDir)) return res.status(404).json({ error: 'Not found' })
  try {
    fs.rmSync(skillDir, { recursive: true, force: true })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Agents & Commands Routes ─────────────────────────────────────────────────

function readAgentMd(filePath: string, fileName: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const fm = parseSkillMd(content)
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/)
    const body = bodyMatch ? bodyMatch[1] : content
    return {
      name: fileName.replace(/\.md$/, ''),
      description: (fm.description as string || '').replace(/\n/g, ' ').trim(),
      tools: normalizeTools(fm.tools),
      body,
    }
  } catch {
    return null
  }
}

app.get('/api/agents', (_req, res) => {
  try {
    if (!fs.existsSync(AGENTS_DIR)) return res.json([])
    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'))
    const agents = files.map(f => readAgentMd(path.join(AGENTS_DIR, f), f)).filter(Boolean)
    res.json(agents)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/commands', (_req, res) => {
  try {
    if (!fs.existsSync(COMMANDS_DIR)) return res.json([])
    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'))
    const commands = files.map(f => readAgentMd(path.join(COMMANDS_DIR, f), f)).filter(Boolean)
    res.json(commands)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── MCP Servers Routes ───────────────────────────────────────────────────────

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function writeSettings(data: Record<string, unknown>) {
  // backup first
  const backup = SETTINGS_PATH + '.dashboard-backup'
  if (fs.existsSync(SETTINGS_PATH)) {
    fs.copyFileSync(SETTINGS_PATH, backup)
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/mcp-servers', (_req, res) => {
  try {
    const settings = readSettings()
    const servers = settings.mcpServers || {}
    // Sanitize: don't send auth tokens to frontend
    const sanitized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(servers as Record<string, unknown>)) {
      const server = v as Record<string, unknown>
      const env = server.env as Record<string, string> | undefined
      const sanitizedEnv: Record<string, string> = {}
      if (env) {
        for (const [ek, ev] of Object.entries(env)) {
          const isSecret = /token|key|secret|password|auth/i.test(ek)
          sanitizedEnv[ek] = isSecret ? '••••••••' : ev
        }
      }
      sanitized[k] = { ...server, ...(env ? { env: sanitizedEnv } : {}) }
    }
    res.json(sanitized)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.post('/api/mcp-servers', (req, res) => {
  try {
    const settings = readSettings()
    const { name, ...serverConfig } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    if (!settings.mcpServers) settings.mcpServers = {}
    ;(settings.mcpServers as Record<string, unknown>)[name] = serverConfig
    writeSettings(settings)
    res.status(201).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.delete('/api/mcp-servers/:name', (req, res) => {
  try {
    const settings = readSettings()
    const servers = settings.mcpServers as Record<string, unknown> | undefined
    if (!servers || !servers[req.params.name]) {
      return res.status(404).json({ error: 'Not found' })
    }
    delete servers[req.params.name]
    writeSettings(settings)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/mcp-servers/health', (_req, res) => {
  try {
    const settings = readSettings()
    const servers = (settings.mcpServers || {}) as Record<string, { type?: string; url?: string; command?: string }>
    const health: Record<string, 'reachable' | 'unreachable' | 'unknown'> = {}
    for (const [name, cfg] of Object.entries(servers)) {
      if (cfg.type === 'sse' && cfg.url) {
        // SSE servers: report unknown (would need async fetch, keep sync for now)
        health[name] = 'unknown'
      } else if (cfg.command) {
        // stdio: check if command exists on PATH
        const { execSync } = require('child_process') as typeof import('child_process')
        try {
          execSync(`which ${cfg.command} 2>/dev/null || where ${cfg.command} 2>nul`, { timeout: 1000 })
          health[name] = 'reachable'
        } catch {
          health[name] = 'unreachable'
        }
      } else {
        health[name] = 'unknown'
      }
    }
    res.json(health)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Plugins Routes ───────────────────────────────────────────────────────────

const PLUGINS_JSON = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')

interface RawPluginEntry {
  scope: 'user' | 'project'
  projectPath?: string
  installPath: string
  version: string
  installedAt: string
  lastUpdated?: string
  gitCommitSha?: string
}

function readPluginsJson(): { version: number; plugins: Record<string, RawPluginEntry[]> } {
  if (!fs.existsSync(PLUGINS_JSON)) return { version: 2, plugins: {} }
  try {
    return JSON.parse(fs.readFileSync(PLUGINS_JSON, 'utf-8'))
  } catch {
    return { version: 2, plugins: {} }
  }
}

function writePluginsJson(data: { version: number; plugins: Record<string, RawPluginEntry[]> }) {
  const backup = PLUGINS_JSON + '.dashboard-backup'
  if (fs.existsSync(PLUGINS_JSON)) {
    fs.copyFileSync(PLUGINS_JSON, backup)
  }
  fs.writeFileSync(PLUGINS_JSON, JSON.stringify(data, null, 2), 'utf-8')
}

function getSkillNames(installPath: string): string[] {
  const skillsDir = path.join(installPath, 'skills')
  if (!fs.existsSync(skillsDir)) return []
  try {
    return fs.readdirSync(skillsDir).filter(name => {
      try { return fs.statSync(path.join(skillsDir, name)).isDirectory() } catch { return false }
    })
  } catch {
    return []
  }
}

function getPluginDescription(installPath: string): string {
  // 1. Try package.json description
  const pkgPath = path.join(installPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (pkg.description && typeof pkg.description === 'string') return pkg.description
    } catch { /* fall through */ }
  }
  // 2. Try first non-heading, non-empty line of README
  const readmePath = path.join(installPath, 'README.md')
  if (fs.existsSync(readmePath)) {
    try {
      const lines = fs.readFileSync(readmePath, 'utf-8').split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('<')) {
          return trimmed.replace(/^[>*_]+\s*/, '').slice(0, 160)
        }
      }
    } catch { /* fall through */ }
  }
  return ''
}

app.get('/api/plugins', (_req, res) => {
  try {
    const data = readPluginsJson()
    const result: unknown[] = []
    for (const [id, entries] of Object.entries(data.plugins)) {
      const atIdx = id.lastIndexOf('@')
      const name = atIdx > 0 ? id.slice(0, atIdx) : id
      const namespace = atIdx > 0 ? id.slice(atIdx + 1) : ''
      for (const entry of entries) {
        const installPath = entry.installPath || ''
        // derive version from the last path segment (version directory) or fall back to field
        const versionFromPath = installPath ? path.basename(installPath) : ''
        const version = /^\d/.test(versionFromPath) ? versionFromPath : (entry.version || '')
        result.push({
          id,
          name,
          namespace,
          version,
          scope: entry.scope,
          ...(entry.projectPath ? { projectPath: entry.projectPath } : {}),
          installPath,
          installedAt: entry.installedAt,
          ...(entry.lastUpdated ? { lastUpdated: entry.lastUpdated } : {}),
          ...(entry.gitCommitSha ? { gitCommitSha: entry.gitCommitSha } : {}),
          description: getPluginDescription(installPath),
          skills: getSkillNames(installPath),
          hasReadme: fs.existsSync(path.join(installPath, 'README.md')),
        })
      }
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/plugins/:id/readme', (req, res) => {
  try {
    const id = req.params.id
    const data = readPluginsJson()
    const entries = data.plugins[id]
    if (!entries || entries.length === 0) return res.status(404).json({ error: 'Plugin not found' })
    // return readme from first entry that has one
    for (const entry of entries) {
      const readmePath = path.join(entry.installPath, 'README.md')
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf-8')
        return res.json({ content })
      }
    }
    return res.status(404).json({ error: 'README not found' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.delete('/api/plugins/:id', (req, res) => {
  try {
    const id = req.params.id
    const data = readPluginsJson()
    if (!data.plugins[id]) return res.status(404).json({ error: 'Plugin not found' })
    delete data.plugins[id]
    writePluginsJson(data)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── App Info ─────────────────────────────────────────────────────────────────

app.get('/api/info', (_req, res) => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
    res.json({ version: pkg.version || '0.0.0' })
  } catch {
    res.json({ version: '0.0.0' })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT) : IS_PROD ? 7432 : 3001

if (IS_PROD && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log(`Skills Dashboard running at ${url}`)
  if (IS_PROD) {
    try { require('child_process').exec(`open ${url}`) } catch { /* ignore */ }
  }
})
