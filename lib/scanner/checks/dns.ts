import type { CheckResult } from "../index"

export async function checkDNS(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname

    // Check for www redirect
    const hasWww = domain.startsWith("www.")
    const baseDomain = hasWww ? domain.slice(4) : domain
    const wwwDomain = hasWww ? domain : `www.${domain}`

    // Try both www and non-www versions
    try {
      const wwwResponse = await fetch(`https://${wwwDomain}`, { method: "HEAD", redirect: "manual" })
      const nonWwwResponse = await fetch(`https://${baseDomain}`, { method: "HEAD", redirect: "manual" })

      const wwwWorks = wwwResponse.ok || wwwResponse.status === 301 || wwwResponse.status === 302
      const nonWwwWorks = nonWwwResponse.ok || nonWwwResponse.status === 301 || nonWwwResponse.status === 302

      if (wwwWorks && nonWwwWorks) {
        // Check if one redirects to the other
        const wwwLocation = wwwResponse.headers.get("location")
        const nonWwwLocation = nonWwwResponse.headers.get("location")

        if (!wwwLocation && !nonWwwLocation) {
          results.push({
            category: "DNS & Domínio",
            title: "Ambas versões www e não-www acessíveis",
            description: "Tanto a versão www quanto a não-www respondem sem redirecionamento, o que pode causar problemas de SEO.",
            risk_level: "low",
            recommendation: "Configure um redirecionamento canônico de uma versão para outra.",
            details: { wwwDomain, baseDomain },
          })
        } else {
          results.push({
            category: "DNS & Domínio",
            title: "Redirecionamento www configurado",
            description: "O domínio está configurado com redirecionamento apropriado entre versões www e não-www.",
            risk_level: "info",
          })
        }
      }
    } catch {
      // One of them might not be configured - this is fine
    }

    // Check for common security.txt
    try {
      const securityTxtUrls = [
        `https://${domain}/.well-known/security.txt`,
        `https://${domain}/security.txt`,
      ]

      let securityTxtFound = false
      for (const securityUrl of securityTxtUrls) {
        try {
          const response = await fetch(securityUrl, { method: "GET" })
          if (response.ok) {
            securityTxtFound = true
            const content = await response.text()
            if (content.includes("Contact:")) {
              results.push({
                category: "DNS & Domínio",
                title: "security.txt presente",
                description: "O arquivo security.txt está configurado, facilitando o reporte responsável de vulnerabilidades.",
                risk_level: "info",
              })
            }
            break
          }
        } catch {
          // Continue checking other URL
        }
      }

      if (!securityTxtFound) {
        results.push({
          category: "DNS & Domínio",
          title: "security.txt não encontrado",
          description: "O arquivo security.txt não está presente. Este arquivo ajuda pesquisadores de segurança a reportar vulnerabilidades.",
          risk_level: "info",
          recommendation: "Crie um arquivo security.txt em /.well-known/security.txt com informações de contato.",
        })
      }
    } catch {
      // Error checking security.txt
    }

    // Check for robots.txt
    try {
      const robotsResponse = await fetch(`https://${domain}/robots.txt`, { method: "GET" })
      if (robotsResponse.ok) {
        const robotsContent = await robotsResponse.text()

        // Check for sensitive paths being blocked
        const sensitivePaths = ["/admin", "/api", "/config", "/backup", "/.git", "/.env"]
        const blockedPaths = sensitivePaths.filter(
          (path) =>
            robotsContent.includes(`Disallow: ${path}`) || robotsContent.includes(`Disallow: ${path}/`)
        )

        if (blockedPaths.length > 0) {
          results.push({
            category: "DNS & Domínio",
            title: "robots.txt bloqueia caminhos sensíveis",
            description: `O robots.txt está bloqueando caminhos sensíveis: ${blockedPaths.join(", ")}. Note que isso não impede acesso direto.`,
            risk_level: "info",
            details: { blockedPaths },
          })
        }

        results.push({
          category: "DNS & Domínio",
          title: "robots.txt presente",
          description: "O arquivo robots.txt está configurado.",
          risk_level: "info",
        })
      }
    } catch {
      // robots.txt not found or error
    }
  } catch (error) {
    results.push({
      category: "DNS & Domínio",
      title: "Erro ao verificar DNS",
      description: `Não foi possível verificar configurações de DNS: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      risk_level: "medium",
    })
  }

  return results
}
