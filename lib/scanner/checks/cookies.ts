import type { CheckResult } from "../index"

export async function checkCookies(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    })

    const setCookieHeaders = response.headers.get("set-cookie")

    if (!setCookieHeaders) {
      results.push({
        category: "Cookies",
        title: "Nenhum cookie detectado",
        description: "O site não define cookies na resposta inicial.",
        risk_level: "info",
      })
      return results
    }

    // Parse cookies (simplified parsing)
    const cookies = setCookieHeaders.split(/,(?=\s*[a-zA-Z_][a-zA-Z0-9_]*=)/)

    for (const cookie of cookies) {
      const cookieParts = cookie.split(";").map((p) => p.trim())
      const nameValue = cookieParts[0]
      const cookieName = nameValue.split("=")[0]

      const flags = cookieParts.slice(1).map((p) => p.toLowerCase())
      const hasSecure = flags.some((f) => f === "secure")
      const hasHttpOnly = flags.some((f) => f === "httponly")
      const hasSameSite = flags.some((f) => f.startsWith("samesite"))
      const sameSiteValue = flags.find((f) => f.startsWith("samesite"))?.split("=")[1]

      // Check for missing Secure flag
      if (!hasSecure) {
        results.push({
          category: "Cookies",
          title: `Cookie '${cookieName}' sem flag Secure`,
          description: "O cookie pode ser transmitido em conexões HTTP não seguras.",
          risk_level: "medium",
          recommendation: "Adicione a flag 'Secure' ao cookie para garantir transmissão apenas via HTTPS.",
          details: { cookie: cookieName },
        })
      }

      // Check for missing HttpOnly flag (for session-like cookies)
      const isSessionCookie = /session|auth|token|login|user/i.test(cookieName)
      if (!hasHttpOnly && isSessionCookie) {
        results.push({
          category: "Cookies",
          title: `Cookie '${cookieName}' sem flag HttpOnly`,
          description: "Cookies de sessão sem HttpOnly podem ser acessados via JavaScript, facilitando ataques XSS.",
          risk_level: "high",
          recommendation: "Adicione a flag 'HttpOnly' aos cookies de sessão para prevenir acesso via JavaScript.",
          details: { cookie: cookieName },
        })
      }

      // Check for missing or weak SameSite
      if (!hasSameSite) {
        results.push({
          category: "Cookies",
          title: `Cookie '${cookieName}' sem atributo SameSite`,
          description: "Cookies sem SameSite podem ser enviados em requisições cross-site, facilitando ataques CSRF.",
          risk_level: "medium",
          recommendation: "Adicione 'SameSite=Strict' ou 'SameSite=Lax' ao cookie.",
          details: { cookie: cookieName },
        })
      } else if (sameSiteValue === "none" && !hasSecure) {
        results.push({
          category: "Cookies",
          title: `Cookie '${cookieName}' com SameSite=None sem Secure`,
          description: "SameSite=None requer a flag Secure para funcionar corretamente.",
          risk_level: "high",
          recommendation: "Adicione a flag 'Secure' junto com 'SameSite=None'.",
          details: { cookie: cookieName },
        })
      }

      // If cookie is properly configured
      if (hasSecure && (hasHttpOnly || !isSessionCookie) && hasSameSite && sameSiteValue !== "none") {
        results.push({
          category: "Cookies",
          title: `Cookie '${cookieName}' bem configurado`,
          description: "O cookie possui as flags de segurança recomendadas.",
          risk_level: "info",
          details: { cookie: cookieName, flags: flags.join(", ") },
        })
      }
    }
  } catch (error) {
    results.push({
      category: "Cookies",
      title: "Erro ao verificar cookies",
      description: `Não foi possível verificar os cookies: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      risk_level: "medium",
    })
  }

  return results
}
