"use client"

import { useEffect, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Shield, CheckCircle, XCircle, Clock } from "lucide-react"

const scanSteps = [
  { id: "headers", label: "Verificando headers de segurança..." },
  { id: "ssl", label: "Analisando certificado SSL/TLS..." },
  { id: "cookies", label: "Inspecionando cookies..." },
  { id: "content", label: "Analisando conteúdo da página..." },
  { id: "dns", label: "Verificando configurações de DNS..." },
]

interface ScanStatusProps {
  status: "pending" | "running" | "completed" | "failed"
  onComplete?: () => void
}

export function ScanStatus({ status, onComplete }: ScanStatusProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1
          if (next < scanSteps.length) {
            setCompletedSteps((steps) => [...steps, prev])
            return next
          }
          return prev
        })
      }, 1500)

      return () => clearInterval(interval)
    }

    if (status === "completed") {
      setCompletedSteps(scanSteps.map((_, i) => i))
      onComplete?.()
    }
  }, [status, onComplete])

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Clock className="h-12 w-12 text-muted-foreground animate-pulse" />
        <p className="text-muted-foreground">Aguardando início do scan...</p>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Falha ao analisar o site</p>
        <p className="text-sm text-muted-foreground">
          Verifique se a URL está correta e tente novamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-8">
      <div className="flex items-center justify-center gap-3">
        <Shield className="h-8 w-8 text-primary animate-pulse" />
        <span className="text-lg font-semibold">Analisando segurança...</span>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {scanSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(index)
          const isCurrent = index === currentStep && status === "running"

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isCompleted
                  ? "bg-green-50 border border-green-200"
                  : isCurrent
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-muted/50 border border-transparent"
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              ) : isCurrent ? (
                <Spinner className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isCompleted
                    ? "text-green-700"
                    : isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
