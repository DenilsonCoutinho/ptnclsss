import { cn } from "@/lib/utils"
import { AlertTriangle, AlertCircle, Info, ShieldAlert, ShieldCheck } from "lucide-react"

type RiskLevel = "critical" | "high" | "medium" | "low" | "info"

const riskConfig: Record<RiskLevel, { label: string; className: string; icon: typeof AlertTriangle }> = {
  critical: {
    label: "Crítico",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: ShieldAlert,
  },
  high: {
    label: "Alto",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertTriangle,
  },
  medium: {
    label: "Médio",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertCircle,
  },
  low: {
    label: "Baixo",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Info,
  },
  info: {
    label: "Info",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: ShieldCheck,
  },
}

interface SecurityBadgeProps {
  level: RiskLevel
  className?: string
  showIcon?: boolean
}

export function SecurityBadge({ level, className, showIcon = true }: SecurityBadgeProps) {
  const config = riskConfig[level]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </span>
  )
}
