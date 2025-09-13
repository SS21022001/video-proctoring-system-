"use client"

import { ReportingDashboard } from "@/components/reporting-dashboard"
import { ApiClient } from "@/lib/api-client"
import { useState } from "react"

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownloadReport = async () => {
    setIsLoading(true)
    try {
      // Get the most recent session or allow user to select
      const sessionId = "latest" // This would typically come from user selection
      await ApiClient.downloadReport(sessionId, "candidate-report")
    } catch (error) {
      console.error("Failed to download report:", error)
      alert("Failed to download report. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateNewReport = async () => {
    setIsLoading(true)
    try {
      const sessionId = "latest" // This would typically come from user selection
      await ApiClient.generateReport(sessionId, "json")
      alert("Report generated successfully!")
    } catch (error) {
      console.error("Failed to generate report:", error)
      alert("Failed to generate report. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <ReportingDashboard
        onDownloadReport={handleDownloadReport}
        onGenerateNewReport={handleGenerateNewReport}
        isLoading={isLoading}
      />
    </main>
  )
}
