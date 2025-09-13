import { type NextRequest, NextResponse } from "next/server"
import type { DetectionEvent } from "../sessions/route"

// In-memory storage (in production, use a proper database)
let events: DetectionEvent[] = []

// GET /api/events - Get detection events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const type = searchParams.get("type")
  const severity = searchParams.get("severity")
  const limit = Number.parseInt(searchParams.get("limit") || "50")
  const offset = Number.parseInt(searchParams.get("offset") || "0")

  try {
    let filteredEvents = events

    if (sessionId) {
      filteredEvents = filteredEvents.filter((event) => event.sessionId === sessionId)
    }

    if (type) {
      filteredEvents = filteredEvents.filter((event) => event.type === type)
    }

    if (severity) {
      filteredEvents = filteredEvents.filter((event) => event.severity === severity)
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginatedEvents,
      total: filteredEvents.length,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 })
  }
}

// POST /api/events - Create new detection event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, type, description, severity, confidence, metadata } = body

    if (!sessionId || !type || !description || !severity) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const validTypes = [
      "focus_lost",
      "no_face",
      "multiple_faces",
      "phone_detected",
      "notes_detected",
      "suspicious_object",
      "eyes_closed",
    ]
    const validSeverities = ["low", "medium", "high"]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid event type" }, { status: 400 })
    }

    if (!validSeverities.includes(severity)) {
      return NextResponse.json({ success: false, error: "Invalid severity level" }, { status: 400 })
    }

    const newEvent: DetectionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      type,
      timestamp: new Date(),
      description,
      severity,
      confidence,
      metadata,
    }

    events.push(newEvent)

    return NextResponse.json(
      {
        success: true,
        data: newEvent,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create event" }, { status: 500 })
  }
}

// DELETE /api/events - Delete events
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const eventId = searchParams.get("eventId")

    if (eventId) {
      // Delete specific event
      const eventIndex = events.findIndex((event) => event.id === eventId)
      if (eventIndex === -1) {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
      }
      events.splice(eventIndex, 1)
    } else if (sessionId) {
      // Delete all events for a session
      events = events.filter((event) => event.sessionId !== sessionId)
    } else {
      return NextResponse.json({ success: false, error: "Event ID or Session ID is required" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Events deleted successfully",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete events" }, { status: 500 })
  }
}
