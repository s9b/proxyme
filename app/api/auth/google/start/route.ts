/**
 * GET /api/auth/google/start
 * Initiates Google OAuth2 authorization code flow.
 * Stores a random state token in an httpOnly cookie for CSRF protection.
 *
 * NOTE: This custom OAuth flow exists because Auth0 Token Vault (which would
 * handle this automatically) requires Auth0 Pro. See lib/auth0-ai.ts for details.
 */

import { auth0 } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export async function GET(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.redirect(
      new URL('/api/auth/login?returnTo=/onboarding', req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.AUTH0_BASE_URL ?? req.nextUrl.origin;

  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID is not configured' },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  return response;
}
