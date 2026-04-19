// Passive route discovery - extracts routes from page content

import type {
  RouteDiscoveryInput,
  RouteDiscoveryResult,
  DiscoveredRoute,
  RouteAnalysis,
} from "./types"
import { classifyRoute } from "./classifier"
import {
  normalizeRoute,
  extractLinksFromHtml,
  extractRoutesFromRobots,
  extractRoutesFromSitemap,
} from "./parser"

// Limits
const MAX_ROUTES_TO_ANALYZE = 30
const REQUEST_TIMEOUT = 5000
const MAX_BODY_SIZE = 50 * 1024 // 50KB para extrair mais links

/**
 * Main function to discover public routes passively
 * Only analyzes routes that actually exist in the page content
 */
export async function discoverRoutes(
  input: RouteDiscoveryInput
): Promise<RouteDiscoveryResult> {
  const errors: string[] = []
  const discoveredRoutes: DiscoveredRoute[] = []

  // Normalize base URL
  const baseUrl = normalizeBaseUrl(input.baseUrl)
  const baseHostname = new URL(baseUrl).hostname

  // Routes found in the page (passive discovery only)
  const foundRoutes = new Set<string>()

  // 1. Fetch homepage and extract all links
  try {
    const response = await fetchWithTimeout(baseUrl, REQUEST_TIMEOUT)
    if (response.ok) {
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("text/html")) {
        const html = await response.text()
        const links = extractLinksFromHtml(html, baseUrl)
        
        // Filter to only same-domain links
        for (const link of links) {
          try {
            const linkUrl = new URL(link, baseUrl)
            if (linkUrl.hostname === baseHostname) {
              foundRoutes.add(linkUrl.pathname)
            }
          } catch {
            // Invalid URL, skip
          }
        }
      }
    }
  } catch (error) {
    errors.push(
      `Erro ao buscar página principal: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    )
  }

  // 2. Check robots.txt for disclosed routes
  try {
    const robotsResponse = await fetchWithTimeout(
      `${baseUrl}/robots.txt`,
      REQUEST_TIMEOUT
    )
    if (robotsResponse.ok) {
      const content = await robotsResponse.text()
      const routes = extractRoutesFromRobots(content)
      for (const route of routes) {
        foundRoutes.add(normalizeRoute(route))
      }
    }
  } catch {
    // robots.txt not found or error, skip silently
  }

  // 3. Check sitemap.xml for disclosed routes
  try {
    const sitemapResponse = await fetchWithTimeout(
      `${baseUrl}/sitemap.xml`,
      REQUEST_TIMEOUT
    )
    if (sitemapResponse.ok) {
      const content = await sitemapResponse.text()
      const routes = extractRoutesFromSitemap(content, baseUrl)
      for (const route of routes) {
        foundRoutes.add(normalizeRoute(route))
      }
    }
  } catch {
    // sitemap.xml not found or error, skip silently
  }

  // 4. Add manual routes if provided (user-specified)
  if (input.manualRoutes && input.manualRoutes.length > 0) {
    for (const route of input.manualRoutes) {
      foundRoutes.add(normalizeRoute(route))
    }
  }

  // Convert to array and limit
  const routesToAnalyze = Array.from(foundRoutes)
    .filter(route => route && route !== "/") // Skip root
    .slice(0, MAX_ROUTES_TO_ANALYZE)

  // Analyze each discovered route
  const analysisPromises = routesToAnalyze.map((route) =>
    analyzeRoute(baseUrl, route).catch((error) => {
      errors.push(`Erro ao analisar ${route}: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      return null
    })
  )

  const results = await Promise.allSettled(analysisPromises)

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      discoveredRoutes.push(result.value)
    }
  }

  // Sort by risk level (high first)
  const riskOrder = { high: 0, medium: 1, low: 2 }
  discoveredRoutes.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])

  return {
    routes: discoveredRoutes,
    totalAnalyzed: routesToAnalyze.length,
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
        "User-Agent": "SecurityScanner/1.0 (Passive Analysis)",
        Accept: "text/html,application/json,*/*",
      },
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
