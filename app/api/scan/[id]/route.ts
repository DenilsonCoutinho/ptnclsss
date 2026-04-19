import { NextRequest, NextResponse } from "next/server"
import { getScan, getFindingsByScan } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scan = await getScan(id)

    if (!scan) {
      return NextResponse.json(
        { success: false, error: "Scan não encontrado" },
        { status: 404 }
      )
    }

    // If scan is completed or failed, include findings
    let findings = null
    if (scan.status === "completed" || scan.status === "failed") {
      findings = await getFindingsByScan(id)
    }

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        url: scan.url,
        status: scan.status,
        score: scan.score,
        startedAt: scan.started_at,
        completedAt: scan.completed_at,
        createdAt: scan.created_at,
        errorMessage: scan.error_message,
      },
      findings: findings?.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        description: f.description,
        riskLevel: f.risk_level,
        recommendation: f.recommendation,
        details: f.details,
      })),
    })
  } catch (error) {
    console.error("Error fetching scan:", error)
    return NextResponse.json(
      { success: false, error: "Erro ao buscar scan" },
      { status: 500 }
    )
  }
}
