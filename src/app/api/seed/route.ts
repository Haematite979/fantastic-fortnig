import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

// POST /api/seed — re-seed the database with sample CRM data
export async function POST() {
  try {
    await execAsync('bun run /home/z/my-project/scripts/seed.ts 2>&1 | tail -3')
    return NextResponse.json({ ok: true, message: 'Database re-seeded' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
