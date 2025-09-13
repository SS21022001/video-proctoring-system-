import { createClient } from "@/lib/supabase/client"

export interface ProctoringSession {
  id: string
  candidate_name: string
  session_start: string
  session_end?: string
  duration_seconds: number
  status: "active" | "paused" | "completed" | "terminated"
  video_quality: "720p" | "1080p"
  integrity_score: number
  created_at: string
  updated_at: string
}

export interface DetectionEvent {
  id: string
  session_id: string
  event_type: string
  description: string
  severity: "low" | "medium" | "high"
  timestamp: string
  confidence?: number
  metadata?: Record<string, any>
}

export interface SessionStatistics {
  id: string
  session_id: string
  total_focus_loss_events: number
  total_multiple_face_events: number
  total_suspicious_object_events: number
  total_no_face_events: number
  average_confidence: number
  updated_at: string
}

class ProctoringService {
  private supabase = createClient()

  async createSession(candidateName: string, videoQuality: "720p" | "1080p" = "720p"): Promise<ProctoringSession> {
    const { data, error } = await this.supabase
      .from("proctoring_sessions")
      .insert({
        candidate_name: candidateName,
        video_quality: videoQuality,
        status: "active",
      })
      .select()
      .single()

    if (error) throw error

    // Create initial statistics record
    await this.supabase.from("session_statistics").insert({
      session_id: data.id,
    })

    return data
  }

  async updateSession(sessionId: string, updates: Partial<ProctoringSession>): Promise<ProctoringSession> {
    const { data, error } = await this.supabase
      .from("proctoring_sessions")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async endSession(sessionId: string, durationSeconds: number): Promise<ProctoringSession> {
    return this.updateSession(sessionId, {
      status: "completed",
      session_end: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
  }

  async logDetectionEvent(
    sessionId: string,
    eventType: string,
    description: string,
    severity: "low" | "medium" | "high",
    confidence?: number,
    metadata?: Record<string, any>,
  ): Promise<DetectionEvent> {
    const { data, error } = await this.supabase
      .from("detection_events")
      .insert({
        session_id: sessionId,
        event_type: eventType,
        description,
        severity,
        confidence,
        metadata,
      })
      .select()
      .single()

    if (error) throw error

    // Update session statistics
    await this.updateSessionStatistics(sessionId, eventType)

    // Update integrity score based on severity
    await this.updateIntegrityScore(sessionId, severity)

    return data
  }

  private async updateSessionStatistics(sessionId: string, eventType: string): Promise<void> {
    const { data: stats } = await this.supabase
      .from("session_statistics")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    if (!stats) return

    const updates: Partial<SessionStatistics> = {
      updated_at: new Date().toISOString(),
    }

    switch (eventType) {
      case "focus_lost":
        updates.total_focus_loss_events = stats.total_focus_loss_events + 1
        break
      case "multiple_faces":
        updates.total_multiple_face_events = stats.total_multiple_face_events + 1
        break
      case "suspicious_object":
        updates.total_suspicious_object_events = stats.total_suspicious_object_events + 1
        break
      case "no_face":
        updates.total_no_face_events = stats.total_no_face_events + 1
        break
    }

    await this.supabase.from("session_statistics").update(updates).eq("session_id", sessionId)
  }

  private async updateIntegrityScore(sessionId: string, severity: "low" | "medium" | "high"): Promise<void> {
    const { data: session } = await this.supabase
      .from("proctoring_sessions")
      .select("integrity_score")
      .eq("id", sessionId)
      .single()

    if (!session) return

    let scoreDeduction = 0
    switch (severity) {
      case "low":
        scoreDeduction = 1
        break
      case "medium":
        scoreDeduction = 3
        break
      case "high":
        scoreDeduction = 5
        break
    }

    const newScore = Math.max(0, session.integrity_score - scoreDeduction)

    await this.supabase.from("proctoring_sessions").update({ integrity_score: newScore }).eq("id", sessionId)
  }

  async getSession(sessionId: string): Promise<ProctoringSession | null> {
    const { data, error } = await this.supabase.from("proctoring_sessions").select("*").eq("id", sessionId).single()

    if (error) return null
    return data
  }

  async getSessionEvents(sessionId: string): Promise<DetectionEvent[]> {
    const { data, error } = await this.supabase
      .from("detection_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: false })

    if (error) return []
    return data
  }

  async getSessionStatistics(sessionId: string): Promise<SessionStatistics | null> {
    const { data, error } = await this.supabase
      .from("session_statistics")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    if (error) return null
    return data
  }

  async getAllSessions(): Promise<ProctoringSession[]> {
    const { data, error } = await this.supabase
      .from("proctoring_sessions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return []
    return data
  }
}

export const proctoringService = new ProctoringService()
