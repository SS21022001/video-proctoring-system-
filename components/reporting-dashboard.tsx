"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  Download,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Users,
  Smartphone,
  BookOpen,
  Brain,
  Calendar,
} from "lucide-react"

interface ReportData {
  session: {
    id: string
    candidateName: string
    startTime: Date
    endTime?: Date
    duration: number
    status: string
    integrityScore: number
    videoQuality: string
    detectionEnabled: boolean
  }
  events: Array<{
    id: string
    type: string
    timestamp: Date
    description: string
    severity: "low" | "medium" | "high"
    confidence?: number
  }>
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

interface ReportingDashboardProps {
  sessionId?: string
  reportData?: ReportData
  onDownloadReport?: () => void
  onGenerateNewReport?: () => void
  isLoading?: boolean
}

export function ReportingDashboard({
  sessionId,
  reportData,
  onDownloadReport,
  onGenerateNewReport,
  isLoading = false,
}: ReportingDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [isGenerating, setIsGenerating] = useState(false)

  // Mock data for demonstration if no reportData provided
  const mockReportData: ReportData = {
    session: {
      id: "session_123",
      candidateName: "John Doe",
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(),
      duration: 3600, // 1 hour
      status: "completed",
      integrityScore: 85,
      videoQuality: "1080p",
      detectionEnabled: true,
    },
    events: [
      {
        id: "1",
        type: "focus_lost",
        timestamp: new Date(Date.now() - 3000000),
        description: "Candidate looked away from screen",
        severity: "medium",
        confidence: 0.85,
      },
      {
        id: "2",
        type: "phone_detected",
        timestamp: new Date(Date.now() - 2400000),
        description: "Mobile phone detected in frame",
        severity: "high",
        confidence: 0.92,
      },
      {
        id: "3",
        type: "notes_detected",
        timestamp: new Date(Date.now() - 1800000),
        description: "Paper notes detected on desk",
        severity: "medium",
        confidence: 0.78,
      },
    ],
    statistics: {
      totalEvents: 3,
      eventsBySeverity: { high: 1, medium: 2, low: 0 },
      eventsByType: {
        focus_lost: 1,
        phone_detected: 1,
        notes_detected: 1,
      },
      focusLossCount: 1,
      suspiciousObjectCount: 2,
      multipleFaceCount: 0,
      averageConfidence: 0.85,
    },
    integrityAnalysis: {
      finalScore: 85,
      deductions: [
        { reason: "High severity violations", points: 15, count: 1 },
        { reason: "Medium severity violations", points: 20, count: 2 },
      ],
      recommendations: [
        "Mobile device detected during session. Verify candidate understanding of device policies.",
        "Notes detected. Review materials policy with candidate.",
        "Good session integrity with minor violations. Consider follow-up discussion.",
      ],
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3000000),
        event: "Candidate looked away from screen",
        severity: "medium",
      },
      {
        timestamp: new Date(Date.now() - 2400000),
        event: "Mobile phone detected in frame",
        severity: "high",
      },
      {
        timestamp: new Date(Date.now() - 1800000),
        event: "Paper notes detected on desk",
        severity: "medium",
      },
    ],
  }

  const data = reportData || mockReportData

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreStatus = (score: number) => {
    if (score >= 90) return "Excellent"
    if (score >= 70) return "Good"
    if (score >= 50) return "Fair"
    return "Poor"
  }

  // Chart data preparation
  const severityChartData = [
    { name: "High", value: data.statistics.eventsBySeverity.high, color: "#ef4444" },
    { name: "Medium", value: data.statistics.eventsBySeverity.medium, color: "#f59e0b" },
    { name: "Low", value: data.statistics.eventsBySeverity.low, color: "#3b82f6" },
  ]

  const eventTypeChartData = Object.entries(data.statistics.eventsByType).map(([type, count]) => ({
    name: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: count,
  }))

  const timelineChartData = data.timeline.map((item, index) => ({
    time: index + 1,
    events: 1,
    severity: item.severity === "high" ? 3 : item.severity === "medium" ? 2 : 1,
  }))

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API call
      onGenerateNewReport?.()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Proctoring Report</h2>
          <p className="text-muted-foreground">Comprehensive analysis for {data.session.candidateName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerateReport} disabled={isGenerating || isLoading} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            {isGenerating || isLoading ? "Generating..." : "Regenerate"}
          </Button>
          <Button onClick={onDownloadReport} disabled={isLoading} className="bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            {isLoading ? "Processing..." : "Download Report"}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Integrity Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(data.integrityAnalysis.finalScore)}`}>
                  {data.integrityAnalysis.finalScore}%
                </p>
                <p className="text-xs text-muted-foreground">{getScoreStatus(data.integrityAnalysis.finalScore)}</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session Duration</p>
                <p className="text-2xl font-bold text-foreground">{formatDuration(data.session.duration)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.session.status === "completed" ? "Completed" : "In Progress"}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-foreground">{data.statistics.totalEvents}</p>
                <p className="text-xs text-muted-foreground">{data.statistics.eventsBySeverity.high} high severity</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Detection</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.session.detectionEnabled ? "Active" : "Inactive"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg confidence: {(data.statistics.averageConfidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Candidate</label>
                    <p className="text-foreground font-medium">{data.session.candidateName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                    <p className="text-foreground font-mono text-sm">{data.session.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Time</label>
                    <p className="text-foreground">{data.session.startTime.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Time</label>
                    <p className="text-foreground">{data.session.endTime?.toLocaleString() || "In Progress"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Video Quality</label>
                    <p className="text-foreground">{data.session.videoQuality}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={data.session.status === "completed" ? "default" : "secondary"}>
                      {data.session.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integrity Score Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Integrity Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(data.integrityAnalysis.finalScore)}`}>
                    {data.integrityAnalysis.finalScore}%
                  </div>
                  <p className="text-muted-foreground">{getScoreStatus(data.integrityAnalysis.finalScore)}</p>
                </div>

                <Progress value={data.integrityAnalysis.finalScore} className="h-2" />

                <div className="space-y-2">
                  <h4 className="font-medium">Deductions:</h4>
                  {data.integrityAnalysis.deductions.map((deduction, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {deduction.reason} ({deduction.count})
                      </span>
                      <span className="text-red-600">-{deduction.points} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Events by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={severityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={eventTypeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Detection Events Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No events detected during this session</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.events.map((event, index) => (
                      <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          {event.type === "focus_lost" && <Eye className="h-4 w-4 text-yellow-500" />}
                          {event.type === "phone_detected" && <Smartphone className="h-4 w-4 text-red-500" />}
                          {event.type === "notes_detected" && <BookOpen className="h-4 w-4 text-yellow-500" />}
                          {event.type === "multiple_faces" && <Users className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{event.description}</p>
                            <Badge
                              variant={
                                event.severity === "high"
                                  ? "destructive"
                                  : event.severity === "medium"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {event.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-muted-foreground">{event.timestamp.toLocaleTimeString()}</p>
                            {event.confidence && (
                              <p className="text-xs text-muted-foreground">
                                Confidence: {(event.confidence * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={timelineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="events" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detection Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{data.statistics.focusLossCount}</div>
                    <div className="text-sm text-muted-foreground">Focus Loss Events</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{data.statistics.suspiciousObjectCount}</div>
                    <div className="text-sm text-muted-foreground">Suspicious Objects</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{data.statistics.multipleFaceCount}</div>
                    <div className="text-sm text-muted-foreground">Multiple Faces</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {(data.statistics.averageConfidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Confidence</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Recommendations & Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.integrityAnalysis.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-primary mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">
                  Based on the analysis of this proctoring session, the candidate achieved an integrity score of{" "}
                  <span className="font-semibold">{data.integrityAnalysis.finalScore}%</span>. This indicates{" "}
                  <span className="font-semibold">
                    {getScoreStatus(data.integrityAnalysis.finalScore).toLowerCase()}
                  </span>{" "}
                  session integrity with {data.statistics.totalEvents} detection events recorded.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
