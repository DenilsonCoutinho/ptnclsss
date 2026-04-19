// HTML and file parsing for route discovery

const MAX_AUTO_DISCOVERED_ROUTES = 20

/**
 * Extracts internal links from HTML content
 */
export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const routes: Set<string> = new Set()
  const baseUrlObj = new URL(baseUrl)
  const baseDomain = baseUrlObj.hostname

  // Match href attributes in anchor tags
  const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi
  let match

  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]
    const route = normalizeAndValidateLink(href, baseUrl, baseDomain)
    if (route) {
      routes.add(route)
    }
  }

  // Also check for data-href or other common patterns
  const dataHrefRegex = /data-href=["']([^"']+)["']/gi
  while ((match = dataHrefRegex.exec(html)) !== null) {
    const href = match[1]
    const route = normalizeAndValidateLink(href, baseUrl, baseDomain)
    if (route) {
      routes.add(route)
    }
  }

  return Array.from(routes).slice(0, MAX_AUTO_DISCOVERED_ROUTES)
}

/**
 * Extracts routes from robots.txt content
 */
export function extractRoutesFromRobots(content: string): string[] {
  const routes: Set<string> = new Set()
  const lines = content.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match Disallow and Allow directives
    const disallowMatch = trimmed.match(/^Disallow:\s*(.+)$/i)
    const allowMatch = trimmed.match(/^Allow:\s*(.+)$/i)
    
    const path = disallowMatch?.[1] || allowMatch?.[1]
    
    if (path) {
      const cleanPath = path.trim()
      // Ignore wildcards and empty paths
      if (cleanPath && !cleanPath.includes("*") && cleanPath !== "/") {
        routes.add(cleanPath)
      }
    }
  }

  return Array.from(routes).slice(0, MAX_AUTO_DISCOVERED_ROUTES)
}

/**
 * Extracts routes from sitemap.xml content
 */
export function extractRoutesFromSitemap(content: string, baseUrl: string): string[] {
  const routes: Set<string> = new Set()
  const baseUrlObj = new URL(baseUrl)
  const baseDomain = baseUrlObj.hostname

  // Match <loc> tags in sitemap
  const locRegex = /<loc>([^<]+)<\/loc>/gi
  let match

  while ((match = locRegex.exec(content)) !== null) {
    const url = match[1].trim()
    try {
      const urlObj = new URL(url)
      // Only include routes from the same domain
      if (urlObj.hostname === baseDomain) {
        routes.add(urlObj.pathname)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(routes).slice(0, MAX_AUTO_DISCOVERED_ROUTES)
}

/**
 * Normalizes and validates a link, returning the path if valid
 */
function normalizeAndValidateLink(
  href: string,
  baseUrl: string,
  baseDomain: string
): string | null {
  // Skip invalid links
  if (!href) return null
  if (href.startsWith("mailto:")) return null
  if (href.startsWith("tel:")) return null
  if (href.startsWith("javascript:")) return null
  if (href.startsWith("#")) return null
  if (href.startsWith("data:")) return null

  try {
    let url: URL

    if (href.startsWith("http://") || href.startsWith("https://")) {
      url = new URL(href)
      // Skip external links
      if (url.hostname !== baseDomain) return null
    } else if (href.startsWith("/")) {
      url = new URL(href, baseUrl)
    } else {
      // Relative path
      url = new URL(href, baseUrl)
    }

    // Return just the pathname
    return url.pathname
  } catch {
    return null
  }
}

/**
 * Normalizes a route path
 */
export function normalizeRoute(route: string): string {
  let normalized = route.trim()
  
  // Ensure it starts with /
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized
  }
  
  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  
  // Remove query strings and fragments
  const queryIndex = normalized.indexOf("?")
  if (queryIndex !== -1) {
    normalized = normalized.slice(0, queryIndex)
  }
  
  const hashIndex = normalized.indexOf("#")
  if (hashIndex !== -1) {
    normalized = normalized.slice(0, hashIndex)
  }
  
  return normalized
}
