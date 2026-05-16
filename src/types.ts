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

export interface McpServer {
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
}

export type McpServersMap = Record<string, McpServer>
