import { useState, type FormEvent } from 'react'

export interface FcuUser {
  id: number
  name?: string
  email: string
  role: string
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://fcu-dashboard-fcuserver.vercel.app' : 'http://localhost:5000')

export default function LoginPage({ onLogin }: { onLogin: (user: FcuUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to sign in')
      onLogin(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcfe] text-[#061b49]">
      <header className="relative z-20 border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <img src="/assets/geetpay-logo.png" alt="GeetPay - Product of Waqt Finance" className="h-12 w-auto max-w-[190px] object-contain object-left sm:max-w-[230px]" />
          <div className="hidden items-center gap-7 text-[12px] font-semibold text-slate-700 md:flex"><span>Secure Access</span><span>FCU Operations</span><span>Help</span></div>
          <div className="rounded-full bg-[#eefaf5] px-4 py-2 text-[10px] font-bold text-[#008d61]"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#00a76f]" />System online</div>
        </div>
      </header>

      <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-[1240px] items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:py-14">
        <div className="pointer-events-none absolute right-[-140px] top-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(0,167,111,.12),transparent_68%)]" />
        <section className="relative order-2 lg:order-1">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cbdced] bg-white px-4 py-2 text-[11px] font-semibold text-slate-600 shadow-sm"><span className="text-[#00a76f]">✥</span> Secure FCU management workspace</div>
          <h1 className="max-w-[650px] text-[44px] font-black leading-[1.03] tracking-[-0.055em] text-[#061b49] sm:text-[58px] lg:text-[68px]">Decisions when<br />you need them.</h1>
          <p className="mt-6 max-w-[610px] text-sm leading-7 text-slate-600 sm:text-base">Review applications, verify customer documents and move genuine cases forward from one secure, transparent workspace.</p>
          <div className="mt-10 grid max-w-[560px] grid-cols-3 border-t border-slate-200 pt-7">
            {[['Fast', 'CASE REVIEW'], ['Secure', 'ROLE ACCESS'], ['100%', 'AUDIT TRAIL']].map(([value, label]) => <div key={label}><div className="text-xl font-black text-[#061b49] sm:text-2xl">{value}</div><div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-slate-500">{label}</div></div>)}
          </div>
        </section>

        <section className="relative order-1 mx-auto w-full max-w-[440px] lg:order-2">
          <div className="absolute -left-16 -top-14 hidden h-36 w-36 select-none items-center justify-center text-[180px] font-black leading-none text-[#edf3ff] lg:flex">₹</div>
          <div className="relative rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(6,27,73,.14)] sm:p-9">
            <div className="absolute right-7 top-7 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf8f3] text-xl text-[#00a76f]">✓</div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#00a76f]">Welcome back</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#061b49]">Sign in to FCU</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Enter your administrator-issued credentials.</p>
            <form onSubmit={submit} className="mt-7 space-y-5">
              <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#29436b]">Work email</span><input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@geetpay.in" className="w-full rounded-xl border border-slate-200 bg-[#f8faff] px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-[#07509d] focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
              <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#29436b]">Password</span><div className="relative"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-[#f8faff] px-4 py-3.5 pr-16 text-sm text-slate-800 outline-none transition focus:border-[#07509d] focus:bg-white focus:ring-4 focus:ring-blue-100" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#07509d]">{showPassword ? 'HIDE' : 'SHOW'}</button></div></label>
              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] font-medium text-rose-700">{error}</div>}
              <button disabled={loading} className="group flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#06479b] via-[#0759ad] to-[#00a76f] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in securely'}<span className="transition-transform group-hover:translate-x-1">→</span></button>
            </form>
            <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-[10px] font-medium text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-[#00a76f]" /> Protected and encrypted FCU access</div>
          </div>
          <div className="mt-4 text-center text-[10px] text-slate-400">GeetPay internal system · Authorized personnel only</div>
        </section>
      </div>
    </main>
  )
}
