import type { ProctoringSession, DetectionEvent } from "@/app/api/sessions/route"

const API_BASE_URL = "/api"

export class ApiClient {
  // Session management
  static async createSession(
    candidateName: string,
    videoQuality: "720p" | "1080p" = "720p",
    detectionEnabled = true,
  ): Promise<ProctoringSession> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidateName,
        videoQuality,
        detectionEnabled,
      }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to create session")
    }

    return result.data
  }

  static async updateSession(sessionId: string, updates: Partial<ProctoringSession>): Promise<ProctoringSession> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        ...updates,
      }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to update session")
    }

    return result.data
  }

  static async getSession(sessionId: string): Promise<ProctoringSession | null> {
    const response = await fetch(`${API_BASE_URL}/sessions?sessionId=${sessionId}`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch session")
    }

    return result.data.length > 0 ? result.data[0] : null
  }

  static async getSessions(status?: string): Promise<ProctoringSession[]> {
    const url = status ? `${API_BASE_URL}/sessions?status=${status}` : `${API_BASE_URL}/sessions`
    const response = await fetch(url)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch sessions")
    }

    return result.data
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sessions?sessionId=${sessionId}`, {
      method: "DELETE",
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to delete session")
    }
  }

  // Event management
  static async logEvent(
    sessionId: string,
    type: DetectionEvent["type"],
    description: string,
    severity: "low" | "medium" | "high",
    confidence?: number,
    metadata?: Record<string, any>,
  ): Promise<DetectionEvent> {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        type,
        description,
        severity,
        confidence,
        metadata,
      }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to log event")
    }

    return result.data
  }

  static async getEvents(
    sessionId?: string,
    type?: string,
    severity?: string,
    limit = 50,
    offset = 0,
  ): Promise<{ events: DetectionEvent[]; total: number }> {
    const params = new URLSearchParams()
    if (sessionId) params.append("sessionId", sessionId)
    if (type) params.append("type", type)
    if (severity) params.append("severity", severity)
    params.append("limit", limit.toString())
    params.append("offset", offset.toString())

    const response = await fetch(`${API_BASE_URL}/events?${params.toString()}`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch events")
    }

    return {
      events: result.data,
      total: result.total,
    }
  }

  static async deleteEvents(sessionId?: string, eventId?: string): Promise<void> {
    const params = new URLSearchParams()
    if (sessionId) params.append("sessionId", sessionId)
    if (eventId) params.append("eventId", eventId)

    const response = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
      method: "DELETE",
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to delete events")
    }
  }

  // Report generation
  static async generateReport(sessionId: string, format: "json" | "csv" = "json"): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/reports?sessionId=${sessionId}&format=${format}`)

    if (format === "csv") {
      return response.text()
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "Failed to generate report")
    }

    return result.data
  }

  static async downloadReport(sessionId: string, candidateName: string): Promise<void> {
    const csv = await this.generateReport(sessionId, "csv")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `proctoring-report-${candidateName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
