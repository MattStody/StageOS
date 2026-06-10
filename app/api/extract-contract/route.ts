import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import type { ObligationType, ObligationRisk } from '@/lib/types'

interface ExtractedObligation {
  title: string
  description: string
  type: ObligationType
  dueDate: string | null
  amount: number | null
  risk: ObligationRisk
  owner: string
  notes: string
}

function fallbackObligations(contractInfo: { partyName: string; contractType: string }): ExtractedObligation[] {
  return [
    {
      title: `Signature required — ${contractInfo.partyName}`,
      description: 'Contract requires signed execution by all parties.',
      type: 'signature_required',
      dueDate: null,
      amount: null,
      risk: 'high',
      owner: contractInfo.partyName,
      notes: 'Extracted from contract (AI unavailable — placeholder)',
    },
  ]
}

const EXTRACTION_PROMPT = (info: { partyName: string; contractType: string; productionName: string; fee: number }) => `
You are a theatrical production management assistant. Analyze this contract and extract every contractual obligation, deadline, payment, and requirement.

Contract context:
- Party: ${info.partyName}
- Type: ${info.contractType}
- Production: ${info.productionName}
- Fee: $${info.fee.toLocaleString()}

Return a JSON array of obligations. Each obligation must have exactly these fields:
- title: string (concise label, ≤60 chars)
- description: string (plain English explanation of the obligation)
- type: one of: signature_required | payment_due | royalty_payment | royalty_statement | report_due | insurance_required | approval_required | deliverable_due | renewal_deadline | option_deadline | expiry_date | termination_notice | reimbursement_due | tax_form_required | rights_restriction | publicity_credit | confidentiality | compliance | other
- dueDate: ISO date string (YYYY-MM-DD) or null if no specific date
- amount: number or null if not monetary
- risk: one of: low | medium | high | critical
- owner: string (party responsible — either the production company or "${info.partyName}")
- notes: string (any additional context or caveats)

Return ONLY the JSON array, no other text. If you cannot find obligations, return [].
`.trim()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileBase64, mediaType, contractInfo } = body as {
      fileBase64: string
      mediaType: string
      contractInfo: { partyName: string; contractType: string; productionName: string; fee: number }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ obligations: fallbackObligations(contractInfo), demo: true })
    }

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType as 'application/pdf',
                data: fileBase64,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT(contractInfo),
            },
          ],
        },
      ],
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? '[]'
    let obligations: ExtractedObligation[] = []
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      obligations = JSON.parse(cleaned)
    } catch {
      obligations = fallbackObligations(contractInfo)
    }

    return Response.json({ obligations })
  } catch (err) {
    console.error('[extract-contract]', err)
    return Response.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
