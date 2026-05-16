export const ALL_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'Agent', 'WebSearch', 'AskUserQuestion', 'Task',
  'TodoRead', 'TodoWrite',
]

export const TOOL_META: Record<string, { bg: string; text: string; border: string }> = {
  Bash:            { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  Read:            { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Write:           { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Edit:            { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  Glob:            { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  Grep:            { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  Agent:           { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  WebSearch:       { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  AskUserQuestion: { bg: '#fff7ed', text: '#b45309', border: '#fde68a' },
  Task:            { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  TodoRead:        { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  TodoWrite:       { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
}

export function toolMeta(tool: string) {
  return TOOL_META[tool] ?? { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }
}
