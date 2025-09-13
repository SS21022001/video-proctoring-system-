"use client"

import { useEffect, useRef, useState } from "react"

// Types for detection results
export interface FaceDetection {
  box: { x: number; y: number; width: number; height: number }
  confidence: number
  landmarks?: { x: number; y: number }[]
}

export interface ObjectDetection {
  class: string
  confidence: number
  box: { x: number; y: number; width: number; height: number }
}

export interface DetectionResults {
  faces: FaceDetection[]
  objects: ObjectDetection[]
  eyesClosed: boolean
  lookingAway: boolean
  multipleFaces: boolean
}

interface CVDetectionProps {
  videoElement: HTMLVideoElement | null
  isActive: boolean
  onDetectionUpdate: (results: DetectionResults) => void
  onFocusLost: () => void
  onMultipleFaces: () => void
  onSuspiciousObject: (objectType: string) => void
}

export function CVDetection({
  videoElement,
  isActive,
  onDetectionUpdate,
  onFocusLost,
  onMultipleFaces,
  onSuspiciousObject,
}: CVDetectionProps) {
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastFocusTime = useRef<number>(Date.now())
  const lastFaceCount = useRef<number>(1)

  // Load TensorFlow.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // In a real implementation, you would load actual TensorFlow.js models
        // For demo purposes, we'll simulate model loading
        await new Promise((resolve) => setTimeout(resolve, 2000))
        setIsModelLoaded(true)
      } catch (err) {
        setError("Failed to load detection models")
        console.error("Model loading error:", err)
      }
    }

    loadModels()
  }, [])

  // Main detection loop
  useEffect(() => {
    if (!isActive || !isModelLoaded || !videoElement) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
      return
    }

    const runDetection = () => {
      if (!videoElement || videoElement.readyState !== 4) return

      try {
        const results = performDetection(videoElement)
        onDetectionUpdate(results)

        // Check for focus loss
        if (results.lookingAway) {
          if (Date.now() - lastFocusTime.current > 5000) {
            onFocusLost()
            lastFocusTime.current = Date.now()
          }
        } else {
          lastFocusTime.current = Date.now()
        }

        // Check for multiple faces
        if (results.multipleFaces && results.faces.length !== lastFaceCount.current) {
          onMultipleFaces()
          lastFaceCount.current = results.faces.length
        }

        // Check for suspicious objects
        results.objects.forEach((obj) => {
          if (obj.confidence > 0.7 && isSuspiciousObject(obj.class)) {
            onSuspiciousObject(obj.class)
          }
        })
      } catch (err) {
        console.error("Detection error:", err)
      }
    }

    detectionIntervalRef.current = setInterval(runDetection, 1000) // Run every second

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [isActive, isModelLoaded, videoElement, onDetectionUpdate, onFocusLost, onMultipleFaces, onSuspiciousObject])

  // Simulated detection function (in real implementation, this would use TensorFlow.js)
  const performDetection = (video: HTMLVideoElement): DetectionResults => {
    // Create canvas for processing
    const canvas = canvasRef.current
    if (!canvas) {
      return {
        faces: [],
        objects: [],
        eyesClosed: false,
        lookingAway: false,
        multipleFaces: false,
      }
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return {
        faces: [],
        objects: [],
        eyesClosed: false,
        lookingAway: false,
        multipleFaces: false,
      }
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Simulate face detection results
    const faces: FaceDetection[] = generateSimulatedFaceDetection()
    const objects: ObjectDetection[] = generateSimulatedObjectDetection()

    return {
      faces,
      objects,
      eyesClosed: Math.random() < 0.1, // 10% chance of eyes being closed
      lookingAway: Math.random() < 0.15, // 15% chance of looking away
      multipleFaces: faces.length > 1,
    }
  }

  // Simulate face detection (replace with actual TensorFlow.js face detection)
  const generateSimulatedFaceDetection = (): FaceDetection[] => {
    const faceCount = Math.random() < 0.9 ? 1 : Math.random() < 0.95 ? 0 : 2
    const faces: FaceDetection[] = []

    for (let i = 0; i < faceCount; i++) {
      faces.push({
        box: {
          x: 100 + i * 200,
          y: 100,
          width: 150,
          height: 200,
        },
        confidence: 0.85 + Math.random() * 0.1,
        landmarks: [
          { x: 150 + i * 200, y: 150 }, // Left eye
          { x: 200 + i * 200, y: 150 }, // Right eye
          { x: 175 + i * 200, y: 180 }, // Nose
          { x: 175 + i * 200, y: 220 }, // Mouth
        ],
      })
    }

    return faces
  }

  // Simulate object detection (replace with actual YOLO/TensorFlow.js object detection)
  const generateSimulatedObjectDetection = (): ObjectDetection[] => {
    const objects: ObjectDetection[] = []

    // Randomly detect suspicious objects
    if (Math.random() < 0.05) {
      // 5% chance of phone
      objects.push({
        class: "cell phone",
        confidence: 0.8,
        box: { x: 300, y: 200, width: 60, height: 120 },
      })
    }

    if (Math.random() < 0.03) {
      // 3% chance of book/notes
      objects.push({
        class: "book",
        confidence: 0.75,
        box: { x: 50, y: 300, width: 100, height: 150 },
      })
    }

    if (Math.random() < 0.02) {
      // 2% chance of laptop
      objects.push({
        class: "laptop",
        confidence: 0.9,
        box: { x: 400, y: 250, width: 200, height: 150 },
      })
    }

    return objects
  }

  // Check if detected object is suspicious
  const isSuspiciousObject = (className: string): boolean => {
    const suspiciousObjects = [
      "cell phone",
      "mobile phone",
      "smartphone",
      "book",
      "notebook",
      "paper",
      "laptop",
      "tablet",
      "monitor",
      "screen",
    ]

    return suspiciousObjects.some((obj) => className.toLowerCase().includes(obj.toLowerCase()))
  }

  return (
    <div className="hidden">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Status indicator */}
      {error && <div className="text-red-500 text-sm">Detection Error: {error}</div>}

      {!isModelLoaded && !error && <div className="text-yellow-500 text-sm">Loading detection models...</div>}
    </div>
  )
}

// Hook for using CV detection
export function useCVDetection() {
  const [detectionResults, setDetectionResults] = useState<DetectionResults>({
    faces: [],
    objects: [],
    eyesClosed: false,
    lookingAway: false,
    multipleFaces: false,
  })

  const [detectionStats, setDetectionStats] = useState({
    totalFocusLossEvents: 0,
    totalMultipleFaceEvents: 0,
    totalSuspiciousObjectEvents: 0,
    lastEventTime: null as Date | null,
  })

  const handleDetectionUpdate = (results: DetectionResults) => {
    setDetectionResults(results)
  }

  const handleFocusLost = () => {
    setDetectionStats((prev) => ({
      ...prev,
      totalFocusLossEvents: prev.totalFocusLossEvents + 1,
      lastEventTime: new Date(),
    }))
  }

  const handleMultipleFaces = () => {
    setDetectionStats((prev) => ({
      ...prev,
      totalMultipleFaceEvents: prev.totalMultipleFaceEvents + 1,
      lastEventTime: new Date(),
    }))
  }

  const handleSuspiciousObject = (objectType: string) => {
    setDetectionStats((prev) => ({
      ...prev,
      totalSuspiciousObjectEvents: prev.totalSuspiciousObjectEvents + 1,
      lastEventTime: new Date(),
    }))
  }

  return {
    detectionResults,
    detectionStats,
    handleDetectionUpdate,
    handleFocusLost,
    handleMultipleFaces,
    handleSuspiciousObject,
  }
}
