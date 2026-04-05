export type TaskStatus =
  | 'pending'
  | 'running'
  | 'awaiting_approval'
  | 'complete'
  | 'failed';

export type StepType =
  | 'research'
  | 'compare'
  | 'action'
  | 'approval'
  | 'complete'
  | 'error'
  | 'info';

export interface Task {
  id: string;
  user_id: string;
  description: string;
  status: TaskStatus;
  messages: unknown | null;
  result: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface AgentStep {
  id: string;
  task_id: string;
  step_type: StepType;
  description: string;
  metadata: Record<string, unknown>;
  status: 'complete' | 'error';
  created_at: string;
}

export interface PendingApproval {
  id: string;
  task_id: string;
  action_summary: string;
  action_reasoning: string;
  action_impact: string;
  alternatives_considered: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ApprovalRequired {
  __type: 'APPROVAL_REQUIRED';
  approvalId: string;
}

export function isApprovalRequired(value: unknown): value is ApprovalRequired {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    (value as Record<string, unknown>).__type === 'APPROVAL_REQUIRED'
  );
}
