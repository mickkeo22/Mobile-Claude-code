'use client';

// The 8-step audit wizard. Questions and copy match the live funnel; the flow
// changes are that email is captured at step 2 (so an abandon is still a saved
// partial lead — the wizard checkpoints answers to /api/lead after every step)
// and the final step collects name + phone so GHL gets a complete contact.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WIZARD_STEPS, isValidEmail, isValidPhone, splitFullName, type WizardStep } from '@/lib/wizard';
import type { AuditResult, MultiAnswer, WizardAnswers } from '@/lib/types';
import { AuditReport } from './AuditReport';

type Phase = 'wizard' | 'generating' | 'results' | 'error';

function emptyMulti(): MultiAnswer {
  return { picks: [], detail: '' };
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'mk_audit_session';
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function AuditExperience() {
  const [phase, setPhase] = useState<Phase>('wizard');
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({
    business_name: '',
    name: '',
    phone: '',
    email: '',
    what_you_do: emptyMulti(),
    lead_flow: emptyMulti(),
    tools: emptyMulti(),
    losing_money: emptyMulti(),
    time_sink: emptyMulti(),
  });

  const sessionId = useRef('');
  const cardRef = useRef<HTMLDivElement>(null);
  const step = WIZARD_STEPS[stepIndex];
  const isLast = stepIndex === WIZARD_STEPS.length - 1;

  const track = useCallback((stepKey: string, event: string) => {
    try {
      const payload = JSON.stringify({
        session_id: sessionId.current,
        step: stepKey,
        event,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        void fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      /* analytics must never break the funnel */
    }
  }, []);

  useEffect(() => {
    sessionId.current = getSessionId();
    track(WIZARD_STEPS[0].key, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move focus to the step's first input on step change.
  useEffect(() => {
    const el = cardRef.current?.querySelector<HTMLElement>('[data-firstfocus], input, textarea');
    el?.focus();
  }, [stepIndex, phase]);

  const saveCheckpoint = useCallback(
    (current: WizardAnswers, stepKey: string) => {
      if (!current.email || !isValidEmail(current.email)) return;
      void fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId.current,
          email: current.email,
          name: current.name,
          phone: current.phone,
          business_name: current.business_name,
          answers: current,
          step: stepKey,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    []
  );

  function validate(s: WizardStep): string {
    if (s.key === 'business_name' && !answers.business_name.trim()) {
      return s.error ?? 'Required.';
    }
    if (s.key === 'contact' && !isValidEmail(answers.email)) {
      return s.error ?? 'Please enter a valid email address.';
    }
    if (s.key === 'contact_info') {
      if (!answers.name?.trim()) return 'Please enter your name.';
      if (!isValidPhone(answers.phone ?? '')) return 'Please enter a valid phone number.';
      if (!isValidEmail(answers.email)) return 'Please double-check your email address.';
    }
    return '';
  }

  function goNext() {
    const problem = validate(step);
    if (problem) {
      setFieldError(problem);
      return;
    }
    setFieldError('');
    track(step.key, 'complete');
    saveCheckpoint(answers, step.key);
    if (!isLast) {
      const next = stepIndex + 1;
      setStepIndex(next);
      track(WIZARD_STEPS[next].key, 'view');
    } else {
      void submit();
    }
  }

  function goBack() {
    setFieldError('');
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  async function submit() {
    setPhase('generating');
    track('results', 'submit');
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, session_id: sessionId.current }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Something went wrong building your audit. Please try again.');
      }
      const body = (await res.json()) as { audit: AuditResult; lead_id?: string | null };
      setAudit(body.audit);
      setLeadId(body.lead_id ?? null);
      setPhase('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(
        e instanceof Error && e.message !== 'Failed to fetch'
          ? e.message
          : 'We couldn’t reach the audit service. Check your connection and try again — your answers are saved.'
      );
      setPhase('error');
    }
  }

  function toggle(option: string) {
    const key = step.key as keyof WizardAnswers;
    const cur = answers[key] as MultiAnswer;
    const picks = cur.picks.includes(option)
      ? cur.picks.filter((p) => p !== option)
      : [...cur.picks, option];
    setAnswers({ ...answers, [key]: { ...cur, picks } });
  }

  // ── Generating ───────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-8 sm:p-12" aria-busy="true">
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow text-signal-700">Working on it</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink sm:text-3xl">
            Building your audit…
          </h2>
          <p className="mt-2 text-ink/70">
            This takes about a minute. Hang tight — we&apos;re reading your answers.
          </p>
          <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div className="h-full w-1/2 rounded-full bg-signal motion-safe:animate-bar-sweep" />
          </div>
          <ul className="mt-8 space-y-2 text-left text-sm text-ink/70">
            <li>• Finding where AI fits your business</li>
            <li>• Matching fixes to how you actually work</li>
            <li>• Ranking them by hours saved and impact</li>
          </ul>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-8 sm:p-12">
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-2xl font-extrabold text-ink">We hit a snag</h2>
          <p className="mt-3 text-ink/70">{error}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button className="btn-primary" onClick={() => void submit()}>
              Try again
            </button>
            <Link href="/book" className="btn-outline">
              Or book a call
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (phase === 'results' && audit) {
    return (
      <div>
        <p className="sr-only" role="status">
          Your audit is ready.
        </p>
        <AuditReport
          audit={audit}
          businessName={answers.business_name}
          firstName={splitFullName(answers.name).first ?? answers.first_name}
          lastName={splitFullName(answers.name).last}
          phone={answers.phone}
          email={answers.email}
          leadId={leadId}
          answers={answers}
          showBooking
          navTop="top-16"
        />
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────
  const progress = Math.round((stepIndex / WIZARD_STEPS.length) * 100);
  const multiValue =
    step.kind === 'multi' ? (answers[step.key as keyof WizardAnswers] as MultiAnswer) : null;

  return (
    <div ref={cardRef} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex items-center justify-between">
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink/70">
          {step.label}
        </p>
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink/70">
          Step {stepIndex + 1} of {WIZARD_STEPS.length}
        </p>
      </div>
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`Step ${stepIndex + 1} of ${WIZARD_STEPS.length}`}
        aria-label="Audit progress"
      >
        <div
          className="h-full rounded-full bg-signal transition-[width] duration-300"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>

      <h1 className="mt-7 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
        {step.title}
      </h1>
      <p className="mt-2 text-ink/70">{step.sub}</p>

      <div className="mt-6">
        {step.kind === 'text' && (
          <div>
            <label className="sr-only" htmlFor="wizard-text">
              {step.title}
            </label>
            <input
              id="wizard-text"
              data-firstfocus
              className="field-input"
              placeholder={step.placeholder}
              value={answers.business_name}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'wizard-error' : undefined}
              onChange={(e) => setAnswers({ ...answers, business_name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && goNext()}
            />
          </div>
        )}

        {step.kind === 'contact' && (
          <div className="space-y-5">
            <div>
              <label className="field-label" htmlFor="wizard-email">
                Email
              </label>
              <input
                id="wizard-email"
                data-firstfocus
                type="email"
                inputMode="email"
                autoComplete="email"
                className="field-input mt-2"
                placeholder={step.placeholder}
                value={answers.email}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'wizard-error' : undefined}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && goNext()}
              />
            </div>
            {step.note ? (
              <p className="border-l-2 border-signal pl-3 text-sm text-ink/70">{step.note}</p>
            ) : null}
          </div>
        )}

        {step.kind === 'contact_info' && (
          <div className="space-y-5">
            <div>
              <label className="field-label" htmlFor="wizard-fullname">
                Full name
              </label>
              <input
                id="wizard-fullname"
                data-firstfocus
                autoComplete="name"
                className="field-input mt-2"
                placeholder="e.g. Sam Rivera"
                value={answers.name ?? ''}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'wizard-error' : undefined}
                onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && goNext()}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="wizard-phone">
                Phone
              </label>
              <input
                id="wizard-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="field-input mt-2"
                placeholder="(555) 201-4433"
                value={answers.phone ?? ''}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'wizard-error' : undefined}
                onChange={(e) => setAnswers({ ...answers, phone: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && goNext()}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="wizard-email-confirm">
                Email
              </label>
              <input
                id="wizard-email-confirm"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="field-input mt-2"
                placeholder="you@yourbusiness.com"
                value={answers.email}
                onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && goNext()}
              />
            </div>
            {step.note ? (
              <p className="border-l-2 border-signal pl-3 text-sm text-ink/70">{step.note}</p>
            ) : null}
          </div>
        )}

        {step.kind === 'multi' && multiValue && (
          <div>
            <div className="flex flex-wrap gap-2.5" role="group" aria-label={step.title}>
              {step.options?.map((option, i) => {
                const on = multiValue.picks.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    data-firstfocus={i === 0 ? '' : undefined}
                    aria-pressed={on}
                    className={`chip ${on ? 'chip-on' : 'chip-off'}`}
                    onClick={() => toggle(option)}
                  >
                    {on ? (
                      <span className="mr-1.5 font-bold text-signal-700" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="mt-6">
              <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-ink/70">
                Add more in your own words (optional)
              </p>
              <textarea
                className="field-input mt-2 min-h-[110px] resize-y"
                placeholder={step.placeholder}
                value={multiValue.detail}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [step.key]: { ...multiValue, detail: e.target.value },
                  })
                }
              />
              <p className="mt-2 border-l-2 border-signal pl-3 text-sm text-ink/70">
                The more you tell us, the more detailed and tailored your audit will be.
              </p>
            </div>
          </div>
        )}
      </div>

      {fieldError ? (
        <p id="wizard-error" className="mt-3 text-sm font-medium text-red-700" role="alert">
          {fieldError}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-4">
        <button className="btn-outline" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </button>
        <button className="btn-primary" onClick={goNext}>
          {isLast ? 'Build my audit' : 'Next'}
        </button>
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        Step {stepIndex + 1} of {WIZARD_STEPS.length}: {step.title}
      </p>
    </div>
  );
}
