import { type NextRequest, NextResponse } from "next/server"

export interface ProctoringSession {
  id: string
  candidateName: string
  startTime: Date
  endTime?: Date
  duration: number
  status: "active" | "paused" | "completed"
  integrityScore: number
  videoQuality: "720p" | "1080p"
  detectionEnabled: boolean
}

export interface DetectionEvent {
  id: string
  sessionId: string
  type:
    | "focus_lost"
    | "no_face"
    | "multiple_faces"
    | "phone_detected"
    | "notes_detected"
    | "suspicious_object"
    | "eyes_closed"
  timestamp: Date
  description: string
  severity: "low" | "medium" | "high"
  confidence?: number
  metadata?: Record<string, any>
}

// In-memory storage (in production, use a proper database)
const sessions: ProctoringSession[] = []
let events: DetectionEvent[] = []

// GET /api/sessions - Get all sessions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const status = searchParams.get("status")

  try {
    let filteredSessions = sessions

    if (sessionId) {
      filteredSessions = sessions.filter((session) => session.id === sessionId)
    }

    if (status) {
      filteredSessions = filteredSessions.filter((session) => session.status === status)
    }

    return NextResponse.json({
      success: true,
      data: filteredSessions,
      total: filteredSessions.length,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch sessions" }, { status: 500 })
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidateName, videoQuality = "720p", detectionEnabled = true } = body

    if (!candidateName) {
      return NextResponse.json({ success: false, error: "Candidate name is required" }, { status: 400 })
    }

    const newSession: ProctoringSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      candidateName,
      startTime: new Date(),
      duration: 0,
      status: "active",
      integrityScore: 100,
      videoQuality,
      detectionEnabled,
    }

    sessions.push(newSession)

    return NextResponse.json(
      {
        success: true,
        data: newSession,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create session" }, { status: 500 })
  }
}

// PUT /api/sessions - Update session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, status, duration, integrityScore } = body

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    const sessionIndex = sessions.findIndex((session) => session.id === sessionId)
    if (sessionIndex === -1) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })
    }

    const session = sessions[sessionIndex]

    if (status) session.status = status
    if (duration !== undefined) session.duration = duration
    if (integrityScore !== undefined) session.integrityScore = integrityScore

    if (status === "completed" && !session.endTime) {
      session.endTime = new Date()
    }

    sessions[sessionIndex] = session

    return NextResponse.json({
      success: true,
      data: session,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update session" }, { status: 500 })
  }
}

// DELETE /api/sessions - Delete session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
    }

    const sessionIndex = sessions.findIndex((session) => session.id === sessionId)
    if (sessionIndex === -1) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })
    }

    // Also delete related events
    events = events.filter((event) => event.sessionId !== sessionId)
    sessions.splice(sessionIndex, 1)

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete session" }, { status: 500 })
  }
}
