// Route classification logic

import type { RouteType, RiskLevel, RouteAnalysis } from "./types"
import { SENSITIVE_KEYWORDS } from "./default-routes"

interface ClassificationResult {
  type: RouteType
  riskLevel: RiskLevel
  indicators: string[]
  riskScore: number
}

/**
 * Classifies a route based on URL patterns, content type, and response body
 */
export function classifyRoute(
  path: string,
  analysis: RouteAnalysis
): ClassificationResult {
  const indicators: string[] = []
  let riskScore = 0
  const pathLower = path.toLowerCase()
  const contentType = analysis.contentType?.toLowerCase() || ""
  const body = analysis.body || ""

  // Determine route type
  let type: RouteType = "unknown"

  // Check for API patterns
  if (isApiRoute(pathLower, contentType, body)) {
    type = "api"
    indicators.push("API pattern")
    riskScore += 2
  }

  // Check for admin patterns
  if (isAdminRoute(pathLower)) {
    type = "admin"
    indicators.push("Admin route")
    riskScore += 2
  }

  // Check for debug/test patterns
  if (isDebugRoute(pathLower)) {
    type = "debug"
    indicators.push("Debug/test route")
    riskScore += 2
  }

  // Check for config patterns
  if (isConfigRoute(pathLower)) {
    type = "config"
    indicators.push("Config/sensitive file")
    riskScore += 3
  }

  // Check for page (HTML)
  if (type === "unknown" && isPageRoute(contentType)) {
    type = "page"
  }

  // Check for JSON response
  if (contentType.includes("application/json")) {
    indicators.push("JSON response")
    riskScore += 3
  }

  // Check for sensitive keywords in path
  const foundKeywords = checkSensitiveKeywords(pathLower)
  if (foundKeywords.length > 0) {
    indicators.push(`Contains keywords: ${foundKeywords.join(", ")}`)
    riskScore += 2
  }

  // Check for sensitive keywords in body (limited check)
  if (body) {
    const bodyKeywords = checkSensitiveKeywords(body.toLowerCase())
    if (bodyKeywords.length > 0) {
      indicators.push(`Response contains sensitive data patterns`)
      riskScore += 2
    }
  }

  // Determine risk level based on score
  const riskLevel = calculateRiskLevel(riskScore)

  return {
    type,
    riskLevel,
    indicators,
    riskScore,
  }
}

function isApiRoute(path: string, contentType: string, body: string): boolean {
  // URL contains /api
  if (path.includes("/api")) return true
  
  // Content-Type is JSON
  if (contentType.includes("application/json")) return true
  
  // Response looks like JSON
  const trimmedBody = body.trim()
  if (
    (trimmedBody.startsWith("{") && trimmedBody.endsWith("}")) ||
    (trimmedBody.startsWith("[") && trimmedBody.endsWith("]"))
  ) {
    return true
  }
  
  return false
}

function isAdminRoute(path: string): boolean {
  const adminPatterns = ["/admin", "/dashboard", "/panel", "/backoffice", "/management"]
  return adminPatterns.some((pattern) => path.includes(pattern))
}

function isDebugRoute(path: string): boolean {
  const debugPatterns = ["/debug", "/test", "/dev", "/staging", "/swagger", "/graphql-playground"]
  return debugPatterns.some((pattern) => path.includes(pattern))
}

function isConfigRoute(path: string): boolean {
  const configPatterns = [".env", ".git", "config", "backup", ".bak", ".sql", ".log"]
  return configPatterns.some((pattern) => path.includes(pattern))
}

function isPageRoute(contentType: string): boolean {
  return contentType.includes("text/html")
}

function checkSensitiveKeywords(text: string): string[] {
  return SENSITIVE_KEYWORDS.filter((keyword) => text.includes(keyword))
}

function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 6) return "high"
  if (score >= 3) return "medium"
  return "low"
}
