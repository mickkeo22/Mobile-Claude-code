'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ScanForm({ autoFocus = false, size = 'lg' }: { autoFocus?: boolean; size?: 'lg' | 'sm' }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
    if (!cleaned || !cleaned.includes('.')) {
      setError('Enter a website address, like joesplumbing.com')
      return
    }
    setError('')
    setBusy(true)
    router.push(`/scan/${encodeURIComponent(cleaned)}`)
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div
        className={`flex flex-col gap-2.5 sm:flex-row ${
          size === 'lg' ? 'sm:gap-3' : 'sm:gap-2'
        }`}
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none font-mono text-sm text-white/30">
            https://
          </span>
          <input
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError('')
            }}
            placeholder="yourbusiness.com"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Your website address"
            className={`w-full rounded-xl border border-white/[0.12] bg-white/[0.04] pl-[4.6rem] pr-4 font-mono text-white
                        placeholder:text-white/25 outline-none transition-colors
                        focus:border-pulse-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-pulse-400/10
                        ${size === 'lg' ? 'h-14 text-base' : 'h-12 text-sm'}`}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`btn-primary shrink-0 ${size === 'lg' ? 'h-14 px-7 text-base' : 'h-12 px-5'}`}
        >
          {busy ? 'Starting…' : 'Scan free'}
        </button>
      </div>
      {error ? (
        <p className="mt-2.5 text-sm text-flare-400">{error}</p>
      ) : (
        <p className="mt-2.5 text-sm text-white/35">
          No signup, no email. Results in about 15 seconds.
        </p>
      )}
    </form>
  )
}
