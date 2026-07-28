import type { Metadata } from 'next'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://answergap.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'AnswerGap — is your business invisible to AI?',
    template: '%s · AnswerGap',
  },
  description:
    'Free scan: we request your homepage as GPTBot, ClaudeBot, PerplexityBot and five other AI crawlers, then compare it to a real browser. Find out what ChatGPT can actually read about your business.',
  openGraph: {
    title: 'AnswerGap — is your business invisible to AI?',
    description:
      'We ask your site for its homepage as each major AI crawler and compare it to a real browser. Most blocked sites have no idea.',
    url: APP_URL,
    siteName: 'AnswerGap',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'AnswerGap', description: 'Is your business invisible to AI?' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="no-print sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-md">
            <div className="wrap flex h-14 items-center justify-between">
              <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
                <Logo />
                <span>
                  Answer<span className="text-pulse-400">Gap</span>
                </span>
              </a>
              <nav className="flex items-center gap-5 text-sm text-white/55">
                <a href="/how-it-works" className="hidden transition-colors hover:text-white sm:inline">
                  How it works
                </a>
                <a href="/#scan" className="transition-colors hover:text-white">
                  Run a scan
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="no-print mt-24 border-t border-white/[0.06] py-10">
            <div className="wrap flex flex-col gap-4 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {new Date().getFullYear()} AnswerGap · Every result is measured live, never estimated.
              </p>
              <div className="flex gap-5">
                <a href="/how-it-works" className="transition-colors hover:text-white/70">
                  Method
                </a>
                <a href="/legal" className="transition-colors hover:text-white/70">
                  Terms &amp; privacy
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="rgba(255,255,255,.16)" />
      <path d="M7 15.5 12 7l5 8.5" stroke="#3ed3a3" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.3 13h5.4" stroke="#3ed3a3" strokeWidth="1.9" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}
