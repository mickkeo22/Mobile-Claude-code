'use client';

// GHL booking calendar embed — same widget as the live site
// (calendar nT7yoVYh91A28KZqfT8Q), with the visitor's email prefilled so the
// booking links to their audit contact in GHL.

import Script from 'next/script';
import { GHL_BOOKING_URL } from '@/lib/env';

export function GHLCalendarEmbed({ prefillEmail }: { prefillEmail?: string }) {
  const src = prefillEmail
    ? `${GHL_BOOKING_URL}?email=${encodeURIComponent(prefillEmail)}`
    : GHL_BOOKING_URL;

  return (
    <div className="w-full">
      <iframe
        src={src}
        title="Book your Free Strategy Call with MK Operating"
        style={{ width: '100%', minHeight: 780, border: 'none', overflow: 'hidden' }}
        scrolling="no"
      />
      <Script src="https://api.leadconnectorhq.com/js/form_embed.js" strategy="afterInteractive" />
      {prefillEmail ? (
        <p className="mt-3 text-sm text-slatey">
          We&apos;ve pre-filled <strong>{prefillEmail}</strong> so your booking links to your audit.
        </p>
      ) : null}
    </div>
  );
}
