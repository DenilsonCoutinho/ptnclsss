import { neon } from "@neondatabase/serverless"

export const sql = neon(process.env.DATABASE_URL!)

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

export async function createScan(url: string, email?: string): Promise<Scan> {
  const result = await sql`
    INSERT INTO scans (url, email, status)
    VALUES (${url}, ${email || null}, 'pending')
    RETURNING *
  `
  return result[0] as Scan
}

export async function getScan(id: string): Promise<Scan | null> {
  const result = await sql`
    SELECT * FROM scans WHERE id = ${id}
  `
  return (result[0] as Scan) || null
}

export async function updateScan(
  id: string,
  data: Partial<Pick<Scan, "status" | "score" | "started_at" | "completed_at" | "error_message">>
): Promise<Scan | null> {
  const updates: string[] = []
  const values: unknown[] = []

  if (data.status !== undefined) {
    updates.push(`status = $${values.length + 1}`)
    values.push(data.status)
  }
  if (data.score !== undefined) {
    updates.push(`score = $${values.length + 1}`)
    values.push(data.score)
  }
  if (data.started_at !== undefined) {
    updates.push(`started_at = $${values.length + 1}`)
    values.push(data.started_at)
  }
  if (data.completed_at !== undefined) {
    updates.push(`completed_at = $${values.length + 1}`)
    values.push(data.completed_at)
  }
  if (data.error_message !== undefined) {
    updates.push(`error_message = $${values.length + 1}`)
    values.push(data.error_message)
  }

  if (updates.length === 0) return getScan(id)

  const result = await sql`
    UPDATE scans 
    SET status = ${data.status || 'pending'},
        score = ${data.score ?? null},
        started_at = ${data.started_at ?? null},
        completed_at = ${data.completed_at ?? null},
        error_message = ${data.error_message ?? null}
    WHERE id = ${id}
    RETURNING *
  `
  return (result[0] as Scan) || null
}

export async function createFinding(finding: Omit<Finding, "id" | "created_at">): Promise<Finding> {
  const result = await sql`
    INSERT INTO findings (scan_id, category, title, description, risk_level, recommendation, details)
    VALUES (
      ${finding.scan_id}, 
      ${finding.category}, 
      ${finding.title}, 
      ${finding.description}, 
      ${finding.risk_level}, 
      ${finding.recommendation || null}, 
      ${finding.details ? JSON.stringify(finding.details) : null}
    )
    RETURNING *
  `
  return result[0] as Finding
}

export async function getFindingsByScan(scanId: string): Promise<Finding[]> {
  const result = await sql`
    SELECT * FROM findings WHERE scan_id = ${scanId} ORDER BY 
      CASE risk_level 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
        WHEN 'info' THEN 5 
      END
  `
  return result as Finding[]
}
