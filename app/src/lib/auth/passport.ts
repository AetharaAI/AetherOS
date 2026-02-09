import type { User } from '@/types/chat';

const DEFAULT_ISSUER = 'https://passport.aetherpro.us/realms/aether';
const DEFAULT_CLIENT_ID = 'aetherpro-web';
const DEFAULT_SCOPES = 'openid profile email';
const DEFAULT_APP_HOME = 'https://aetherpro.tech';

const PKCE_VERIFIER_KEY = 'aetheros.passport.pkce_verifier';
const PKCE_STATE_KEY = 'aetheros.passport.state';
const LOGIN_RETURN_TO_KEY = 'aetheros.passport.return_to';

interface JwtClaims {
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  picture?: string;
}

function readEnv(name: string): string | undefined {
  const raw = import.meta.env[name];
  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readFirstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function normalizeUrlCandidate(input: string): string {
  const candidate = input.trim();
  if (!candidate) {
    return '';
  }

  if (candidate.startsWith('https:') && !candidate.startsWith('https://')) {
    return candidate.replace(/^https:/, 'https://');
  }

  if (candidate.startsWith('http:') && !candidate.startsWith('http://')) {
    return candidate.replace(/^http:/, 'http://');
  }

  return candidate;
}

function splitUriCandidates(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map(normalizeUrlCandidate)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseAbsoluteUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function selectRuntimeUri(candidates: string[], fallbackPath: string): string {
  if (typeof window === 'undefined') {
    return candidates[0] ?? `${DEFAULT_APP_HOME}${fallbackPath}`;
  }

  for (const candidate of candidates) {
    const parsed = parseAbsoluteUrl(candidate);
    if (parsed && parsed.origin === window.location.origin) {
      return parsed.toString();
    }
  }

  const firstValid = candidates.find((candidate) => parseAbsoluteUrl(candidate) !== null);
  if (firstValid) {
    return firstValid;
  }

  return `${window.location.origin}${fallbackPath}`;
}

function normalizeIssuer(issuer: string): string {
  const normalized = normalizeUrlCandidate(issuer);
  return normalized.replace(/\/+$/, '');
}

function getCryptoSafe(): Crypto {
  if (typeof window === 'undefined' || !window.crypto) {
    throw new Error('Browser crypto API is unavailable');
  }
  return window.crypto;
}

function randomHex(size = 32): string {
  const buffer = new Uint8Array(size);
  getCryptoSafe().getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await getCryptoSafe().subtle.digest('SHA-256', encoder.encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

function decodeJwtClaims(token?: string): JwtClaims {
  if (!token) {
    return {};
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return {};
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return payload as JwtClaims;
  } catch {
    return {};
  }
}

export interface PassportRuntimeConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: string;
  appHomeUrl: string;
}

export function getPassportConfig(): PassportRuntimeConfig {
  const issuerUrl = normalizeIssuer(
    readFirstEnv(['VITE_PASSPORT_ISSUER_URL', 'VITE_PASSPORT_ISSUER']) ?? DEFAULT_ISSUER
  );

  const clientId =
    readFirstEnv([
      'VITE_PASSPORT_CLIENT_ID',
      'VITE_PASSPORT_CLINET_ID', // Backward-compatible typo alias
    ]) ?? DEFAULT_CLIENT_ID;

  const redirectCandidates = splitUriCandidates(
    readFirstEnv(['VITE_PASSPORT_REDIRECT_URI', 'VITE_PASSPORT_REDIRECT_URIS'])
  );
  const postLogoutCandidates = splitUriCandidates(
    readFirstEnv(['VITE_PASSPORT_POST_LOGOUT_REDIRECT_URI', 'VITE_PASSPORT_POST_LOGOUT_REDIRECT_URIS'])
  );

  const redirectUri = selectRuntimeUri(redirectCandidates, '/auth/callback');
  const postLogoutRedirectUri = selectRuntimeUri(postLogoutCandidates, '/logout');

  const scopes = readFirstEnv(['VITE_PASSPORT_SCOPES']) ?? DEFAULT_SCOPES;
  const appHomeUrl = readFirstEnv(['VITE_AETHEROS_HOME_URL']) ?? DEFAULT_APP_HOME;
  const clientSecret = readFirstEnv(['VITE_PASSPORT_CLIENT_SECRET']);

  return {
    issuerUrl,
    clientId,
    clientSecret,
    redirectUri,
    postLogoutRedirectUri,
    scopes,
    appHomeUrl,
  };
}

export function isPassportConfigured(): boolean {
  const config = getPassportConfig();
  return Boolean(config.issuerUrl && config.clientId && config.redirectUri);
}

export async function startPassportLogin(returnTo = '/'): Promise<void> {
  const config = getPassportConfig();
  const state = randomHex(24);
  const codeVerifier = randomHex(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  sessionStorage.setItem(PKCE_STATE_KEY, state);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(LOGIN_RETURN_TO_KEY, returnTo);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.assign(`${config.issuerUrl}/protocol/openid-connect/auth?${params.toString()}`);
}

interface PassportTokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function handlePassportCallback(): Promise<{ user: User; returnTo: string }> {
  const config = getPassportConfig();
  const url = new URL(window.location.href);
  const authCode = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    throw new Error(errorDescription ?? error);
  }

  if (!authCode) {
    throw new Error('Missing authorization code');
  }

  const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!expectedState || !codeVerifier || returnedState !== expectedState) {
    throw new Error('Invalid OIDC callback state');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code: authCode,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  // Optional: only used if explicitly configured (not recommended for browser SPAs).
  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret);
  }

  const response = await fetch(`${config.issuerUrl}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${detail}`);
  }

  const tokens = (await response.json()) as PassportTokenResponse;
  const claims = decodeJwtClaims(tokens.id_token ?? tokens.access_token);
  const subject = claims.sub ?? `passport-${Date.now()}`;
  const email = claims.email ?? `${subject}@passport.aether`;
  const name = claims.name ?? claims.preferred_username ?? email.split('@')[0] ?? subject;

  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  const returnTo = sessionStorage.getItem(LOGIN_RETURN_TO_KEY) ?? '/';
  sessionStorage.removeItem(LOGIN_RETURN_TO_KEY);

  return {
    user: {
      id: subject,
      email,
      name,
      image: claims.picture,
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : undefined,
    },
    returnTo,
  };
}

export function startPassportLogout(idTokenHint?: string): void {
  const config = getPassportConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: config.postLogoutRedirectUri,
  });

  if (idTokenHint) {
    params.set('id_token_hint', idTokenHint);
  }

  window.location.assign(`${config.issuerUrl}/protocol/openid-connect/logout?${params.toString()}`);
}

