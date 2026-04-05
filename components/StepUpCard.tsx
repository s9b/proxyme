'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PendingApproval } from '@/lib/types';

interface StepUpCardProps {
  taskId: string;
  approval: PendingApproval;
}

export default function StepUpCard({ taskId, approval }: StepUpCardProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Animate in after mount
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: approval.id,
          taskId,
          decision: 'approved',
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setRejecting(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: approval.id,
          taskId,
          decision: 'rejected',
          rejectionReason: rejectionReason.trim(),
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '2px',
            borderTop: '4px solid var(--accent)',
            overflow: 'hidden',
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.97)',
            transition: 'opacity 200ms ease, transform 200ms ease',
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px 28px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px' }}>⚠</span>
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--warning)',
                }}
              >
                ACTION REQUIRED
              </span>
            </div>
          </div>

          {/* Sections */}
          <div style={{ padding: '0 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Section label="WHAT" content={approval.action_summary} />
            <Section label="WHY" content={approval.action_reasoning} />
            <Section label="IMPACT" content={approval.action_impact} accent />
            {approval.alternatives_considered && (
              <Section label="ALTERNATIVES CONSIDERED" content={approval.alternatives_considered} />
            )}
          </div>

          {/* Rejection reason input */}
          {rejecting && (
            <div style={{ padding: '16px 28px 0' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-syne)',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                REASON FOR REJECTION
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tell the agent why you're declining..."
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Buttons */}
          <div
            style={{
              padding: '20px 28px 24px',
              display: 'flex',
              gap: '12px',
              marginTop: '8px',
            }}
          >
            <button
              onClick={handleApprove}
              disabled={loading}
              style={{
                flex: 1,
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '2px',
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.05em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'PROCESSING...' : 'AUTHORIZE ACTION'}
            </button>

            <button
              onClick={rejecting ? handleReject : () => setRejecting(true)}
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                padding: '14px 20px',
                borderRadius: '2px',
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.05em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {rejecting ? 'CONFIRM REJECT' : 'STOP & ASK'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  content,
  accent = false,
}: {
  label: string;
  content: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-syne)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          marginBottom: '4px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: accent ? 'var(--accent)' : 'var(--text-primary)',
          fontWeight: accent ? 500 : 400,
        }}
      >
        {content}
      </p>
    </div>
  );
}
