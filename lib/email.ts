import nodemailer from "nodemailer"
import type { Scan, Finding } from "./db"

// For production, use a real SMTP service
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function getRiskColor(risk: string): string {
  switch (risk) {
    case "critical":
      return "#dc2626"
    case "high":
      return "#ea580c"
    case "medium":
      return "#ca8a04"
    case "low":
      return "#2563eb"
    default:
      return "#6b7280"
  }
}

function getRiskLabel(risk: string): string {
  switch (risk) {
    case "critical":
      return "Crítico"
    case "high":
      return "Alto"
    case "medium":
      return "Médio"
    case "low":
      return "Baixo"
    default:
      return "Info"
  }
}

export async function sendScanResultsEmail(
  scan: Scan,
  findings: Finding[],
  baseUrl: string
): Promise<void> {
  if (!scan.email || !process.env.SMTP_USER) {
    return
  }

  const criticalCount = findings.filter((f) => f.risk_level === "critical").length
  const highCount = findings.filter((f) => f.risk_level === "high").length
  const mediumCount = findings.filter((f) => f.risk_level === "medium").length
  const lowCount = findings.filter((f) => f.risk_level === "low").length

  const issuesFindings = findings.filter((f) => f.risk_level !== "info")
  const resultsUrl = `${baseUrl}/results/${scan.id}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">SafeCheck</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">Relatório de Segurança</p>
        </div>
        
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 100px; height: 100px; line-height: 100px; border-radius: 50%; font-size: 36px; font-weight: bold; color: white; background-color: ${scan.score && scan.score >= 80 ? "#22c55e" : scan.score && scan.score >= 60 ? "#ca8a04" : "#dc2626"};">
              ${scan.score}
            </div>
            <p style="color: #6b7280; margin: 16px 0 0;">Score de Segurança</p>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">URL Analisada</p>
            <p style="margin: 4px 0 0; color: #0f172a; font-weight: 500;">${scan.url}</p>
          </div>
          
          <div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
            ${criticalCount > 0 ? `<span style="background-color: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 9999px; font-size: 14px;">${criticalCount} Crítico</span>` : ""}
            ${highCount > 0 ? `<span style="background-color: #fff7ed; color: #ea580c; padding: 4px 12px; border-radius: 9999px; font-size: 14px;">${highCount} Alto</span>` : ""}
            ${mediumCount > 0 ? `<span style="background-color: #fefce8; color: #ca8a04; padding: 4px 12px; border-radius: 9999px; font-size: 14px;">${mediumCount} Médio</span>` : ""}
            ${lowCount > 0 ? `<span style="background-color: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 9999px; font-size: 14px;">${lowCount} Baixo</span>` : ""}
          </div>
          
          ${issuesFindings.length > 0 ? `
            <h3 style="color: #0f172a; margin: 0 0 16px;">Principais Descobertas</h3>
            ${issuesFindings.slice(0, 5).map((f) => `
              <div style="border-left: 3px solid ${getRiskColor(f.risk_level)}; padding-left: 12px; margin-bottom: 16px;">
                <span style="background-color: ${getRiskColor(f.risk_level)}20; color: ${getRiskColor(f.risk_level)}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${getRiskLabel(f.risk_level)}</span>
                <p style="margin: 8px 0 4px; color: #0f172a; font-weight: 500;">${f.title}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${f.description}</p>
              </div>
            `).join("")}
          ` : `
            <div style="text-align: center; padding: 24px; background-color: #f0fdf4; border-radius: 8px;">
              <p style="color: #22c55e; font-weight: 500; margin: 0;">Nenhum problema crítico encontrado!</p>
            </div>
          `}
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="${resultsUrl}" style="display: inline-block; background-color: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Ver Relatório Completo</a>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Este email foi enviado pelo SafeCheck. Você recebeu porque solicitou uma análise de segurança.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: `"SafeCheck" <${process.env.SMTP_USER}>`,
    to: scan.email,
    subject: `Relatório SafeCheck: ${scan.url} - Score ${scan.score}/100`,
    html,
  })
}
