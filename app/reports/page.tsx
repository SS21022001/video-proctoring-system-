import { ReportingDashboard } from "@/components/reporting-dashboard"

export default function ReportsPage() {
  const handleDownloadReport = () => {
    // This would typically call the API to download the report
    console.log("Downloading report...")
  }

  const handleGenerateNewReport = () => {
    // This would typically call the API to generate a new report
    console.log("Generating new report...")
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <ReportingDashboard onDownloadReport={handleDownloadReport} onGenerateNewReport={handleGenerateNewReport} />
    </main>
  )
}
