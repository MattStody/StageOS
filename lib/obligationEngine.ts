import type { Contract, ContractType, ObligationType, ObligationRisk } from './types'

export interface SuggestedObligation {
  type: ObligationType
  description: string
  dueDate: string
  amount?: number
  owner: string
  risk: ObligationRisk
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

function addDays(base: string, days: number): string {
  const d = base ? new Date(base) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function addMonths(base: string, months: number): string {
  const d = base ? new Date(base) : new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const TYPE_DEFAULTS: Record<ContractType, SuggestedObligation[]> = {
  rights: [
    {
      type: 'royalty_payment',
      description: 'Royalty payment per agreed schedule',
      dueDate: '',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'Rights contracts always include royalty payment obligations',
    },
    {
      type: 'royalty_statement',
      description: 'Royalty statement and accounting to licensor',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'Rights contracts require periodic royalty accounting statements',
    },
    {
      type: 'rights_restriction',
      description: 'Territorial and media rights restrictions must be observed',
      dueDate: '',
      owner: 'Artistic Director',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Rights agreements define permitted use and territory',
    },
  ],
  venue: [
    {
      type: 'insurance_required',
      description: 'Certificate of insurance naming venue as additional insured',
      dueDate: '',
      owner: 'General Manager',
      risk: 'critical',
      confidence: 'high',
      reasoning: 'Venue contracts universally require insurance documentation',
    },
    {
      type: 'payment_due',
      description: 'Venue rental / box office settlement payment',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'Venue contracts require periodic settlement of box office proceeds',
    },
  ],
  investor: [
    {
      type: 'report_due',
      description: 'Investor financial report per offering memorandum',
      dueDate: '',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'Investor agreements require regular financial reporting',
    },
    {
      type: 'payment_due',
      description: 'Investor recoupment distribution when applicable',
      dueDate: '',
      owner: 'General Manager',
      risk: 'medium',
      confidence: 'medium',
      reasoning: 'Investor contracts include distribution obligations on recoupment',
    },
  ],
  vendor: [
    {
      type: 'deliverable_due',
      description: 'Vendor deliverable per contract terms',
      dueDate: '',
      owner: 'Production Manager',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Vendor contracts specify deliverables and delivery schedules',
    },
    {
      type: 'payment_due',
      description: 'Vendor payment per invoice schedule',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Vendor contracts require payment upon deliverable completion',
    },
  ],
  cast: [
    {
      type: 'tax_form_required',
      description: 'W-2 or 1099 tax form for performer',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Cast members require annual tax documentation',
    },
    {
      type: 'payment_due',
      description: 'Weekly salary per AEA contract schedule',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'AEA contracts specify weekly payment obligations',
    },
  ],
  creative: [
    {
      type: 'payment_due',
      description: 'Creative fee per milestone or schedule',
      dueDate: '',
      owner: 'General Manager',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Creative contracts specify fee payment schedule',
    },
    {
      type: 'tax_form_required',
      description: 'Tax documentation for creative team member',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'low',
      confidence: 'high',
      reasoning: 'Creative team members require annual tax documentation',
    },
  ],
  employment: [
    {
      type: 'tax_form_required',
      description: 'W-2 annual tax form for employee',
      dueDate: '',
      owner: 'Company Manager',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Employees receive W-2 tax documentation annually',
    },
    {
      type: 'compliance',
      description: 'Labor law compliance — overtime, breaks, ADA',
      dueDate: '',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'Employment contracts require ongoing labor law compliance',
    },
  ],
}

interface KeywordRule {
  pattern: RegExp
  obligation: Partial<SuggestedObligation>
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    pattern: /royalt/i,
    obligation: {
      type: 'royalty_payment',
      description: 'Royalty obligation mentioned in key terms',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'medium',
      reasoning: 'Keyword "royalt" detected in key obligations text',
    },
  },
  {
    pattern: /approval|approve/i,
    obligation: {
      type: 'approval_required',
      description: 'Approval required per contract terms',
      owner: 'Artistic Director',
      risk: 'medium',
      confidence: 'medium',
      reasoning: 'Keyword "approval" detected in key obligations text',
    },
  },
  {
    pattern: /insurance|insured/i,
    obligation: {
      type: 'insurance_required',
      description: 'Insurance coverage required per contract',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'high',
      reasoning: 'Keyword "insurance" detected in key obligations text',
    },
  },
  {
    pattern: /report/i,
    obligation: {
      type: 'report_due',
      description: 'Report required per contract terms',
      owner: 'General Manager',
      risk: 'medium',
      confidence: 'medium',
      reasoning: 'Keyword "report" detected in key obligations text',
    },
  },
  {
    pattern: /deliver|deliverable/i,
    obligation: {
      type: 'deliverable_due',
      description: 'Deliverable due per contract terms',
      owner: 'Production Manager',
      risk: 'medium',
      confidence: 'medium',
      reasoning: 'Keyword "deliver" detected in key obligations text',
    },
  },
  {
    pattern: /renew|renewal/i,
    obligation: {
      type: 'renewal_deadline',
      description: 'Contract renewal decision deadline',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'medium',
      reasoning: 'Keyword "renew" detected in key obligations text',
    },
  },
  {
    pattern: /credit|billing/i,
    obligation: {
      type: 'publicity_credit',
      description: 'Publicity credit and billing requirements',
      owner: 'Marketing Director',
      risk: 'medium',
      confidence: 'medium',
      reasoning: 'Keyword "credit/billing" detected in key obligations text',
    },
  },
  {
    pattern: /confidential|nda/i,
    obligation: {
      type: 'confidentiality',
      description: 'Confidentiality obligations per NDA/contract terms',
      owner: 'General Manager',
      risk: 'medium',
      confidence: 'high',
      reasoning: 'Keyword "confidential/nda" detected in key obligations text',
    },
  },
  {
    pattern: /notice|terminat/i,
    obligation: {
      type: 'termination_notice',
      description: 'Notice period for termination must be observed',
      owner: 'General Manager',
      risk: 'high',
      confidence: 'medium',
      reasoning: 'Keyword "notice/terminat" detected in key obligations text',
    },
  },
]

function dedupeObligations(obligations: SuggestedObligation[]): SuggestedObligation[] {
  const seen = new Set<ObligationType>()
  return obligations.filter((o) => {
    if (seen.has(o.type)) return false
    seen.add(o.type)
    return true
  })
}

export function extractObligations(contract: Contract): SuggestedObligation[] {
  const results: SuggestedObligation[] = []
  const baseDate = contract.dueDate || new Date().toISOString().slice(0, 10)

  // Signature obligation — always add if not signed/expired
  if (contract.status !== 'signed' && contract.status !== 'expired') {
    results.push({
      type: 'signature_required',
      description: `${contract.partyName} signature required to execute contract`,
      dueDate: addDays(baseDate, 0),
      owner: 'General Manager',
      risk: contract.status === 'needs_review' ? 'critical' : 'high',
      confidence: 'high',
      reasoning: `Contract status is "${contract.status}" — signature has not been collected`,
    })
  }

  // Type-specific defaults
  const typeDefaults = TYPE_DEFAULTS[contract.contractType] || []
  for (const tmpl of typeDefaults) {
    let dueDate = ''
    switch (tmpl.type) {
      case 'royalty_payment':
      case 'royalty_statement':
        dueDate = addMonths(baseDate, 1)
        break
      case 'insurance_required':
        dueDate = addDays(baseDate, 14)
        break
      case 'payment_due':
        dueDate = addMonths(baseDate, 1)
        break
      case 'report_due':
        dueDate = addMonths(baseDate, 1)
        break
      case 'deliverable_due':
        dueDate = addDays(baseDate, 30)
        break
      case 'tax_form_required':
        // Next Jan 31
        dueDate = `${new Date().getFullYear() + 1}-01-31`
        break
      default:
        dueDate = addMonths(baseDate, 3)
    }
    results.push({
      ...tmpl,
      dueDate,
      amount: tmpl.type === 'royalty_payment' && contract.fee > 0
        ? Math.round(contract.fee * 0.08)
        : undefined,
    })
  }

  // Keyword parsing on keyObligations text
  if (contract.keyObligations) {
    const existingTypes = new Set(results.map((r) => r.type))
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(contract.keyObligations) && !existingTypes.has(rule.obligation.type as ObligationType)) {
        results.push({
          type: rule.obligation.type as ObligationType,
          description: rule.obligation.description || '',
          dueDate: addMonths(baseDate, 1),
          owner: rule.obligation.owner || 'General Manager',
          risk: rule.obligation.risk as ObligationRisk || 'medium',
          confidence: rule.obligation.confidence || 'medium',
          reasoning: rule.obligation.reasoning || '',
        })
        existingTypes.add(rule.obligation.type as ObligationType)
      }
    }
  }

  return dedupeObligations(results)
}
