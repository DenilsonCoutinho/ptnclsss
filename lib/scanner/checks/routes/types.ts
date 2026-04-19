// Types for the Route Analysis module

export type RouteType = "page" | "api" | "admin" | "debug" | "config" | "auth" | "backup" | "sensitive" | "unknown"

export type RiskLevel = "low" | "medium" | "high"

export interface DiscoveredRoute {
  url: string
  status: number
  type: RouteType
  riskLevel: RiskLevel
  isAccessible: boolean
  contentType: string | null
  indicators: string[]
}

export interface RouteDiscoveryInput {
  baseUrl: string
  manualRoutes?: string[]
}

export interface RouteDiscoveryResult {
  routes: DiscoveredRoute[]
  totalAnalyzed: number
  totalAccessible: number
  errors: string[]
}

export interface RouteAnalysis {
  status: number
  contentType: string | null
  body?: string
  headers: Record<string, string>
}
