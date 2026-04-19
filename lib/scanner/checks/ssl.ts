import type { CheckResult } from "../index"

export async function checkSSL(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const urlObj = new URL(url)

  // Check if using HTTPS
  if (urlObj.protocol === "http:") {
    results.push({
      category: "SSL/TLS",
      title: "Site não usa HTTPS",
      description: "O site está usando HTTP ao invés de HTTPS, expondo dados em trânsito a interceptação.",
      risk_level: "critical",
      recommendation: "Configure SSL/TLS e redirecione todo o tráfego HTTP para HTTPS.",
    })
    return results
  }

  try {
    // Try to fetch the site
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
    })

    // Check if HTTPS is working
    if (response.ok || response.status === 301 || response.status === 302) {
      results.push({
        category: "SSL/TLS",
        title: "HTTPS configurado",
        description: "O site está usando HTTPS corretamente.",
        risk_level: "info",
      })
    }

    // Check for HTTP to HTTPS redirect
    try {
      const httpUrl = url.replace("https://", "http://")
      const httpResponse = await fetch(httpUrl, {
        method: "HEAD",
        redirect: "manual",
      })

      if (httpResponse.status === 301 || httpResponse.status === 302) {
        const location = httpResponse.headers.get("location")
        if (location?.startsWith("https://")) {
          results.push({
            category: "SSL/TLS",
            title: "Redirecionamento HTTP para HTTPS",
            description: "O site redireciona corretamente de HTTP para HTTPS.",
            risk_level: "info",
          })
        }
      } else if (httpResponse.ok) {
        results.push({
          category: "SSL/TLS",
          title: "HTTP não redireciona para HTTPS",
          description: "O site responde em HTTP sem redirecionar para HTTPS.",
          risk_level: "high",
          recommendation: "Configure um redirecionamento 301 de HTTP para HTTPS.",
        })
      }
    } catch {
      // HTTP version not accessible - this is fine
    }
  } catch (error) {
    // Check if it's an SSL error
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
    
    if (errorMessage.includes("certificate") || errorMessage.includes("SSL") || errorMessage.includes("TLS")) {
      results.push({
        category: "SSL/TLS",
        title: "Erro de certificado SSL",
        description: `Problema detectado com o certificado SSL: ${errorMessage}`,
        risk_level: "critical",
        recommendation: "Verifique a validade e configuração do certificado SSL.",
      })
    } else {
      results.push({
        category: "SSL/TLS",
        title: "Erro ao verificar SSL",
        description: `Não foi possível verificar a configuração SSL: ${errorMessage}`,
        risk_level: "medium",
      })
    }
  }

  return results
}
