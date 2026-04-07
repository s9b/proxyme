import { auth0 } from '@/lib/auth0';
import { listTasksForUser } from '@/lib/supabase/db';
import TaskInput from '@/components/TaskInput';
import Link from 'next/link';
import type { Task } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--text-muted)',
  running: 'var(--accent)',
  awaiting_approval: 'var(--warning)',
  complete: 'var(--accent)',
  failed: 'var(--danger)',
};

export default async function HomePage() {
  const session = await auth0.getSession();
  const user = session?.user ?? null;

  let recentTasks: Task[] = [];
  if (user?.sub) {
    try {
      const all = await listTasksForUser(user.sub);
      recentTasks = all.slice(0, 3);
    } catch {
      // Not fatal — just show empty
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '48px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '540px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '40px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            color: 'var(--text-primary)',
          }}
        >
          Your AI proxy.
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          I&apos;ll research, compare, and ask before I act.
          <br />
          You stay in control of every irreversible step.
        </p>
      </div>

      {user ? (
        <TaskInput />
      ) : (
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/auth/login"
            style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: '#000',
              padding: '12px 28px',
              borderRadius: '2px',
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.05em',
              textDecoration: 'none',
            }}
          >
            SIGN IN TO START
          </a>
          <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Connect Gmail to let the agent research on your behalf
          </p>
        </div>
      )}

      {recentTasks.length > 0 && (
        <div style={{ width: '100%', maxWidth: '640px' }}>
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: '12px',
              fontFamily: 'var(--font-syne)',
            }}
          >
            RECENT
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={`/task/${task.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '2px',
                  background: 'var(--bg-elevated)',
                  textDecoration: 'none',
                  gap: '16px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.description}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-syne)',
                    letterSpacing: '0.05em',
                    color: STATUS_COLORS[task.status] ?? 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  {task.status.toUpperCase().replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
