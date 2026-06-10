import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'

interface ExtractedActorData {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  startDate: string | null
  endDate: string | null
  weeklyRate: number | null
  paymentSchedule: ('deposit_on_signing' | 'weekly' | 'closing_night_bonus')[]
  productionName: string
  notes: string
}

function fallback(): ExtractedActorData {
  return {
    firstName: '', lastName: '', email: '', phone: '',
    role: '', startDate: null, endDate: null,
    weeklyRate: null, paymentSchedule: [], productionName: '', notes: '',
  }
}

const PROMPT = `
You are a theatrical production assistant. Read this contract document and extract actor engagement details.

Return a single JSON object with exactly these fields:
- firstName: string (actor's first name, or "")
- lastName: string (actor's last name, or "")
- email: string (actor's email address, or "")
- phone: string (actor's phone number, or "")
- role: string (character name or role, e.g. "Hamlet", "Ensemble", or "")
- startDate: string | null (first rehearsal or engagement start, ISO format YYYY-MM-DD, or null)
- endDate: string | null (closing night or contract end, ISO format YYYY-MM-DD, or null)
- weeklyRate: number | null (weekly salary/fee in dollars, or null)
- paymentSchedule: array of zero or more of these exact strings: "deposit_on_signing", "weekly", "closing_night_bonus"
- productionName: string (name of the production/show, or "")
- notes: string (any other relevant contract details worth noting, or "")

Return ONLY the JSON object, no other text.
`.trim()

export async function POST(req: NextRequest) {
  try {
    const { fileBase64, mediaType } = await req.json() as { fileBase64: string; mediaType: string }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ data: fallback(), demo: true })
    }

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType as 'application/pdf', data: fileBase64 },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = (textBlock && 'text' in textBlock ? textBlock.text : null) ?? '{}'
    let data: ExtractedActorData
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      data = JSON.parse(cleaned)
    } catch {
      data = fallback()
    }

    return Response.json({ data })
  } catch (err) {
    console.error('[extract-actor-contract]', err)
    return Response.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
