/**
 * Demo seed — creates a mock task with pre-populated steps
 * to demonstrate the full flow without needing real Gmail or broadband APIs.
 *
 * Use: POST /api/demo/seed  (only in dev or with DEMO_MODE=true)
 */

import { supabaseServer } from '../supabase/client';

export async function seedDemoTask(userId: string) {
  // Create task
  const { data: task, error: taskError } = await supabaseServer
    .from('tasks')
    .insert({
      user_id: userId,
      description: "My Jio broadband expires next month. Find something faster and cheaper. Ask before switching.",
      status: 'awaiting_approval',
    })
    .select()
    .single();

  if (taskError || !task) throw new Error(`seedDemoTask: ${taskError?.message}`);

  const taskId = task.id as string;
  const now = new Date();
  const t = (offsetSec: number) => new Date(now.getTime() + offsetSec * 1000).toISOString();

  // Insert steps
  const steps = [
    { task_id: taskId, step_type: 'research', description: 'Searching Gmail for Jio billing emails...', metadata: {}, created_at: t(0) },
    { task_id: taskId, step_type: 'research', description: 'Found Jio billing email — current plan: 100Mbps @ ₹999/mo, expires May 3', metadata: { plan: 'Jio 100Mbps', price: '₹999/mo' }, created_at: t(2) },
    { task_id: taskId, step_type: 'research', description: 'Searching broadband providers in Bangalore...', metadata: {}, created_at: t(4) },
    { task_id: taskId, step_type: 'research', description: 'Found ACT Fibernet plans — 300Mbps @ ₹699/mo available', metadata: { provider: 'ACT Fibernet', plan: '300Mbps', price: '₹699/mo' }, created_at: t(6) },
    { task_id: taskId, step_type: 'research', description: 'Checking Airtel Xstream plans — 200Mbps @ ₹799/mo', metadata: { provider: 'Airtel', plan: '200Mbps', price: '₹799/mo' }, created_at: t(8) },
    { task_id: taskId, step_type: 'compare', description: 'Compared 8 broadband plans across 4 providers', metadata: { plans_compared: 8 }, created_at: t(10) },
    { task_id: taskId, step_type: 'compare', description: 'ACT Fibernet 300Mbps @ ₹699/mo — best value: 3x speed, saves ₹300/mo vs Jio', metadata: { winner: 'ACT 300Mbps', savings_monthly: 300, savings_annual: 3600 }, created_at: t(12) },
    { task_id: taskId, step_type: 'approval', description: 'Requesting approval: Switch from Jio 100Mbps to ACT 300Mbps — saves ₹3,600/yr', metadata: {}, created_at: t(14) },
  ];

  const { error: stepsError } = await supabaseServer
    .from('agent_steps')
    .insert(steps);

  if (stepsError) throw new Error(`seedDemoTask steps: ${stepsError.message}`);

  // Insert pending approval
  const { data: approval, error: approvalError } = await supabaseServer
    .from('pending_approvals')
    .insert({
      task_id: taskId,
      action_summary: 'Switch broadband from Jio 100Mbps to ACT Fibernet 300Mbps plan.',
      action_reasoning: 'Your Jio plan (₹999/mo, 100Mbps) expires May 3. ACT Fibernet offers 300Mbps at ₹699/mo in your area — 3x faster at ₹300/mo less. The switch can be initiated online and takes 2-3 business days.',
      action_impact: 'Saves ₹3,600/yr · Speed 100Mbps → 300Mbps · Jio plan cancelled after cutover',
      alternatives_considered: 'Airtel 200Mbps @ ₹799/mo (considered) — slower and ₹100/mo more than ACT. BSNL 100Mbps @ ₹499/mo — same speed as Jio, customer service concerns.',
      status: 'pending',
    })
    .select()
    .single();

  if (approvalError || !approval) throw new Error(`seedDemoTask approval: ${approvalError?.message}`);

  return { taskId, approvalId: approval.id };
}
