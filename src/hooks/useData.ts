import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import type { Skill, McpServersMap, Plugin } from '../types'

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get<Skill[]>('/api/skills')
      setSkills(data)
      setError(null)
    } catch (e) {
      setError('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  const updateSkill = async (name: string, payload: Partial<Skill>) => {
    await axios.put(`/api/skills/${name}`, payload)
    await fetchSkills()
  }

  const createSkill = async (payload: Partial<Skill> & { name: string }) => {
    const { data } = await axios.post<Skill>('/api/skills', payload)
    await fetchSkills()
    return data
  }

  const deleteSkill = async (name: string) => {
    await axios.delete(`/api/skills/${name}`)
    await fetchSkills()
  }

  const renameSkill = async (name: string, newName: string) => {
    await axios.post(`/api/skills/${name}/rename`, { newName })
    await fetchSkills()
  }

  return { skills, loading, error, refetch: fetchSkills, updateSkill, createSkill, deleteSkill, renameSkill }
}

export type McpHealthMap = Record<string, 'reachable' | 'unreachable' | 'unknown'>

export function useMcpServers() {
  const [servers, setServers] = useState<McpServersMap>({})
  const [health, setHealth] = useState<McpHealthMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: serversData }, healthRes] = await Promise.all([
        axios.get<McpServersMap>('/api/mcp-servers'),
        axios.get<McpHealthMap>('/api/mcp-servers/health').catch(() => ({ data: {} as McpHealthMap })),
      ])
      setServers(serversData)
      setHealth(healthRes.data)
      setError(null)
    } catch (e) {
      setError('Failed to load MCP servers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchServers() }, [fetchServers])

  const addServer = async (name: string, config: McpServersMap[string]) => {
    await axios.post('/api/mcp-servers', { name, ...config })
    await fetchServers()
  }

  const removeServer = async (name: string) => {
    await axios.delete(`/api/mcp-servers/${name}`)
    await fetchServers()
  }

  return { servers, health, loading, error, refetch: fetchServers, addServer, removeServer }
}

export function usePlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get<Plugin[]>('/api/plugins')
      setPlugins(data)
      setError(null)
    } catch (e) {
      setError('Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlugins() }, [fetchPlugins])

  const removePlugin = async (id: string) => {
    await axios.delete(`/api/plugins/${encodeURIComponent(id)}`)
    await fetchPlugins()
  }

  return { plugins, loading, error, removePlugin, refetch: fetchPlugins }
}
