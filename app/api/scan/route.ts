import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createScan } from "@/lib/db"
import { runScan } from "@/lib/scanner"

const scanRequestSchema = z.object({
  url: z.string().url("URL inválida").or(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}/, "Domínio inválido")),
  email: z.string().email("Email inválido").optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, email } = scanRequestSchema.parse(body)

    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`

    // Create scan record
    const scan = await createScan(normalizedUrl, email)

    // Start scan in background (don't await)
    runScan(scan.id, normalizedUrl).catch((error) => {
      console.error(`Scan ${scan.id} failed:`, error)
    })

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      message: "Scan iniciado com sucesso",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating scan:", error)
    return NextResponse.json(
      { success: false, error: "Erro ao iniciar o scan" },
      { status: 500 }
    )
  }
}
