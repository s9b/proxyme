'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentStep, TaskStatus } from '@/lib/types';

interface AgentFeedProps {
  taskId: string;
  initialSteps: AgentStep[];
  initialStatus: TaskStatus;
}

const STEP_TYPE_PHASE: Record<string, string> = {
  research: 'RESEARCHING',
  compare: 'ANALYZING',
  action: 'ACTING',
  approval: 'AWAITING APPROVAL',
  complete: 'COMPLETE',
  error: 'ERROR',
  info: 'INFO',
};

function groupStepsByPhase(steps: AgentStep[]): Array<{ phase: string; steps: AgentStep[]; active: boolean }> {
  const groups: Array<{ phase: string; steps: AgentStep[]; active: boolean }> = [];
  let current: { phase: string; steps: AgentStep[] } | null = null;

  for (const step of steps) {
    const phase = STEP_TYPE_PHASE[step.step_type] ?? 'INFO';
    if (!current || current.phase !== phase) {
      current = { phase, steps: [] };
      groups.push({ ...current, active: false });
      current = groups[groups.length - 1];
    }
    current.steps.push(step);
  }

  return groups;
}

function highlightNumbers(text: string): React.ReactNode {
  const parts = text.split(/(\₹[\d,]+(?:\/[a-z]+)?|[\d,]+(?:Mbps|GB|TB|\/mo|\/yr|%)|₹[\d,.]+)/g);
  return parts.map((part, i) =>
    /\₹[\d,]+|[\d,]+(?:Mbps|GB|TB|\/mo|\/yr|%)/.test(part) ? (
      <span key={i} style={{ color: 'var(--accent)', fontWeight: 500 }}>{part}</span>
    ) : (
      part
    )
  );
}

export default function AgentFeed({ taskId, initialSteps, initialStatus }: AgentFeedProps) {
  const [steps, setSteps] = useState<AgentStep[]>(initialSteps);
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isActive = status === 'running' || status === 'pending';

  useEffect(() => {
    if (status === 'complete' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) return;
        const data = await res.json() as {
          task: { status: TaskStatus };
          steps: AgentStep[];
        };
        const newStatus = data.task.status;
        setSteps(data.steps);
        setStatus(newStatus);
        // When transitioning to a terminal/action-required state, refresh the server
        // component so StepUpCard, AuditLog, and StatusBadge render with fresh data.
        if (newStatus === 'awaiting_approval' || newStatus === 'complete' || newStatus === 'failed') {
          router.refresh();
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, status, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const groups = groupStepsByPhase(steps);
  // Mark last group as active if task is still running
  if (isActive && groups.length > 0) {
    groups[groups.length - 1].active = true;
  }

  if (steps.length === 0) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="dot-pulse"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '12px',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
            }}
          >
            STARTING
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {group.active ? (
              <span
                className="dot-pulse"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: group.phase === 'ERROR' ? 'var(--danger)' : group.phase === 'AWAITING APPROVAL' ? 'var(--warning)' : 'var(--accent)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--text-muted)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                color: group.active
                  ? (group.phase === 'ERROR' ? 'var(--danger)' : group.phase === 'AWAITING APPROVAL' ? 'var(--warning)' : 'var(--accent)')
                  : 'var(--text-muted)',
              }}
            >
              {group.phase}
            </span>
          </div>

          <div
            style={{
              marginLeft: '16px',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {group.steps.map((step, si) => (
              <div key={step.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, paddingTop: '1px' }}>
                  {si === group.steps.length - 1 ? '└' : '├'}
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                    margin: 0,
                  }}
                >
                  {highlightNumbers(step.description)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
