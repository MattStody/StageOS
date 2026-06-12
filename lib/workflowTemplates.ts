import type { WorkflowTemplate } from './types'

// Built-in workflow library — standard operating procedures for every
// department in a regional theatre company. These seed the workflow store;
// AI-imported and custom workflows are added alongside them.

export const BUILTIN_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'wf-crew-onboarding',
    name: 'Crew Member Onboarding',
    department: 'Production',
    description: 'Bring a new crew member (carpenter, electrician, audio, props) onto a production with payroll, safety, and scheduling handled.',
    source: 'built_in',
    labelFieldId: 'crew-name',
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      {
        id: 's1',
        title: 'Crew details',
        fields: [
          { id: 'crew-name', label: 'Full name', type: 'text', required: true },
          { id: 'crew-email', label: 'Email', type: 'email', required: true },
          { id: 'crew-phone', label: 'Phone', type: 'text' },
          { id: 'crew-position', label: 'Position', type: 'select', required: true, options: ['Carpenter', 'Electrician', 'Audio Engineer', 'Props', 'Flies / Rigging', 'Wardrobe Crew', 'Stagehand'] },
          { id: 'crew-start', label: 'Start date', type: 'date' },
          { id: 'crew-rate', label: 'Hourly rate', type: 'currency' },
        ],
      },
      {
        id: 's2',
        title: 'Compliance & certifications',
        fields: [
          { id: 'crew-certs', label: 'Certifications on file', type: 'checkbox_group', options: ['Working at heights', 'Forklift / Genie lift', 'First aid', 'Pyro / SFX', 'Rigging'] },
          { id: 'crew-union', label: 'Union affiliation', type: 'select', options: ['Non-union', 'IATSE', 'Other'] },
          { id: 'crew-notes', label: 'Notes', type: 'textarea', placeholder: 'Availability constraints, equipment, etc.' },
        ],
      },
    ],
    autoTasks: [
      { title: 'Set up payroll record', description: 'Add crew member to payroll with rate and tax forms.', department: 'Finance', priority: 'high' },
      { title: 'Schedule safety orientation', description: 'Book venue safety walk-through and toolbox talk before first call.', department: 'Production', priority: 'high' },
      { title: 'Add to crew call schedule', description: 'Include in load-in, tech, and run crew calls.', department: 'Production', priority: 'normal' },
      { title: 'Issue building access & comms', description: 'Stage door access, keys/fobs, and radio/headset assignment.', department: 'Technical', priority: 'normal' },
    ],
  },
  {
    id: 'wf-production-launch',
    name: 'Production Launch',
    department: 'Production',
    description: 'Green-light a new show: budget shell, key dates, rights confirmation, and kickoff tasks for every department.',
    source: 'built_in',
    labelFieldId: 'pl-title',
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      {
        id: 's1',
        title: 'Show basics',
        fields: [
          { id: 'pl-title', label: 'Working title', type: 'text', required: true },
          { id: 'pl-venue', label: 'Venue', type: 'text' },
          { id: 'pl-opening', label: 'Target opening', type: 'date' },
          { id: 'pl-closing', label: 'Target closing', type: 'date' },
          { id: 'pl-budget', label: 'Estimated budget', type: 'currency' },
        ],
      },
      {
        id: 's2',
        title: 'Rights & creative',
        fields: [
          { id: 'pl-rights', label: 'Rights status', type: 'select', required: true, options: ['Secured', 'In negotiation', 'Not started', 'Public domain'] },
          { id: 'pl-director', label: 'Director (if attached)', type: 'text' },
          { id: 'pl-notes', label: 'Notes', type: 'textarea' },
        ],
      },
    ],
    autoTasks: [
      { title: 'Build budget shell', description: 'Create budget categories and seed line items from the launch estimate.', department: 'Finance', priority: 'high' },
      { title: 'Confirm rights & licensing', description: 'Execute rights agreement and log royalty obligations.', department: 'Admin', priority: 'urgent' },
      { title: 'Draft production calendar', description: 'Rehearsal, tech, preview, and press dates into the calendar.', department: 'Production', priority: 'high' },
      { title: 'Open marketing brief', description: 'Kickoff brief: audience, key art timeline, on-sale date.', department: 'Marketing', priority: 'normal' },
      { title: 'Venue technical assessment', description: 'Confirm venue specs against creative requirements.', department: 'Technical', priority: 'normal' },
    ],
  },
  {
    id: 'wf-weekly-settlement',
    name: 'Weekly Box Office Settlement',
    department: 'Finance',
    description: 'Close out a performance week: reconcile ticket revenue, log royalties, and report to stakeholders.',
    source: 'built_in',
    labelFieldId: 'ws-week',
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      {
        id: 's1',
        title: 'Week summary',
        fields: [
          { id: 'ws-week', label: 'Week ending', type: 'date', required: true },
          { id: 'ws-performances', label: 'Performances', type: 'number', required: true },
          { id: 'ws-gross', label: 'Gross revenue', type: 'currency', required: true },
          { id: 'ws-comps', label: 'Comps issued', type: 'number' },
          { id: 'ws-notes', label: 'Variances / notes', type: 'textarea', placeholder: 'Cancelled shows, weather, discount campaigns…' },
        ],
      },
    ],
    autoTasks: [
      { title: 'Reconcile box office to bank', description: 'Match ticketing platform settlement against bank deposits.', department: 'Finance', priority: 'high' },
      { title: 'Calculate & log royalties', description: 'Apply royalty percentages to net receipts and queue payments.', department: 'Finance', priority: 'high' },
      { title: 'Distribute weekly wrap report', description: 'Send gross/net/capacity summary to producers and board.', department: 'Admin', priority: 'normal' },
    ],
  },
  {
    id: 'wf-incident-report',
    name: 'Incident Report',
    department: 'Stage Management',
    description: 'Document an injury, near-miss, or equipment failure and trigger the required follow-ups.',
    source: 'built_in',
    labelFieldId: 'ir-summary',
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      {
        id: 's1',
        title: 'Incident details',
        fields: [
          { id: 'ir-summary', label: 'Short summary', type: 'text', required: true, placeholder: 'e.g. Trip hazard backstage left' },
          { id: 'ir-date', label: 'Date of incident', type: 'date', required: true },
          { id: 'ir-type', label: 'Type', type: 'select', required: true, options: ['Injury', 'Near-miss', 'Equipment failure', 'Property damage', 'Audience incident'] },
          { id: 'ir-severity', label: 'Severity', type: 'select', required: true, options: ['Minor', 'Moderate', 'Serious', 'Critical'] },
          { id: 'ir-people', label: 'People involved', type: 'text' },
          { id: 'ir-description', label: 'Full description', type: 'textarea', required: true },
        ],
      },
      {
        id: 's2',
        title: 'Immediate response',
        fields: [
          { id: 'ir-firstaid', label: 'Response taken', type: 'checkbox_group', options: ['First aid administered', 'Area secured', 'Equipment tagged out', 'Emergency services called', 'Show stopped/held'] },
          { id: 'ir-witnesses', label: 'Witnesses', type: 'text' },
        ],
      },
    ],
    autoTasks: [
      { title: 'File formal incident report', description: 'Complete the official report and store in records within 24h.', department: 'Admin', priority: 'urgent' },
      { title: 'Notify insurance broker', description: 'Report incident to insurer if injury or property damage occurred.', department: 'Finance', priority: 'high' },
      { title: 'Hazard remediation', description: 'Fix or remove the hazard; verify before next performance.', department: 'Technical', priority: 'urgent' },
      { title: 'Follow up with affected person', description: 'Check in within 48 hours and document status.', department: 'Production', priority: 'high' },
    ],
  },
  {
    id: 'wf-costume-build',
    name: 'Costume Build Request',
    department: 'Wardrobe',
    description: 'Commission a new costume build or major alteration with budget, measurements, and fitting schedule.',
    source: 'built_in',
    labelFieldId: 'cb-item',
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      {
        id: 's1',
        title: 'Build details',
        fields: [
          { id: 'cb-item', label: 'Costume / item', type: 'text', required: true, placeholder: 'e.g. Act II ball gown — Cinderella' },
          { id: 'cb-performer', label: 'Performer', type: 'text', required: true },
          { id: 'cb-type', label: 'Build type', type: 'select', required: true, options: ['New build', 'Major alteration', 'Pull & modify', 'Rental modification'] },
          { id: 'cb-deadline', label: 'Needed by', type: 'date', required: true },
          { id: 'cb-budget', label: 'Materials budget', type: 'currency' },
          { id: 'cb-specs', label: 'Design specs / references', type: 'textarea' },
        ],
      },
    ],
    autoTasks: [
      { title: 'Source materials & fabric', description: 'Purchase fabric and notions within the materials budget.', department: 'Wardrobe', priority: 'high' },
      { title: 'Schedule first fitting', description: 'Book mockup/muslin fitting with the performer.', department: 'Wardrobe', priority: 'normal' },
      { title: 'Log build cost to budget', description: 'Commit materials cost against the costumes budget line.', department: 'Finance', priority: 'normal' },
    ],
  },
  {
    id: 'wf-press-night',
    name: 'Press Night Setup',
    department: 'Marketing',
    description: 'Coordinate press night: invitations, comps, photographer, and front-of-house hospitality.',
    source: 'built_in',
    labelFieldId: 'pn-date',
    createdAt: '2026-01-01T00:00:00.000Z',
    steps: [
      {
        id: 's1',
        title: 'Event details',
        fields: [
          { id: 'pn-date', label: 'Press night date', type: 'date', required: true },
          { id: 'pn-comps', label: 'Press comps to hold', type: 'number', required: true },
          { id: 'pn-outlets', label: 'Target outlets / critics', type: 'textarea', placeholder: 'One per line' },
          { id: 'pn-reception', label: 'Post-show reception', type: 'select', options: ['Yes — lobby', 'Yes — offsite', 'No'] },
        ],
      },
    ],
    autoTasks: [
      { title: 'Send press invitations', description: 'Invite critics and media with RSVP tracking.', department: 'Marketing', priority: 'urgent' },
      { title: 'Hold press comps in box office', description: 'Block premium seats for confirmed press.', department: 'Finance', priority: 'high' },
      { title: 'Book production photographer', description: 'Confirm photo call and usage rights.', department: 'Marketing', priority: 'normal' },
      { title: 'Brief front of house team', description: 'Press list at the door, reception logistics, VIP handling.', department: 'Front of House', priority: 'normal' },
    ],
  },
]
