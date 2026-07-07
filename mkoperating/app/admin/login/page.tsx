'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Login failed.');
      }
      router.replace(search.get('next') || '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm">
      <h1 className="font-display text-xl font-extrabold text-ink">Command center</h1>
      <p className="mt-1 text-sm text-ink/60">MK Operating — operator access.</p>
      <label className="field-label mt-6 block" htmlFor="pw">
        Password
      </label>
      <input
        id="pw"
        type="password"
        autoFocus
        autoComplete="current-password"
        className="field-input mt-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary mt-5 w-full" disabled={busy || !password}>
        {busy ? 'Checking…' : 'Enter'}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-5">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
