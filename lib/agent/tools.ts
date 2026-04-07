import { tool } from 'ai';
import { z } from 'zod';
import { withGmailConnection, withGmailWriteConnection, getAccessToken } from '../auth0-ai';
import { insertAgentStep, createApproval, updateTaskStatus } from '../supabase/db';

// Context injected by executor — taskId is passed via a closure
let _taskId = '';
export function setTaskContext(taskId: string) {
  _taskId = taskId;
}

// ── Tool definitions (plain tools, no Token Vault wrapping yet) ───────────

const searchGmailBase = tool({
  description: 'Search Gmail for messages matching a query. Use to find billing emails, service confirmations, etc.',
  inputSchema: z.object({
    query: z.string().describe('Gmail search query, e.g. "from:jio subject:bill"'),
  }),
  execute: async ({ query }) => {
    const accessToken = await getAccessToken();
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json() as { messages?: Array<{ id: string; threadId: string }> };
    return { messages: data.messages ?? [], count: data.messages?.length ?? 0 };
  },
});

const readGmailThreadBase = tool({
  description: 'Read full email thread by threadId.',
  inputSchema: z.object({
    threadId: z.string().describe('Gmail thread ID'),
  }),
  execute: async ({ threadId }) => {
    const accessToken = await getAccessToken();
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return await res.json() as Record<string, unknown>;
  },
});

const sendEmailBase = tool({
  description: 'Send an email via Gmail. MUST call requestApproval before this.',
  inputSchema: z.object({
    to: z.string().describe('Recipient email address'),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    const accessToken = await getAccessToken();
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\n');
    const encoded = Buffer.from(message).toString('base64url');
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      }
    );
    const data = await res.json() as { id?: string };
    await insertAgentStep(_taskId, 'action', `Email sent to ${to}: ${subject}`, { messageId: data.id });
    return { sent: true, messageId: data.id };
  },
});

const searchWeb = tool({
  description: 'Search the web for information.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ query }) => {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { 'User-Agent': 'ProxyMe/1.0' } }
    );
    const data = await res.json() as {
      AbstractText?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      Answer?: string;
    };
    const results = (data.RelatedTopics ?? [])
      .filter((t) => t.Text)
      .slice(0, 5)
      .map((t) => ({ text: t.Text, url: t.FirstURL }));
    return { query, answer: data.Answer ?? data.AbstractText ?? '', results };
  },
});

const fetchUrl = tool({
  description: 'Fetch text content of a URL.',
  inputSchema: z.object({
    url: z.string().url().describe('URL to fetch'),
  }),
  execute: async ({ url }) => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ProxyMe/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    return { url, text, status: res.status };
  },
});

const logStep = tool({
  description: 'Log a step to the audit trail.',
  inputSchema: z.object({
    step_type: z.enum(['research', 'compare', 'action', 'approval', 'complete', 'error', 'info']),
    description: z.string().describe('What just happened'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Extra data'),
  }),
  execute: async ({ step_type, description, metadata }) => {
    await insertAgentStep(_taskId, step_type, description, metadata ?? {});
    return { logged: true };
  },
});

const taskComplete = tool({
  description: 'Mark the task as complete.',
  inputSchema: z.object({
    summary: z.string().describe('Completion summary with key results'),
  }),
  execute: async ({ summary }) => {
    await insertAgentStep(_taskId, 'complete', summary, {});
    await updateTaskStatus(_taskId, 'complete', { summary });
    return { completed: true };
  },
});

const taskFailed = tool({
  description: 'Call this when the task cannot be completed. Provide a reason.',
  inputSchema: z.object({
    reason: z.string().describe('Why the task failed'),
  }),
  execute: async ({ reason }) => {
    await insertAgentStep(_taskId, 'error', reason, {});
    await updateTaskStatus(_taskId, 'failed');
    return { failed: true };
  },
});

const requestApproval = tool({
  description: 'Request user approval before any action.',
  inputSchema: z.object({
    action_summary: z.string().describe('What action to take'),
    action_reasoning: z.string().describe('Why this action'),
    action_impact: z.string().describe('Expected impact'),
    alternatives_considered: z.string().describe('Other options evaluated'),
  }),
  execute: async ({ action_summary, action_reasoning, action_impact, alternatives_considered }) => {
    const approval = await createApproval({
      taskId: _taskId,
      action_summary,
      action_reasoning,
      action_impact,
      alternatives_considered,
    });

    await updateTaskStatus(_taskId, 'awaiting_approval');
    await insertAgentStep(_taskId, 'approval', `Requesting approval: ${action_summary}`, {
      approvalId: approval.id,
    });

    return { __type: 'APPROVAL_REQUIRED' as const, approvalId: approval.id };
  },
});

const initiateCancellation = tool({
  description: 'Cancel a service (mocked demo).',
  inputSchema: z.object({
    serviceId: z.string().describe('Service ID e.g. jio-broadband'),
    reason: z.string().describe('Cancellation reason'),
  }),
  execute: async ({ serviceId, reason }) => {
    await insertAgentStep(
      _taskId,
      'action',
      `Initiated cancellation for ${serviceId}: ${reason}`,
      { serviceId, reason, mocked: true }
    );
    return { initiated: true, serviceId, mocked: true, reference: `CANCEL-${Date.now()}` };
  },
});

const initiateSignup = tool({
  description: 'Sign up for a new service plan (mocked demo).',
  inputSchema: z.object({
    serviceId: z.string().describe('Service ID e.g. act-broadband'),
    planId: z.string().describe('Plan ID e.g. act-300mbps-699'),
  }),
  execute: async ({ serviceId, planId }) => {
    await insertAgentStep(
      _taskId,
      'action',
      `Initiated signup for ${serviceId} plan ${planId}`,
      { serviceId, planId, mocked: true }
    );
    return { initiated: true, serviceId, planId, mocked: true, reference: `SIGNUP-${Date.now()}` };
  },
});

// ── allTools — build lazily to defer Token Vault initialization ────────────
// withGmailConnection / withGmailWriteConnection call Auth0AI.withTokenVault()
// which validates env vars. Must not run at module load time (breaks next build).

let _allTools: ReturnType<typeof buildTools> | null = null;

function buildTools() {
  return {
    searchWeb,
    fetchUrl,
    logStep,
    requestApproval,
    initiateSignup,
    initiateCancellation,
    taskComplete,
  };
}

export function getAllTools() {
  if (!_allTools) {
    _allTools = buildTools();
  }
  return _allTools;
}
