"use client"

import { useCallback, useEffect, useState } from "react"
import { authService } from "@/lib/auth"
import { API_URL } from "@/lib/config"

export function adminHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${authService.getToken()}` }
}

/** Loads one admin endpoint and exposes loading, error and reload for the tab using it. */
export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API_URL}${path}`, { headers: adminHeaders() })
      if (!res.ok) throw new Error(String(res.status))
      setData(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, setData, loading, error, reload }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown"
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`)
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}
