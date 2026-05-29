# Skills Control Panel

> **The missing UI for Claude Code.** Browse, edit, create, and rename your skills, agents, commands, MCP servers, and plugins from a single dashboard — without ever touching a YAML file.
>
> **First of its kind.** Skill marketplaces let you find skills. This lets you manage everything you already have — locally, no account, no sync, no cloud.

![Demo](public/demo.gif)

---

<div align="center">

### ⭐ If this tool saves you time, please star it on GitHub ⭐
**It takes 2 seconds and helps other developers find it.**

</div>

---

## The problem it solves

You've built 20+ Claude Code skills, defined custom agents, wired up slash commands, and installed a handful of plugins. They live scattered across `~/.claude/skills/`, `~/.claude/agents/`, and `~/.claude/plugins/`. To find one, you `ls`. To edit one, you `vim`. To check if two skills are fighting over the same trigger phrase — you guess.

**This fixes that.**

---

## What you get

| | |
|---|---|
| ![Skills grid](public/screenshot.png) | ![Editor modal](public/screenshot-editor.png) |
| **58 skills at a glance.** Health dots, tool chips, trigger phrases, conflict badges — everything visible without opening a single file. | **Edit anything.** Description, tools, triggers, version, slash-command toggle, and the full SKILL.md body with live markdown preview. |

| | |
|---|---|
| ![MCP Servers](public/screenshot-mcp.png) | ![Plugins](public/screenshot-plugins.png) |
| **MCP server registry.** Green dot = command on PATH. Red = broken. Add/remove servers directly — secrets are always redacted. | **Plugin browser.** Every installed plugin with auto-detected descriptions, skill chips, version badges, and a full detail modal with README. |

| | |
|---|---|
| ![Agents tab](public/screenshot-agents.png) | ![Commands tab](public/screenshot-commands.png) |
| **Agent browser.** All custom agents in `~/.claude/agents/` with role descriptions, tool permissions, and a detail modal for each definition. | **Commands browser.** Every slash command registered in your Claude Code config — name, description, binding, and the prompt body in one place. |

| | |
|---|---|
| ![Plugin detail](public/screenshot-plugin-detail.png) | ![Dark mode](public/screenshot-dark.png) |
| **Plugin detail modal.** Install path, git commit, install/update timestamps, and the full README rendered in-place. | **Dark mode.** Press `D`. Everything switches instantly and persists across sessions — status strip stays dark either way. |

---

## Features

**Skills tab**
- Health dot per skill — green when description + tools + triggers + body are all present
- Sort by name, health ↑, health ↓, or **conflicts-first** (the most useful sort)
- Filter by tool, invocability, or free-text across name + description + triggers
- ⚠ conflict badge — hover to see which trigger phrases collide and **click to jump directly to the conflicting skill**

**Skill editor**
- Toggle grid for all standard tools + freeform custom tool input
- `/slash-command` invocability toggle with live preview
- Full SKILL.md body editor with **Edit / Preview** toggle
- **Inline rename** — renames the directory and patches the frontmatter atomically, no manual file moves

**Skill creator**
- 5 starter templates: Research · Code Review · Debug · Deploy · Blank
- Name validated on input — lowercase, numbers, hyphens only

**Agents tab**
- Reads all agent definitions from `~/.claude/agents/`
- Displays agent name, description, tool permissions, and subagent type
- Click any agent card to open a full detail modal with the complete agent configuration
- Shows which tools each agent has access to via permission chips

**Commands tab**
- Lists every slash command registered across user and project settings
- Shows command name, description, and the full prompt body
- Distinguishes between built-in commands and custom user-defined commands
- Filter and search across command names and descriptions

**MCP server panel**
- Reads and writes `~/.claude/settings.json` directly
- stdio health check: `which <command>` to confirm it's on PATH
- Secret env vars (`TOKEN`, `KEY`, `SECRET`, `PASSWORD`, `AUTH`) always masked in the UI
- `settings.json` backed up before every write

**Plugin browser**
- Reads `~/.claude/plugins/installed_plugins.json` — the Claude Code plugin registry
- Auto-detects descriptions from `package.json` or first non-heading README line
- Click any card to open a detail modal: install path, version, git commit SHA, timestamps, skill chips
- README rendered inline with markdown — no need to open the file
- Unregister plugins directly from the UI (backs up the registry first)
- Scope badges: USER vs PROJECT, with project path shown

**Quality of life**
- Live UTC clock · dynamic version from `package.json` · refresh button
- Status strip: skills count, agents count, commands count, MCP servers count, plugins count — all live
- Keyboard shortcuts: `N` new · `/` search · `D` dark · `Esc` close · `?` help

---

## Quickstart

### One command via Claude Code

```
/skills-dashboard
```

Claude builds and launches it. That's it.

**First time — install the skill:**
```bash
cp -r ~/Desktop/claude-skills-dashboard/skill ~/.claude/skills/skills-dashboard
```

### Manual

```bash
git clone https://github.com/Shivang-Agarwal11/claude-skills-dashboard
cd claude-skills-dashboard
npm install && npm run build && npm start
# → http://localhost:7432
```

### Dev mode (hot reload)

```bash
npm run dev
# Frontend:  http://localhost:5173
# API:       http://localhost:3001
```

---

## Requirements

- Node.js 18+
- `~/.claude/skills/` — created automatically by Claude Code
- `~/.claude/agents/` — for agent browsing (created when you define custom agents)
- `~/.claude/settings.json` — for MCP server management and commands
- `~/.claude/plugins/installed_plugins.json` — for plugin browsing (created by `claude install`)

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/skills` | List all skills |
| `GET` | `/api/skills/:name` | Get one skill |
| `POST` | `/api/skills` | Create skill |
| `PUT` | `/api/skills/:name` | Update skill |
| `DELETE` | `/api/skills/:name` | Delete skill |
| `POST` | `/api/skills/:name/rename` | Rename (atomic dir move + frontmatter patch) |
| `GET` | `/api/agents` | List all custom agents |
| `GET` | `/api/agents/:name` | Get one agent definition |
| `GET` | `/api/commands` | List all registered slash commands |
| `GET` | `/api/mcp-servers` | List servers (secrets redacted) |
| `POST` | `/api/mcp-servers` | Add server |
| `DELETE` | `/api/mcp-servers/:name` | Remove server |
| `GET` | `/api/mcp-servers/health` | Stdio health check |
| `GET` | `/api/plugins` | List plugins with auto-detected descriptions |
| `GET` | `/api/plugins/:id/readme` | Fetch plugin README content |
| `DELETE` | `/api/plugins/:id` | Unregister plugin (backs up registry) |
| `GET` | `/api/info` | App version |

---

## Security

- All skill name inputs validated against `/^[a-z0-9-]+$/` — no path traversal possible
- Secret env vars masked as `••••••••` in the UI, never sent to the frontend in plaintext
- `settings.json` backed up to `settings.json.dashboard-backup` before every mutation

---

## Like what you see?

<div align="center">

### ⭐ Star this repo — it's free and takes 2 seconds ⭐

Found a bug or have a feature idea? [Open an issue](https://github.com/Shivang-Agarwal11/claude-skills-dashboard/issues) — contributions welcome.

</div>

---