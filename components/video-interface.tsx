"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CVDetection, useCVDetection } from "@/components/cv-detection"
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Download,
  Maximize,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Brain,
} from "lucide-react"

interface VideoInterfaceProps {
  onRecordingStart: () => void
  onRecordingStop: () => void
  onRecordingPause: () => void
  onDetectionEvent: (type: string, description: string, severity: "low" | "medium" | "high") => void
  isRecording: boolean
  isPaused: boolean
  sessionDuration: number
  candidateName: string
  onCandidateNameChange: (name: string) => void
}

export function VideoInterface({
  onRecordingStart,
  onRecordingStop,
  onRecordingPause,
  onDetectionEvent,
  isRecording,
  isPaused,
  sessionDuration,
  candidateName,
  onCandidateNameChange,
}: VideoInterfaceProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoQuality, setVideoQuality] = useState<"720p" | "1080p">("720p")
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [cvEnabled, setCvEnabled] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Use CV detection hook
  const {
    detectionResults,
    detectionStats,
    handleDetectionUpdate,
    handleFocusLost,
    handleMultipleFaces,
    handleSuspiciousObject,
  } = useCVDetection()

  // Handle detection events
  useEffect(() => {
    if (!isRecording) return

    // Focus loss detection
    if (detectionResults.lookingAway) {
      onDetectionEvent("focus_lost", "Candidate looking away from screen", "medium")
    }

    // Multiple faces detection
    if (detectionResults.multipleFaces) {
      onDetectionEvent("multiple_faces", `${detectionResults.faces.length} faces detected in frame`, "high")
    }

    // No face detection
    if (detectionResults.faces.length === 0) {
      onDetectionEvent("no_face", "No face detected in frame", "high")
    }

    // Eyes closed detection
    if (detectionResults.eyesClosed) {
      onDetectionEvent("eyes_closed", "Candidate appears to have eyes closed", "low")
    }

    // Suspicious objects detection
    detectionResults.objects.forEach((obj) => {
      if (obj.confidence > 0.7) {
        const severity = obj.class.includes("phone") ? "high" : "medium"
        onDetectionEvent("suspicious_object", `${obj.class} detected in frame`, severity)
      }
    })
  }, [detectionResults, isRecording, onDetectionEvent])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getVideoConstraints = () => {
    return {
      width: videoQuality === "1080p" ? 1920 : 1280,
      height: videoQuality === "1080p" ? 1080 : 720,
      frameRate: 30,
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled ? getVideoConstraints() : false,
        audio: micEnabled,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }

      // Setup MediaRecorder for video recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data])
        }
      }

      mediaRecorder.start(1000) // Record in 1-second chunks
      mediaRecorderRef.current = mediaRecorder

      onRecordingStart()
    } catch (error) {
      console.error("Error accessing camera/microphone:", error)
      alert("Unable to access camera or microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    onRecordingStop()
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause()
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume()
    }
    onRecordingPause()
  }

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const downloadRecording = () => {
    if (recordedChunks.length === 0) {
      alert("No recording available to download")
      return
    }

    const blob = new Blob(recordedChunks, { type: "video/webm" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `interview-${candidateName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const restartSession = () => {
    if (window.confirm("Are you sure you want to restart the session? This will stop the current recording.")) {
      stopRecording()
      setRecordedChunks([])
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl">Candidate Video Interface</CardTitle>
            <Badge variant={isRecording ? "destructive" : "secondary"}>
              {isRecording ? (isPaused ? "PAUSED" : "RECORDING") : "READY"}
            </Badge>
            {cvEnabled && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Brain className="h-3 w-3 mr-1" />
                AI Detection Active
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-mono text-primary font-semibold">{formatTime(sessionDuration)}</span>
          </div>
        </div>

        {/* Candidate Name Input */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="candidate-name" className="text-sm font-medium">
              Candidate Name
            </Label>
            <Input
              id="candidate-name"
              value={candidateName}
              onChange={(e) => onCandidateNameChange(e.target.value)}
              placeholder="Enter candidate name"
              disabled={isRecording}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="video-quality" className="text-sm font-medium">
              Quality:
            </Label>
            <select
              id="video-quality"
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value as "720p" | "1080p")}
              disabled={isRecording}
              className="px-2 py-1 border border-border rounded text-sm bg-background"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="cv-detection" className="text-sm font-medium">
              AI Detection:
            </Label>
            <Button
              variant={cvEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setCvEnabled(!cvEnabled)}
              disabled={isRecording}
            >
              <Brain className="h-4 w-4 mr-1" />
              {cvEnabled ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div ref={containerRef} className="relative">
          {/* Video Display */}
          <div className={`relative ${isFullscreen ? "h-screen" : "aspect-video"} bg-muted rounded-lg overflow-hidden`}>
            <video
              ref={videoRef}
              autoPlay
              muted={isMuted}
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {!isRecording && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">Ready to Start Monitoring</p>
                  <p className="text-muted-foreground">Click "Start Recording" to begin the proctored session</p>
                  {cvEnabled && <p className="text-sm text-primary mt-2">AI Detection will automatically start</p>}
                </div>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && !isPaused && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE RECORDING
              </div>
            )}

            {/* Paused Indicator */}
            {isRecording && isPaused && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                <Pause className="w-3 h-3" />
                PAUSED
              </div>
            )}

            {/* Detection Status Overlay */}
            {isRecording && cvEnabled && (
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-3 w-3" />
                  <span>AI Detection</span>
                </div>
                <div className="text-xs space-y-1">
                  <div>Faces: {detectionResults.faces.length}</div>
                  <div>Objects: {detectionResults.objects.length}</div>
                  <div className={detectionResults.lookingAway ? "text-yellow-300" : "text-green-300"}>
                    {detectionResults.lookingAway ? "Looking Away" : "Focused"}
                  </div>
                </div>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  disabled={isRecording}
                  className="text-white hover:bg-white/20"
                >
                  {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMicEnabled(!micEnabled)}
                  disabled={isRecording}
                  className="text-white hover:bg-white/20"
                >
                  {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>

                <Button size="sm" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>

              <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {!isRecording ? (
              <Button onClick={startRecording} size="lg" className="bg-primary hover:bg-primary/90">
                <Play className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button onClick={pauseRecording} variant="outline" size="lg">
                  {isPaused ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                  {isPaused ? "Resume" : "Pause"}
                </Button>

                <Button onClick={stopRecording} variant="destructive" size="lg">
                  <Square className="h-5 w-5 mr-2" />
                  Stop Recording
                </Button>
              </>
            )}

            <Button onClick={restartSession} variant="outline" size="lg" disabled={!isRecording}>
              <RotateCcw className="h-5 w-5 mr-2" />
              Restart
            </Button>

            <Button onClick={downloadRecording} variant="outline" size="lg" disabled={recordedChunks.length === 0}>
              <Download className="h-5 w-5 mr-2" />
              Download
            </Button>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Recording Quality</p>
              <p className="font-semibold text-primary">{videoQuality}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Audio Status</p>
              <p className="font-semibold text-primary">{micEnabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Video Status</p>
              <p className="font-semibold text-primary">{cameraEnabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">AI Detection</p>
              <p className="font-semibold text-primary">{cvEnabled ? "Active" : "Inactive"}</p>
            </div>
          </div>

          {/* Detection Statistics */}
          {cvEnabled && isRecording && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium text-primary mb-2">Detection Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Focus Loss Events:</span>
                  <span className="ml-2 font-semibold">{detectionStats.totalFocusLossEvents}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Multiple Face Events:</span>
                  <span className="ml-2 font-semibold">{detectionStats.totalMultipleFaceEvents}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Suspicious Objects:</span>
                  <span className="ml-2 font-semibold">{detectionStats.totalSuspiciousObjectEvents}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CV Detection Component */}
        <CVDetection
          videoElement={videoRef.current}
          isActive={isRecording && cvEnabled}
          onDetectionUpdate={handleDetectionUpdate}
          onFocusLost={handleFocusLost}
          onMultipleFaces={handleMultipleFaces}
          onSuspiciousObject={handleSuspiciousObject}
        />
      </CardContent>
    </Card>
  )
}
