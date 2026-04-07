import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { listTasksForUser } from '@/lib/supabase/db';
import Link from 'next/link';
import type { Task } from '@/lib/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  pending: { label: 'PENDING', color: 'var(--text-muted)', pulse: false },
  running: { label: 'RUNNING', color: 'var(--accent)', pulse: true },
  awaiting_approval: { label: 'NEEDS APPROVAL', color: 'var(--warning)', pulse: true },
  complete: { label: 'COMPLETE', color: 'var(--accent)', pulse: false },
  failed: { label: 'FAILED', color: 'var(--danger)', pulse: false },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span
        className={config.pulse ? 'dot-pulse' : ''}
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-syne)',
          letterSpacing: '0.05em',
          color: config.color,
        }}
      >
        {config.label}
      </span>
    </span>
  );
}

function TaskCard({ task }: { task: Task }) {
  const date = new Date(task.created_at);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Link
      href={`/task/${task.id}`}
      className="task-card"
      style={{
        display: 'block',
        border: '1px solid',
        borderRadius: '2px',
        padding: '16px 20px',
        background: 'var(--bg-elevated)',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <p
          style={{
            color: 'var(--text-primary)',
            fontSize: '14px',
            lineHeight: '1.5',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {task.description}
        </p>
        <StatusBadge status={task.status} />
      </div>
      <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
        {dateStr}
      </p>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    redirect('/auth/login?returnTo=/dashboard');
  }

  let tasks: Task[] = [];
  try {
    tasks = await listTasksForUser(session.user.sub);
  } catch {
    // Show empty state
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          Tasks
        </h1>
        <Link
          href="/"
          style={{
            background: 'var(--accent)',
            color: '#000',
            padding: '8px 18px',
            borderRadius: '2px',
            textDecoration: 'none',
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.05em',
          }}
        >
          + NEW TASK
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: '2px',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            No tasks yet.
          </p>
          <Link
            href="/"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Start your first task →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
