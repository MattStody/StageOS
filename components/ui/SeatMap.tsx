'use client'
import { useState, useMemo } from 'react'
import type { TicketMapData, SectionMap } from '@/lib/spektrix'
import { fmt, fmtPct } from '@/lib/utils'

interface SeatMapProps {
  data: TicketMapData
  productionColor: string
}

const SEAT_BG: Record<string, string> = {
  available: '#e7e5e4',
  held: '#fbbf24',
  comp: '#a78bfa',
}

function SeatGrid({ section, color }: { section: SectionMap; color: string }) {
  const seatPx = Math.max(6, Math.min(10, Math.floor(560 / (section.seatsPerRow + 2))))
  const gap = 1

  return (
    <div className="overflow-x-auto pb-2">
      <div style={{ display: 'inline-block', minWidth: 'max-content' }}>
        {section.rows.map((row) => {
          const rowSeats = section.seats.filter((s) => s.row === row)
          return (
            <div key={row} style={{ display: 'flex', alignItems: 'center', marginBottom: gap }}>
              <span style={{ width: 20, fontSize: 10, color: '#a8a29e', textAlign: 'right', paddingRight: 4, flexShrink: 0, fontFamily: 'monospace' }}>
                {row}
              </span>
              {rowSeats.map((seat) => (
                <span
                  key={seat.num}
                  title={`Row ${seat.row} Seat ${seat.num} — ${seat.status}`}
                  style={{
                    display: 'inline-block',
                    width: seatPx,
                    height: seatPx,
                    marginRight: gap,
                    borderRadius: 1,
                    backgroundColor: seat.status === 'sold' ? color : SEAT_BG[seat.status] ?? '#e7e5e4',
                    cursor: 'default',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SeatMap({ data, productionColor }: SeatMapProps) {
  const [activeSection, setActiveSection] = useState(data.sections[0]?.id ?? '')

  const section = useMemo(
    () => data.sections.find((s) => s.id === activeSection) ?? data.sections[0],
    [data.sections, activeSection],
  )

  const soldPct = data.totalCapacity > 0 ? (data.sold / data.totalCapacity) * 100 : 0

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {[
          { label: 'Sold', value: data.sold.toLocaleString(), sub: fmtPct(soldPct) },
          { label: 'Available', value: data.available.toLocaleString(), sub: `of ${data.totalCapacity.toLocaleString()}` },
          { label: 'Holds', value: data.held.toLocaleString(), sub: '' },
          { label: 'Comps', value: data.comps.toLocaleString(), sub: '' },
          { label: 'Gross', value: fmt(data.grossRevenue), sub: '' },
          { label: 'Avg Price', value: `$${data.avgTicketPrice.toFixed(0)}`, sub: '' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-stone-50 rounded-lg p-3 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-stone-800">{value}</p>
            {sub && <p className="text-[10px] text-stone-400">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>Capacity</span>
          <span className="font-medium text-stone-700">{fmtPct(soldPct)}</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(soldPct, 100)}%`, backgroundColor: productionColor }}
          />
        </div>
        <div className="flex gap-3 mt-1.5">
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, backgroundColor: productionColor }} />
            Sold
          </span>
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, backgroundColor: '#fbbf24' }} />
            Held
          </span>
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, backgroundColor: '#a78bfa' }} />
            Comp
          </span>
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1, backgroundColor: '#e7e5e4' }} />
            Available
          </span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-4 border-b border-stone-100 pb-0">
        {data.sections.map((s) => {
          const pct = (s.sold / (s.sold + s.available)) * 100
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors rounded-t border-b-2 -mb-px ${
                activeSection === s.id
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {s.label}
              <span className="ml-1.5 text-[10px] text-stone-400">{fmtPct(pct)}</span>
            </button>
          )
        })}
      </div>

      {/* Seat grid */}
      {section && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-stone-500">
              {section.rows.length} rows · {section.seatsPerRow} seats/row · {section.sold + section.available} total
            </p>
            <div className="flex gap-3 text-xs text-stone-500">
              <span><span className="font-medium text-stone-700">{section.sold}</span> sold</span>
              <span><span className="font-medium text-stone-700">{section.held}</span> held</span>
              <span><span className="font-medium text-stone-700">{section.comps}</span> comp</span>
              <span><span className="font-medium text-stone-700">{section.available}</span> avail</span>
            </div>
          </div>
          {/* Stage / screen indicator */}
          <div className="text-center mb-3">
            <div className="inline-block px-8 py-1 rounded text-[10px] text-stone-400 bg-stone-100 border border-stone-200 tracking-widest uppercase">
              Stage
            </div>
          </div>
          <SeatGrid section={section} color={productionColor} />
        </div>
      )}
    </div>
  )
}
