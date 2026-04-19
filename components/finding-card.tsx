"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { SecurityBadge } from "./security-badge"
import { ChevronDown, Lightbulb } from "lucide-react"

interface FindingCardProps {
  title: string
  description: string
  riskLevel: "critical" | "high" | "medium" | "low" | "info"
  category: string
  recommendation?: string | null
  details?: Record<string, unknown> | null
}

export function FindingCard({
  title,
  description,
  riskLevel,
  category,
  recommendation,
  details,
}: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(riskLevel === "critical" || riskLevel === "high")

  const borderColors = {
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
    info: "border-l-gray-400",
  }

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden border-l-4 transition-all",
        borderColors[riskLevel]
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between gap-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SecurityBadge level={riskLevel} />
            <span className="text-xs text-muted-foreground">{category}</span>
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {!isExpanded && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {description}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          {recommendation && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">
                    Recomendação
                  </p>
                  <p className="text-sm text-foreground">{recommendation}</p>
                </div>
              </div>
            </div>
          )}

          {details && Object.keys(details).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Detalhes Técnicos
              </p>
              <pre className="text-xs text-foreground overflow-x-auto font-mono">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
