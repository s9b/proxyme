import { auth0 } from '@/lib/auth0';
import { hasGoogleToken } from '@/lib/token-store';
import { redirect } from 'next/navigation';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect('/api/auth/login?returnTo=/onboarding');
  }

  const params = await searchParams;
  const justConnected = params.connected === 'gmail';
  const hasGmail = justConnected || (await hasGoogleToken(session.user.sub));

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '8px',
          }}
        >
          Connect your services
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
          Proxy Me needs access to act on your behalf. You can revoke access at any time.
        </p>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          {/* Gmail */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-elevated)',
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 600,
                  fontSize: '14px',
                  marginBottom: '4px',
                }}
              >
                Gmail
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Read billing emails · Send on your behalf
              </p>
            </div>

            {hasGmail ? (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-syne)',
                  letterSpacing: '0.05em',
                  border: '1px solid var(--accent)',
                  padding: '4px 10px',
                  borderRadius: '2px',
                }}
              >
                CONNECTED
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a
                href="/api/auth/google/start"
                style={{
                  background: 'var(--accent)',
                  color: '#000',
                  padding: '6px 14px',
                  borderRadius: '2px',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 600,
                  fontSize: '12px',
                  letterSpacing: '0.05em',
                }}
              >
                CONNECT
              </a>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--border)' }} />

          {/* Info row */}
          <div
            style={{
              padding: '12px 24px',
              background: 'var(--bg-secondary)',
            }}
          >
            {params.error ? (
              <p style={{ fontSize: '11px', color: 'var(--danger)', lineHeight: '1.6' }}>
                Connection failed: {params.error.replace(/_/g, ' ')}. Please try again.
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Tokens are stored encrypted in Supabase. Proxy Me never stores raw credentials.
                {' '}In production, Auth0 Token Vault would handle this automatically.
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-syne)',
            }}
          >
            Continue to dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
