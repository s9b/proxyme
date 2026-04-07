import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { getTask, getStepsForTask, getPendingApproval } from '@/lib/supabase/db';
import AgentFeed from '@/components/AgentFeed';
import StepUpCard from '@/components/StepUpCard';
import AuditLog from '@/components/AuditLog';
import Link from 'next/link';
import type { Task, AgentStep, PendingApproval } from '@/lib/types';

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    redirect('/auth/login');
  }

  const { id } = await params;
  const task: Task | null = await getTask(id);

  if (!task || task.user_id !== session.user.sub) {
    redirect('/dashboard');
  }

  const [steps, pendingApproval]: [AgentStep[], PendingApproval | null] = await Promise.all([
    getStepsForTask(id),
    task.status === 'awaiting_approval' ? getPendingApproval(id) : Promise.resolve(null),
  ]);

  const isComplete = task.status === 'complete';
  const isFailed = task.status === 'failed';
  const needsApproval = task.status === 'awaiting_approval';
  const hasTokenVaultInterrupt = steps.some(
    (s) => s.step_type === 'info' && (s.metadata as Record<string, unknown>).tokenVaultInterrupt === true
  );

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/dashboard"
          style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'block', marginBottom: '12px' }}
        >
          ← Dashboard
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: '1.4',
              color: 'var(--text-primary)',
            }}
          >
            {task.description}
          </h1>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Agent Feed */}
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '2px',
          padding: '20px 24px',
          background: 'var(--bg-elevated)',
          marginBottom: '24px',
        }}
      >
        <AgentFeed
          taskId={task.id}
          initialSteps={steps}
          initialStatus={task.status}
        />
      </div>

      {/* Token Vault Connect Banner */}
      {hasTokenVaultInterrupt && !needsApproval && !isComplete && (
        <div
          style={{
            border: '1px solid var(--warning)',
            background: 'rgba(255, 170, 0, 0.06)',
            borderRadius: '2px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div>
            <p style={{ fontFamily: 'var(--font-syne)', fontSize: '13px', color: 'var(--warning)', fontWeight: 600, marginBottom: '4px' }}>
              GMAIL ACCESS REQUIRED
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Connect your Google account so the agent can read your emails.
            </p>
          </div>
          <a
            href={`/api/auth/login?connection=google-oauth2&returnTo=/task/${task.id}`}
            style={{
              background: 'var(--accent)',
              color: '#000',
              padding: '8px 16px',
              borderRadius: '2px',
              textDecoration: 'none',
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            CONNECT GMAIL
          </a>
        </div>
      )}

      {/* StepUpCard — shown when awaiting approval */}
      {needsApproval && pendingApproval && (
        <StepUpCard
          taskId={task.id}
          approval={pendingApproval}
        />
      )}

      {/* AuditLog — shown when complete */}
      {isComplete && (
        <AuditLog
          task={task}
          steps={steps}
        />
      )}

      {/* Failed state */}
      {isFailed && (
        <div
          style={{
            border: '1px solid var(--danger)',
            background: 'var(--danger-dim)',
            borderRadius: '2px',
            padding: '16px 20px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '13px',
              color: 'var(--danger)',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            TASK FAILED
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {steps.find((s) => s.step_type === 'error')?.description ?? 'An unexpected error occurred.'}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string }> = {
    pending: { label: 'PENDING', color: 'var(--text-muted)' },
    running: { label: 'RUNNING', color: 'var(--accent)' },
    awaiting_approval: { label: 'NEEDS APPROVAL', color: 'var(--warning)' },
    complete: { label: 'COMPLETE', color: 'var(--accent)' },
    failed: { label: 'FAILED', color: 'var(--danger)' },
  };
  const c = configs[status] ?? configs.pending;
  return (
    <span
      style={{
        fontFamily: 'var(--font-syne)',
        fontSize: '11px',
        letterSpacing: '0.05em',
        color: c.color,
        border: `1px solid ${c.color}`,
        padding: '3px 8px',
        borderRadius: '2px',
        flexShrink: 0,
      }}
    >
      {c.label}
    </span>
  );
}
