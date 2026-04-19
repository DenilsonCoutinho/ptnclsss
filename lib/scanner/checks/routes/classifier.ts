// Route classification logic

import type { RouteType, RiskLevel, RouteAnalysis } from "./types"

// Sensitive keywords to check for
const SENSITIVE_KEYWORDS = [
  "password",
  "secret",
  "token",
  "api_key",
  "apikey",
  "private",
  "credentials",
  "auth",
  "database",
  "db_",
  "mysql",
  "postgres",
  "mongodb",
]

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
  let type: RouteType = "page"

  // Check for admin patterns
  if (isAdminRoute(pathLower)) {
    type = "admin"
    indicators.push("Painel administrativo detectado")
    riskScore += 5
  }

  // Check for config patterns
  else if (isConfigRoute(pathLower)) {
    type = "config"
    indicators.push("Arquivo de configuração exposto")
    riskScore += 6
  }

  // Check for debug/test patterns
  else if (isDebugRoute(pathLower)) {
    type = "debug"
    indicators.push("Rota de debug/desenvolvimento")
    riskScore += 4
  }

  // Check for backup patterns
  else if (isBackupRoute(pathLower)) {
    type = "backup"
    indicators.push("Arquivo de backup detectado")
    riskScore += 6
  }

  // Check for API patterns
  else if (isApiRoute(pathLower, contentType, body)) {
    type = "api"
    indicators.push("Endpoint de API")
    riskScore += 2
  }

  // Check for auth patterns
  else if (isAuthRoute(pathLower)) {
    type = "auth"
    indicators.push("Rota de autenticação")
    riskScore += 1
  }

  // Check for sensitive file extensions
  else if (isSensitiveFile(pathLower)) {
    type = "sensitive"
    indicators.push("Arquivo sensível exposto")
    riskScore += 5
  }

  // Check response content type
  if (contentType.includes("application/json")) {
    indicators.push("Resposta JSON")
  }

  // Check for sensitive keywords in body (limited check)
  if (body) {
    const bodyKeywords = checkSensitiveKeywords(body.toLowerCase())
    if (bodyKeywords.length > 0) {
      indicators.push(`Dados sensíveis detectados no conteúdo`)
      riskScore += 3
    }
  }

  // Check HTTP status
  if (analysis.status === 200) {
    indicators.push(`Status: ${analysis.status} OK`)
  } else if (analysis.status >= 300 && analysis.status < 400) {
    indicators.push(`Redirecionamento: ${analysis.status}`)
  } else if (analysis.status >= 400) {
    indicators.push(`Erro: ${analysis.status}`)
    riskScore = Math.max(0, riskScore - 2)
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
  if (path.includes("/api")) return true
  if (contentType.includes("application/json")) return true

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
  const adminPatterns = [
    "/admin",
    "/dashboard",
    "/panel",
    "/backoffice",
    "/management",
    "/cms",
    "/wp-admin",
    "/administrator",
    "/cpanel",
  ]
  return adminPatterns.some((pattern) => path.includes(pattern))
}

function isAuthRoute(path: string): boolean {
  const authPatterns = [
    "/login",
    "/signin",
    "/sign-in",
    "/logout",
    "/register",
    "/signup",
    "/sign-up",
    "/auth",
    "/oauth",
    "/forgot-password",
    "/reset-password",
  ]
  return authPatterns.some((pattern) => path.includes(pattern))
}

function isDebugRoute(path: string): boolean {
  const debugPatterns = [
    "/debug",
    "/test",
    "/dev",
    "/staging",
    "/swagger",
    "/graphql-playground",
    "/graphiql",
    "/phpinfo",
    "/_profiler",
    "/actuator",
  ]
  return debugPatterns.some((pattern) => path.includes(pattern))
}

function isConfigRoute(path: string): boolean {
  const configPatterns = [
    ".env",
    ".git",
    "/config",
    "/.config",
    "/settings",
    ".htaccess",
    "web.config",
    ".aws",
    ".docker",
  ]
  return configPatterns.some((pattern) => path.includes(pattern))
}

function isBackupRoute(path: string): boolean {
  const backupPatterns = [
    ".bak",
    ".backup",
    ".sql",
    ".dump",
    ".tar",
    ".zip",
    ".old",
    "/backup",
  ]
  return backupPatterns.some((pattern) => path.includes(pattern))
}

function isSensitiveFile(path: string): boolean {
  const sensitivePatterns = [
    ".log",
    ".key",
    ".pem",
    ".crt",
    "id_rsa",
    ".ssh",
    "credentials",
    "secrets",
  ]
  return sensitivePatterns.some((pattern) => path.includes(pattern))
}

function checkSensitiveKeywords(text: string): string[] {
  return SENSITIVE_KEYWORDS.filter((keyword) => text.includes(keyword))
}

function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 5) return "high"
  if (score >= 2) return "medium"
  return "low"
}
