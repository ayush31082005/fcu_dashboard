import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts'
import { useEffect, useState } from 'react'
import { API_BASE_URL } from './LoginPage'

// ── Data ──────────────────────────────────────────────────────────────────────

const dailyCases = [
  { day: 'Mon', assigned: 18, completed: 14, pending: 4 },
  { day: 'Tue', assigned: 22, completed: 19, pending: 3 },
  { day: 'Wed', assigned: 15, completed: 11, pending: 4 },
  { day: 'Thu', assigned: 26, completed: 21, pending: 5 },
  { day: 'Fri', assigned: 30, completed: 24, pending: 6 },
  { day: 'Sat', assigned: 12, completed: 10, pending: 2 },
  { day: 'Sun', assigned: 8,  completed: 6,  pending: 2 },
]

const tatTrend = [
  { week: 'W1', tat: 3.8 },
  { week: 'W2', tat: 3.2 },
  { week: 'W3', tat: 2.9 },
  { week: 'W4', tat: 3.5 },
  { week: 'W5', tat: 2.6 },
  { week: 'W6', tat: 2.4 },
  { week: 'W7', tat: 2.1 },
  { week: 'W8', tat: 1.9 },
]

const executives = [
  { name: 'Priya Mehta',    cases: 47, completed: 43, pending: 4, tat: '1.8d', score: 92 },
  { name: 'Rohit Verma',    cases: 41, completed: 36, pending: 5, tat: '2.1d', score: 87 },
  { name: 'Sneha Rao',      cases: 38, completed: 35, pending: 3, tat: '2.0d', score: 92 },
  { name: 'Amit Chauhan',   cases: 35, completed: 29, pending: 6, tat: '2.6d', score: 83 },
  { name: 'Kavita Singh',   cases: 33, completed: 31, pending: 2, tat: '1.9d', score: 94 },
  { name: 'Deepak Sharma',  cases: 28, completed: 22, pending: 6, tat: '3.1d', score: 79 },
]

const branches = [
  { name: 'Panrose Delhi',    assigned: 58, approved: 38, rejected: 12, pending: 8,  tat: 2.1 },
  { name: 'Nazut Delhi',      assigned: 47, approved: 30, rejected: 9,  pending: 8,  tat: 2.4 },
  { name: 'Goztep Varanasi',  assigned: 34, approved: 20, rejected: 8,  pending: 6,  tat: 2.8 },
  { name: 'Goztep Jaipur',    assigned: 29, approved: 19, rejected: 5,  pending: 5,  tat: 2.3 },
  { name: 'Nazut Bhopal',     assigned: 22, approved: 14, rejected: 4,  pending: 4,  tat: 3.0 },
]

const approvalTrend = [
  { month: 'Mar', approved: 68, rejected: 18, pending: 14 },
  { month: 'Apr', approved: 72, rejected: 15, pending: 13 },
  { month: 'May', approved: 65, rejected: 22, pending: 13 },
  { month: 'Jun', approved: 78, rejected: 12, pending: 10 },
  { month: 'Jul', approved: 74, rejected: 16, pending: 10 },
  { month: 'Aug', approved: 81, rejected: 11, pending: 8  },
]

const caseStatusPie = [
  { name: 'Approved',         value: 127, color: '#111827' },
  { name: 'Rejected',         value: 43,  color: '#6b7280' },
  { name: 'Pending',          value: 28,  color: '#9ca3af' },
  { name: 'Document Pending', value: 19,  color: '#d1d5db' },
  { name: 'Under Review',     color: '#374151', value: 14 },
  { name: 'Disbursed',        value: 89,  color: '#4b5563' },
]

const purposeBar = [
  { purpose: 'Home Repair', count: 68 },
  { purpose: 'Education',   count: 54 },
  { purpose: 'Business',    count: 47 },
  { purpose: 'Medical',     count: 39 },
  { purpose: 'Agriculture', count: 22 },
  { purpose: 'Personal',    count: 18 },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon, trend,
}: {
  label: string; value: string; sub?: string; color: string; icon: string; trend?: { val: string; up: boolean }
}) {
  return (
    <div className={`rounded border border-gray-200 bg-white border-l-4 ${color} p-3 shadow-sm flex items-start justify-between`}>
      <div>
        <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide mb-1">{label}</div>
        <div className="text-2xl font-bold text-slate-800 font-mono leading-none">{value}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
        {trend && (
          <div className={`text-[9px] font-semibold mt-1 flex items-center gap-0.5 ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.up ? '▲' : '▼'} {trend.val} vs last week
          </div>
        )}
      </div>
      <div className="text-xl opacity-60">{icon}</div>
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-[13px] font-bold text-slate-800">{title}</h2>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 80 ? 'bg-blue-500' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${score >= 90 ? 'text-emerald-600' : score >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>{score}</span>
    </div>
  )
}

const TOOLTIP_STYLE = {
  fontSize: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/fcu/auth/dashboard`, { credentials: 'include' })
      .then(async response => {
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.message || 'Unable to load dashboard')
        return result.data
      })
      .then(setDashboardData)
      .catch(error => setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const statusColors = ['#111827', '#6b7280', '#9ca3af', '#d1d5db', '#374151', '#4b5563', '#94a3b8']
  const dailyCases = dashboardData?.dailyCases || []
  const tatTrend = dashboardData?.tatTrend || []
  const executives = dashboardData?.executives || []
  const branches = dashboardData?.branches || []
  const approvalTrend = dashboardData?.approvalTrend || []
  const caseStatusPie = (dashboardData?.caseStatusPie || []).map((item: any, index: number) => ({
    ...item,
    name: String(item.name).replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()),
    color: statusColors[index % statusColors.length],
  }))
  const purposeBar = dashboardData?.purposeBar || []
  const summary = dashboardData?.summary
  const totalAssigned  = dailyCases.reduce((s, d) => s + d.assigned, 0)
  const totalCompleted = dailyCases.reduce((s, d) => s + d.completed, 0)
  const totalPending   = dailyCases.reduce((s, d) => s + d.pending, 0)
  const avgTAT         = Number(summary?.avgTat || 0).toFixed(1)
  const totalCases     = Number(summary?.totalCases || 0)
  const approvedCases  = Number(summary?.approved || 0)
  const rejectedCases  = Number(summary?.rejected || 0)
  const approvalRatio  = Number(summary?.approvalRatio || 0).toFixed(1)
  const rejectionRatio = Number(summary?.rejectionRatio || 0).toFixed(1)

  return (
    <div className="flex-1 overflow-auto bg-[#f5f7fb] p-3 sm:p-4">
      <div className="w-full space-y-5">

        {loading && <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">Loading live dashboard data…</div>}
        {loadError && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{loadError}</div>}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800">FCU Panel</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Fraud Control Unit — Live Management Information System</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-gray-200 rounded px-2 py-1 text-[11px] bg-white text-gray-600 focus:outline-none">
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last 3 Months</option>
            </select>
            <button className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-[10px] font-semibold hover:bg-blue-800">
              ↓ Export MIS
            </button>
          </div>
        </div>

        {/* KPI Row 1 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Daily Cases Assigned" value={String(totalAssigned)} sub="Last 7 days" color="border-blue-500" icon="📋" />
          <KpiCard label="Pending Verification" value={String(summary?.pending ?? totalPending)} sub="Awaiting FCU review" color="border-amber-500" icon="⏳" />
          <KpiCard label="Completed Verification" value={String(summary?.completed ?? totalCompleted)} sub="Workflow completed" color="border-emerald-500" icon="✅" />
          <KpiCard label="Average TAT" value={`${avgTAT} days`} sub="Turnaround time" color="border-purple-500" icon="⏱" />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Cases (MTD)"        value={String(totalCases)}      sub="Month to date"          color="border-slate-400"   icon="🗂" />
          <KpiCard label="Approval Ratio"           value={`${approvalRatio}%`}     sub={`${approvedCases} approved`}   color="border-emerald-500" icon="✓" trend={{ val: '+2.1%', up: true }} />
          <KpiCard label="Rejection Ratio"          value={`${rejectionRatio}%`}    sub={`${rejectedCases} rejected`}   color="border-red-500"     icon="✗" trend={{ val: '−1.4%', up: true }} />
          <KpiCard label="Fraud Detected" value={String(summary?.fraudDetected || 0)} sub="Flagged cases" color="border-rose-600" icon="🚩" />
        </div>

        {/* Row: Daily Cases Bar + TAT Trend */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <SectionHeader title="Daily Cases — Assigned vs Completed" sub="Current week breakdown" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyCases} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="assigned"  name="Assigned"  fill="#111827" radius={[3,3,0,0]} />
                <Bar dataKey="completed" name="Completed" fill="#6b7280" radius={[3,3,0,0]} />
                <Bar dataKey="pending"   name="Pending"   fill="#d1d5db" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <SectionHeader title="Average TAT Trend" sub="Turnaround time in days (8 weeks)" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={tatTrend}>
                <defs>
                  <linearGradient id="tatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#111827" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 5]} unit="d" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} days`, 'Avg TAT']} />
                <Area type="monotone" dataKey="tat" name="Avg TAT" stroke="#111827" strokeWidth={2} fill="url(#tatGrad)" dot={{ r: 3, fill: '#111827' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row: Approval/Rejection Trend + Case Status Pie */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="bg-white rounded border border-gray-200 shadow-sm p-4 xl:col-span-2">
            <SectionHeader title="Approval & Rejection Trend" sub="Monthly breakdown — last 6 months" />
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={approvalTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="approved" name="Approved" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="rejected" name="Rejected" stroke="#6b7280" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="pending"  name="Pending"  stroke="#9ca3af" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
            <SectionHeader title="Case Status Split" sub={`Total ${totalCases} cases`} />
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={caseStatusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {caseStatusPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
              {caseStatusPie.map(d => (
                <div key={d.name} className="flex items-center gap-1 text-[9px] text-slate-700">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name} <span className="font-bold ml-auto text-slate-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row: Executive Productivity */}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-bold text-slate-800">Executive Productivity</div>
              <div className="text-[10px] text-slate-500">Live FCU officer-wise case handling performance</div>
            </div>
            <div className="flex gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> 90+ Excellent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm" /> 80–89 Good</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-sm" /> Below 80</span>
            </div>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-2 text-left font-semibold text-slate-600 uppercase tracking-wide text-[10px]">#</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Executive</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Total Cases</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Completed</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Pending</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Avg TAT</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Completion %</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 uppercase tracking-wide text-[10px] w-36">Score</th>
              </tr>
            </thead>
            <tbody>
              {executives.map((e, i) => {
                const pct = Math.round((e.completed / e.cases) * 100)
                return (
                  <tr key={e.name} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-2.5 text-slate-500 font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: ['#3b82f6','#8b5cf6','#ec4899','#10b981','#f59e0b','#6366f1'][i] }}>
                          {e.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-semibold text-slate-800">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-800">{e.cases}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-emerald-700 font-semibold">{e.completed}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${e.pending > 4 ? 'bg-red-50 text-red-600' : e.pending > 2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {e.pending}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-700">{e.tat}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-semibold text-slate-700 text-[10px]">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 w-36"><ScoreBar score={e.score} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Row: Branch Performance + Purpose Distribution */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden xl:col-span-2">
            <div className="bg-[#f8fafc] border-b border-gray-200 px-4 py-2.5">
              <div className="text-[12px] font-bold text-slate-800">Branch Performance</div>
              <div className="text-[10px] text-slate-500">Approval / Rejection / Pending by branch</div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={branches} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="approved" name="Approved" fill="#22c55e" stackId="a" radius={[0,0,0,0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" stackId="a" />
                  <Bar dataKey="pending"  name="Pending"  fill="#f59e0b" stackId="a" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Branch Table */}
            <div className="border-t border-gray-100 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Branch','Assigned','Approved','Rejected','Pending','Approval %','Rejection %','Avg TAT'].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => {
                    const appPct = ((b.approved / b.assigned) * 100).toFixed(0)
                    const rejPct = ((b.rejected / b.assigned) * 100).toFixed(0)
                    return (
                      <tr key={b.name} className="border-b border-gray-100 hover:bg-blue-50/20">
                        <td className="px-3 py-1.5 font-semibold text-slate-800">{b.name}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">{b.assigned}</td>
                        <td className="px-3 py-1.5 font-mono text-emerald-700 font-semibold">{b.approved}</td>
                        <td className="px-3 py-1.5 font-mono text-red-600 font-semibold">{b.rejected}</td>
                        <td className="px-3 py-1.5 font-mono text-amber-600">{b.pending}</td>
                        <td className="px-3 py-1.5">
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{appPct}%</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">{rejPct}%</span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-600">{b.tat}d</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Purpose Distribution */}
            <div className="bg-[#0f141b] rounded border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.25)] p-4 flex-1">
              <SectionHeader title="Cases by Purpose" sub="Loan purpose distribution" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={purposeBar} layout="vertical" barCategoryGap="20%">
                  <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="purpose" type="category" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Cases" fill="#3b82f6" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Approval vs Rejection Gauge */}
            <div className="bg-white rounded border border-gray-200 shadow-sm p-4">
              <SectionHeader title="Approval vs Rejection" sub="Overall ratio" />
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600 font-mono">{approvalRatio}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Approval Rate</div>
                  <div className="text-[9px] text-slate-600">{approvedCases} cases</div>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 font-mono">{rejectionRatio}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Rejection Rate</div>
                  <div className="text-[9px] text-slate-600">{rejectedCases} cases</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${approvalRatio}%` }} />
                <div className="h-full bg-red-500 transition-all" style={{ width: `${rejectionRatio}%` }} />
                <div className="h-full bg-amber-400 flex-1" />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span className="text-emerald-600">● Approved</span>
                <span className="text-red-500">● Rejected</span>
                <span className="text-amber-500">● Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-2" />
      </div>
    </div>
  )
}
