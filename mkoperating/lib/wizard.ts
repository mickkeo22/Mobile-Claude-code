// Wizard definition — questions, options and copy match the live funnel,
// with two flow changes: email is captured at step 2 so mid-wizard abandons
// are still saved as partial leads, and the final step collects name + phone
// so GHL receives a complete contact and booking a call is one tap.

export type StepKey =
  | 'business_name'
  | 'contact'
  | 'what_you_do'
  | 'lead_flow'
  | 'tools'
  | 'losing_money'
  | 'time_sink'
  | 'contact_info';

export interface WizardStep {
  key: StepKey;
  label: string; // short eyebrow label
  title: string;
  sub: string;
  kind: 'text' | 'contact' | 'multi' | 'contact_info';
  options?: string[];
  placeholder?: string; // text input or textarea placeholder
  note?: string;
  error?: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    key: 'business_name',
    label: 'Business name',
    title: "What's your business called?",
    sub: 'Just the name — we tailor everything else to it.',
    kind: 'text',
    placeholder: 'e.g. Summit Tree & Land',
    error: 'Please enter your business name.',
  },
  {
    key: 'contact',
    label: 'Your email',
    title: 'Where should we send your audit?',
    sub: 'Required — we send your audit here and use it to keep out spam.',
    kind: 'contact',
    placeholder: 'you@yourbusiness.com',
    note: 'No spam, ever. Your audit shows on this page too — email is your copy.',
    error: 'Please enter a valid email address.',
  },
  {
    key: 'what_you_do',
    label: 'What you do',
    title: 'What does your business do?',
    sub: 'Tap what fits — add detail below.',
    kind: 'multi',
    options: [
      'Tree service / removal',
      'Pressure washing',
      'Landscaping / lawn care',
      'Cleaning service',
      'Roofing / gutters',
      'Handyman / general contractor',
      'HVAC / plumbing / electrical',
      'Other home or field service',
    ],
    placeholder: 'Tell us more about what you do and who you serve…',
    note: 'Pick what fits, or tell us in your own words.',
  },
  {
    key: 'lead_flow',
    label: 'New-lead flow',
    title: 'When a new lead reaches out, what usually happens?',
    sub: 'Check all that happen — then add detail.',
    kind: 'multi',
    options: [
      'I answer right away when I can',
      "I miss calls when I'm on a job",
      'I call or text back later that day',
      'Leads message or fill out a form online',
      'A team member or answering service handles it',
      'I book an estimate, then follow up',
      'Some leads slip through the cracks',
    ],
    placeholder: 'Walk us through it start to finish…',
    note: 'Pick what happens, or describe it in your own words.',
  },
  {
    key: 'tools',
    label: 'Your tools',
    title: 'What do you use to run the business today?',
    sub: 'Pick what you use — add anything we missed.',
    kind: 'multi',
    options: [
      'Just my phone',
      'Paper / whiteboard / notebook',
      'Spreadsheets',
      'QuickBooks',
      'Housecall Pro',
      'ServiceTitan',
      'Google Calendar / Workspace',
    ],
    placeholder: 'Anything else you rely on…',
    note: 'Pick what you use, or tell us in your own words.',
  },
  {
    key: 'losing_money',
    label: 'The leaks',
    title: 'Where do you think money is slipping away?',
    sub: 'Your honest gut read — this drives your audit.',
    kind: 'multi',
    options: [
      'Missed calls',
      'Slow follow-up on estimates',
      'Overdue or unpaid invoices',
      'No-shows or cancellations',
      'Underpricing my work',
      'Losing repeat customers',
      'Few or bad online reviews',
      "Not sure — that's why I'm here",
    ],
    placeholder: 'Tell us more about where it’s leaking…',
    note: 'Pick what fits, or tell us in your own words.',
  },
  {
    key: 'time_sink',
    label: 'Time sinks',
    title: 'What eats the most of your time each week?',
    sub: 'Check the big ones — add detail below.',
    kind: 'multi',
    options: [
      'Answering calls and texts',
      'Scheduling and dispatching',
      'Quotes and estimates',
      'Invoicing and chasing payments',
      'Following up with leads',
      'Paperwork and admin',
      'Hiring and managing crew',
    ],
    placeholder: 'What keeps you off the truck or up at night…',
    note: 'Pick what fits, or tell us in your own words.',
  },
  {
    key: 'contact_info',
    label: 'Your details',
    title: 'Last step — who should we prepare this for?',
    sub: 'Your audit gets your name on it, and booking a call takes one tap — everything is pre-filled.',
    kind: 'contact_info',
    note: 'Your phone is only used if you book a call — no cold calls, no spam, ever.',
    error: 'Please fill in your name, phone, and a valid email.',
  },
];

export const MULTI_KEYS = ['what_you_do', 'lead_flow', 'tools', 'losing_money', 'time_sink'] as const;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Lenient phone check: 7–15 digits, common punctuation allowed. */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!/^[\d\s()+.\-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/** "Sam J Rivera" → { first: "Sam", last: "J Rivera" } — GHL wants both. */
export function splitFullName(name?: string | null): { first: string | null; last: string | null } {
  const clean = (name ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return { first: null, last: null };
  const [first, ...rest] = clean.split(' ');
  return { first, last: rest.length ? rest.join(' ') : null };
}

// The three lanes every audit item is sorted into (colors from the live site).
export const BUCKET_META = {
  ghl: {
    key: 'ghl',
    label: 'Automation systems',
    tag: 'Ready now',
    color: '#1F6F4F',
    tint: '#E7F2EC',
    blurb:
      'The systems we stand up fast — they catch leads, follow through, and keep customers warm without you lifting a finger.',
  },
  plugin: {
    key: 'plugin',
    label: 'Back-office, handled by us',
    tag: 'Run by us',
    color: '#2563EB',
    tint: '#E8EEFB',
    blurb:
      'The recurring back-office work we run for you, so the numbers and follow-through stop slipping.',
  },
  build: {
    key: 'build',
    label: 'Custom builds',
    tag: 'One-time build',
    color: '#7C3AED',
    tint: '#F0E9FB',
    blurb: 'Bespoke tools and automations we build once for the specific way your business runs.',
  },
} as const;
