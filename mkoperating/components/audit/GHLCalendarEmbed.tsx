'use client';

// GHL booking calendar embed — same widget as the live site
// (calendar nT7yoVYh91A28KZqfT8Q), with the visitor's contact details
// prefilled so the booking links to their audit contact in GHL and they
// don't have to retype anything.

import Script from 'next/script';
import { GHL_BOOKING_URL } from '@/lib/env';

export function GHLCalendarEmbed({
  prefillEmail,
  prefillFirstName,
  prefillLastName,
  prefillPhone,
}: {
  prefillEmail?: string;
  prefillFirstName?: string;
  prefillLastName?: string;
  prefillPhone?: string;
}) {
  const params = new URLSearchParams();
  if (prefillEmail) params.set('email', prefillEmail);
  if (prefillFirstName) params.set('first_name', prefillFirstName);
  if (prefillLastName) params.set('last_name', prefillLastName);
  if (prefillPhone) params.set('phone', prefillPhone);
  const qs = params.toString();
  const src = qs ? `${GHL_BOOKING_URL}?${qs}` : GHL_BOOKING_URL;

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
          We&apos;ve pre-filled your details{prefillPhone ? '' : ` (${prefillEmail})`} so your booking
          links to your audit.
        </p>
      ) : null}
    </div>
  );
}
