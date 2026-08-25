import { useState, useEffect, type FormEvent } from 'react'
import geetpayLogo from './assets/geetpay-logo.png'

export interface FcuUser {
  id: number
  name?: string
  email: string
  role: string
}

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocal) {
      return (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
    }
    const saved = localStorage.getItem('fcu_api_url');
    if (saved && !saved.includes('localhost')) return saved.trim().replace(/\/+$/, '');
    return (import.meta.env.VITE_PROD_API_URL || import.meta.env.VITE_API_URL || 'https://api.geetpay.in/FCUTEAM').trim().replace(/\/+$/, '');
  }
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/+$/, '');
};

export const API_BASE_URL = {
  toString: () => getApiBaseUrl(),
  valueOf: () => getApiBaseUrl(),
  [Symbol.toPrimitive]: () => getApiBaseUrl(),
} as unknown as string;

export default function LoginPage({
  onLogin,
  installPrompt: externalPrompt,
  onInstallPwa: externalInstall,
}: {
  onLogin: (user: FcuUser) => void
  installPrompt?: any
  onInstallPwa?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [internalPrompt, setInternalPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInternalPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const effectivePrompt = externalPrompt || internalPrompt

  const handleInstallClick = async () => {
    if (externalInstall) {
      externalInstall()
      return
    }
    if (effectivePrompt) {
      effectivePrompt.prompt()
      const choice = await effectivePrompt.userChoice
      if (choice?.outcome === 'accepted') {
        setInternalPrompt(null)
      }
    } else {
      alert('To install the app, click the install icon in your browser address bar (or browser Menu > Install app / Add to Home Screen).')
    }
  }

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''

  const candidateUrls = isLocal
    ? ['http://localhost:5000', 'https://api.geetpay.in/FCUTEAM', 'https://geetpay.in/FCU']
    : Array.from(new Set([
        localStorage.getItem('fcu_api_url') || '',
        import.meta.env.VITE_PROD_API_URL || '',
        import.meta.env.VITE_API_URL || '',
        'https://api.geetpay.in/FCUTEAM',
        'https://geetpay.in/FCU',
        'https://geetpay.in/FCUTEAM',
        `${currentOrigin}/FCUTEAM`,
        `${currentOrigin}/FCU`,
      ]))
      .map(u => String(u).trim().replace(/\/+$/, ''))
      .filter(u => Boolean(u) && (!isHttps || !u.includes('localhost')))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    let lastErrorMessage = ''
    let loggedIn = false

    for (const endpoint of candidateUrls) {
      try {
        const response = await fetch(`${endpoint}/api/fcu/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: email.trim(), password }),
        })

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          continue
        }

        const result = await response.json().catch(() => null)
        if (!result || typeof result !== 'object' || !result.status) {
          continue
        }

        if (!response.ok || result.status !== 'success') {
          lastErrorMessage = result.message || 'Unable to sign in. Please check your credentials.'
          break
        }

        if (result.data) {
          localStorage.setItem('fcu_api_url', endpoint)
          if (result.data.token) {
            localStorage.setItem('fcu_token', result.data.token)
          }
          onLogin(result.data)
          loggedIn = true
          break
        }
      } catch (err: any) {
        lastErrorMessage = err?.message || 'Connection error'
      }
    }

    if (!loggedIn) {
      setError(lastErrorMessage || 'Unable to connect to backend server. Please verify server status in cPanel.')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcfe] text-[#061b49]">
      <header className="relative z-20 border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <img src={geetpayLogo} alt="GeetPay - Product of Waqt Finance" className="h-12 w-auto max-w-[190px] object-contain object-left sm:max-w-[230px]" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow active:scale-95 cursor-pointer animate-pulse"
              title="Install GeetPay FCU Dashboard as App"
            >
              <span>📲</span> Install App
            </button>
            <div className="rounded-full bg-[#eefaf5] px-4 py-2 text-[10px] font-bold text-[#008d61]">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#00a76f]" />System online
            </div>
          </div>
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
