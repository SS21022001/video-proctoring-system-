"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { VideoInterface } from "@/components/video-interface"
import { ReportingDashboard } from "@/components/reporting-dashboard"
import { useProctoringSession } from "@/hooks/use-proctoring-session"
import {
  Eye,
  EyeOff,
  Users,
  Smartphone,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  FileText,
} from "lucide-react"

interface DetectionEvent {
  id: string
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
}

export function VideoProctoring() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [candidateName, setCandidateName] = useState("John Doe")
  const [sessionDuration, setSessionDuration] = useState(0)
  const [detectionEvents, setDetectionEvents] = useState<DetectionEvent[]>([])
  const [showReports, setShowReports] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<{
    focused: boolean
    faceDetected: boolean
    multipleFaces: boolean
    suspiciousItems: string[]
    aiDetectionActive: boolean
  }>({
    focused: true,
    faceDetected: true,
    multipleFaces: false,
    suspiciousItems: [],
    aiDetectionActive: false,
  })

  const {
    currentSession,
    sessionEvents,
    isLoading,
    error,
    createSession,
    updateSession,
    logDetectionEvent,
    generateReport,
    downloadReport,
    endSession,
    clearError,
  } = useProctoringSession()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setSessionDuration((prev) => {
          const newDuration = prev + 1
          // Update session duration in backend every 10 seconds
          if (newDuration % 10 === 0 && currentSession) {
            updateSession({ duration: newDuration })
          }
          return newDuration
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused, currentSession, updateSession])

  const handleRecordingStart = async () => {
    try {
      if (!currentSession) {
        await createSession(candidateName, "1080p", true)
      }
      setIsRecording(true)
      setIsPaused(false)
      setCurrentStatus((prev) => ({ ...prev, aiDetectionActive: true }))
    } catch (err) {
      console.error("Failed to start session:", err)
    }
  }

  const handleRecordingStop = async () => {
    try {
      if (currentSession) {
        await endSession()
      }
      setIsRecording(false)
      setIsPaused(false)
      setCurrentStatus((prev) => ({ ...prev, aiDetectionActive: false }))
    } catch (err) {
      console.error("Failed to end session:", err)
    }
  }

  const handleRecordingPause = async () => {
    try {
      const newPausedState = !isPaused
      setIsPaused(newPausedState)

      if (currentSession) {
        await updateSession({
          status: newPausedState ? "paused" : "active",
        })
      }
    } catch (err) {
      console.error("Failed to update session:", err)
    }
  }

  const handleDetectionEvent = async (type: string, description: string, severity: "low" | "medium" | "high") => {
    const newEvent: DetectionEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: type as DetectionEvent["type"],
      timestamp: new Date(),
      description,
      severity,
    }
    setDetectionEvents((prev) => [newEvent, ...prev].slice(0, 20)) // Keep last 20 events

    // Log to backend
    try {
      if (currentSession) {
        await logDetectionEvent(type as any, description, severity)
      }
    } catch (err) {
      console.error("Failed to log detection event:", err)
    }

    // Update current status based on event
    switch (type) {
      case "focus_lost":
        setCurrentStatus((prev) => ({ ...prev, focused: false }))
        setTimeout(() => setCurrentStatus((prev) => ({ ...prev, focused: true })), 5000)
        break
      case "no_face":
        setCurrentStatus((prev) => ({ ...prev, faceDetected: false }))
        setTimeout(() => setCurrentStatus((prev) => ({ ...prev, faceDetected: true })), 3000)
        break
      case "multiple_faces":
        setCurrentStatus((prev) => ({ ...prev, multipleFaces: true }))
        setTimeout(() => setCurrentStatus((prev) => ({ ...prev, multipleFaces: false })), 3000)
        break
      case "suspicious_object":
      case "phone_detected":
      case "notes_detected":
        const objectType = description.split(" ")[0].toLowerCase()
        setCurrentStatus((prev) => ({
          ...prev,
          suspiciousItems: [...prev.suspiciousItems.filter((item) => item !== objectType), objectType].slice(-3),
        }))
        setTimeout(() => {
          setCurrentStatus((prev) => ({
            ...prev,
            suspiciousItems: prev.suspiciousItems.filter((item) => item !== objectType),
          }))
        }, 10000)
        break
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getIntegrityScore = () => {
    return currentSession?.integrityScore || 100
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getEventIcon = (type: DetectionEvent["type"]) => {
    switch (type) {
      case "focus_lost":
        return <EyeOff className="h-4 w-4 text-yellow-500" />
      case "no_face":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "multiple_faces":
        return <Users className="h-4 w-4 text-orange-500" />
      case "phone_detected":
      case "suspicious_object":
        return <Smartphone className="h-4 w-4 text-red-500" />
      case "notes_detected":
        return <BookOpen className="h-4 w-4 text-yellow-500" />
      case "eyes_closed":
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const handleDownloadReport = async () => {
    try {
      if (currentSession) {
        await downloadReport()
      }
    } catch (err) {
      console.error("Failed to download report:", err)
    }
  }

  if (showReports) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={() => setShowReports(false)} variant="outline">
            ← Back to Monitoring
          </Button>
        </div>
        <ReportingDashboard
          sessionId={currentSession?.id}
          onDownloadReport={handleDownloadReport}
          onGenerateNewReport={() => generateReport()}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Video Proctoring System</h1>
          <p className="text-muted-foreground">Real-time AI-powered monitoring for online interviews</p>
        </div>
        <Button onClick={() => setShowReports(true)} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          View Reports
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button onClick={clearError} variant="ghost" size="sm" className="ml-2">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed - Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <VideoInterface
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onRecordingPause={handleRecordingPause}
            onDetectionEvent={handleDetectionEvent}
            isRecording={isRecording}
            isPaused={isPaused}
            sessionDuration={sessionDuration}
            candidateName={candidateName}
            onCandidateNameChange={setCandidateName}
          />

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Recent Detection Events
                {currentStatus.aiDetectionActive && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Brain className="h-3 w-3 mr-1" />
                    AI Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {detectionEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {currentStatus.aiDetectionActive
                      ? "AI detection running... No events detected yet"
                      : "No events detected yet"}
                  </p>
                ) : (
                  detectionEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground">{event.timestamp.toLocaleTimeString()}</p>
                      </div>
                      <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Status & Controls */}
        <div className="space-y-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-foreground">{candidateName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Session Duration</label>
                  <p className="text-foreground font-mono">{formatTime(sessionDuration)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Session Status</label>
                  <p className="text-foreground">{isRecording ? (isPaused ? "Paused" : "Recording") : "Ready"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">AI Detection</label>
                  <p className="text-foreground flex items-center gap-2">
                    {currentStatus.aiDetectionActive ? (
                      <>
                        <Brain className="h-4 w-4 text-primary" />
                        Active
                      </>
                    ) : (
                      "Inactive"
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Integrity Score</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getIntegrityScore()}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-primary">{getIntegrityScore()}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Status */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Face Detected</span>
                  {currentStatus.faceDetected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Focused</span>
                  {currentStatus.focused ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Multiple Faces</span>
                  {currentStatus.multipleFaces ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Suspicious Items</span>
                  {currentStatus.suspiciousItems.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600">{currentStatus.suspiciousItems.join(", ")}</span>
                    </div>
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {detectionEvents.filter((event) => event.severity === "high").length > 0 ? (
                <div className="space-y-2">
                  {detectionEvents
                    .filter((event) => event.severity === "high")
                    .slice(0, 3)
                    .map((event) => (
                      <Alert key={event.id} className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{event.description}</AlertDescription>
                      </Alert>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No active alerts</p>
              )}
            </CardContent>
          </Card>

          {/* Detection Summary */}
          {detectionEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Events:</span>
                    <span className="font-semibold">{detectionEvents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Severity:</span>
                    <span className="font-semibold text-red-600">
                      {detectionEvents.filter((e) => e.severity === "high").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium Severity:</span>
                    <span className="font-semibold text-yellow-600">
                      {detectionEvents.filter((e) => e.severity === "medium").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low Severity:</span>
                    <span className="font-semibold text-blue-600">
                      {detectionEvents.filter((e) => e.severity === "low").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {currentSession && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleDownloadReport}
                  variant="outline"
                  className="w-full bg-transparent"
                  disabled={isLoading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button onClick={() => setShowReports(true)} variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Detailed Report
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
