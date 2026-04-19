// Route Discovery Check - integrates with the scanner system

import type { CheckResult } from "../index"
import { discoverRoutes, type DiscoveredRoute } from "./routes/index"

/**
 * Performs public route discovery and returns findings
 */
export async function checkRouteDiscovery(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const discovery = await discoverRoutes({
      baseUrl: url,
    })

    // Add summary finding
    results.push({
      category: "Route Discovery",
      title: "Descoberta de Rotas Públicas",
      description: `Foram analisadas ${discovery.totalAnalyzed} rotas, ${discovery.totalAccessible} estão acessíveis.`,
      risk_level: "info",
      details: {
        totalAnalyzed: discovery.totalAnalyzed,
        totalAccessible: discovery.totalAccessible,
        errors: discovery.errors,
      },
    })

    // Group routes by risk level
    const highRiskRoutes = discovery.routes.filter(
      (r) => r.riskLevel === "high" && r.isAccessible
    )
    const mediumRiskRoutes = discovery.routes.filter(
      (r) => r.riskLevel === "medium" && r.isAccessible
    )

    // Report high risk routes
    if (highRiskRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: `${highRiskRoutes.length} rota(s) de alto risco detectada(s)`,
        description: formatRouteList(highRiskRoutes),
        risk_level: "high",
        recommendation:
          "Revise essas rotas para garantir que não expõem dados sensíveis ou funcionalidades administrativas sem proteção adequada.",
        details: {
          routes: highRiskRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report medium risk routes
    if (mediumRiskRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: `${mediumRiskRoutes.length} rota(s) de risco médio detectada(s)`,
        description: formatRouteList(mediumRiskRoutes),
        risk_level: "medium",
        recommendation:
          "Verifique se essas rotas possuem controles de acesso apropriados.",
        details: {
          routes: mediumRiskRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report admin routes found
    const adminRoutes = discovery.routes.filter(
      (r) => r.type === "admin" && r.isAccessible
    )
    if (adminRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Rotas administrativas expostas",
        description: `Foram encontradas ${adminRoutes.length} rota(s) administrativa(s) publicamente acessíveis: ${adminRoutes.map((r) => r.url).join(", ")}`,
        risk_level: "high",
        recommendation:
          "Rotas administrativas devem estar protegidas por autenticação e preferencialmente não devem ser descobertas facilmente.",
        details: {
          routes: adminRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report debug routes found
    const debugRoutes = discovery.routes.filter(
      (r) => r.type === "debug" && r.isAccessible
    )
    if (debugRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Rotas de debug/teste expostas",
        description: `Foram encontradas ${debugRoutes.length} rota(s) de debug/teste publicamente acessíveis: ${debugRoutes.map((r) => r.url).join(", ")}`,
        risk_level: "high",
        recommendation:
          "Rotas de debug e teste devem ser desabilitadas em produção para evitar vazamento de informações.",
        details: {
          routes: debugRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report API endpoints found
    const apiRoutes = discovery.routes.filter(
      (r) => r.type === "api" && r.isAccessible
    )
    if (apiRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: `${apiRoutes.length} endpoint(s) de API detectado(s)`,
        description: `Endpoints de API públicos encontrados: ${apiRoutes.map((r) => r.url).join(", ")}`,
        risk_level: "medium",
        recommendation:
          "Verifique se todos os endpoints de API possuem autenticação e autorização adequadas.",
        details: {
          routes: apiRoutes.map(formatRouteDetail),
        },
      })
    }

    // Report config files found
    const configRoutes = discovery.routes.filter(
      (r) => r.type === "config" && r.isAccessible
    )
    if (configRoutes.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Arquivos de configuração expostos",
        description: `Foram encontrados arquivos de configuração publicamente acessíveis: ${configRoutes.map((r) => r.url).join(", ")}`,
        risk_level: "critical",
        recommendation:
          "Arquivos de configuração NUNCA devem estar acessíveis publicamente. Remova imediatamente o acesso a esses arquivos.",
        details: {
          routes: configRoutes.map(formatRouteDetail),
        },
      })
    }

    // Add errors if any
    if (discovery.errors.length > 0) {
      results.push({
        category: "Route Discovery",
        title: "Erros durante a descoberta de rotas",
        description: `Ocorreram ${discovery.errors.length} erro(s) durante a análise: ${discovery.errors.slice(0, 3).join("; ")}`,
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

function formatRouteList(routes: DiscoveredRoute[]): string {
  return routes
    .slice(0, 5)
    .map((r) => `${r.url} (${r.type}, ${r.indicators.join(", ")})`)
    .join("; ")
}

function formatRouteDetail(route: DiscoveredRoute) {
  return {
    url: route.url,
    status: route.status,
    type: route.type,
    riskLevel: route.riskLevel,
    contentType: route.contentType,
    indicators: route.indicators,
  }
}
