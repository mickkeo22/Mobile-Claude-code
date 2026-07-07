// Single-operator admin auth: password from env, HMAC-signed expiry cookie.
// Uses Web Crypto only so the same code runs in middleware (edge) and routes.

import { env } from './env';

export const SESSION_COOKIE = 'mk_admin';
const SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.sessionSecret || 'mk-unconfigured'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  // Pure Web-API base64url — this code also runs in middleware (edge runtime)
  // where Node's Buffer is not guaranteed.
  return arrayToB64(sig);
}

function arrayToB64(buf: ArrayBuffer): string {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !env.adminPassword) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (Number(payload) < Date.now()) return false;
  const expected = await hmac(payload);
  return timingSafeEqual(sig, expected);
}

export function verifyPassword(candidate: string): boolean {
  const real = env.adminPassword;
  if (!real) return false;
  // constant-time-ish compare
  if (candidate.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) diff |= candidate.charCodeAt(i) ^ real.charCodeAt(i);
  return diff === 0;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
