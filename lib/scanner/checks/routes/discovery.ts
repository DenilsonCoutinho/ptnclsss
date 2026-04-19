// Main route discovery logic

import type {
  RouteDiscoveryInput,
  RouteDiscoveryResult,
  DiscoveredRoute,
  RouteAnalysis,
} from "./types"
import { DEFAULT_ROUTES, DISCOVERY_FILES } from "./default-routes"
import { classifyRoute } from "./classifier"
import {
  normalizeRoute,
  extractLinksFromHtml,
  extractRoutesFromRobots,
  extractRoutesFromSitemap,
} from "./parser"

// Limits
const MAX_TOTAL_ROUTES = 50
const MAX_AUTO_DISCOVERED = 20
const MAX_MANUAL_ROUTES = 30
const REQUEST_TIMEOUT = 5000
const MAX_BODY_SIZE = 10 * 1024 // 10KB

/**
 * Main function to discover public routes
 */
export async function discoverRoutes(
  input: RouteDiscoveryInput
): Promise<RouteDiscoveryResult> {
  const errors: string[] = []
  const discoveredRoutes: DiscoveredRoute[] = []

  // Normalize base URL
  const baseUrl = normalizeBaseUrl(input.baseUrl)

  // Collect all routes to analyze
  const routesToAnalyze = new Set<string>()

  // 1. Add default routes
  for (const route of DEFAULT_ROUTES) {
    routesToAnalyze.add(route)
  }

  // 2. Add manual routes (normalized, limited to 30)
  if (input.manualRoutes && input.manualRoutes.length > 0) {
    const manualNormalized = input.manualRoutes
      .slice(0, MAX_MANUAL_ROUTES)
      .map(normalizeRoute)
    for (const route of manualNormalized) {
      routesToAnalyze.add(route)
    }
  }

  // 3. Automatic discovery from homepage and discovery files
  try {
    const autoDiscovered = await performAutoDiscovery(baseUrl)
    let autoCount = 0
    for (const route of autoDiscovered) {
      if (autoCount >= MAX_AUTO_DISCOVERED) break
      if (!routesToAnalyze.has(route)) {
        routesToAnalyze.add(route)
        autoCount++
      }
    }
  } catch (error) {
    errors.push(
      `Auto discovery error: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }

  // Limit total routes
  const finalRoutes = Array.from(routesToAnalyze).slice(0, MAX_TOTAL_ROUTES)

  // Analyze each route
  const analysisPromises = finalRoutes.map((route) =>
    analyzeRoute(baseUrl, route).catch((error) => {
      errors.push(`Error analyzing ${route}: ${error instanceof Error ? error.message : "Unknown"}`)
      return null
    })
  )

  const results = await Promise.allSettled(analysisPromises)

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === "fulfilled" && result.value) {
      discoveredRoutes.push(result.value)
    }
  }

  // Sort by risk level (high first)
  const riskOrder = { high: 0, medium: 1, low: 2 }
  discoveredRoutes.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])

  return {
    routes: discoveredRoutes,
    totalAnalyzed: finalRoutes.length,
    totalAccessible: discoveredRoutes.filter((r) => r.isAccessible).length,
    errors,
  }
}

/**
 * Normalizes the base URL
 */
function normalizeBaseUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized
  }
  // Remove trailing slash
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

/**
 * Performs automatic route discovery
 */
async function performAutoDiscovery(baseUrl: string): Promise<string[]> {
  const discovered: Set<string> = new Set()

  // Fetch homepage and extract links
  try {
    const response = await fetchWithTimeout(baseUrl, REQUEST_TIMEOUT)
    if (response.ok) {
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("text/html")) {
        const html = await response.text()
        const links = extractLinksFromHtml(html, baseUrl)
        for (const link of links) {
          discovered.add(link)
        }
      }
    }
  } catch {
    // Ignore errors during homepage fetch
  }

  // Check robots.txt
  try {
    const robotsResponse = await fetchWithTimeout(
      `${baseUrl}/robots.txt`,
      REQUEST_TIMEOUT
    )
    if (robotsResponse.ok) {
      const content = await robotsResponse.text()
      const routes = extractRoutesFromRobots(content)
      for (const route of routes) {
        discovered.add(route)
      }
    }
  } catch {
    // Ignore errors during robots.txt fetch
  }

  // Check sitemap.xml
  try {
    const sitemapResponse = await fetchWithTimeout(
      `${baseUrl}/sitemap.xml`,
      REQUEST_TIMEOUT
    )
    if (sitemapResponse.ok) {
      const content = await sitemapResponse.text()
      const routes = extractRoutesFromSitemap(content, baseUrl)
      for (const route of routes) {
        discovered.add(route)
      }
    }
  } catch {
    // Ignore errors during sitemap.xml fetch
  }

  return Array.from(discovered)
}

/**
 * Analyzes a single route
 */
async function analyzeRoute(
  baseUrl: string,
  path: string
): Promise<DiscoveredRoute | null> {
  const fullUrl = `${baseUrl}${path}`

  try {
    const response = await fetchWithTimeout(fullUrl, REQUEST_TIMEOUT)

    const status = response.status
    const contentType = response.headers.get("content-type")
    const headers: Record<string, string> = {}
    
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Read body (limited to MAX_BODY_SIZE)
    let body = ""
    if (response.ok) {
      try {
        const text = await response.text()
        body = text.slice(0, MAX_BODY_SIZE)
      } catch {
        // Ignore body read errors
      }
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
    // Return a result for unreachable routes
    return {
      url: fullUrl,
      status: 0,
      type: "unknown",
      riskLevel: "low",
      isAccessible: false,
      contentType: null,
      indicators: [
        `Error: ${error instanceof Error ? error.message : "Connection failed"}`,
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
        "User-Agent": "SecurityScanner/1.0 (Passive Analysis)",
        Accept: "text/html,application/json,*/*",
      },
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
