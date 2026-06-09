'use client'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowRight, CheckCircle2, Upload } from 'lucide-react'

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
      </div>
    </div>
  )
}
