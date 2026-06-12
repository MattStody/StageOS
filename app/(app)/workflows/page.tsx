'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { deptColor } from '@/lib/team'
import {
  Play, Trash2, Upload, Sparkles, Loader2, AlertTriangle, Check,
  ClipboardList, ListChecks, FileText, Workflow as WorkflowIcon,
} from 'lucide-react'
import type { WorkflowTemplate, WorkflowSource } from '@/lib/types'

const SOURCE_LABELS: Record<WorkflowSource, string> = {
  built_in: 'Built-in',
  ai_imported: 'AI imported',
  custom: 'Custom',
}

const SOURCE_STYLES: Record<WorkflowSource, string> = {
  built_in: 'text-stone-500 bg-stone-100 border-stone-200',
  ai_imported: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  custom: 'text-emerald-600 bg-emerald-50 border-emerald-200',
}

type ImportStep = 'input' | 'extracting' | 'preview'

export default function WorkflowsPage() {
  const { workflowTemplates, workflowRuns, addWorkflowTemplate, deleteWorkflowTemplate } = useStore()

  // Import modal state
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>('input')
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importIsDemo, setImportIsDemo] = useState(false)
  const [preview, setPreview] = useState<Omit<WorkflowTemplate, 'id' | 'source' | 'createdAt'> | null>(null)
  const [previewName, setPreviewName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Group templates by department
  const departments = [...new Set(workflowTemplates.map((t) => t.department))]

  function openImport() {
    setImportOpen(true)
    setImportStep('input')
    setImportText('')
    setImportError('')
    setPreview(null)
    setImportIsDemo(false)
  }

  async function runImport(payload: { fileBase64?: string; mediaType?: string; text?: string }) {
    setImportStep('extracting')
    setImportError('')
    try {
      const res = await fetch('/api/import-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Import failed')
      setPreview(json.template)
      setPreviewName(json.template.name)
      setImportIsDemo(!!json.demo)
      setImportStep('preview')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error')
      setImportStep('input')
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunk = 8192
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      await runImport({ fileBase64: btoa(binary), mediaType: file.type || 'application/pdf' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSavePreview() {
    if (!preview) return
    addWorkflowTemplate({
      ...preview,
      name: previewName || preview.name,
      id: `wf-imported-${Date.now()}`,
      source: 'ai_imported',
      createdAt: new Date().toISOString(),
    })
    setImportOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        subtitle="Standard operating procedures for every department — run them, or import your old processes"
        actions={
          <Button onClick={openImport} size="sm">
            <Sparkles size={13} /> Import a process
          </Button>
        }
      />

      {departments.map((dept) => {
        const deptTemplates = workflowTemplates.filter((t) => t.department === dept)
        return (
          <div key={dept} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${deptColor(dept)}`}>{dept}</span>
              <span className="text-xs text-stone-400">{deptTemplates.length} workflow{deptTemplates.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {deptTemplates.map((t) => {
                const runCount = workflowRuns.filter((r) => r.templateId === t.id).length
                return (
                  <div key={t.id} className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col group hover:border-stone-300 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <WorkflowIcon size={14} className="text-stone-400 shrink-0" />
                        <p className="text-sm font-semibold text-stone-800 truncate">{t.name}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${SOURCE_STYLES[t.source]}`}>
                        {SOURCE_LABELS[t.source]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 leading-snug flex-1">{t.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-[10px] text-stone-400">
                      <span className="flex items-center gap-1"><ClipboardList size={10} /> {t.steps.length} step{t.steps.length !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><ListChecks size={10} /> {t.autoTasks.length} auto-task{t.autoTasks.length !== 1 ? 's' : ''}</span>
                      {runCount > 0 && <span>{runCount} run{runCount !== 1 ? 's' : ''}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                      <Link href={`/workflows/${t.id}/run`}>
                        <Button size="sm"><Play size={11} /> Run</Button>
                      </Link>
                      {t.source !== 'built_in' && (
                        <button
                          onClick={() => deleteWorkflowTemplate(t.id)}
                          className="p-1 text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete workflow"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Import modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={
          importStep === 'input' ? 'Import an existing process'
          : importStep === 'extracting' ? 'Converting your process…'
          : 'Review imported workflow'
        }
        className="max-w-2xl"
      >
        {importStep === 'input' && (
          <div className="space-y-5">
            <p className="text-sm text-stone-600">
              Have an old checklist, SOP document, onboarding packet, or spreadsheet? Upload it or paste the text and Claude will convert it into a runnable StageOS workflow — steps, form fields, and follow-up tasks included.
            </p>
            {importError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertTriangle size={14} className="shrink-0" /> {importError}
              </div>
            )}
            <div
              className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} className="mx-auto mb-2 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">Upload a document</p>
              <p className="text-xs text-stone-400 mt-0.5">PDF, JPG, or PNG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400">or paste the process as text</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'e.g.\nNEW VOLUNTEER USHER CHECKLIST\n1. Collect contact details and emergency contact\n2. Issue lanyard and uniform shirt\n3. Walk fire exits with FOH manager\n4. Add to shift roster…'}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500 resize-none font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={() => runImport({ text: importText })} disabled={!importText.trim()}>
                <Sparkles size={13} /> Convert to workflow
              </Button>
            </div>
          </div>
        )}

        {importStep === 'extracting' && (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-stone-700">Claude is reading your process…</p>
            <p className="text-xs text-stone-400">Building steps, form fields, and follow-up tasks</p>
          </div>
        )}

        {importStep === 'preview' && preview && (
          <div className="space-y-5">
            {importIsDemo && (
              <p className="text-xs text-amber-600">Demo mode — AI key not configured. This is a placeholder workflow.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Workflow name</label>
                <input
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Department</label>
                <div className="pt-1.5">
                  <span className={`text-xs font-semibold px-2 py-1 rounded border ${deptColor(preview.department)}`}>{preview.department}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-500">{preview.description}</p>

            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Steps &amp; fields</p>
              <div className="space-y-2">
                {preview.steps.map((s, i) => (
                  <div key={s.id} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-stone-700 mb-1.5">Step {i + 1} — {s.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.fields.map((f) => (
                        <span key={f.id} className="text-[10px] text-stone-600 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                          {f.label}{f.required && <span className="text-red-400">*</span>}
                          <span className="text-stone-400 ml-1">{f.type}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Auto-created tasks</p>
              <div className="space-y-1.5">
                {preview.autoTasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Check size={11} className="text-emerald-500 shrink-0" />
                    <span className="text-stone-700">{t.title}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${deptColor(t.department)}`}>{t.department}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <Button variant="secondary" onClick={() => setImportStep('input')}>Back</Button>
              <Button onClick={handleSavePreview}>
                <Check size={13} /> Save to library
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
