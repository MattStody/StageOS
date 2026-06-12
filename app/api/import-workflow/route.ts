import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import type { WorkflowTemplate } from '@/lib/types'

// Converts an existing process document (SOP, checklist, spreadsheet export,
// onboarding packet) into a runnable StageOS WorkflowTemplate.

function demoTemplate(): Omit<WorkflowTemplate, 'id' | 'source' | 'createdAt'> {
  return {
    name: 'Imported Process (Demo)',
    department: 'Production',
    description: 'Demo import — configure ANTHROPIC_API_KEY to convert real documents.',
    labelFieldId: 'subject',
    steps: [
      {
        id: 's1',
        title: 'Details',
        fields: [
          { id: 'subject', label: 'Subject', type: 'text', required: true },
          { id: 'date', label: 'Date', type: 'date' },
          { id: 'notes', label: 'Notes', type: 'textarea' },
        ],
      },
    ],
    autoTasks: [
      { title: 'Review imported process', description: 'Verify this imported workflow matches your old process.', department: 'Admin', priority: 'normal' },
    ],
  }
}

const PROMPT = `
You are helping a regional theatre company migrate their old processes into StageOS, their production management system. The attached content describes an existing process: it may be an SOP, a checklist, an onboarding packet, a form, or a spreadsheet export.

Convert it into a StageOS workflow template. Return a single JSON object with exactly these fields:

- name: string — short workflow name (≤40 chars)
- department: string — one of: Production, Finance, Wardrobe, Marketing, Technical, Stage Management, Front of House, Admin (pick the best fit)
- description: string — one sentence describing when to run this workflow
- labelFieldId: string — the id of the single field whose value best labels a run of this workflow (e.g. a person's name or item name)
- steps: array of 1-4 steps, each:
  - id: string (slug like "s1", "s2")
  - title: string
  - description: string (optional, may be omitted)
  - fields: array of fields, each:
    - id: string (unique kebab-case slug)
    - label: string
    - type: one of: "text" | "email" | "date" | "number" | "currency" | "select" | "textarea" | "checkbox_group"
    - required: boolean (only the truly essential fields)
    - placeholder: string (optional)
    - options: array of strings (REQUIRED for "select" and "checkbox_group", omit otherwise)
- autoTasks: array of 2-6 follow-up tasks that should be auto-created when the workflow is submitted, each:
  - title: string
  - description: string
  - department: one of the departments listed above
  - priority: one of: "low" | "normal" | "high" | "urgent"

Capture the spirit of the original process: every form field in the source becomes a workflow field, and every follow-up action or handoff becomes an autoTask. Keep field counts practical (≤8 per step).

Return ONLY the JSON object, no other text.
`.trim()

export async function POST(req: NextRequest) {
  try {
    const { fileBase64, mediaType, text } = await req.json() as {
      fileBase64?: string
      mediaType?: string
      text?: string
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ template: demoTemplate(), demo: true })
    }

    const content: Anthropic.ContentBlockParam[] = []
    if (fileBase64 && mediaType) {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: mediaType as 'application/pdf', data: fileBase64 },
      })
    }
    if (text) {
      content.push({ type: 'text', text: `--- SOURCE PROCESS DOCUMENT ---\n${text}\n--- END SOURCE ---` })
    }
    content.push({ type: 'text', text: PROMPT })

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const raw = (textBlock && 'text' in textBlock ? textBlock.text : null) ?? '{}'
    let template
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      template = JSON.parse(cleaned)
    } catch {
      return Response.json({ error: 'Could not parse the document into a workflow' }, { status: 422 })
    }

    return Response.json({ template })
  } catch (err) {
    console.error('[import-workflow]', err)
    return Response.json({ error: 'Import failed' }, { status: 500 })
  }
}
