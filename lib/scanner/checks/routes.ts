// Route Discovery Check - integrates with the scanner system

import type { CheckResult } from "../index"
import { discoverRoutes, type DiscoveredRoute } from "./routes/index"

/**
 * Performs passive route discovery and returns findings
 * Only reports routes that were actually found in the page content
 */
export async function checkRouteDiscovery(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const discovery = await discoverRoutes({
      baseUrl: url,
    })

    // Only proceed if we found routes
    if (discovery.routes.length === 0) {
      results.push({
        category: "Route Discovery",
        title: "Descoberta de Rotas",
        description: "Nenhuma rota adicional foi encontrada na página.",
        risk_level: "info",
      })
      return results
    }

    // Group routes by type for better reporting
    const routesByType = groupRoutesByType(discovery.routes)

    // Report high risk routes (admin, config, debug, backup)
    const highRiskRoutes = discovery.routes.filter(
      (r) => r.riskLevel === "high" && r.isAccessible
    )
    if (highRiskRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: `${highRiskRoutes.length} rota(s) de alto risco encontrada(s)`,
        description: formatRouteListSimple(highRiskRoutes),
        risk_level: "high",
        recommendation:
          "Revise essas rotas para garantir que não expõem dados sensíveis ou funcionalidades administrativas sem proteção adequada.",
        details: {
          routes: highRiskRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report admin routes specifically
    if (routesByType.admin.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Painel administrativo detectado",
        description: `Rota(s) administrativa(s) encontrada(s): ${routesByType.admin.map(r => extractPath(r.url)).join(", ")}`,
        risk_level: "high",
        recommendation:
          "Certifique-se de que rotas administrativas estão protegidas por autenticação forte e não são facilmente descobertas.",
        details: {
          routes: routesByType.admin.map(formatRouteDetail),
        },
      })
    }

    // Report config files
    if (routesByType.config.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Arquivos de configuração expostos",
        description: `Arquivo(s) de configuração encontrado(s): ${routesByType.config.map(r => extractPath(r.url)).join(", ")}`,
        risk_level: "critical",
        recommendation:
          "Arquivos de configuração NUNCA devem estar acessíveis publicamente. Remova imediatamente o acesso a esses arquivos.",
        details: {
          routes: routesByType.config.map(formatRouteDetail),
        },
      })
    }

    // Report debug/dev routes
    if (routesByType.debug.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Rotas de desenvolvimento expostas",
        description: `Rota(s) de debug/dev encontrada(s): ${routesByType.debug.map(r => extractPath(r.url)).join(", ")}`,
        risk_level: "high",
        recommendation:
          "Rotas de debug e desenvolvimento devem ser desabilitadas em produção.",
        details: {
          routes: routesByType.debug.map(formatRouteDetail),
        },
      })
    }

    // Report API endpoints
    if (routesByType.api.length > 0) {
      results.push({
        category: "Route Discovery",
        title: `${routesByType.api.length} endpoint(s) de API encontrado(s)`,
        description: `Endpoints: ${routesByType.api.map(r => extractPath(r.url)).join(", ")}`,
        risk_level: "medium",
        recommendation:
          "Verifique se todos os endpoints de API possuem autenticação e autorização adequadas.",
        details: {
          routes: routesByType.api.map(formatRouteDetail),
        },
      })
    }

    // Report auth routes
    if (routesByType.auth.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Rotas de autenticação encontradas",
        description: `Rota(s) de login/auth: ${routesByType.auth.map(r => extractPath(r.url)).join(", ")}`,
        risk_level: "info",
        recommendation:
          "Certifique-se de que as rotas de autenticação utilizam HTTPS, proteção contra brute-force e tokens CSRF.",
        details: {
          routes: routesByType.auth.map(formatRouteDetail),
        },
      })
    }

    // Summary of all discovered routes
    const accessibleRoutes = discovery.routes.filter(r => r.isAccessible)
    if (accessibleRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Resumo da Descoberta de Rotas",
        description: `Foram encontradas ${accessibleRoutes.length} rota(s) acessível(eis) na página: ${accessibleRoutes.slice(0, 10).map(r => extractPath(r.url)).join(", ")}${accessibleRoutes.length > 10 ? ` e mais ${accessibleRoutes.length - 10}...` : ""}`,
        risk_level: "info",
        details: {
          totalFound: discovery.routes.length,
          totalAccessible: discovery.totalAccessible,
          byType: {
            admin: routesByType.admin.length,
            api: routesByType.api.length,
            auth: routesByType.auth.length,
            config: routesByType.config.length,
            debug: routesByType.debug.length,
            other: routesByType.other.length,
          },
          routes: accessibleRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report errors if any
    if (discovery.errors.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Erros durante a descoberta",
        description: discovery.errors.slice(0, 3).join("; "),
        risk_level: "info",
        details: {
          errors: discovery.errors,
        },
      })
    }
  } catch (error) {
    results.push({
      category: "Route Discovery",
      title: "Erro na descoberta de rotas",
      description: `Não foi possível realizar a descoberta de rotas: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      risk_level: "info",
    })
  }

  return results
}

function groupRoutesByType(routes: DiscoveredRoute[]) {
  return {
    admin: routes.filter(r => r.type === "admin" && r.isAccessible),
    api: routes.filter(r => r.type === "api" && r.isAccessible),
    auth: routes.filter(r => r.type === "auth" && r.isAccessible),
    config: routes.filter(r => r.type === "config" && r.isAccessible),
    debug: routes.filter(r => r.type === "debug" && r.isAccessible),
    backup: routes.filter(r => r.type === "backup" && r.isAccessible),
    sensitive: routes.filter(r => r.type === "sensitive" && r.isAccessible),
    other: routes.filter(r => 
      !["admin", "api", "auth", "config", "debug", "backup", "sensitive"].includes(r.type) && 
      r.isAccessible
    ),
  }
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function formatRouteListSimple(routes: DiscoveredRoute[]): string {
  return routes
    .slice(0, 5)
    .map((r) => `${extractPath(r.url)} (${r.type})`)
    .join(", ")
}

function formatRouteDetail(route: DiscoveredRoute) {
  return {
    path: extractPath(route.url),
    url: route.url,
    status: route.status,
    type: route.type,
    riskLevel: route.riskLevel,
    contentType: route.contentType,
    indicators: route.indicators,
  }
}
