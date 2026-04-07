import { generateText, stepCountIs } from 'ai';
import { createGroq } from '@ai-sdk/groq';
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
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })('moonshotai/kimi-k2-instruct'),
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

    // If the agent exited without calling taskComplete, force the task to a terminal state
    // so the frontend stops polling.
    const { getTask, insertAgentStep } = await import('../supabase/db');
    const currentTask = await getTask(taskId);
    if (currentTask?.status === 'running') {
      await insertAgentStep(taskId, 'error', 'Agent finished without completing the task. It may have run out of steps or been unable to proceed.', {});
      await updateTaskStatus(taskId, 'failed');
      return { status: 'failed', reason: 'Agent did not call taskComplete' };
    }

    return { status: 'complete' };
  } catch (err: unknown) {
    // Print full raw error so we can debug Groq failed_generation issues
    console.error('[Groq raw error]', JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Write an error step so the UI shows the real reason instead of the generic fallback
    try {
      const { insertAgentStep } = await import('../supabase/db');
      await insertAgentStep(taskId, 'error', message, {});
    } catch {
      // non-fatal — best effort
    }
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
