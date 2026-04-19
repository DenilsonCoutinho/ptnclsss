import { createFinding, updateScan, type Finding } from "@/lib/db"
import { checkSecurityHeaders } from "./checks/headers"
import { checkSSL } from "./checks/ssl"
import { checkCookies } from "./checks/cookies"
import { checkContentAnalysis } from "./checks/content"
import { checkDNS } from "./checks/dns"

export type CheckResult = {
  category: string
  title: string
  description: string
  risk_level: "critical" | "high" | "medium" | "low" | "info"
  recommendation?: string
  details?: Record<string, unknown>
}

export async function runScan(scanId: string, url: string): Promise<number> {
  // Update scan status to running
  await updateScan(scanId, {
    status: "running",
    started_at: new Date().toISOString(),
  })

  const findings: CheckResult[] = []

  try {
    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`

    // Run all passive checks in parallel
    const [headersResults, sslResults, cookiesResults, contentResults, dnsResults] =
      await Promise.allSettled([
        checkSecurityHeaders(normalizedUrl),
        checkSSL(normalizedUrl),
        checkCookies(normalizedUrl),
        checkContentAnalysis(normalizedUrl),
        checkDNS(normalizedUrl),
      ])

    // Collect results from each check
    if (headersResults.status === "fulfilled") findings.push(...headersResults.value)
    if (sslResults.status === "fulfilled") findings.push(...sslResults.value)
    if (cookiesResults.status === "fulfilled") findings.push(...cookiesResults.value)
    if (contentResults.status === "fulfilled") findings.push(...contentResults.value)
    if (dnsResults.status === "fulfilled") findings.push(...dnsResults.value)

    // Save all findings to database
    for (const finding of findings) {
      await createFinding({
        scan_id: scanId,
        ...finding,
        recommendation: finding.recommendation || null,
        details: finding.details || null,
      })
    }

    // Calculate score based on findings
    const score = calculateScore(findings)

    // Update scan as completed
    await updateScan(scanId, {
      status: "completed",
      score,
      completed_at: new Date().toISOString(),
    })

    return score
  } catch (error) {
    await updateScan(scanId, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Unknown error occurred",
    })
    throw error
  }
}

function calculateScore(findings: CheckResult[]): number {
  // Start with perfect score
  let score = 100

  // Deduct points based on risk level
  const deductions = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
  }

  for (const finding of findings) {
    score -= deductions[finding.risk_level]
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score))
}
