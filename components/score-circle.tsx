"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface ScoreCircleProps {
  score: number
  size?: "sm" | "md" | "lg"
  animated?: boolean
}

export function ScoreCircle({ score, size = "lg", animated = true }: ScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score)
      return
    }

    let current = 0
    const increment = score / 50
    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setDisplayScore(score)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.floor(current))
      }
    }, 20)

    return () => clearInterval(timer)
  }, [score, animated])

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-500"
    if (s >= 60) return "text-yellow-500"
    if (s >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getGradient = (s: number) => {
    if (s >= 80) return "from-green-500 to-emerald-400"
    if (s >= 60) return "from-yellow-500 to-amber-400"
    if (s >= 40) return "from-orange-500 to-amber-500"
    return "from-red-500 to-rose-400"
  }

  const getLabel = (s: number) => {
    if (s >= 80) return "Excelente"
    if (s >= 60) return "Bom"
    if (s >= 40) return "Regular"
    return "Crítico"
  }

  const sizeClasses = {
    sm: "h-24 w-24 text-2xl",
    md: "h-32 w-32 text-4xl",
    lg: "h-44 w-44 text-6xl",
  }

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (displayScore / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn("relative", sizeClasses[size])}>
        {/* Background circle */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={cn("stop-color-current", getScoreColor(displayScore))} stopColor="currentColor" />
              <stop offset="100%" className={cn("stop-color-current", getScoreColor(displayScore))} stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>

        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold tabular-nums", getScoreColor(displayScore))}>
            {displayScore}
          </span>
          <span className="text-xs text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>

      <span className={cn("text-sm font-semibold", getScoreColor(score))}>
        {getLabel(score)}
      </span>
    </div>
  )
}
