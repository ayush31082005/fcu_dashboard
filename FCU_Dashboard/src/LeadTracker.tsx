import { useMemo, useState } from 'react'

type LeadCase = {
  id: string
  ref: string
  borrower: string
  initials: string
  avatar: string
  mobile: string
  email: string
  loan: string
  loanRaw?: number
  purpose: string
  lti: string
  branch: string
  rm: string
  status: string
  applied: string
  disburse: string
  city: string
  state: string
}

const STATUS_OPTIONS = [
  'All Statuses',
  'Pending',
  'Approved',
  'Rejected by FCU',
  'Rejected by Credit',
  'Under Review',
  'Document Pending',
  'Disbursed',
]

const STATUS_MAP: Record<string, string> = {
  'All Statuses': '',
  Disbursed: 'DISBURSED',
  'Document Pending': 'DOCUMENT_PENDING',
  'Rejected by FCU': 'REJECTED_BY_FCU',
  'Rejected by Credit': 'REJECTED_BY_CREDIT',
  Rejected: 'REJECTED',
  Pending: 'PENDING',
  Approved: 'APPROVED',
  'Under Review': 'UNDER_REVIEW',
}

function TrackStatusBadge({ status }: { status: string }) {
  const palette: Record<string, { label: string; bg: string }> = {
    DISBURSED: { label: 'Disbursed', bg: 'bg-slate-100 text-slate-800' },
    DOCUMENT_PENDING: { label: 'Document Pending', bg: 'bg-zinc-100 text-zinc-800' },
    REJECTED: { label: 'Rejected', bg: 'bg-rose-50 text-rose-800 border border-rose-200' },
    REJECTED_BY_FCU: { label: 'Rejected by FCU', bg: 'bg-rose-100 text-rose-800 border border-rose-200' },
    FCU_REJECTED: { label: 'Rejected by FCU', bg: 'bg-rose-100 text-rose-800 border border-rose-200' },
    FORWARDED_REJECT: { label: 'Rejected by FCU', bg: 'bg-rose-100 text-rose-800 border border-rose-200' },
    REJECTED_BY_CREDIT: { label: 'Rejected by Credit', bg: 'bg-amber-100 text-amber-800 border border-amber-200' },
    CREDIT_REJECTED: { label: 'Rejected by Credit', bg: 'bg-amber-100 text-amber-800 border border-amber-200' },
    PENDING: { label: 'Pending', bg: 'bg-slate-100 text-slate-700' },
    APPROVED: { label: 'Approved', bg: 'bg-zinc-100 text-zinc-900' },
    FCU_APPROVED: { label: 'Approved by FCU', bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
    SENT_TO_CREDIT: { label: 'Sent to Credit', bg: 'bg-blue-50 text-blue-900 border border-blue-200' },
    UNDER_REVIEW: { label: 'Under Review', bg: 'bg-zinc-100 text-zinc-800' },
    FIELD_VERIFICATION: { label: 'Field Verification', bg: 'bg-slate-100 text-slate-800' },
    HOLD: { label: 'Hold', bg: 'bg-slate-100 text-slate-700' },
  }

  const found = palette[status] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${found.bg}`}>
      {found.label}
    </span>
  )
}

export default function LeadTracker({
  cases,
  onViewCase,
}: {
  cases: LeadCase[]
  onViewCase: (caseData: LeadCase) => void
}) {
  const branchOptions = useMemo(() => {
    return ['All Branches', ...new Set(cases.map(c => c.branch))]
  }, [cases])

  const [searchQuery, setSearchQuery] = useState('')
  const [loanStatus, setLoanStatus] = useState('All Statuses')
  const [loanMin, setLoanMin] = useState('')
  const [loanMax, setLoanMax] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('All Branches')
  const [hasSearched, setHasSearched] = useState(false)

  const filtered = cases.filter(c => {
    const q = searchQuery.toLowerCase().trim()
    const selectedStatus = STATUS_MAP[loanStatus]
    const loanAmount = typeof c.loanRaw === 'number' ? c.loanRaw : Number.parseInt(c.loan.replace(/[^\d]/g, ''), 10) || 0

    const matchesQuery = !q || [c.borrower, c.id, c.ref, c.mobile, c.branch, c.purpose, c.city]
      .some(v => v.toLowerCase().includes(q))

    const matchesStatus = !selectedStatus || c.status === selectedStatus
    const matchesBranch = selectedBranch === 'All Branches' || c.branch === selectedBranch
    const matchesMin = !loanMin || loanAmount >= Number(loanMin)
    const matchesMax = !loanMax || loanAmount <= Number(loanMax)

    return matchesQuery && matchesStatus && matchesBranch && matchesMin && matchesMax
  })

  const resetSearch = () => {
    setSearchQuery('')
    setLoanStatus('All Statuses')
    setLoanMin('')
    setLoanMax('')
    setSelectedBranch('All Branches')
    setHasSearched(false)
  }

  const resultsPanel = !hasSearched ? (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-gray-50/60 border border-dashed border-gray-200 rounded-b text-center">
      <div className="text-[64px] text-gray-300">⌕</div>
      <div className="text-[12px] text-gray-600">Enter search criteria above and click Search to find loan applications.</div>
    </div>
  ) : filtered.length === 0 ? (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-gray-50/60 border border-dashed border-gray-200 rounded-b text-center">
      <div className="text-[64px] text-gray-300">⌕</div>
      <div className="text-[12px] text-gray-600">No matching loan applications found for the current criteria.</div>
    </div>
  ) : (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-[11px]">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-gray-200">
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Lead</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Application</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Loan</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Branch / RM</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: c.avatar }}>
                      {c.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{c.borrower}</div>
                      <div className="text-[9px] text-gray-400">{c.city}, {c.state}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="font-semibold text-blue-700 font-mono">{c.id}</div>
                  <div className="text-[9px] text-gray-400">{c.ref}</div>
                </td>
                <td className="px-2 py-2">
                  <div className="font-mono text-gray-700">{c.mobile}</div>
                  <div className="text-[9px] text-gray-400">{c.email}</div>
                </td>
                <td className="px-2 py-2">
                  <div className="font-bold text-gray-800">{c.loan}</div>
                  <div className="flex gap-1 mt-0.5">
                    <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[9px]">{c.purpose}</span>
                    <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-[9px]">LTI: {c.lti}</span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="font-medium text-gray-700">{c.branch}</div>
                  <div className="text-[9px] text-gray-400">{c.rm}</div>
                </td>
                <td className="px-2 py-2">
                  <TrackStatusBadge status={c.status} />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => onViewCase(c)}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-semibold hover:bg-slate-700"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="flex-1 min-w-0 overflow-auto p-3 bg-[#f5f7fb]">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4">
          <h1 className="text-[18px] font-bold text-slate-800">Search</h1>
        </div>

        <div className="bg-white rounded border border-gray-200 shadow-sm p-5 mb-4">
          <div className="mb-5 text-[14px] font-bold text-slate-800">Advanced Search</div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-700">Search (Name / App No / Mobile / CIF / Email)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. FOREST ROHILLA or APP000000088..."
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-700">Loan Status</label>
              <select
                value={loanStatus}
                onChange={e => setLoanStatus(e.target.value)}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none focus:border-blue-400"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-700">Loan Amount Range (₹)</label>
              <div className="grid grid-cols-[1fr_16px_1fr] items-center gap-2">
                <input
                  type="number"
                  value={loanMin}
                  onChange={e => setLoanMin(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none focus:border-blue-400"
                />
                <span className="text-center text-[11px] text-gray-400">to</span>
                <input
                  type="number"
                  value={loanMax}
                  onChange={e => setLoanMax(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-700">Branch</label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none focus:border-blue-400"
              >
                {branchOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setHasSearched(true)}
              className="rounded bg-slate-900 px-5 py-2 text-[11px] font-semibold text-white hover:bg-slate-700"
            >
              Search
            </button>
            <button
              onClick={resetSearch}
              className="rounded border border-gray-200 bg-white px-5 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          {resultsPanel}
        </div>
      </div>
    </div>
  )
}
