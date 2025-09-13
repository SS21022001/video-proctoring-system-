"use client"

import { useState, useEffect, useCallback } from "react"
import { ApiClient } from "@/lib/api-client"
import type { ProctoringSession, DetectionEvent } from "@/app/api/sessions/route"

export function useProctoringSession() {
  const [currentSession, setCurrentSession] = useState<ProctoringSession | null>(null)
  const [sessionEvents, setSessionEvents] = useState<DetectionEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSession = useCallback(
    async (candidateName: string, videoQuality: "720p" | "1080p" = "720p", detectionEnabled = true) => {
      setIsLoading(true)
      setError(null)

      try {
        const session = await ApiClient.createSession(candidateName, videoQuality, detectionEnabled)
        setCurrentSession(session)
        setSessionEvents([])
        return session
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create session"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const updateSession = useCallback(
    async (updates: Partial<ProctoringSession>) => {
      if (!currentSession) {
        throw new Error("No active session")
      }

      setIsLoading(true)
      setError(null)

      try {
        const updatedSession = await ApiClient.updateSession(currentSession.id, updates)
        setCurrentSession(updatedSession)
        return updatedSession
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update session"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [currentSession],
  )

  const logDetectionEvent = useCallback(
    async (
      type: DetectionEvent["type"],
      description: string,
      severity: "low" | "medium" | "high",
      confidence?: number,
      metadata?: Record<string, any>,
    ) => {
      if (!currentSession) {
        throw new Error("No active session")
      }

      try {
        const event = await ApiClient.logEvent(currentSession.id, type, description, severity, confidence, metadata)

        setSessionEvents((prev) => [event, ...prev].slice(0, 50)) // Keep last 50 events

        // Update integrity score based on new event
        const deduction = severity === "high" ? 15 : severity === "medium" ? 10 : 5
        const newScore = Math.max(0, currentSession.integrityScore - deduction)

        await updateSession({ integrityScore: newScore })

        return event
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to log event"
        setError(errorMessage)
        throw err
      }
    },
    [currentSession, updateSession],
  )

  const loadSessionEvents = useCallback(
    async (sessionId?: string) => {
      const targetSessionId = sessionId || currentSession?.id
      if (!targetSessionId) return

      setIsLoading(true)
      setError(null)

      try {
        const { events } = await ApiClient.getEvents(targetSessionId)
        setSessionEvents(events)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load events"
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [currentSession],
  )

  const generateReport = useCallback(
    async (format: "json" | "csv" = "json") => {
      if (!currentSession) {
        throw new Error("No active session")
      }

      setIsLoading(true)
      setError(null)

      try {
        const report = await ApiClient.generateReport(currentSession.id, format)
        return report
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate report"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [currentSession],
  )

  const downloadReport = useCallback(async () => {
    if (!currentSession) {
      throw new Error("No active session")
    }

    try {
      await ApiClient.downloadReport(currentSession.id, currentSession.candidateName)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to download report"
      setError(errorMessage)
      throw err
    }
  }, [currentSession])

  const endSession = useCallback(async () => {
    if (!currentSession) return

    try {
      await updateSession({
        status: "completed",
        endTime: new Date(),
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to end session"
      setError(errorMessage)
      throw err
    }
  }, [currentSession, updateSession])

  // Auto-load events when session changes
  useEffect(() => {
    if (currentSession) {
      loadSessionEvents()
    }
  }, [currentSession, loadSessionEvents])

  return {
    currentSession,
    sessionEvents,
    isLoading,
    error,
    createSession,
    updateSession,
    logDetectionEvent,
    loadSessionEvents,
    generateReport,
    downloadReport,
    endSession,
    clearError: () => setError(null),
  }
}
