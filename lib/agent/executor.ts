import { generateText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { getAllTools, setTaskContext } from './tools';
import { SYSTEM_PROMPT } from './prompts';
import { isApprovalRequired } from '../types';
import { updateTaskStatus, getTask } from '../supabase/db';
import { setUserContext } from '../auth0-ai';
import type { ModelMessage } from 'ai';

export type ExecutorResult =
  | { status: 'complete' }
  | { status: 'awaiting_approval'; approvalId: string }
  | { status: 'failed'; reason: string };

interface ExecutorParams {
  taskId: string;
  userId: string;
  description: string;
  messages?: ModelMessage[];
}

export async function runAgent(params: ExecutorParams): Promise<ExecutorResult> {
  const { taskId, userId, description, messages: resumeMessages } = params;

  // Set user context for token lookup (mock Token Vault)
  setUserContext(userId);

  // Set task context for tools (for logStep, requestApproval, etc.)
  setTaskContext(taskId);

  await updateTaskStatus(taskId, 'running');

  const initialMessages: ModelMessage[] = resumeMessages ?? [
    { role: 'user', content: description },
  ];

  try {
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      system: SYSTEM_PROMPT,
      messages: initialMessages,
      tools: getAllTools(),
      stopWhen: stepCountIs(30),
    });

    // Check every step's tool results for APPROVAL_REQUIRED
    for (const step of result.steps) {
      for (const toolResult of step.toolResults ?? []) {
        const output = 'output' in toolResult ? toolResult.output : undefined;
        if (isApprovalRequired(output)) {
          // Save full message history for resume
          const fullMessages: ModelMessage[] = [
            ...initialMessages,
            ...result.response.messages,
          ];
          await updateTaskStatus(taskId, 'awaiting_approval', {
            messages: fullMessages,
          });
          return {
            status: 'awaiting_approval',
            approvalId: (output as { approvalId: string }).approvalId,
          };
        }
      }
    }

    return { status: 'complete' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await updateTaskStatus(taskId, 'failed');
    return { status: 'failed', reason: message };
  }
}

export async function resumeAgent(
  taskId: string,
  approvalDecision: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<ExecutorResult> {
  const task = await getTask(taskId);
  if (!task) {
    return { status: 'failed', reason: 'Task not found' };
  }
  if (!task.messages) {
    return { status: 'failed', reason: 'No saved message state to resume from' };
  }

  const savedMessages = task.messages as ModelMessage[];
  const userId = task.user_id;

  if (approvalDecision === 'rejected') {
    const rejectMsg = rejectionReason
      ? `The user rejected the proposed action. Reason: "${rejectionReason}". Please reconsider and propose an alternative, or call taskFailed if there is no good alternative.`
      : 'The user rejected the proposed action. Please reconsider or call taskFailed.';

    return runAgent({
      taskId,
      userId,
      description: task.description,
      messages: [
        ...savedMessages,
        { role: 'user', content: rejectMsg },
      ],
    });
  }

  return runAgent({
    taskId,
    userId,
    description: task.description,
    messages: [
      ...savedMessages,
      { role: 'user', content: 'The action was approved. Please proceed.' },
    ],
  });
}
