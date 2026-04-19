"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Shield, Mail, Globe } from "lucide-react"

export function ScanForm() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email: email || undefined }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Erro ao iniciar scan")
        setIsLoading(false)
        return
      }

      router.push(`/results/${data.scanId}`)
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
        <div className="space-y-4">
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="exemplo.com.br"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-12 h-14 text-lg bg-background"
              required
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="seu@email.com (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12 h-14 text-lg bg-background"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-destructive text-sm font-medium">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            disabled={isLoading || !url}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Analisando...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                Analisar Segurança
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Análise 100% passiva. Não realizamos nenhuma ação invasiva.
        </p>
      </div>
    </form>
  )
}
