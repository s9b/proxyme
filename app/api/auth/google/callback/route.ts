/**
 * GET /api/auth/google/callback
 * Receives the Google OAuth2 authorization code, exchanges it for tokens,
 * and stores them encrypted in the Supabase user_tokens table.
 *
 * NOTE: This custom OAuth flow exists because Auth0 Token Vault (which would
 * handle this automatically) requires Auth0 Pro. See lib/auth0-ai.ts for details.
 */

import { auth0 } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';
import { storeGoogleTokens } from '@/lib/token-store';

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }

  const baseUrl = process.env.AUTH0_BASE_URL ?? req.nextUrl.origin;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = req.cookies.get('google_oauth_state')?.value;

  // CSRF check
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/onboarding?error=oauth_state_mismatch', baseUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  if (!tokens.access_token) {
    return NextResponse.redirect(
      new URL(
        `/onboarding?error=token_exchange_failed&detail=${encodeURIComponent(tokens.error_description ?? tokens.error ?? 'unknown')}`,
        baseUrl
      )
    );
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : undefined;

  await storeGoogleTokens(
    session.user.sub,
    tokens.access_token,
    tokens.refresh_token,
    expiresAt
  );

  const response = NextResponse.redirect(
    new URL('/onboarding?connected=gmail', baseUrl)
  );
  response.cookies.delete('google_oauth_state');
  return response;
}
