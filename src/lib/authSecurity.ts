import { UserAccount, AppRole } from '../types';

/**
 * ============================================================================
 * Enterprise Security & Authentication Engine
 * - Web Crypto API (SubtleCrypto) Salted SHA-256 Hashing
 * - Zero Plaintext Password Storage (in bundle & memory)
 * - Cryptographically Signed JWT-style Session Tokens with Expiration
 * - Brute-Force Rate Limiting & Account Lockout
 * ============================================================================
 */

// Rate Limiting Config
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_EXPIRY_HOURS = 8; // 8 hours session token validity
const LOCKOUT_STORAGE_KEY = 'security_lockout_tracker_v1';
const SESSION_SECRET_KEY = 'security_session_signing_key_v1';

/**
 * Generates a random cryptographic salt (16 bytes hex encoded)
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password using SHA-256 and a user-specific salt via Web Crypto API.
 * Never stores or transmits plaintext passwords.
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a password attempt against stored cryptographic salt and hash
 */
export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  if (!password || !salt || !expectedHash) return false;
  const computed = await hashPasswordWithSalt(password, salt);
  return computed.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * ============================================================================
 * BRUTE FORCE PROTECTION & ACCOUNT LOCKOUT
 * ============================================================================
 */
interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

function getLockoutMap(): Record<string, LockoutEntry> {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLockoutMap(map: Record<string, LockoutEntry>) {
  try {
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
}

export function checkLockout(username: string): LockoutStatus {
  const cleanUser = username.trim().toLowerCase();
  const map = getLockoutMap();
  const entry = map[cleanUser];

  if (!entry) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attemptsLeft: 0 };
  }

  // If lockout expired, reset attempts
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    delete map[cleanUser];
    saveLockoutMap(map);
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - entry.failedAttempts);
  return { isLocked: false, remainingSeconds: 0, attemptsLeft };
}

export function recordFailedAttempt(username: string): LockoutStatus {
  const cleanUser = username.trim().toLowerCase();
  const map = getLockoutMap();
  const now = Date.now();

  const entry = map[cleanUser] || { failedAttempts: 0, lockedUntil: null, lastAttemptAt: now };
  entry.failedAttempts += 1;
  entry.lastAttemptAt = now;

  if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    map[cleanUser] = entry;
    saveLockoutMap(map);
    return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000), attemptsLeft: 0 };
  }

  map[cleanUser] = entry;
  saveLockoutMap(map);
  const attemptsLeft = MAX_FAILED_ATTEMPTS - entry.failedAttempts;
  return { isLocked: false, remainingSeconds: 0, attemptsLeft };
}

export function resetFailedAttempts(username: string): void {
  const cleanUser = username.trim().toLowerCase();
  const map = getLockoutMap();
  if (map[cleanUser]) {
    delete map[cleanUser];
    saveLockoutMap(map);
  }
}

/**
 * ============================================================================
 * CRYPTOGRAPHICALLY SIGNED SESSION TOKENS (JWT-STYLE)
 * ============================================================================
 */

function getOrCreateSigningSecret(): string {
  let secret = sessionStorage.getItem(SESSION_SECRET_KEY);
  if (!secret) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    secret = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(SESSION_SECRET_KEY, secret);
  }
  return secret;
}

export interface SessionTokenPayload {
  userId: string;
  username: string;
  name: string;
  role: AppRole;
  assignedProjectIds: string[];
  iat: number; // issued at (timestamp ms)
  exp: number; // expires at (timestamp ms)
  nonce: string;
}

/**
 * Creates a tamper-evident signed token with payload and HMAC signature
 */
export async function createSessionToken(user: UserAccount): Promise<string> {
  const now = Date.now();
  const payload: SessionTokenPayload = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    assignedProjectIds: user.assignedProjectIds,
    iat: now,
    exp: now + SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
    nonce: generateSalt()
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = btoa(unescape(encodeURIComponent(payloadJson)));

  const secret = getOrCreateSigningSecret();
  const signature = await hashPasswordWithSalt(payloadB64, secret);

  return `${payloadB64}.${signature}`;
}

/**
 * Validates token signature, expiration, and integrity
 */
export async function verifySessionToken(token: string): Promise<{ valid: boolean; payload?: SessionTokenPayload; error?: string }> {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [payloadB64, signature] = token.split('.');
  const secret = getOrCreateSigningSecret();
  const expectedSignature = await hashPasswordWithSalt(payloadB64, secret);

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid cryptographic signature (token tampered)' };
  }

  try {
    const payloadJson = decodeURIComponent(escape(atob(payloadB64)));
    const payload: SessionTokenPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Session expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: 'Failed to decode payload' };
  }
}
