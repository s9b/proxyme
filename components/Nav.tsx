'use client';

import Link from 'next/link';

interface NavProps {
  user: { name?: string | null; email?: string | null; picture?: string | null } | null;
}

export default function Nav({ user }: NavProps) {
  return (
    <nav
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-syne)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}
      >
        PROXY ME
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user ? (
          <>
            <Link
              href="/dashboard"
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email ?? user.name}
            </span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/logout"
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                border: '1px solid var(--border)',
                padding: '4px 10px',
                borderRadius: '2px',
              }}
            >
              Sign out
            </a>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/api/auth/login"
            style={{
              fontSize: '13px',
              color: 'var(--accent)',
              textDecoration: 'none',
              border: '1px solid var(--accent)',
              padding: '6px 14px',
              borderRadius: '2px',
            }}
          >
            Sign in
          </a>
        )}
      </div>
    </nav>
  );
}
