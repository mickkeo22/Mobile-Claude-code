'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-outline !px-4 !py-2 !text-xs">
      <Printer className="h-3.5 w-3.5" /> Save as PDF
    </button>
  );
}
