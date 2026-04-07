'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLE_PROMPTS = [
  'My Airtel broadband expires next month. Find something faster and cheaper. Ask before switching.',
  'Find me the best credit card for spending on food and travel in India.',
  'My gym membership auto-renews next week. Find alternatives and ask me before you do anything.',
];

export default function TaskInput() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: trimmed }),
      });

      const data = await res.json() as { taskId?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      router.push(`/task/${data.taskId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '640px' }}>
      <div
        style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          borderRadius: '2px',
          overflow: 'hidden',
          transition: 'border-color 0.1s',
        }}
        onFocus={() => {
          if (textareaRef.current?.parentElement) {
            textareaRef.current.parentElement.style.borderColor = 'var(--accent)';
          }
        }}
        onBlur={() => {
          if (textareaRef.current?.parentElement) {
            textareaRef.current.parentElement.style.borderColor = 'var(--border)';
          }
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want me to handle?"
          rows={3}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: '16px',
            lineHeight: '1.6',
            resize: 'none',
          }}
        />
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ⌘ + Enter to submit
          </span>
          <button
            type="submit"
            disabled={loading || !value.trim()}
            style={{
              background: value.trim() && !loading ? 'var(--accent)' : 'var(--bg-primary)',
              color: value.trim() && !loading ? '#000' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: value.trim() && !loading ? 'var(--accent)' : 'var(--border)',
              padding: '6px 18px',
              borderRadius: '2px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: value.trim() && !loading ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-syne)',
              letterSpacing: '0.05em',
            }}
          >
            {loading ? 'STARTING...' : 'START'}
          </button>
        </div>
      </div>

      {error && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '13px',
            color: 'var(--danger)',
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setValue(prompt)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              padding: '6px 12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans)',
              textAlign: 'left',
              lineHeight: '1.4',
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </form>
  );
}
