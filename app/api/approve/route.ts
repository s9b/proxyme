import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { auth0 } from '@/lib/auth0';
import { resolveApproval, getTask } from '@/lib/supabase/db';
import { resumeAgent } from '@/lib/agent/executor';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      approvalId?: string;
      taskId?: string;
      decision?: 'approved' | 'rejected';
      rejectionReason?: string;
    };

    const { approvalId, taskId, decision, rejectionReason } = body;

    if (!approvalId || !taskId || !decision) {
      return NextResponse.json({ error: 'approvalId, taskId, and decision are required' }, { status: 400 });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'decision must be approved or rejected' }, { status: 400 });
    }

    // Verify task belongs to this user
    const task = await getTask(taskId);
    if (!task || task.user_id !== session.user.sub) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Record the decision in Supabase
    await resolveApproval(approvalId, decision, rejectionReason);

    // Resume the agent in background — waitUntil keeps the Lambda alive on Vercel
    waitUntil(resumeAgent(taskId, decision, rejectionReason).catch(() => {}));

    return NextResponse.json({ resumed: true, decision });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
