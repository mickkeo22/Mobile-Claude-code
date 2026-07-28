import Scanner from '@/components/Scanner'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>
}): Promise<Metadata> {
  const { domain } = await params
  const clean = decodeURIComponent(domain)
  return {
    title: `AI visibility scan for ${clean}`,
    description: `Live results: which AI crawlers can reach ${clean}, and what ChatGPT can actually read about it.`,
  }
}

export default async function ScanPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  const clean = decodeURIComponent(domain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  return (
    <div className="wrap py-10 sm:py-14">
      <Scanner domain={clean} />
    </div>
  )
}
