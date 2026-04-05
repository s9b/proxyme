/**
 * auth0-ai.ts — OAuth token access for agent tools
 *
 * This is a Supabase-backed mock of Auth0 Token Vault.
 *
 * PRODUCTION NOTE: With Auth0 Pro, replace this entire file with the real
 * Token Vault implementation using @auth0/ai-vercel:
 *
 *   import { Auth0AI, getAccessTokenFromTokenVault } from '@auth0/ai-vercel';
 *   const auth0AI = new Auth0AI();
 *   export const withGmailConnection = auth0AI.withTokenVault({
 *     connection: 'google-oauth2',
 *     scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
 *     refreshToken: getRefreshToken,
 *   });
 *   export const getAccessToken = () => getAccessTokenFromTokenVault();
 *
 * The wrapper interface (withGmailConnection, withGmailWriteConnection) is
 * intentionally identical so swapping back to Token Vault is a one-file change.
 */

import { getGoogleAccessToken } from './token-store';

// Current user context — set by executor before calling generateText
let _currentUserId = '';
export function setUserContext(userId: string): void {
  _currentUserId = userId;
}
export function getUserContext(): string {
  return _currentUserId;
}

/**
 * Get the stored Google OAuth access token for the current user.
 * Reads from the Supabase user_tokens table (encrypted at rest).
 *
 * In production Token Vault, this would be: getAccessTokenFromTokenVault()
 */
export async function getAccessToken(): Promise<string> {
  if (!_currentUserId) {
    throw new Error('User context not set. Call setUserContext(userId) before running tools.');
  }
  return getGoogleAccessToken(_currentUserId);
}

/**
 * withGmailConnection — passthrough wrapper that mirrors the Token Vault interface.
 *
 * In production: would be Auth0AI.withTokenVault({ connection, scopes, refreshToken })
 * which injects the access token and handles refresh automatically.
 *
 * Here: token lookup is done inside getAccessToken() at execute time, so the
 * wrapper itself is a no-op — the interface stays identical to Token Vault.
 */
export function withGmailConnection<T>(t: T): T {
  return t;
}

export function withGmailWriteConnection<T>(t: T): T {
  return t;
}
