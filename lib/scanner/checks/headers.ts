import type { CheckResult } from "../index"

const SECURITY_HEADERS = {
  "strict-transport-security": {
    title: "HTTP Strict Transport Security (HSTS)",
    critical: true,
    recommendation: "Adicione o header 'Strict-Transport-Security: max-age=31536000; includeSubDomains' para forçar conexões HTTPS.",
  },
  "content-security-policy": {
    title: "Content Security Policy (CSP)",
    critical: true,
    recommendation: "Implemente uma Content Security Policy para prevenir ataques XSS e injeção de código.",
  },
  "x-content-type-options": {
    title: "X-Content-Type-Options",
    critical: false,
    recommendation: "Adicione 'X-Content-Type-Options: nosniff' para prevenir MIME type sniffing.",
  },
  "x-frame-options": {
    title: "X-Frame-Options",
    critical: false,
    recommendation: "Adicione 'X-Frame-Options: DENY' ou 'SAMEORIGIN' para prevenir clickjacking.",
  },
  "x-xss-protection": {
    title: "X-XSS-Protection",
    critical: false,
    recommendation: "Adicione 'X-XSS-Protection: 1; mode=block' como camada adicional de proteção XSS.",
  },
  "referrer-policy": {
    title: "Referrer-Policy",
    critical: false,
    recommendation: "Adicione 'Referrer-Policy: strict-origin-when-cross-origin' para controlar informações de referência.",
  },
  "permissions-policy": {
    title: "Permissions-Policy",
    critical: false,
    recommendation: "Adicione Permissions-Policy para controlar quais features do navegador podem ser usadas.",
  },
}

export async function checkSecurityHeaders(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    })

    const headers = response.headers

    // Check each security header
    for (const [headerName, config] of Object.entries(SECURITY_HEADERS)) {
      const headerValue = headers.get(headerName)

      if (!headerValue) {
        results.push({
          category: "Headers de Segurança",
          title: `${config.title} não encontrado`,
          description: `O header de segurança '${headerName}' não está presente na resposta do servidor.`,
          risk_level: config.critical ? "high" : "medium",
          recommendation: config.recommendation,
          details: { header: headerName },
        })
      } else {
        // Header present - add as info
        results.push({
          category: "Headers de Segurança",
          title: `${config.title} configurado`,
          description: `O header '${headerName}' está presente e configurado.`,
          risk_level: "info",
          details: { header: headerName, value: headerValue },
        })

        // Check for weak HSTS configuration
        if (headerName === "strict-transport-security") {
          const maxAge = headerValue.match(/max-age=(\d+)/)
          if (maxAge && parseInt(maxAge[1]) < 31536000) {
            results.push({
              category: "Headers de Segurança",
              title: "HSTS com max-age baixo",
              description: `O valor de max-age do HSTS (${maxAge[1]} segundos) é menor que o recomendado (31536000 segundos = 1 ano).`,
              risk_level: "low",
              recommendation: "Aumente o max-age do HSTS para pelo menos 1 ano (31536000 segundos).",
              details: { currentMaxAge: maxAge[1] },
            })
          }
        }
      }
    }

    // Check for server information disclosure
    const serverHeader = headers.get("server")
    if (serverHeader && /\d/.test(serverHeader)) {
      results.push({
        category: "Headers de Segurança",
        title: "Versão do servidor exposta",
        description: `O header 'Server' está expondo informações de versão: ${serverHeader}`,
        risk_level: "low",
        recommendation: "Configure o servidor para não expor informações de versão no header 'Server'.",
        details: { server: serverHeader },
      })
    }

    const poweredBy = headers.get("x-powered-by")
    if (poweredBy) {
      results.push({
        category: "Headers de Segurança",
        title: "X-Powered-By exposto",
        description: `O header 'X-Powered-By' está expondo tecnologia usada: ${poweredBy}`,
        risk_level: "low",
        recommendation: "Remova o header 'X-Powered-By' para não expor a stack tecnológica.",
        details: { poweredBy },
      })
    }
  } catch (error) {
    results.push({
      category: "Headers de Segurança",
      title: "Erro ao verificar headers",
      description: `Não foi possível verificar os headers de segurança: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      risk_level: "medium",
    })
  }

  return results
}
