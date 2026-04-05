import type { Task, AgentStep } from '@/lib/types';

interface AuditLogProps {
  task: Task;
  steps: AgentStep[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  research: { label: 'RESEARCH', color: 'var(--text-secondary)' },
  compare: { label: 'ANALYSIS', color: 'var(--text-secondary)' },
  action: { label: 'ACTION', color: 'var(--accent)' },
  approval: { label: 'APPROVAL', color: 'var(--warning)' },
  complete: { label: 'COMPLETE', color: 'var(--accent)' },
  error: { label: 'ERROR', color: 'var(--danger)' },
  info: { label: 'INFO', color: 'var(--text-muted)' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLog({ task, steps }: AuditLogProps) {
  const result = task.result as Record<string, unknown> | null;

  return (
    <div>
      {/* Result metric card */}
      {result && Object.keys(result).length > 0 && (
        <div
          style={{
            border: '1px solid var(--accent)',
            borderRadius: '2px',
            background: 'var(--accent-dim)',
            padding: '20px 24px',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              marginBottom: '12px',
            }}
          >
            TASK RESULT
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {Object.entries(result).map(([key, value]) => (
              <div key={key}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {key.replace(/_/g, ' ')}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}
                >
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: '12px',
          }}
        >
          AUDIT TRAIL — {steps.length} STEPS
        </p>

        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          {steps.map((step, i) => {
            const cfg = TYPE_CONFIG[step.step_type] ?? TYPE_CONFIG.info;
            return (
              <div
                key={step.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 80px 1fr',
                  gap: '0',
                  borderBottom: i < steps.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  background: i % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                      color: cfg.color,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRight: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {formatDate(step.created_at)}
                  </span>
                </div>

                <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      margin: 0,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
