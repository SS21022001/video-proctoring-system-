import { type NextRequest, NextResponse } from "next/server"
import type { ProctoringSession, DetectionEvent } from "../sessions/route"

// In-memory storage references (in production, use a proper database)
declare global {
  var sessions: ProctoringSession[]
  var events: DetectionEvent[]
}

interface ProctoringReport {
  session: ProctoringSession
  events: DetectionEvent[]
  statistics: {
    totalEvents: number
    eventsBySeverity: {
      high: number
      medium: number
      low: number
    }
    eventsByType: Record<string, number>
    focusLossCount: number
    suspiciousObjectCount: number
    multipleFaceCount: number
    averageConfidence: number
  }
  integrityAnalysis: {
    finalScore: number
    deductions: Array<{
      reason: string
      points: number
      count: number
    }>
    recommendations: string[]
  }
  timeline: Array<{
    timestamp: Date
    event: string
    severity: string
  }>
}

// GET /api/reports - Generate proctoring report
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const format = searchParams.get("format") || "json" // json, csv, pdf

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Session ID is required" }, { status: 400 })
  }

  try {
    // Get session data (in production, fetch from database)
    const sessions: ProctoringSession[] = globalThis.sessions || []
    const events: DetectionEvent[] = globalThis.events || []

    const session = sessions.find((s) => s.id === sessionId)
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 })
    }

    const sessionEvents = events.filter((e) => e.sessionId === sessionId)

    // Generate statistics
    const statistics = generateStatistics(sessionEvents)

    // Generate integrity analysis
    const integrityAnalysis = generateIntegrityAnalysis(sessionEvents, session)

    // Generate timeline
    const timeline = generateTimeline(sessionEvents)

    const report: ProctoringReport = {
      session,
      events: sessionEvents,
      statistics,
      integrityAnalysis,
      timeline,
    }

    if (format === "csv") {
      const csv = generateCSVReport(report)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="proctoring-report-${sessionId}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 })
  }
}

function generateStatistics(events: DetectionEvent[]) {
  const eventsBySeverity = {
    high: events.filter((e) => e.severity === "high").length,
    medium: events.filter((e) => e.severity === "medium").length,
    low: events.filter((e) => e.severity === "low").length,
  }

  const eventsByType = events.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const focusLossCount = events.filter((e) => e.type === "focus_lost").length
  const suspiciousObjectCount = events.filter(
    (e) => e.type === "phone_detected" || e.type === "notes_detected" || e.type === "suspicious_object",
  ).length
  const multipleFaceCount = events.filter((e) => e.type === "multiple_faces").length

  const confidenceValues = events.filter((e) => e.confidence).map((e) => e.confidence!)
  const averageConfidence =
    confidenceValues.length > 0 ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length : 0

  return {
    totalEvents: events.length,
    eventsBySeverity,
    eventsByType,
    focusLossCount,
    suspiciousObjectCount,
    multipleFaceCount,
    averageConfidence,
  }
}

function generateIntegrityAnalysis(events: DetectionEvent[], session: ProctoringSession) {
  const deductions = []
  let totalDeduction = 0

  // Calculate deductions by event type
  const highSeverityEvents = events.filter((e) => e.severity === "high")
  const mediumSeverityEvents = events.filter((e) => e.severity === "medium")
  const lowSeverityEvents = events.filter((e) => e.severity === "low")

  if (highSeverityEvents.length > 0) {
    const points = highSeverityEvents.length * 15
    deductions.push({
      reason: "High severity violations",
      points,
      count: highSeverityEvents.length,
    })
    totalDeduction += points
  }

  if (mediumSeverityEvents.length > 0) {
    const points = mediumSeverityEvents.length * 10
    deductions.push({
      reason: "Medium severity violations",
      points,
      count: mediumSeverityEvents.length,
    })
    totalDeduction += points
  }

  if (lowSeverityEvents.length > 0) {
    const points = lowSeverityEvents.length * 5
    deductions.push({
      reason: "Low severity violations",
      points,
      count: lowSeverityEvents.length,
    })
    totalDeduction += points
  }

  const finalScore = Math.max(0, 100 - totalDeduction)

  // Generate recommendations
  const recommendations = []
  if (events.filter((e) => e.type === "focus_lost").length > 3) {
    recommendations.push(
      "Candidate showed frequent loss of focus. Consider discussing attention management strategies.",
    )
  }
  if (events.filter((e) => e.type === "phone_detected").length > 0) {
    recommendations.push("Mobile device detected during session. Verify candidate understanding of device policies.")
  }
  if (events.filter((e) => e.type === "multiple_faces").length > 0) {
    recommendations.push("Multiple faces detected. Investigate potential unauthorized assistance.")
  }
  if (events.filter((e) => e.type === "notes_detected").length > 0) {
    recommendations.push("Notes or reference materials detected. Review materials policy with candidate.")
  }
  if (finalScore >= 90) {
    recommendations.push("Excellent session integrity. No major concerns identified.")
  } else if (finalScore >= 70) {
    recommendations.push("Good session integrity with minor violations. Consider follow-up discussion.")
  } else {
    recommendations.push(
      "Session integrity concerns identified. Recommend detailed review and potential re-examination.",
    )
  }

  return {
    finalScore,
    deductions,
    recommendations,
  }
}

function generateTimeline(events: DetectionEvent[]) {
  return events
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((event) => ({
      timestamp: event.timestamp,
      event: event.description,
      severity: event.severity,
    }))
}

function generateCSVReport(report: ProctoringReport): string {
  const lines = []

  // Header
  lines.push("Proctoring Session Report")
  lines.push("")

  // Session Info
  lines.push("Session Information")
  lines.push(`Candidate Name,${report.session.candidateName}`)
  lines.push(`Session ID,${report.session.id}`)
  lines.push(`Start Time,${report.session.startTime.toISOString()}`)
  lines.push(`End Time,${report.session.endTime?.toISOString() || "N/A"}`)
  lines.push(
    `Duration,${Math.floor(report.session.duration / 60)}:${(report.session.duration % 60).toString().padStart(2, "0")}`,
  )
  lines.push(`Status,${report.session.status}`)
  lines.push(`Video Quality,${report.session.videoQuality}`)
  lines.push(`Final Integrity Score,${report.integrityAnalysis.finalScore}%`)
  lines.push("")

  // Statistics
  lines.push("Detection Statistics")
  lines.push(`Total Events,${report.statistics.totalEvents}`)
  lines.push(`High Severity Events,${report.statistics.eventsBySeverity.high}`)
  lines.push(`Medium Severity Events,${report.statistics.eventsBySeverity.medium}`)
  lines.push(`Low Severity Events,${report.statistics.eventsBySeverity.low}`)
  lines.push(`Focus Loss Events,${report.statistics.focusLossCount}`)
  lines.push(`Suspicious Object Events,${report.statistics.suspiciousObjectCount}`)
  lines.push(`Multiple Face Events,${report.statistics.multipleFaceCount}`)
  lines.push("")

  // Events Timeline
  lines.push("Events Timeline")
  lines.push("Timestamp,Event Type,Description,Severity")
  report.events.forEach((event) => {
    lines.push(`${event.timestamp.toISOString()},${event.type},${event.description},${event.severity}`)
  })
  lines.push("")

  // Recommendations
  lines.push("Recommendations")
  report.integrityAnalysis.recommendations.forEach((rec) => {
    lines.push(`"${rec}"`)
  })

  return lines.join("\n")
}
