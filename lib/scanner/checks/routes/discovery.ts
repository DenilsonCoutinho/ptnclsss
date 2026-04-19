// Route analysis - analyzes the specific URL provided by the user

import type {
  RouteDiscoveryInput,
  RouteDiscoveryResult,
  DiscoveredRoute,
  RouteAnalysis,
} from "./types"
import { classifyRoute } from "./classifier"

const REQUEST_TIMEOUT = 8000
const MAX_BODY_SIZE = 50 * 1024 // 50KB

/**
 * Analyzes the specific URL provided by the user
 * Does NOT crawl or test other routes - only analyzes what was requested
 */
export async function discoverRoutes(
  input: RouteDiscoveryInput
): Promise<RouteDiscoveryResult> {
  const errors: string[] = []
  const discoveredRoutes: DiscoveredRoute[] = []

  // Normalize the URL provided by the user
  const targetUrl = normalizeUrl(input.baseUrl)

  try {
    const urlObj = new URL(targetUrl)
    const path = urlObj.pathname || "/"

    // Analyze the specific route
    const routeResult = await analyzeRoute(targetUrl, path)

    if (routeResult) {
      discoveredRoutes.push(routeResult)
    }
  } catch (error) {
    errors.push(
      `Erro ao analisar URL: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    )
  }

  return {
    routes: discoveredRoutes,
    totalAnalyzed: 1,
    totalAccessible: discoveredRoutes.filter((r) => r.isAccessible).length,
    errors,
  }
}

/**
 * Normalizes the URL
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized
  }
  return normalized
}

/**
 * Analyzes a single route
 */
async function analyzeRoute(
  fullUrl: string,
  path: string
): Promise<DiscoveredRoute | null> {
  try {
    const response = await fetchWithTimeout(fullUrl, REQUEST_TIMEOUT)

    const status = response.status
    const contentType = response.headers.get("content-type")
    const headers: Record<string, string> = {}

    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Read body (limited)
    let body = ""
    try {
      const text = await response.text()
      body = text.slice(0, MAX_BODY_SIZE)
    } catch {
      // Ignore body read errors
    }

    const analysis: RouteAnalysis = {
      status,
      contentType,
      body,
      headers,
    }

    const classification = classifyRoute(path, analysis)

    // Consider accessible if status is 2xx or 3xx
    const isAccessible = status >= 200 && status < 400

    return {
      url: fullUrl,
      status,
      type: classification.type,
      riskLevel: classification.riskLevel,
      isAccessible,
      contentType,
      indicators: classification.indicators,
    }
  } catch (error) {
    return {
      url: fullUrl,
      status: 0,
      type: "unknown",
      riskLevel: "low",
      isAccessible: false,
      contentType: null,
      indicators: [
        `Erro: ${error instanceof Error ? error.message : "Falha na conexão"}`,
      ],
    }
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SecurityScanner/1.0",
        Accept: "text/html,application/json,*/*",
      },
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
