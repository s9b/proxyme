/**
 * token-store.ts — Supabase-backed encrypted OAuth token storage
 *
 * Mock replacement for Auth0 Token Vault.
 * In production (Auth0 Pro), tokens would be stored and retrieved via
 * Auth0AI.withTokenVault() from @auth0/ai-vercel — no custom crypto needed.
 *
 * Encryption: AES-256-GCM with TOKEN_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Format: "<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { supabaseServer } from './supabase/client';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  if (hex.length < 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-char hex string. Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex.slice(0, 64), 'hex');
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

// ── Supabase CRUD ─────────────────────────────────────────────────────────────

export async function storeGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  const { error } = await supabaseServer.from('user_tokens').upsert(
    {
      user_id: userId,
      provider: 'google-oauth2',
      access_token_encrypted: encryptToken(accessToken),
      refresh_token_encrypted: refreshToken ? encryptToken(refreshToken) : null,
      expires_at: expiresAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  );
  if (error) throw new Error(`storeGoogleTokens: ${error.message}`);
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const { data, error } = await supabaseServer
    .from('user_tokens')
    .select('access_token_encrypted')
    .eq('user_id', userId)
    .eq('provider', 'google-oauth2')
    .single();

  if (error || !data) {
    throw new Error(
      'No Google token found. Please connect your Gmail account on the onboarding page.'
    );
  }

  return decryptToken(data.access_token_encrypted as string);
}

export async function hasGoogleToken(userId: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from('user_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'google-oauth2')
    .maybeSingle();
  return !!data;
}
