import { supabaseServer } from './client';
import type { Task, AgentStep, PendingApproval, TaskStatus, StepType } from '../types';

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function createTask(
  userId: string,
  description: string
): Promise<Task> {
  const { data, error } = await supabaseServer
    .from('tasks')
    .insert({ user_id: userId, description, status: 'pending' })
    .select()
    .single();

  if (error) throw new Error(`createTask: ${error.message}`);
  return data as Task;
}

export async function getTask(taskId: string): Promise<Task | null> {
  const { data, error } = await supabaseServer
    .from('tasks')
    .select()
    .eq('id', taskId)
    .single();

  if (error) return null;
  return data as Task;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  extra?: { messages?: unknown; result?: unknown }
): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (extra?.messages !== undefined) update.messages = extra.messages;
  if (extra?.result !== undefined) update.result = extra.result;

  const { error } = await supabaseServer
    .from('tasks')
    .update(update)
    .eq('id', taskId);

  if (error) throw new Error(`updateTaskStatus: ${error.message}`);
}

export async function listTasksForUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabaseServer
    .from('tasks')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listTasksForUser: ${error.message}`);
  return (data ?? []) as Task[];
}

// ── Agent Steps ────────────────────────────────────────────────────────────

export async function insertAgentStep(
  taskId: string,
  stepType: StepType,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<AgentStep> {
  const { data, error } = await supabaseServer
    .from('agent_steps')
    .insert({ task_id: taskId, step_type: stepType, description, metadata })
    .select()
    .single();

  if (error) throw new Error(`insertAgentStep: ${error.message}`);
  return data as AgentStep;
}

export async function getStepsForTask(taskId: string): Promise<AgentStep[]> {
  const { data, error } = await supabaseServer
    .from('agent_steps')
    .select()
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`getStepsForTask: ${error.message}`);
  return (data ?? []) as AgentStep[];
}

// ── Pending Approvals ──────────────────────────────────────────────────────

export async function createApproval(params: {
  taskId: string;
  action_summary: string;
  action_reasoning: string;
  action_impact: string;
  alternatives_considered: string;
}): Promise<PendingApproval> {
  const { data, error } = await supabaseServer
    .from('pending_approvals')
    .insert({
      task_id: params.taskId,
      action_summary: params.action_summary,
      action_reasoning: params.action_reasoning,
      action_impact: params.action_impact,
      alternatives_considered: params.alternatives_considered,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`createApproval: ${error.message}`);
  return data as PendingApproval;
}

export async function resolveApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<PendingApproval> {
  const update: Record<string, unknown> = {
    status: decision,
    resolved_at: new Date().toISOString(),
  };
  if (rejectionReason) update.rejection_reason = rejectionReason;

  const { data, error } = await supabaseServer
    .from('pending_approvals')
    .update(update)
    .eq('id', approvalId)
    .select()
    .single();

  if (error) throw new Error(`resolveApproval: ${error.message}`);
  return data as PendingApproval;
}

export async function getPendingApproval(
  taskId: string
): Promise<PendingApproval | null> {
  const { data, error } = await supabaseServer
    .from('pending_approvals')
    .select()
    .eq('task_id', taskId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as PendingApproval;
}
