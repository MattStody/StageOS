'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowRight, CheckCircle2, Upload, BookOpen, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'

function DemoDataCard() {
  const { clearAllData, resetToDefaults, productions, people } = useStore()
  const [confirming, setConfirming] = useState(false)
  const isEmpty = productions.length === 0 && people.length === 0

  return (
    <Card>
      <CardHeader><CardTitle>Demo Data</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-stone-500">
          StageOS ships with sample productions, people, and financials so you can explore.
          Start fresh to clear everything and enter your own data.
        </p>

        {confirming ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-red-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                This removes all productions, budgets, contracts, company members, and every
                other record. Workflow templates stay. You can restore the demo data any time.
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => { clearAllData(); setConfirming(false) }}
              >
                Yes, clear everything
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)} disabled={isEmpty}>
              <Trash2 size={13} className="mr-1.5" />
              {isEmpty ? 'Workspace is empty' : 'Start fresh'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => resetToDefaults()}>
              <RotateCcw size={13} className="mr-1.5" />
              Restore demo data
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Workspace and account preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Workspace Name</label>
              <input defaultValue="Adam Blanshay Productions" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Fiscal Year Start</label>
              <select className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                <option>January</option>
                <option>July</option>
                <option>October</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Currency</label>
              <select className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500">
                <option>USD — US Dollar</option>
                <option>GBP — British Pound</option>
                <option>EUR — Euro</option>
                <option>CAD — Canadian Dollar</option>
              </select>
            </div>
            <Button>Save Changes</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Name</label>
              <input defaultValue="Leon Kay" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Email</label>
              <input defaultValue="leon@adamblanshay.com" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Role</label>
              <input defaultValue="General Manager" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <Button>Update Account</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risk Alert Thresholds</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Budget Variance Alert (%)</label>
              <input type="number" defaultValue={10} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Deadline Warning (days before)</label>
              <input type="number" defaultValue={7} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Minimum Capacity Target (%)</label>
              <input type="number" defaultValue={70} className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <Button>Save Thresholds</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Data Import</CardTitle></CardHeader>
          <CardBody>
            <Link
              href="/settings/import"
              className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-stone-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Upload size={14} className="text-stone-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stone-800">CSV Import</p>
                  <p className="text-[11px] text-stone-400">Upload productions, revenue, budget, performances, and contracts</p>
                </div>
              </div>
              <ArrowRight size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Union Agreements</CardTitle></CardHeader>
          <CardBody>
            <Link
              href="/settings/unions"
              className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-stone-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen size={14} className="text-stone-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stone-800">Obligation Templates</p>
                  <p className="text-[11px] text-stone-400">CAEA-ITA, AFM Local 149, SDC, IATSE 58 — auto-generate obligations on new contracts</p>
                </div>
              </div>
              <ArrowRight size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Link
              href="/settings/integrations"
              className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-stone-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stone-800">Spektrix</p>
                  <p className="text-[11px] text-stone-400">Box office & ticketing data</p>
                </div>
              </div>
              <ArrowRight size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </Link>
            {['Tessitura', 'QuickBooks', 'Xero', 'Gusto', 'DocuSign', 'Google Drive', 'Slack'].map((name) => (
              <div key={name} className="flex items-center justify-between py-2 px-3 -mx-3">
                <span className="text-sm text-stone-500">{name}</span>
                <span className="text-[11px] text-stone-300 px-2 py-0.5 bg-stone-50 border border-stone-100 rounded">Coming soon</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <DemoDataCard />
      </div>
    </div>
  )
}
