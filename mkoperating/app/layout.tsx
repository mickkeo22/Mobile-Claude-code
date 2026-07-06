import type { Metadata } from 'next';
import { Archivo, Inter } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mkoperating.com'),
  title: {
    default: 'MK Operating Company — Stop leaking money. Get a free AI audit.',
    template: '%s · MK Operating Company',
  },
  description:
    'MK Operating helps local service businesses stop leaking money to missed calls and slow follow-up. Get a free, tailored AI audit of what we can automate — then book a call.',
  keywords: [
    'small business automation',
    'missed call text back',
    'lead follow up',
    'service business',
    'AI audit',
  ],
  openGraph: {
    type: 'website',
    siteName: 'MK Operating Company',
    title: 'MK Operating Company — Stop leaking money. Get a free AI audit.',
    description:
      'A free, tailored AI audit of what your service business can automate — missed calls, slow follow-up, and the back-office work that keeps slipping.',
    url: 'https://mkoperating.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MK Operating Company — Stop leaking money.',
    description: 'A free, tailored AI audit of what your service business can automate. Then book a call.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
