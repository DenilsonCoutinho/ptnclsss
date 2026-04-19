// Route Analysis Check - analyzes the specific URL provided by the user

import type { CheckResult } from "../index"
import { discoverRoutes, type DiscoveredRoute } from "./routes/index"

/**
 * Analyzes the specific URL that was provided by the user
 * Reports information about that specific route only
 */
export async function checkRouteDiscovery(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const discovery = await discoverRoutes({
      baseUrl: url,
    })

    // Check if we got any result
    if (discovery.routes.length === 0) {
      if (discovery.errors.length > 0) {
        results.push({
          category: "Route Analysis",
          title: "Erro ao analisar rota",
          description: discovery.errors[0],
          risk_level: "info",
        })
      }
      return results
    }

    const route = discovery.routes[0]
    const path = extractPath(route.url)

    // Route not accessible
    if (!route.isAccessible) {
      results.push({
        category: "Route Analysis",
        title: `Rota inacessível: ${path}`,
        description: `A rota ${path} retornou status ${route.status}${route.indicators.length > 0 ? `. ${route.indicators[0]}` : ""}`,
        risk_level: "info",
        details: formatRouteDetail(route),
      })
      return results
    }

    // Report based on route type and risk
    if (route.riskLevel === "high") {
      results.push({
        category: "Route Analysis",
        title: `Rota de alto risco: ${path}`,
        description: getHighRiskDescription(route, path),
        risk_level: "high",
        recommendation: getRecommendation(route.type),
        details: formatRouteDetail(route),
      })
    } else if (route.riskLevel === "medium") {
      results.push({
        category: "Route Analysis",
        title: `Rota encontrada: ${path}`,
        description: getMediumRiskDescription(route, path),
        risk_level: "medium",
        recommendation: getRecommendation(route.type),
        details: formatRouteDetail(route),
      })
    } else {
      results.push({
        category: "Route Analysis",
        title: `Rota analisada: ${path}`,
        description: getLowRiskDescription(route, path),
        risk_level: "info",
        details: formatRouteDetail(route),
      })
    }

    // Add specific findings based on indicators
    if (route.indicators.length > 0) {
      const indicatorDescription = route.indicators.join("; ")
      results.push({
        category: "Route Analysis",
        title: "Indicadores detectados",
        description: indicatorDescription,
        risk_level: route.riskLevel === "high" ? "medium" : "info",
      })
    }

  } catch (error) {
    results.push({
      category: "Route Analysis",
      title: "Erro na análise de rota",
      description: `Não foi possível analisar a rota: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      risk_level: "info",
    })
  }

  return results
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function getHighRiskDescription(route: DiscoveredRoute, path: string): string {
  switch (route.type) {
    case "admin":
      return `A rota ${path} parece ser um painel administrativo acessível publicamente.`
    case "config":
      return `A rota ${path} expõe arquivos de configuração que podem conter dados sensíveis.`
    case "debug":
      return `A rota ${path} é uma rota de debug/desenvolvimento exposta em produção.`
    default:
      return `A rota ${path} foi classificada como alto risco (tipo: ${route.type}).`
  }
}

function getMediumRiskDescription(route: DiscoveredRoute, path: string): string {
  switch (route.type) {
    case "api":
      return `A rota ${path} é um endpoint de API. Verifique se possui autenticação adequada.`
    case "auth":
      return `A rota ${path} é uma página de autenticação.`
    default:
      return `A rota ${path} está acessível (status ${route.status}).`
  }
}

function getLowRiskDescription(route: DiscoveredRoute, path: string): string {
  return `A rota ${path} está acessível e retornou status ${route.status}. Tipo: ${route.type}.`
}

function getRecommendation(type: string): string {
  switch (type) {
    case "admin":
      return "Proteja rotas administrativas com autenticação forte e considere restringir acesso por IP."
    case "config":
      return "Remova imediatamente o acesso público a arquivos de configuração."
    case "debug":
      return "Desabilite rotas de debug em ambiente de produção."
    case "api":
      return "Verifique se o endpoint possui autenticação, rate limiting e validação de entrada."
    case "auth":
      return "Certifique-se de usar HTTPS, proteção contra brute-force e tokens CSRF."
    default:
      return "Revise as permissões de acesso desta rota."
  }
}

function formatRouteDetail(route: DiscoveredRoute) {
  return {
    url: route.url,
    path: extractPath(route.url),
    status: route.status,
    type: route.type,
    riskLevel: route.riskLevel,
    isAccessible: route.isAccessible,
    contentType: route.contentType,
    indicators: route.indicators,
  }
}
