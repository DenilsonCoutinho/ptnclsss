import type { CheckResult } from "../index"

export async function checkContentAnalysis(url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    })

    const html = await response.text()

    // Check for forms with action over HTTP
    const httpFormActions = html.match(/<form[^>]*action=["']http:\/\/[^"']+["']/gi)
    if (httpFormActions) {
      results.push({
        category: "Análise de Conteúdo",
        title: "Formulários enviando para HTTP",
        description: `Detectados ${httpFormActions.length} formulário(s) com action apontando para URLs HTTP não seguras.`,
        risk_level: "high",
        recommendation: "Altere todas as actions de formulários para usar HTTPS.",
        details: { count: httpFormActions.length },
      })
    }

    // Check for mixed content (HTTP resources on HTTPS page)
    const mixedContent = []
    const httpScripts = html.match(/<script[^>]*src=["']http:\/\/[^"']+["']/gi)
    const httpStyles = html.match(/<link[^>]*href=["']http:\/\/[^"']+["'][^>]*stylesheet/gi)
    const httpImages = html.match(/<img[^>]*src=["']http:\/\/[^"']+["']/gi)
    const httpIframes = html.match(/<iframe[^>]*src=["']http:\/\/[^"']+["']/gi)

    if (httpScripts) mixedContent.push({ type: "scripts", count: httpScripts.length })
    if (httpStyles) mixedContent.push({ type: "styles", count: httpStyles.length })
    if (httpImages) mixedContent.push({ type: "images", count: httpImages.length })
    if (httpIframes) mixedContent.push({ type: "iframes", count: httpIframes.length })

    if (mixedContent.length > 0) {
      results.push({
        category: "Análise de Conteúdo",
        title: "Conteúdo misto detectado",
        description: "A página carrega recursos via HTTP em uma página HTTPS, o que pode ser bloqueado pelo navegador.",
        risk_level: "high",
        recommendation: "Atualize todas as referências de recursos para usar HTTPS.",
        details: { mixedContent },
      })
    } else {
      results.push({
        category: "Análise de Conteúdo",
        title: "Sem conteúdo misto",
        description: "Não foi detectado conteúdo HTTP em página HTTPS.",
        risk_level: "info",
      })
    }

    // Check for inline JavaScript event handlers (potential XSS vectors)
    const inlineEventHandlers = html.match(/\son\w+\s*=\s*["'][^"']+["']/gi)
    if (inlineEventHandlers && inlineEventHandlers.length > 10) {
      results.push({
        category: "Análise de Conteúdo",
        title: "Muitos event handlers inline",
        description: `Detectados ${inlineEventHandlers.length} event handlers JavaScript inline. Isso pode indicar práticas que dificultam a implementação de CSP.`,
        risk_level: "low",
        recommendation: "Considere mover event handlers para arquivos JavaScript externos.",
        details: { count: inlineEventHandlers.length },
      })
    }

    // Check for sensitive data patterns
    const emailPatterns = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    const phonePatterns = html.match(/\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g)

    if (emailPatterns && emailPatterns.length > 5) {
      results.push({
        category: "Análise de Conteúdo",
        title: "Múltiplos emails expostos",
        description: `Detectados ${emailPatterns.length} endereços de email no HTML. Isso pode facilitar spam e phishing.`,
        risk_level: "low",
        recommendation: "Considere ofuscar emails ou usar formulários de contato.",
        details: { count: emailPatterns.length },
      })
    }

    // Check for comments that might expose sensitive info
    const htmlComments = html.match(/<!--[\s\S]*?-->/g)
    if (htmlComments) {
      const sensitiveComments = htmlComments.filter((comment) =>
        /todo|fixme|bug|password|secret|key|token|api|debug|test/i.test(comment)
      )
      if (sensitiveComments.length > 0) {
        results.push({
          category: "Análise de Conteúdo",
          title: "Comentários HTML potencialmente sensíveis",
          description: `Detectados ${sensitiveComments.length} comentários HTML que podem conter informações sensíveis.`,
          risk_level: "low",
          recommendation: "Remova comentários de desenvolvimento do HTML em produção.",
          details: { count: sensitiveComments.length },
        })
      }
    }

    // Check for meta tags
    const robotsMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*>/i)
    const viewportMeta = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)

    if (!viewportMeta) {
      results.push({
        category: "Análise de Conteúdo",
        title: "Meta viewport ausente",
        description: "A meta tag viewport não está configurada, o que pode afetar a usabilidade em dispositivos móveis.",
        risk_level: "info",
        recommendation: "Adicione <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
      })
    }
  } catch (error) {
    results.push({
      category: "Análise de Conteúdo",
      title: "Erro ao analisar conteúdo",
      description: `Não foi possível analisar o conteúdo da página: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      risk_level: "medium",
    })
  }

  return results
}
