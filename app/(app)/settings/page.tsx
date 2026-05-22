'use client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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
              <input defaultValue="Goldstein General Management" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
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
              <input defaultValue="Maria Goldstein" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider mb-1">Email</label>
              <input defaultValue="maria@goldsteinGM.com" className="w-full px-3 py-2 text-sm border border-stone-300 rounded focus:outline-none focus:border-stone-500" />
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
          <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <p className="text-xs text-stone-500 mb-3">Future integrations — coming soon</p>
            {['Spektrix', 'Tessitura', 'QuickBooks', 'Xero', 'Gusto', 'DocuSign', 'Google Drive', 'Slack'].map((name) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <span className="text-sm text-stone-700">{name}</span>
                <span className="text-xs text-stone-400 px-2 py-0.5 bg-stone-100 rounded">Coming Soon</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
