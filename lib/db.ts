import { prisma } from "@/lib/prisma"
import type { Scan as PrismaScan, Finding as PrismaFinding } from "@/src/generated/prisma/models"

export type Scan = {
  id: string
  url: string
  email: string | null
  status: "pending" | "running" | "completed" | "failed"
  score: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  error_message: string | null
}

export type Finding = {
  id: string
  scan_id: string
  category: string
  title: string
  description: string
  risk_level: "critical" | "high" | "medium" | "low" | "info"
  recommendation: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Helper to convert Prisma Scan to our Scan type
function toScan(prismaScan: PrismaScan): Scan {
  return {
    id: prismaScan.id,
    url: prismaScan.url,
    email: prismaScan.email,
    status: prismaScan.status as Scan["status"],
    score: prismaScan.score,
    started_at: prismaScan.startedAt?.toISOString() ?? null,
    completed_at: prismaScan.completedAt?.toISOString() ?? null,
    created_at: prismaScan.createdAt.toISOString(),
    error_message: prismaScan.errorMessage,
  }
}

// Helper to convert Prisma Finding to our Finding type
function toFinding(prismaFinding: PrismaFinding): Finding {
  return {
    id: prismaFinding.id,
    scan_id: prismaFinding.scanId,
    category: prismaFinding.category,
    title: prismaFinding.title,
    description: prismaFinding.description,
    risk_level: prismaFinding.riskLevel as Finding["risk_level"],
    recommendation: prismaFinding.recommendation,
    details: prismaFinding.details as Record<string, unknown> | null,
    created_at: prismaFinding.createdAt.toISOString(),
  }
}

export async function createScan(url: string, email?: string): Promise<Scan> {
  const scan = await prisma.scan.create({
    data: {
      url,
      email: email || null,
      status: "pending",
    },
  })
  return toScan(scan)
}

export async function getScan(id: string): Promise<Scan | null> {
  const scan = await prisma.scan.findUnique({
    where: { id },
  })
  return scan ? toScan(scan) : null
}

export async function updateScan(
  id: string,
  data: Partial<Pick<Scan, "status" | "score" | "started_at" | "completed_at" | "error_message">>
): Promise<Scan | null> {
  const scan = await prisma.scan.update({
    where: { id },
    data: {
      status: data.status,
      score: data.score,
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      errorMessage: data.error_message,
    },
  })
  return toScan(scan)
}

export async function createFinding(finding: Omit<Finding, "id" | "created_at">): Promise<Finding> {
  const created = await prisma.finding.create({
    data: {
      scanId: finding.scan_id,
      category: finding.category,
      title: finding.title,
      description: finding.description,
      riskLevel: finding.risk_level,
      recommendation: finding.recommendation,
      details: finding.details ?? undefined,
    },
  })
  return toFinding(created)
}

export async function getFindingsByScan(scanId: string): Promise<Finding[]> {
  const riskOrder = ["critical", "high", "medium", "low", "info"]
  
  const findings = await prisma.finding.findMany({
    where: { scanId },
  })
  
  // Sort by risk level
  findings.sort((a, b) => {
    return riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel)
  })
  
  return findings.map(toFinding)
}
