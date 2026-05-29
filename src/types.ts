export interface Skill {
  name: string
  version?: string
  description?: string
  'allowed-tools'?: string[]
  triggers?: string[]
  hooks?: unknown
  'preamble-tier'?: number
  'user-invocable'?: boolean
  body: string
  files: string[]
}

export interface Agent {
  name: string
  description: string
  tools: string[]
  body: string
}

export type Command = Agent

export interface McpServer {
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
}

export type McpServersMap = Record<string, McpServer>

export interface Plugin {
  id: string
  name: string
  namespace: string
  version: string
  scope: 'user' | 'project'
  projectPath?: string
  installPath: string
  installedAt: string
  lastUpdated?: string
  gitCommitSha?: string
  description: string
  skills: string[]
  hasReadme: boolean
}
