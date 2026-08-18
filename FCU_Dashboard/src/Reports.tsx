type ReportCase = {
  id: string
  borrower: string
  branch: string
  state: string
  purpose: string
  status: string
  loanRaw: number
  cibil: string
  gender?: string
  dob?: string
}

function getAge(dob?: string) {
  if (!dob) return null
  const match = dob.match(/(\d{1,2})\s+[A-Za-z]+\s+(\d{4})/)
  if (!match) return null
  const birthYear = Number(match[2])
  const now = new Date()
  const age = now.getFullYear() - birthYear
  return age
}

export default function Reports({ cases }: { cases: ReportCase[] }) {
  const totalCases = cases.length
  const approved = cases.filter(c => c.status === 'APPROVED' || c.status === 'SENT_TO_CREDIT').length
  const rejected = cases.filter(c => c.status === 'REJECTED' || c.status === 'FORWARDED_REJECT').length
  const disbursed = cases.filter(c => c.status === 'DISBURSED').length
  const pending = cases.filter(c => c.status === 'PENDING' || c.status === 'DOCUMENT_PENDING' || c.status === 'UNDER_REVIEW').length

  const stateSummary = Array.from(
    cases.reduce((acc, c) => {
      const key = c.state || 'Unknown'
      const existing = acc.get(key) ?? { state: key, assigned: 0, approved: 0, rejected: 0, pending: 0 }
      existing.assigned += 1
      if (c.status === 'APPROVED' || c.status === 'SENT_TO_CREDIT') existing.approved += 1
      if (c.status === 'REJECTED' || c.status === 'FORWARDED_REJECT') existing.rejected += 1
      if (c.status === 'PENDING' || c.status === 'DOCUMENT_PENDING' || c.status === 'UNDER_REVIEW') existing.pending += 1
      acc.set(key, existing)
      return acc
    }, new Map<string, { state: string; assigned: number; approved: number; rejected: number; pending: number }>())
  ).map(item => item[1])

  const genderSummary = Array.from(
    cases.reduce((acc, c) => {
      const key = c.gender || 'Unknown'
      const existing = acc.get(key) ?? { gender: key, count: 0, approved: 0, rejected: 0 }
      existing.count += 1
      if (c.status === 'APPROVED' || c.status === 'SENT_TO_CREDIT') existing.approved += 1
      if (c.status === 'REJECTED' || c.status === 'FORWARDED_REJECT') existing.rejected += 1
      acc.set(key, existing)
      return acc
    }, new Map<string, { gender: string; count: number; approved: number; rejected: number }>())
  ).map(item => item[1])

  const ageBandSummary = Array.from(
    cases.reduce((acc, c) => {
      const age = getAge(c.dob)
      let band = 'Unknown'
      if (age !== null) {
        if (age <= 25) band = '18-25'
        else if (age <= 35) band = '26-35'
        else if (age <= 45) band = '36-45'
        else if (age <= 60) band = '46-60'
        else band = '60+'
      }
      const existing = acc.get(band) ?? { band, count: 0, approved: 0, rejected: 0 }
      existing.count += 1
      if (c.status === 'APPROVED' || c.status === 'SENT_TO_CREDIT') existing.approved += 1
      if (c.status === 'REJECTED' || c.status === 'FORWARDED_REJECT') existing.rejected += 1
      acc.set(band, existing)
      return acc
    }, new Map<string, { band: string; count: number; approved: number; rejected: number }>())
  ).map(item => item[1])

  const purposeSummary = Array.from(
    cases.reduce((acc, c) => {
      const key = c.purpose
      const existing = acc.get(key) ?? { purpose: key, count: 0 }
      existing.count += 1
      acc.set(key, existing)
      return acc
    }, new Map<string, { purpose: string; count: number }>())
  ).map(item => item[1])

  return (
    <div className="flex-1 min-w-0 overflow-auto bg-[#f5f7fb] p-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-sm font-bold text-slate-800">Reports & MIS</h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Operational reporting view for FCU applications</p>
            </div>
            <button className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-[10px] font-semibold hover:bg-blue-800">
              ↓ Export MIS
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Cases', value: String(totalCases), color: 'border-blue-500' },
              { label: 'Approved', value: String(approved), color: 'border-emerald-500' },
              { label: 'Disbursed', value: String(disbursed), color: 'border-purple-500' },
              { label: 'Pending / Review', value: String(pending), color: 'border-amber-500' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded border-l-4 ${s.color} p-3 shadow-sm`}>
                <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">{s.label}</div>
                <div className="text-xl font-bold text-[#1e3a5f] font-mono">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#f0f4fa] border-b border-gray-200 px-4 py-2.5">
              <div className="text-[12px] font-bold text-[#1e3a5f]">State-wise Summary</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">State</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Approved</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Rejected</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {stateSummary.map(s => (
                    <tr key={s.state} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 font-semibold text-gray-800">{s.state}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700">{s.assigned}</td>
                      <td className="px-3 py-1.5 font-mono text-emerald-700 font-semibold">{s.approved}</td>
                      <td className="px-3 py-1.5 font-mono text-red-600 font-semibold">{s.rejected}</td>
                      <td className="px-3 py-1.5 font-mono text-amber-600">{s.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#f0f4fa] border-b border-gray-200 px-4 py-2.5">
              <div className="text-[12px] font-bold text-[#1e3a5f]">Gender-wise Report</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Gender</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Count</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Approved</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {genderSummary.map(g => (
                    <tr key={g.gender} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 font-semibold text-gray-800">{g.gender}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700">{g.count}</td>
                      <td className="px-3 py-1.5 font-mono text-emerald-700 font-semibold">{g.approved}</td>
                      <td className="px-3 py-1.5 font-mono text-red-600 font-semibold">{g.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#f0f4fa] border-b border-gray-200 px-4 py-2.5">
              <div className="text-[12px] font-bold text-[#1e3a5f]">Age-wise Report</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Age Band</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Count</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Approved</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {ageBandSummary.map(a => (
                    <tr key={a.band} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 font-semibold text-gray-800">{a.band}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700">{a.count}</td>
                      <td className="px-3 py-1.5 font-mono text-emerald-700 font-semibold">{a.approved}</td>
                      <td className="px-3 py-1.5 font-mono text-red-600 font-semibold">{a.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-[#f0f4fa] border-b border-gray-200 px-4 py-2.5">
              <div className="text-[12px] font-bold text-[#1e3a5f]">Purpose Distribution</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Purpose</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {purposeSummary.map(p => (
                    <tr key={p.purpose} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 font-semibold text-gray-800">{p.purpose}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
          <div className="text-[12px] font-bold text-[#1e3a5f] mb-3">Operational Highlights</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Approval Ratio</div>
              <div className="text-lg font-bold text-emerald-600 font-mono">{Math.round((approved / Math.max(totalCases, 1)) * 100)}%</div>
            </div>
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Rejection Ratio</div>
              <div className="text-lg font-bold text-red-600 font-mono">{Math.round((rejected / Math.max(totalCases, 1)) * 100)}%</div>
            </div>
            <div className="rounded border border-gray-200 p-3 bg-gray-50">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Disbursement Rate</div>
              <div className="text-lg font-bold text-purple-600 font-mono">{Math.round((disbursed / Math.max(totalCases, 1)) * 100)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
