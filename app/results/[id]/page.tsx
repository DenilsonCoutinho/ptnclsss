"use client"

import { useEffect, useState, use } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ScanStatus } from "@/components/scan-status"
import { ScoreCircle } from "@/components/score-circle"
import { FindingCard } from "@/components/finding-card"
import { SecurityBadge } from "@/components/security-badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Share2, RefreshCw, Download } from "lucide-react"
import Link from "next/link"

type RiskLevel = "critical" | "high" | "medium" | "low" | "info"

interface Finding {
  id: string
  category: string
  title: string
  description: string
  riskLevel: RiskLevel
  recommendation: string | null
  details: Record<string, unknown> | null
}

interface ScanData {
  id: string
  url: string
  status: "pending" | "running" | "completed" | "failed"
  score: number | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  errorMessage: string | null
}

interface ApiResponse {
  success: boolean
  scan: ScanData
  findings: Finding[] | null
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchScan = async () => {
    try {
      const response = await fetch(`/api/scan/${id}`)
      const result = await response.json()

      if (!result.success) {
        setError(result.error || "Erro ao carregar resultados")
        return
      }

      setData(result)

      // Poll if still running
      if (result.scan.status === "pending" || result.scan.status === "running") {
        setTimeout(fetchScan, 2000)
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchScan()
  }, [id])

  const groupedFindings = data?.findings?.reduce((acc, finding) => {
    if (!acc[finding.category]) {
      acc[finding.category] = []
    }
    acc[finding.category].push(finding)
    return acc
  }, {} as Record<string, Finding[]>)

  const issueCount = {
    critical: data?.findings?.filter((f) => f.riskLevel === "critical").length || 0,
    high: data?.findings?.filter((f) => f.riskLevel === "high").length || 0,
    medium: data?.findings?.filter((f) => f.riskLevel === "medium").length || 0,
    low: data?.findings?.filter((f) => f.riskLevel === "low").length || 0,
    info: data?.findings?.filter((f) => f.riskLevel === "info").length || 0,
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `SafeCheck - Análise de ${data?.scan.url}`,
        url: window.location.href,
      })
    } catch {
      await navigator.clipboard.writeText(window.location.href)
      alert("Link copiado para a área de transferência!")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <ScanStatus status="pending" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {error || "Scan não encontrado"}
            </h1>
            <p className="text-muted-foreground mb-8">
              Não foi possível carregar os resultados do scan.
            </p>
            <Link href="/">
              <Button>
                <RefreshCw className="mr-2 h-4 w-4" />
                Novo Scan
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const { scan, findings } = data

  // Show loading state while scan is running
  if (scan.status === "pending" || scan.status === "running") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Analisando {scan.url}
              </h1>
              <p className="text-muted-foreground">
                Aguarde enquanto verificamos a segurança do seu site...
              </p>
            </div>
            <ScanStatus status={scan.status} />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Show error state
  if (scan.status === "failed") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto text-center">
            <ScanStatus status="failed" />
            <p className="text-muted-foreground mt-4 mb-8">
              {scan.errorMessage || "Erro desconhecido ao analisar o site."}
            </p>
            <Link href="/">
              <Button>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Relatório de Segurança
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <a
                  href={scan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {scan.url}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
              <Link href="/">
                <Button size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Novo Scan
                </Button>
              </Link>
            </div>
          </div>

          {/* Score and Summary */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ScoreCircle score={scan.score || 0} />

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Resumo da Análise
                </h2>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {issueCount.critical > 0 && (
                    <div className="flex items-center gap-1.5">
                      <SecurityBadge level="critical" />
                      <span className="text-sm text-muted-foreground">
                        {issueCount.critical}
                      </span>
                    </div>
                  )}
                  {issueCount.high > 0 && (
                    <div className="flex items-center gap-1.5">
                      <SecurityBadge level="high" />
                      <span className="text-sm text-muted-foreground">
                        {issueCount.high}
                      </span>
                    </div>
                  )}
                  {issueCount.medium > 0 && (
                    <div className="flex items-center gap-1.5">
                      <SecurityBadge level="medium" />
                      <span className="text-sm text-muted-foreground">
                        {issueCount.medium}
                      </span>
                    </div>
                  )}
                  {issueCount.low > 0 && (
                    <div className="flex items-center gap-1.5">
                      <SecurityBadge level="low" />
                      <span className="text-sm text-muted-foreground">
                        {issueCount.low}
                      </span>
                    </div>
                  )}
                  {issueCount.info > 0 && (
                    <div className="flex items-center gap-1.5">
                      <SecurityBadge level="info" />
                      <span className="text-sm text-muted-foreground">
                        {issueCount.info}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Analisado em{" "}
                  {new Date(scan.completedAt || scan.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </div>

          {/* Findings */}
          {groupedFindings && Object.keys(groupedFindings).length > 0 && (
            <div className="space-y-8">
              <h2 className="text-xl font-semibold text-foreground">
                Descobertas Detalhadas
              </h2>

              {Object.entries(groupedFindings).map(([category, categoryFindings]) => (
                <div key={category}>
                  <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                    {category}
                    <span className="text-sm text-muted-foreground font-normal">
                      ({categoryFindings.length})
                    </span>
                  </h3>

                  <div className="space-y-3">
                    {categoryFindings.map((finding) => (
                      <FindingCard
                        key={finding.id}
                        title={finding.title}
                        description={finding.description}
                        riskLevel={finding.riskLevel}
                        category={finding.category}
                        recommendation={finding.recommendation}
                        details={finding.details}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
